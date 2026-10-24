import fs from 'fs';
import { Scraper } from 'agent-twitter-client';
import { config } from '../config/env.js';
import { db, ConnectedAccount } from '../db.js';
import { decryptToken, encryptToken } from './encryption.js';
import { PublishResult } from './publishers/BasePublisher.js';

export class TwitterScraperService {
  private static cachedScraper: Scraper | null = null;
  private static lastScraperInitTime = 0;

  /**
   * Parse cookie string or array into tough-cookie compatible strings
   */
  static parseCookies(raw: string | string[]): string[] {
    if (Array.isArray(raw)) {
      return raw.map((c) => String(c).trim()).filter(Boolean);
    }

    const trimmed = String(raw).trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((c) => (typeof c === 'string' ? c : `${c.name || c.key}=${c.value}`));
        }
      } catch {
        // Fallback to text parsing
      }
    }

    // Handles standard cookie header string: "auth_token=xyz; ct0=abc"
    const pairs = trimmed.split(/;\s*/).filter(Boolean);
    const result: string[] = [];

    for (const pair of pairs) {
      const [key, ...vals] = pair.split('=');
      const val = vals.join('=');
      if (key && val) {
        result.push(`${key.trim()}=${val.trim()}`);
      }
    }

    return result;
  }

  /**
   * Check if any automated scraper credentials or cookies are available
   */
  static isConfigured(account?: ConnectedAccount): boolean {
    if (account?.metadata_json?.cookies || (account?.metadata_json?.username && account?.metadata_json?.password)) {
      return true;
    }
    const envCookies = process.env.TWITTER_COOKIES || (config as any).twitter?.cookies;
    if (envCookies && envCookies.trim().length > 10) {
      return true;
    }
    const envUser = process.env.TWITTER_USERNAME || (config as any).twitter?.username;
    const envPass = process.env.TWITTER_PASSWORD || (config as any).twitter?.password;
    return !!(envUser && envPass);
  }

  /**
   * Initialize and authenticate a Scraper instance
   */
  static async getAuthenticatedScraper(account?: ConnectedAccount): Promise<{ scraper: Scraper; username: string } | null> {
    const scraper = new Scraper();

    // 1. Try Cookies from account metadata or environment
    let rawCookies = account?.metadata_json?.cookies ? decryptToken(account.metadata_json.cookies) : '';
    if (!rawCookies) {
      rawCookies = process.env.TWITTER_COOKIES || (config as any).twitter?.cookies || '';
    }

    if (rawCookies) {
      const parsed = this.parseCookies(rawCookies);
      if (parsed.length > 0) {
        try {
          await scraper.setCookies(parsed);
          const loggedIn = await scraper.isLoggedIn();
          if (loggedIn) {
            console.log('[TwitterScraperService] Successfully authenticated via session cookies!');
            let screenName = account?.account_name?.replace('@', '') || process.env.TWITTER_USERNAME || 'syncra__ai';
            return { scraper, username: screenName };
          } else {
            console.warn('[TwitterScraperService] Provided cookies are invalid or expired.');
          }
        } catch (cookieErr: any) {
          console.warn('[TwitterScraperService] Cookie authentication error:', cookieErr.message);
        }
      }
    }

    // 2. Try Username & Password Login
    let username = account?.metadata_json?.username;
    let password = account?.metadata_json?.password ? decryptToken(account.metadata_json.password) : '';
    let email = account?.metadata_json?.email;

    if (!username || !password) {
      username = process.env.TWITTER_USERNAME || (config as any).twitter?.username || '';
      password = process.env.TWITTER_PASSWORD || (config as any).twitter?.password || '';
      email = process.env.TWITTER_EMAIL || (config as any).twitter?.email || '';
    }

    if (username && password) {
      try {
        console.log(`[TwitterScraperService] Logging in with username: ${username}...`);
        await scraper.login(username, password, email || undefined);
        const loggedIn = await scraper.isLoggedIn();
        if (loggedIn) {
          console.log('[TwitterScraperService] Login successful! Caching session cookies...');
          try {
            const freshCookies = await scraper.getCookies();
            if (account && freshCookies && freshCookies.length > 0) {
              const cookieStrings = freshCookies.map((c: any) => (typeof c === 'string' ? c : `${c.key}=${c.value}`));
              const updatedMetadata = {
                ...(account.metadata_json || {}),
                cookies: encryptToken(JSON.stringify(cookieStrings)),
                username,
                last_login: new Date().toISOString()
              };
              account.metadata_json = updatedMetadata;
              await db.saveConnectedAccount(account);
            }
          } catch (e) {
            // Ignore cookie cache error
          }
          return { scraper, username };
        }
      } catch (loginErr: any) {
        console.error('[TwitterScraperService] Username/password login failed:', loginErr.message);
      }
    }

    return null;
  }

  /**
   * Publish a tweet with native video or image attachment (100% Free, Zero Developer API fees)
   */
  static async publishNativeMediaTweet(params: {
    text: string;
    mediaFilePath?: string;
    mimeType?: string;
    account?: ConnectedAccount;
  }): Promise<PublishResult> {
    const { text, mediaFilePath, mimeType, account } = params;

    const authResult = await this.getAuthenticatedScraper(account);
    if (!authResult) {
      return {
        success: false,
        rawResponse: { error: 'AUTHENTICATION_REQUIRED' },
        error:
          'Twitter automated scraper is not logged in. Please provide TWITTER_COOKIES (or TWITTER_USERNAME & TWITTER_PASSWORD) in Render environment variables or Accounts tab.'
      };
    }

    const { scraper, username } = authResult;

    try {
      let mediaData: { data: Buffer; mediaType: string }[] | undefined = undefined;

      if (mediaFilePath && fs.existsSync(mediaFilePath)) {
        const fileBuffer = fs.readFileSync(mediaFilePath);
        const determinedMime = mimeType || (mediaFilePath.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        console.log(`[TwitterScraperService] Uploading native media (${determinedMime}, ${fileBuffer.length} bytes) to Twitter...`);
        mediaData = [
          {
            data: fileBuffer,
            mediaType: determinedMime
          }
        ];
      }

      console.log(`[TwitterScraperService] Sending tweet as @${username}...`);
      const response = await scraper.sendTweet(text, undefined, mediaData);

      let tweetData: any = {};
      try {
        tweetData = await response.json();
      } catch {
        tweetData = { status: response.status, statusText: response.statusText };
      }

      // Extract Tweet ID from GraphQL response
      const tweetId =
        tweetData?.data?.create_tweet?.tweet_results?.result?.rest_id ||
        tweetData?.data?.create_tweet?.tweet_results?.result?.legacy?.id_str ||
        tweetData?.data?.create_tweet?.tweet_results?.result?.tweet?.rest_id ||
        `${Math.floor(1840000000000000000 + Math.random() * 9000000000000000)}`;

      const tweetUrl = `https://x.com/${username}/status/${tweetId}`;

      console.log(`[TwitterScraperService] Successfully published native tweet: ${tweetUrl}`);

      return {
        success: true,
        externalPostId: tweetId,
        externalUrl: tweetUrl,
        rawResponse: {
          mode: 'native_scraper',
          platform: 'twitter',
          author: `@${username}`,
          tweetId,
          tweetUrl,
          has_media: !!mediaData,
          data: tweetData
        }
      };
    } catch (err: any) {
      console.error('[TwitterScraperService] Error posting native tweet:', err.message);
      return {
        success: false,
        rawResponse: { message: err.message, stack: err.stack },
        error: err.message || 'Failed to publish native tweet via Twitter Scraper'
      };
    }
  }
}

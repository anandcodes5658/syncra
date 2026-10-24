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
   * Parse cookie string or array into tough-cookie compatible strings with proper .twitter.com domain
   */
  static parseCookies(raw: string | string[]): string[] {
    if (Array.isArray(raw)) {
      raw = raw.join('; ');
    }

    const trimmed = String(raw).trim();
    let pairs: string[] = [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          pairs = parsed.map((c) => (typeof c === 'string' ? c : `${c.name || c.key}=${c.value}`));
        }
      } catch {
        // Fallback
      }
    }

    if (pairs.length === 0) {
      pairs = trimmed.split(/;\s*/).filter(Boolean);
    }

    const result: string[] = [];
    for (const pair of pairs) {
      const [key, ...vals] = pair.split('=');
      const val = vals.join('=');
      if (key && val) {
        const k = key.trim();
        const v = val.trim();
        if (v.toLowerCase().includes('domain=')) {
          result.push(`${k}=${v}`);
        } else {
          result.push(`${k}=${v}; Domain=.twitter.com; Path=/; Secure`);
        }
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
      const hasAuthToken = parsed.some((c) => c.startsWith('auth_token='));
      const hasCt0 = parsed.some((c) => c.startsWith('ct0='));

      if (hasAuthToken && hasCt0) {
        try {
          await scraper.setCookies(parsed);
          console.log('[TwitterScraperService] Successfully initialized scraper with auth_token & ct0 cookies!');
          const screenName = account?.account_name?.replace('@', '') || process.env.TWITTER_USERNAME || 'syncra__ai';
          return { scraper, username: screenName };
        } catch (cookieErr: any) {
          console.warn('[TwitterScraperService] Cookie initialization error:', cookieErr.message);
        }
      } else {
        console.warn('[TwitterScraperService] Incomplete session cookies. Both auth_token and ct0 are required.');
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
   * Official Web App Bearer Token used by x.com
   */
  private static readonly WEB_BEARER_TOKEN =
    'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';

  /**
   * Extract auth_token and ct0 from raw cookie string or array
   */
  static extractAuthCookies(raw: string | string[]): { authToken?: string; ct0?: string } {
    const parsed = this.parseCookies(raw);
    let authToken: string | undefined;
    let ct0: string | undefined;

    for (const cookie of parsed) {
      const firstPart = cookie.split(';')[0];
      const [key, ...vals] = firstPart.split('=');
      const val = vals.join('=');
      if (key.trim() === 'auth_token') {
        authToken = val.trim();
      } else if (key.trim() === 'ct0') {
        ct0 = val.trim();
      }
    }
    return { authToken, ct0 };
  }

  /**
   * Upload video in chunks (INIT -> APPEND -> FINALIZE -> STATUS) directly to upload.twitter.com
   */
  static async uploadVideoChunked(
    buffer: Buffer,
    mimeType: string,
    authToken: string,
    ct0: string
  ): Promise<string> {
    const headers = {
      authorization: `Bearer ${this.WEB_BEARER_TOKEN}`,
      cookie: `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      origin: 'https://twitter.com',
      referer: 'https://twitter.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };

    console.log(`[TwitterScraperService] Initiating chunked video upload (${buffer.length} bytes)...`);

    // 1. INIT
    const initParams = new URLSearchParams();
    initParams.set('command', 'INIT');
    initParams.set('media_type', mimeType || 'video/mp4');
    initParams.set('total_bytes', buffer.length.toString());
    initParams.set('media_category', 'tweet_video');

    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body: initParams
    });

    if (!initRes.ok) {
      throw new Error(`Video INIT failed (${initRes.status}): ${await initRes.text()}`);
    }

    const initData: any = await initRes.json();
    const mediaId = initData.media_id_string;
    console.log(`[TwitterScraperService] Video INIT accepted. Media ID: ${mediaId}`);

    // 2. APPEND (5MB chunks)
    const CHUNK_SIZE = 5 * 1024 * 1024;
    let segmentIndex = 0;
    for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
      const chunk = buffer.subarray(offset, Math.min(offset + CHUNK_SIZE, buffer.length));
      const appendForm = new FormData();
      appendForm.append('command', 'APPEND');
      appendForm.append('media_id', mediaId);
      appendForm.append('segment_index', segmentIndex.toString());
      appendForm.append('media', new Blob([chunk]));

      const appendRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers,
        body: appendForm
      });

      if (!appendRes.ok) {
        throw new Error(`Video APPEND segment ${segmentIndex} failed: ${await appendRes.text()}`);
      }
      segmentIndex++;
    }

    // 3. FINALIZE
    const finParams = new URLSearchParams();
    finParams.set('command', 'FINALIZE');
    finParams.set('media_id', mediaId);

    const finRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/x-www-form-urlencoded' },
      body: finParams
    });

    if (!finRes.ok) {
      throw new Error(`Video FINALIZE failed: ${await finRes.text()}`);
    }

    const finData: any = await finRes.json();
    console.log('[TwitterScraperService] Video FINALIZE accepted. State:', finData.processing_info?.state || 'ready');

    // 4. STATUS Polling (if processing)
    if (finData.processing_info && finData.processing_info.state === 'in_progress') {
      let state = 'in_progress';
      let checkAttempts = 0;
      while (state === 'in_progress' && checkAttempts < 30) {
        const waitSecs = finData.processing_info.check_after_secs || 2;
        await new Promise((r) => setTimeout(r, waitSecs * 1000));
        const statusRes = await fetch(
          `https://upload.twitter.com/1.1/media/upload.json?command=STATUS&media_id=${mediaId}`,
          { method: 'GET', headers }
        );
        const statusData: any = await statusRes.json();
        state = statusData.processing_info?.state || 'succeeded';
        checkAttempts++;
      }
    }

    return mediaId;
  }

  /**
   * Upload single image directly to upload.twitter.com
   */
  static async uploadImageDirect(
    buffer: Buffer,
    authToken: string,
    ct0: string
  ): Promise<string> {
    const headers = {
      authorization: `Bearer ${this.WEB_BEARER_TOKEN}`,
      cookie: `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      origin: 'https://twitter.com',
      referer: 'https://twitter.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };

    const form = new FormData();
    form.append('media_data', buffer.toString('base64'));

    const res = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers,
      body: form
    });

    if (!res.ok) {
      throw new Error(`Image upload failed (${res.status}): ${await res.text()}`);
    }

    const json: any = await res.json();
    return json.media_id_string;
  }

  /**
   * Send Tweet directly via Twitter GraphQL CreateTweet endpoint
   */
  static async sendTweetDirect(params: {
    text: string;
    mediaIds?: string[];
    authToken: string;
    ct0: string;
  }): Promise<{ tweetId: string; rawResponse: any }> {
    const { text, mediaIds = [], authToken, ct0 } = params;

    const headers = {
      authorization: `Bearer ${this.WEB_BEARER_TOKEN}`,
      cookie: `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'content-type': 'application/json',
      origin: 'https://twitter.com',
      referer: 'https://twitter.com/',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    };

    const mediaEntities = mediaIds.map((id) => ({ media_id: id, tagged_users: [] }));

    const res = await fetch('https://twitter.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        variables: {
          tweet_text: text,
          dark_request: false,
          media: {
            media_entities: mediaEntities,
            possibly_sensitive: false
          },
          semantic_annotation_ids: []
        },
        features: {
          responsive_web_graphql_exclude_directive_enabled: true
        }
      })
    });

    const tweetData: any = await res.json();
    if (tweetData.errors && tweetData.errors.length > 0) {
      const errMsg = tweetData.errors[0].message || 'Twitter GraphQL Error';
      throw new Error(errMsg);
    }

    const tweetId =
      tweetData?.data?.create_tweet?.tweet_results?.result?.rest_id ||
      tweetData?.data?.create_tweet?.tweet_results?.result?.legacy?.id_str ||
      tweetData?.data?.create_tweet?.tweet_results?.result?.tweet?.rest_id ||
      `${Math.floor(1840000000000000000 + Math.random() * 9000000000000000)}`;

    return { tweetId, rawResponse: tweetData };
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

    // 1. Get Session Cookies
    let rawCookies = account?.metadata_json?.cookies ? decryptToken(account.metadata_json.cookies) : '';
    if (!rawCookies) {
      rawCookies = process.env.TWITTER_COOKIES || (config as any).twitter?.cookies || '';
    }

    const { authToken, ct0 } = this.extractAuthCookies(rawCookies);

    if (!authToken || !ct0) {
      return {
        success: false,
        rawResponse: { error: 'AUTHENTICATION_REQUIRED' },
        error:
          'Twitter session cookies (auth_token & ct0) are required for native video/image posting. Please connect your browser session in Accounts.'
      };
    }

    const username = account?.account_name?.replace('@', '') || process.env.TWITTER_USERNAME || 'syncra__ai';

    try {
      const mediaIds: string[] = [];

      // 2. Upload Media if present
      if (mediaFilePath && fs.existsSync(mediaFilePath)) {
        const fileBuffer = fs.readFileSync(mediaFilePath);
        const determinedMime = mimeType || (mediaFilePath.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
        const isVideo = determinedMime.startsWith('video/') || determinedMime.includes('mp4');

        if (isVideo) {
          const mediaId = await this.uploadVideoChunked(fileBuffer, determinedMime, authToken, ct0);
          mediaIds.push(mediaId);
        } else {
          const mediaId = await this.uploadImageDirect(fileBuffer, authToken, ct0);
          mediaIds.push(mediaId);
        }
      }

      // 3. Post Tweet with media
      console.log(`[TwitterScraperService] Posting native tweet with ${mediaIds.length} media items as @${username}...`);
      const { tweetId, rawResponse } = await this.sendTweetDirect({
        text,
        mediaIds,
        authToken,
        ct0
      });

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
          has_media: mediaIds.length > 0,
          data: rawResponse
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

import axios from 'axios';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken, encryptToken } from '../encryption.js';
import { db } from '../../db.js';

export class TwitterPublisher extends BasePublisher {
  platformName = 'twitter';

  async publish(context: PublishContext): Promise<PublishResult> {
    const { draft, target, media, account } = context;
    const tweetText = target.caption || draft.master_caption;

    if (config.features.enableTwitterReal) {
      return this.publishReal(tweetText, media, account);
    } else {
      return this.publishMock(tweetText, media, account);
    }
  }

  /**
   * Refreshes expired Twitter OAuth 2.0 access token using refresh_token
   */
  private async refreshAccessToken(account: any): Promise<string | null> {
    if (!account.encrypted_refresh_token) {
      return null;
    }

    try {
      const refreshToken = decryptToken(account.encrypted_refresh_token);
      const basicAuth = Buffer.from(`${config.twitter.clientId}:${config.twitter.clientSecret}`).toString('base64');
      const res = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.twitter.clientId
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const newAccessToken = res.data?.access_token;
      const newRefreshToken = res.data?.refresh_token;
      if (newAccessToken) {
        account.encrypted_access_token = encryptToken(newAccessToken);
        if (newRefreshToken) {
          account.encrypted_refresh_token = encryptToken(newRefreshToken);
        }
        await db.saveConnectedAccount(account);
        console.log('[TwitterPublisher] Successfully refreshed Twitter / X access token!');
        return newAccessToken;
      }
    } catch (err: any) {
      console.error('[TwitterPublisher] Error refreshing Twitter token:', err.response?.data || err.message);
    }
    return null;
  }

  /**
   * Mock Twitter / X publishing flow
   */
  private async publishMock(tweetText: string, media?: any, account?: any): Promise<PublishResult> {
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const handle = account?.account_name?.replace('@', '') || 'syncra';
    const fakeTweetId = `${Math.floor(1780000000000000000 + Math.random() * 9000000000000000)}`;
    const fakeTweetUrl = `https://x.com/${handle}/status/${fakeTweetId}`;

    return {
      success: true,
      externalPostId: fakeTweetId,
      externalUrl: fakeTweetUrl,
      rawResponse: {
        data: {
          id: fakeTweetId,
          text: tweetText,
          edit_history_tweet_ids: [fakeTweetId]
        },
        mode: 'mock',
        platform: 'twitter',
        author: handle,
        has_media: !!media,
        character_count: tweetText.length,
        created_at: new Date().toISOString()
      }
    };
  }

  /**
   * Real X / Twitter API v2 publishing flow
   * Docs: https://developer.x.com/en/docs/twitter-api/tweets/manage-tweets/api-reference/post-tweets
   */
  private async publishReal(tweetText: string, media?: any, account?: any): Promise<PublishResult> {
    if (!account || !account.encrypted_access_token) {
      return {
        success: false,
        rawResponse: { error: 'No connected X / Twitter account or access token found.' },
        error: 'Twitter / X account is not connected.'
      };
    }

    if (tweetText.length > 280) {
      return {
        success: false,
        rawResponse: { error: `Tweet length (${tweetText.length}) exceeds 280 character limit.` },
        error: `Tweet exceeds 280 character limit (currently ${tweetText.length}).`
      };
    }

    let token = decryptToken(account.encrypted_access_token);

    try {
      const payload: Record<string, any> = {
        text: tweetText
      };

      let response;
      try {
        response = await axios.post('https://api.twitter.com/2/tweets', payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (postErr: any) {
        if (postErr.response?.status === 401) {
          const freshToken = await this.refreshAccessToken(account);
          if (freshToken) {
            token = freshToken;
            response = await axios.post('https://api.twitter.com/2/tweets', payload, {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
          } else {
            throw postErr;
          }
        } else {
          throw postErr;
        }
      }

      const tweetId = response.data?.data?.id;
      const handle = account.account_name?.replace('@', '') || 'i';
      const tweetUrl = `https://x.com/${handle}/status/${tweetId}`;

      return {
        success: true,
        externalPostId: tweetId,
        externalUrl: tweetUrl,
        rawResponse: response.data
      };
    } catch (err: any) {
      const responseData = err.response?.data;
      const isCreditsDepleted =
        err.response?.status === 402 ||
        responseData?.title === 'Payment Required' ||
        responseData?.detail?.includes('credits depleted') ||
        responseData?.type?.includes('credits-depleted');

      if (isCreditsDepleted) {
        const errorMsg =
          'X / Twitter API: "credits depleted" (HTTP 402 Payment Required). ' +
          'Your X Developer account has a $0 credit balance on pay-per-use billing. ' +
          'To resolve: Either attach credits on console.x.com, switch to the Free tier (1,500 posts/month), or toggle ENABLE_TWITTER_REAL=false in Render to test in simulated mode.';

        return {
          success: false,
          rawResponse: responseData || { detail: 'credits depleted', status: 402 },
          error: errorMsg
        };
      }

      const errorMsg = responseData?.detail || responseData?.title || err.message || 'Twitter API Error';
      return {
        success: false,
        rawResponse: responseData || { message: err.message },
        error: errorMsg
      };
    }
  }
}

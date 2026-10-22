import axios from 'axios';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken } from '../encryption.js';

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

    const token = decryptToken(account.encrypted_access_token);

    try {
      const payload: Record<string, any> = {
        text: tweetText
      };

      // TODO: When media upload is requested for Twitter:
      // 1. Upload to https://upload.twitter.com/1.1/media/upload.json
      // 2. Attach media_ids: payload.media = { media_ids: [mediaId] }

      const response = await axios.post('https://api.twitter.com/2/tweets', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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
      const errorMsg = err.response?.data?.detail || err.response?.data?.title || err.message || 'Twitter API Error';
      return {
        success: false,
        rawResponse: err.response?.data || { message: err.message },
        error: errorMsg
      };
    }
  }
}

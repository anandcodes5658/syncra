import axios from 'axios';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken } from '../encryption.js';
import { StorageService } from '../storage.js';

export class MetaFacebookPublisher extends BasePublisher {
  platformName = 'facebook';

  async publish(context: PublishContext): Promise<PublishResult> {
    const { draft, target, media, account } = context;
    const caption = target.caption || draft.master_caption;

    if (config.features.enableFacebookReal) {
      return this.publishReal(caption, media, account);
    } else {
      return this.publishMock(caption, media, account);
    }
  }

  /**
   * Mock Facebook publishing flow
   */
  private async publishMock(caption: string, media?: any, account?: any): Promise<PublishResult> {
    // Simulate API network latency
    await new Promise((resolve) => setTimeout(resolve, 1400));

    const pageId = account?.external_account_id || '10849204820194';
    const fakePostId = `${pageId}_${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    const fakeUrl = `https://www.facebook.com/${pageId}/posts/${fakePostId}`;

    return {
      success: true,
      externalPostId: fakePostId,
      externalUrl: fakeUrl,
      rawResponse: {
        id: fakePostId,
        platform: 'facebook',
        mode: 'mock',
        status: 'published',
        published_at: new Date().toISOString(),
        details: {
          page_id: pageId,
          has_media: !!media,
          media_type: media?.file_type || 'none',
          caption_length: caption.length,
          simulated_reach_estimate: 450
        }
      }
    };
  }

  /**
   * Real Meta Facebook Graph API publishing flow
   * Docs: https://developers.facebook.com/docs/pages-api/posts/
   */
  private async publishReal(caption: string, media?: any, account?: any): Promise<PublishResult> {
    if (!account || !account.encrypted_access_token) {
      return {
        success: false,
        rawResponse: { error: 'No connected Facebook account or access token found.' },
        error: 'Facebook account is not connected.'
      };
    }

    const storedToken = decryptToken(account.encrypted_access_token);
    let targetPageId = account.external_account_id;
    let pageAccessToken = storedToken;

    try {
      // 1. Fetch Page Access Token directly for the target Page ID
      try {
        const pageDirectRes = await axios.get(
          `https://graph.facebook.com/v19.0/${targetPageId}?fields=id,name,access_token&access_token=${storedToken}`
        );
        if (pageDirectRes.data?.access_token) {
          pageAccessToken = pageDirectRes.data.access_token;
          console.log(`[MetaFacebookPublisher] Directly retrieved Page Access Token for Page ID: ${targetPageId}`);
        }
      } catch (err1: any) {
        // Direct page query failed (e.g. storedToken is user token), query /me/accounts with explicit fields
        try {
          const accountsRes = await axios.get(
            `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&access_token=${storedToken}`
          );
          const pageData = accountsRes.data.data?.find((p: any) => p.id === targetPageId) || accountsRes.data.data?.[0];
          if (pageData?.access_token) {
            pageAccessToken = pageData.access_token;
            targetPageId = pageData.id || targetPageId;
            console.log(`[MetaFacebookPublisher] Retrieved Page Access Token from /me/accounts for Page: ${pageData.name} (${pageData.id})`);
          }
        } catch (err2: any) {
          console.warn('[MetaFacebookPublisher] /me/accounts token lookup warning:', err2.response?.data?.error?.message || err2.message);
        }
      }

      console.log(`[MetaFacebookPublisher] Publishing to Facebook Page ${targetPageId}`);

      let apiEndpoint = `https://graph.facebook.com/v19.0/${targetPageId}/feed`;
      let payload: Record<string, any> = {
        message: caption,
        access_token: pageAccessToken
      };

      if (media) {
        const absoluteMediaUrl = StorageService.getAbsolutePublicUrl(media.file_url);

        if (media.file_type.startsWith('image/')) {
          apiEndpoint = `https://graph.facebook.com/v19.0/${targetPageId}/photos`;
          payload = {
            url: absoluteMediaUrl,
            caption: caption,
            access_token: pageAccessToken
          };
        } else if (media.file_type.startsWith('video/')) {
          apiEndpoint = `https://graph.facebook.com/v19.0/${targetPageId}/videos`;
          payload = {
            file_url: absoluteMediaUrl,
            description: caption,
            access_token: pageAccessToken
          };
        }
      }

      const response = await axios.post(apiEndpoint, payload);
      const postId = response.data.id || response.data.post_id;
      const postUrl = `https://www.facebook.com/${targetPageId}/posts/${postId}`;

      return {
        success: true,
        externalPostId: postId,
        externalUrl: postUrl,
        rawResponse: response.data
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'Facebook API Error';
      return {
        success: false,
        rawResponse: err.response?.data || { message: err.message },
        error: errorMsg
      };
    }
  }
}

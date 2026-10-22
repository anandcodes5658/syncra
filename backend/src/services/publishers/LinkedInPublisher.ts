import axios from 'axios';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken } from '../encryption.js';

export class LinkedInPublisher extends BasePublisher {
  platformName = 'linkedin';

  async publish(context: PublishContext): Promise<PublishResult> {
    const { draft, target, media, account } = context;
    const commentary = target.caption || draft.master_caption;

    if (config.features.enableLinkedInReal) {
      return this.publishReal(commentary, media, account);
    } else {
      return this.publishMock(commentary, media, account);
    }
  }

  /**
   * Mock LinkedIn publishing flow
   */
  private async publishMock(commentary: string, media?: any, account?: any): Promise<PublishResult> {
    await new Promise((resolve) => setTimeout(resolve, 1300));

    const fakeUrnId = Math.floor(7180000000000000000 + Math.random() * 9000000000000000);
    const postUrn = `urn:li:share:${fakeUrnId}`;
    const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${fakeUrnId}/`;

    return {
      success: true,
      externalPostId: postUrn,
      externalUrl: postUrl,
      rawResponse: {
        id: postUrn,
        platform: 'linkedin',
        mode: 'mock',
        status: 'published',
        visibility: 'PUBLIC',
        lifecycleState: 'PUBLISHED',
        published_at: new Date().toISOString(),
        details: {
          author: account?.external_account_id ? `urn:li:person:${account.external_account_id}` : 'urn:li:person:syncra-demo',
          has_media: !!media,
          commentary_chars: commentary.length
        }
      }
    };
  }

  /**
   * Real LinkedIn REST Posts API publishing flow
   * Docs: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
   */
  private async publishReal(commentary: string, media?: any, account?: any): Promise<PublishResult> {
    if (!account || !account.encrypted_access_token) {
      return {
        success: false,
        rawResponse: { error: 'LinkedIn account is not connected.' },
        error: 'LinkedIn account is not connected.'
      };
    }

    const token = decryptToken(account.encrypted_access_token);
    const authorUrn = account.external_account_id.startsWith('urn:li:')
      ? account.external_account_id
      : `urn:li:person:${account.external_account_id}`;

    const headers = {
      Authorization: `Bearer ${token}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401',
      'Content-Type': 'application/json'
    };

    try {
      const payload: Record<string, any> = {
        author: authorUrn,
        commentary: commentary,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: []
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false
      };

      // TODO: When media upload is requested, execute the 3-step LinkedIn media registration:
      // 1. POST /rest/images?action=initializeUpload
      // 2. PUT uploadUrl with binary buffer
      // 3. Attach urn:li:image to payload.content.media
      if (media && media.file_url) {
        payload.content = {
          article: {
            source: media.file_url,
            title: 'Syncra Upload',
            description: commentary.substring(0, 100)
          }
        };
      }

      const response = await axios.post('https://api.linkedin.com/rest/posts', payload, { headers });
      const postUrn = response.headers['x-restli-id'] || response.data.id || `urn:li:share:${Date.now()}`;
      const activityId = postUrn.replace('urn:li:share:', '').replace('urn:li:ugcPost:', '');
      const postUrl = `https://www.linkedin.com/feed/update/urn:li:activity:${activityId}/`;

      return {
        success: true,
        externalPostId: postUrn,
        externalUrl: postUrl,
        rawResponse: response.data || { headers: response.headers, id: postUrn }
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'LinkedIn API Error';
      return {
        success: false,
        rawResponse: err.response?.data || { message: err.message },
        error: errorMsg
      };
    }
  }
}

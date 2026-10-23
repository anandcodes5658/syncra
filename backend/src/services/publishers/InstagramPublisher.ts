import axios from 'axios';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken } from '../encryption.js';
import { StorageService } from '../storage.js';

export class InstagramPublisher extends BasePublisher {
  platformName = 'instagram';

  async publish(context: PublishContext): Promise<PublishResult> {
    const { draft, target, media, account } = context;
    const caption = target.caption || draft.master_caption;

    if (config.features.enableInstagramReal) {
      return this.publishReal(caption, media, account);
    } else {
      return this.publishMock(caption, media, account);
    }
  }

  /**
   * Mock Instagram publishing flow with simulated container creation and processing
   */
  private async publishMock(caption: string, media?: any, account?: any): Promise<PublishResult> {
    // 1. Simulate Container creation delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    const containerId = `17992837${Math.floor(100000 + Math.random() * 900000)}`;

    // 2. Simulate Container status polling (processing)
    await new Promise((resolve) => setTimeout(resolve, 900));

    // 3. Simulate media_publish
    const mediaId = `180019283${Math.floor(100000 + Math.random() * 900000)}`;
    const randomShortcode = 'D' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const fakePermalink = `https://www.instagram.com/p/${randomShortcode}/`;

    return {
      success: true,
      externalPostId: mediaId,
      externalUrl: fakePermalink,
      rawResponse: {
        id: mediaId,
        container_id: containerId,
        status: 'published',
        permalink: fakePermalink,
        media_type: media?.file_type?.startsWith('video') ? 'REELS' : 'IMAGE',
        caption: caption,
        mode: 'mock',
        published_at: new Date().toISOString()
      }
    };
  }

  /**
   * Real Instagram Graph API container flow
   * Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing/
   */
  private async publishReal(caption: string, media?: any, account?: any): Promise<PublishResult> {
    if (!account || !account.encrypted_access_token) {
      return {
        success: false,
        rawResponse: { error: 'No connected Instagram account found' },
        error: 'Instagram account is not connected.'
      };
    }

    if (!media || !media.file_url) {
      return {
        success: false,
        rawResponse: { error: 'Instagram requires a media file URL.' },
        error: 'Instagram posts require an image or video.'
      };
    }

    const token = decryptToken(account.encrypted_access_token);
    const igUserId = account.external_account_id;
    const isVideo = media.file_type.startsWith('video/');

    try {
      // Step 1: Create media container
      const containerParams: Record<string, string> = {
        access_token: token,
        caption: caption
      };

      const absoluteMediaUrl = StorageService.getAbsolutePublicUrl(media.file_url);

      if (isVideo) {
        containerParams.media_type = 'REELS';
        containerParams.video_url = absoluteMediaUrl;
      } else {
        containerParams.image_url = absoluteMediaUrl;
      }

      const createRes = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, null, {
        params: containerParams
      });

      const containerId = createRes.data.id;
      if (!containerId) {
        throw new Error('Failed to retrieve Instagram media container ID.');
      }

      // Step 2: Poll container status until FINISHED or ERROR
      let status = 'IN_PROGRESS';
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts && (status === 'IN_PROGRESS' || status === 'STARTED')) {
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
        const statusRes = await axios.get(`https://graph.facebook.com/v19.0/${containerId}`, {
          params: { fields: 'status_code', access_token: token }
        });
        status = statusRes.data.status_code;
        if (status === 'FINISHED') break;
        if (status === 'ERROR' || status === 'EXPIRED') {
          throw new Error(`Media container processing failed with status: ${status}`);
        }
      }

      // Step 3: Publish container
      const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, null, {
        params: {
          creation_id: containerId,
          access_token: token
        }
      });

      const igMediaId = publishRes.data.id;

      // Fetch permalink or profile fallback
      const handle = account?.account_name?.replace('@', '') || 'syncra.ai_';
      let permalink = `https://www.instagram.com/${handle}/`;
      try {
        const infoRes = await axios.get(`https://graph.facebook.com/v19.0/${igMediaId}`, {
          params: { fields: 'permalink', access_token: token }
        });
        if (infoRes.data?.permalink) {
          permalink = infoRes.data.permalink;
        }
      } catch (err) {
        // Fallback to profile URL
      }

      return {
        success: true,
        externalPostId: igMediaId,
        externalUrl: permalink,
        rawResponse: publishRes.data
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'Instagram API Error';
      return {
        success: false,
        rawResponse: err.response?.data || { message: err.message },
        error: errorMsg
      };
    }
  }
}

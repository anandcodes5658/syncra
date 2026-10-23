import axios from 'axios';
import fs from 'fs';
import { BasePublisher, PublishContext, PublishResult } from './BasePublisher.js';
import { config } from '../../config/env.js';
import { decryptToken, encryptToken } from '../encryption.js';
import { StorageService } from '../storage.js';
import { db } from '../../db.js';

export class YouTubePublisher extends BasePublisher {
  platformName = 'youtube';

  async publish(context: PublishContext): Promise<PublishResult> {
    const { draft, target, media, account } = context;

    if (config.features.enableYouTubeReal) {
      return this.publishReal(target, draft, media, account);
    } else {
      return this.publishMock(target, draft, media, account);
    }
  }

  /**
   * Automatically refreshes expired Google OAuth 2.0 access token using refresh_token
   */
  private async refreshAccessToken(account: any): Promise<string | null> {
    if (!account.encrypted_refresh_token) {
      console.warn('[YouTubePublisher] No refresh token found on YouTube account record.');
      return null;
    }

    try {
      const refreshToken = decryptToken(account.encrypted_refresh_token);
      const res = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const newAccessToken = res.data?.access_token;
      if (newAccessToken) {
        account.encrypted_access_token = encryptToken(newAccessToken);
        await db.saveConnectedAccount(account);
        console.log('[YouTubePublisher] Successfully refreshed Google/YouTube access token!');
        return newAccessToken;
      }
    } catch (err: any) {
      console.error('[YouTubePublisher] Error refreshing Google token:', err.response?.data || err.message);
    }
    return null;
  }

  /**
   * Mock YouTube publishing flow
   */
  private async publishMock(target: any, draft: any, media?: any, account?: any): Promise<PublishResult> {
    // 1. Simulate resumable upload initiation & byte stream chunks
    await new Promise((resolve) => setTimeout(resolve, 1600));

    // Realistic YouTube 11-char ID
    const sampleIds = ['dQw4w9WgXcQ', 'M7lc1UVf-VE', 'kXYiU_JCYtU', '9bZkp7q19f0', 'kJQP7kiw5Fk'];
    const videoId = sampleIds[Math.floor(Math.random() * sampleIds.length)];
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      success: true,
      externalPostId: videoId,
      externalUrl: watchUrl,
      rawResponse: {
        kind: 'youtube#video',
        id: videoId,
        snippet: {
          title: target.title || 'Syncra Social Video',
          description: target.description || target.caption || draft.master_caption,
          tags: ['Syncra', 'Automation', 'Tech'],
          categoryId: '28',
          publishedAt: new Date().toISOString()
        },
        status: {
          privacyStatus: target.privacy || 'public',
          uploadStatus: 'uploaded'
        },
        mode: 'mock'
      }
    };
  }

  /**
   * Real YouTube Data API v3 resumable upload flow
   * Docs: https://developers.google.com/youtube/v3/guides/uploading_a_video
   */
  private async publishReal(target: any, draft: any, media?: any, account?: any): Promise<PublishResult> {
    if (!account || !account.encrypted_access_token) {
      return {
        success: false,
        rawResponse: { error: 'YouTube account not connected.' },
        error: 'YouTube account is not connected.'
      };
    }

    if (!media || !media.file_type.startsWith('video/')) {
      return {
        success: false,
        rawResponse: { error: 'YouTube requires a valid video file.' },
        error: 'YouTube requires a video file (MP4, MOV).'
      };
    }

    let token = decryptToken(account.encrypted_access_token);
    const title = target.title || 'Syncra Update';
    const description = target.description || target.caption || draft.master_caption;
    const privacy = target.privacy || 'public';

    try {
      // Step 1: Initiate Resumable Upload Session
      const metadata = {
        snippet: {
          title: title.substring(0, 100),
          description: description,
          categoryId: '22', // People & Blogs
          tags: ['syncra', 'update']
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false
        }
      };

      let initResponse;
      try {
        initResponse = await axios.post(
          'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
          metadata,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json; charset=UTF-8',
              'X-Upload-Content-Type': media.file_type || 'video/mp4',
              'X-Upload-Content-Length': media.file_size
            }
          }
        );
      } catch (initErr: any) {
        const isAuthError =
          initErr.response?.status === 401 ||
          initErr.response?.data?.error?.status === 'UNAUTHENTICATED' ||
          JSON.stringify(initErr.response?.data || '').includes('authentication credentials');

        if (isAuthError) {
          console.log('[YouTubePublisher] Detected expired Google token. Attempting automatic refresh...');
          const freshToken = await this.refreshAccessToken(account);
          if (freshToken) {
            token = freshToken;
            initResponse = await axios.post(
              'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
              metadata,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json; charset=UTF-8',
                  'X-Upload-Content-Type': media.file_type || 'video/mp4',
                  'X-Upload-Content-Length': media.file_size
                }
              }
            );
          } else {
            return {
              success: false,
              rawResponse: initErr.response?.data || { message: initErr.message },
              error: 'YouTube Google access token expired. Click "Reconnect Token" under YouTube in the Accounts tab to re-authorize.'
            };
          }
        } else {
          throw initErr;
        }
      }

      const uploadUrl = initResponse.headers.location;
      if (!uploadUrl) {
        throw new Error('Could not obtain YouTube resumable upload URL.');
      }

      // Step 2: Stream/Upload video file bytes
      const localFilePath = StorageService.getLocalFilePath(media.file_url);
      let uploadResultData: any;

      if (fs.existsSync(localFilePath)) {
        const fileStream = fs.createReadStream(localFilePath);
        const uploadRes = await axios.put(uploadUrl, fileStream, {
          headers: {
            'Content-Type': media.file_type || 'video/mp4',
            'Content-Length': media.file_size
          }
        });
        uploadResultData = uploadRes.data;
      } else {
        // Stream from absolute public URL
        const streamRes = await axios.get(StorageService.getAbsolutePublicUrl(media.file_url), {
          responseType: 'stream'
        });
        const uploadRes = await axios.put(uploadUrl, streamRes.data, {
          headers: {
            'Content-Type': media.file_type || 'video/mp4',
            'Content-Length': media.file_size
          }
        });
        uploadResultData = uploadRes.data;
      }

      const videoId = uploadResultData.id;
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

      return {
        success: true,
        externalPostId: videoId,
        externalUrl: watchUrl,
        rawResponse: uploadResultData
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message || 'YouTube Upload Failed';
      return {
        success: false,
        rawResponse: err.response?.data || { message: err.message },
        error: errorMsg
      };
    }
  }
}

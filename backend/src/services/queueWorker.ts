import { db, PublishJob, PostTarget, PostDraft } from '../db.js';
import { MetaFacebookPublisher } from './publishers/MetaFacebookPublisher.js';
import { InstagramPublisher } from './publishers/InstagramPublisher.js';
import { LinkedInPublisher } from './publishers/LinkedInPublisher.js';
import { YouTubePublisher } from './publishers/YouTubePublisher.js';
import { TwitterPublisher } from './publishers/TwitterPublisher.js';
import { BasePublisher } from './publishers/BasePublisher.js';

class QueueWorker {
  private publishers: Record<string, BasePublisher> = {
    facebook: new MetaFacebookPublisher(),
    instagram: new InstagramPublisher(),
    linkedin: new LinkedInPublisher(),
    youtube: new YouTubePublisher(),
    twitter: new TwitterPublisher()
  };

  private isProcessing = false;
  private queue: string[] = []; // array of job IDs

  enqueue(jobId: string) {
    this.queue.push(jobId);
    this.processNext();
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const jobId = this.queue.shift();
    if (jobId) {
      try {
        await this.executeJob(jobId);
      } catch (err) {
        console.error(`Error processing job ${jobId}:`, err);
      }
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      setTimeout(() => this.processNext(), 100);
    }
  }

  async executeJob(jobId: string): Promise<void> {
    const job = await db.getPublishJob(jobId);
    if (!job) return;

    const allTargets = await db.listPublishJobs();
    const target = (await db.getPostTargetsByDraftId('')).find(t => t.id === job.post_target_id)
      || await this.findTargetById(job.post_target_id);

    if (!target) {
      await db.updatePublishJob(jobId, {
        job_status: 'failed',
        last_error: 'Associated PostTarget record not found.'
      });
      return;
    }

    const draft = await db.getPostDraft(target.post_draft_id);
    if (!draft) {
      await db.updatePublishJob(jobId, {
        job_status: 'failed',
        last_error: 'Associated PostDraft record not found.'
      });
      return;
    }

    const media = draft.media_asset_id ? await db.getMediaAsset(draft.media_asset_id) : undefined;
    const account = await db.getConnectedAccountByPlatform(draft.user_id, target.platform);

    // Step 1: Update status to uploading
    await db.updatePublishJob(jobId, {
      job_status: 'uploading',
      attempts: (job.attempts || 0) + 1
    });
    await db.updatePostTarget(target.id, { status: 'uploading' });
    await db.updatePostDraft(draft.id, { status: 'publishing' });

    // Step 2: Publish using platform service
    const publisher = this.publishers[target.platform];
    if (!publisher) {
      await db.updatePublishJob(jobId, {
        job_status: 'failed',
        last_error: `Unsupported platform: ${target.platform}`
      });
      await db.updatePostTarget(target.id, { status: 'failed' });
      return;
    }

    try {
      const result = await publisher.publish({
        draft,
        target,
        media,
        account
      });

      if (result.success) {
        await db.updatePublishJob(jobId, {
          job_status: 'published',
          external_post_id: result.externalPostId,
          external_url: result.externalUrl,
          api_response_json: result.rawResponse,
          last_error: undefined
        });

        await db.updatePostTarget(target.id, { status: 'published' });

        await db.createAuditLog({
          user_id: draft.user_id,
          action: 'PUBLISH_SUCCESS',
          platform: target.platform,
          request_id: jobId,
          metadata_json: {
            external_post_id: result.externalPostId,
            external_url: result.externalUrl
          }
        });
      } else {
        await db.updatePublishJob(jobId, {
          job_status: 'failed',
          last_error: result.error || 'Failed to publish to platform',
          api_response_json: result.rawResponse
        });

        await db.updatePostTarget(target.id, { status: 'failed' });

        await db.createAuditLog({
          user_id: draft.user_id,
          action: 'PUBLISH_FAILED',
          platform: target.platform,
          request_id: jobId,
          metadata_json: {
            error: result.error,
            rawResponse: result.rawResponse
          }
        });
      }
    } catch (err: any) {
      await db.updatePublishJob(jobId, {
        job_status: 'failed',
        last_error: err.message || 'Unexpected worker exception',
        api_response_json: { stack: err.stack }
      });
      await db.updatePostTarget(target.id, { status: 'failed' });
    }

    // Update parent draft overall status
    await this.syncDraftStatus(draft.id);
  }

  private async findTargetById(targetId: string): Promise<PostTarget | undefined> {
    const user = await db.getDefaultUser();
    const drafts = await db.listPostDrafts(user.id);
    for (const d of drafts) {
      const targets = await db.getPostTargetsByDraftId(d.id);
      const found = targets.find(t => t.id === targetId);
      if (found) return found;
    }
    return undefined;
  }

  private async syncDraftStatus(draftId: string) {
    const targets = await db.getPostTargetsByDraftId(draftId);
    if (targets.length === 0) return;

    const hasFailed = targets.some(t => t.status === 'failed');
    const allPublished = targets.every(t => t.status === 'published');
    const isUploading = targets.some(t => t.status === 'uploading' || t.status === 'pending');

    if (allPublished) {
      await db.updatePostDraft(draftId, { status: 'published' });
    } else if (hasFailed && !isUploading) {
      const somePublished = targets.some(t => t.status === 'published');
      await db.updatePostDraft(draftId, { status: somePublished ? 'partially_failed' : 'failed' });
    } else if (isUploading) {
      await db.updatePostDraft(draftId, { status: 'publishing' });
    }
  }
}

export const queueWorker = new QueueWorker();

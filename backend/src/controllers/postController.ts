import { Request, Response } from 'express';
import { db, PostTarget } from '../db.js';
import { queueWorker } from '../services/queueWorker.js';

export async function createPostDraft(req: Request, res: Response): Promise<void> {
  try {
    const { title, master_caption, media_asset_id, platforms, scheduled_at } = req.body;
    const user = await db.getDefaultUser();

    if (!master_caption && !media_asset_id) {
      res.status(400).json({ error: 'Master caption or media asset is required.' });
      return;
    }

    const draft = await db.createPostDraft({
      user_id: user.id,
      title: title || 'Untitled Post',
      master_caption: master_caption || '',
      media_asset_id,
      status: scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: scheduled_at || undefined
    });

    const createdTargets: PostTarget[] = [];
    if (Array.isArray(platforms)) {
      for (const p of platforms) {
        const platformName = typeof p === 'string' ? p : p.platform;
        const target = await db.createPostTarget({
          post_draft_id: draft.id,
          platform: platformName,
          caption: p.caption || master_caption,
          title: p.title || title,
          description: p.description,
          privacy: p.privacy || 'public',
          status: 'pending'
        });
        createdTargets.push(target);
      }
    }

    res.status(201).json({
      success: true,
      draft,
      targets: createdTargets
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create draft' });
  }
}

export async function updatePostDraft(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { title, master_caption, targets, scheduled_at } = req.body;

    const draft = await db.getPostDraft(id);
    if (!draft) {
      res.status(404).json({ error: 'Post draft not found' });
      return;
    }

    await db.updatePostDraft(id, {
      ...(title !== undefined && { title }),
      ...(master_caption !== undefined && { master_caption }),
      ...(scheduled_at !== undefined && { scheduled_at })
    });

    if (Array.isArray(targets)) {
      for (const t of targets) {
        if (t.id) {
          await db.updatePostTarget(t.id, {
            caption: t.caption,
            title: t.title,
            description: t.description,
            privacy: t.privacy
          });
        }
      }
    }

    const updatedDraft = await db.getPostDraft(id);
    const updatedTargets = await db.getPostTargetsByDraftId(id);

    res.json({
      success: true,
      draft: updatedDraft,
      targets: updatedTargets
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update draft' });
  }
}

export async function publishPost(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const draft = await db.getPostDraft(id);
    if (!draft) {
      res.status(404).json({ error: 'Post draft not found' });
      return;
    }

    const targets = await db.getPostTargetsByDraftId(id);
    if (targets.length === 0) {
      res.status(400).json({ error: 'No target platforms selected for this draft.' });
      return;
    }

    await db.updatePostDraft(id, { status: 'publishing' });

    const createdJobs = [];
    for (const target of targets) {
      // Check if job already exists
      let job = await db.getPublishJobByTargetId(target.id);
      if (!job) {
        job = await db.createPublishJob({
          post_target_id: target.id,
          job_status: 'pending',
          attempts: 0
        });
      } else {
        // Reset for publishing attempt
        await db.updatePublishJob(job.id, {
          job_status: 'pending',
          last_error: undefined
        });
      }

      createdJobs.push(job);
      // Asynchronously process in background
      queueWorker.enqueue(job.id);
    }

    res.json({
      success: true,
      message: `Enqueued ${createdJobs.length} publishing job(s) in background`,
      draftId: id,
      jobs: createdJobs
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Publishing failed to initiate' });
  }
}

export async function getPostStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const draft = await db.getPostDraft(id);
    if (!draft) {
      res.status(404).json({ error: 'Draft not found' });
      return;
    }

    const targets = await db.getPostTargetsByDraftId(id);
    const media = draft.media_asset_id ? await db.getMediaAsset(draft.media_asset_id) : null;

    const targetStatuses = await Promise.all(
      targets.map(async (t) => {
        const job = await db.getPublishJobByTargetId(t.id);
        return {
          targetId: t.id,
          platform: t.platform,
          status: job?.job_status || t.status || 'pending',
          attempts: job?.attempts || 0,
          externalPostId: job?.external_post_id,
          externalUrl: job?.external_url,
          lastError: job?.last_error,
          rawResponse: job?.api_response_json,
          jobId: job?.id
        };
      })
    );

    let overallStatus = draft.status;
    if (targetStatuses.length > 0) {
      const allDone = targetStatuses.every(t => t.status === 'published');
      const hasFailed = targetStatuses.some(t => t.status === 'failed');
      const isPending = targetStatuses.some(t => t.status === 'pending' || t.status === 'uploading');
      if (allDone) {
        overallStatus = 'published';
        if (draft.status !== 'published') {
          await db.updatePostDraft(draft.id, { status: 'published' });
        }
      } else if (hasFailed && !isPending) {
        overallStatus = targetStatuses.some(t => t.status === 'published') ? 'partially_failed' : 'failed';
      }
    }

    res.json({
      draftId: draft.id,
      title: draft.title,
      masterCaption: draft.master_caption,
      overallStatus,
      media,
      targets: targetStatuses
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch status' });
  }
}

export async function listPosts(req: Request, res: Response): Promise<void> {
  try {
    const user = await db.getDefaultUser();
    const drafts = await db.listPostDrafts(user.id);
    const { platform, status } = req.query;

    const enriched = await Promise.all(
      drafts.map(async (d) => {
        const targets = await db.getPostTargetsByDraftId(d.id);
        const media = d.media_asset_id ? await db.getMediaAsset(d.media_asset_id) : null;
        const targetsWithJobs = await Promise.all(
          targets.map(async (t) => {
            const job = await db.getPublishJobByTargetId(t.id);
            return {
              ...t,
              job
            };
          })
        );

        let effectiveStatus = d.status;
        if (targetsWithJobs.length > 0) {
          const allDone = targetsWithJobs.every(t => t.status === 'published' || t.job?.job_status === 'published');
          const hasFailed = targetsWithJobs.some(t => t.status === 'failed' || t.job?.job_status === 'failed');
          const isPending = targetsWithJobs.some(t => 
            (t.status === 'pending' || t.status === 'uploading' || t.job?.job_status === 'pending' || t.job?.job_status === 'uploading') &&
            t.status !== 'published' && t.job?.job_status !== 'published' &&
            t.status !== 'failed' && t.job?.job_status !== 'failed'
          );
          if (allDone) {
            effectiveStatus = 'published';
            if (d.status !== 'published') {
              db.updatePostDraft(d.id, { status: 'published' }).catch(() => {});
            }
          } else if (hasFailed && !isPending) {
            const someDone = targetsWithJobs.some(t => t.status === 'published' || t.job?.job_status === 'published');
            effectiveStatus = someDone ? 'partially_failed' : 'failed';
          } else if (isPending) {
            effectiveStatus = 'publishing';
          }
        }

        return {
          ...d,
          status: effectiveStatus,
          media,
          targets: targetsWithJobs
        };
      })
    );

    let filtered = enriched;
    if (platform && typeof platform === 'string' && platform !== 'all') {
      filtered = filtered.filter(p => p.targets.some(t => t.platform === platform));
    }
    if (status && typeof status === 'string' && status !== 'all') {
      filtered = filtered.filter(p => p.status === status);
    }

    res.json({
      success: true,
      posts: filtered
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch post history' });
  }
}

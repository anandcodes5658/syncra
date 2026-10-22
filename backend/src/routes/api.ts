import { Router } from 'express';
import { uploadMiddleware, uploadMedia } from '../controllers/mediaController.js';
import {
  createPostDraft,
  updatePostDraft,
  publishPost,
  getPostStatus,
  listPosts
} from '../controllers/postController.js';
import { retryJob } from '../controllers/jobController.js';
import { OAuthController } from '../controllers/oauthController.js';
import { generateCaptions } from '../controllers/aiController.js';
import { db } from '../db.js';
import { config } from '../config/env.js';

const router = Router();

// Media
router.post('/media/upload', uploadMiddleware, uploadMedia);

// Post Drafts & Publishing
router.post('/posts/draft', createPostDraft);
router.patch('/posts/:id', updatePostDraft);
router.post('/posts/:id/publish', publishPost);
router.get('/posts/:id/status', getPostStatus);
router.get('/posts', listPosts);

// Background Jobs
router.post('/jobs/:id/retry', retryJob);

// OAuth Endpoints (Official API flows)
router.post('/oauth/meta/start', OAuthController.startMeta);
router.get('/oauth/meta/callback', OAuthController.callbackMeta);

router.post('/oauth/linkedin/start', OAuthController.startLinkedIn);
router.get('/oauth/linkedin/callback', OAuthController.callbackLinkedIn);

router.post('/oauth/google/start', OAuthController.startGoogle);
router.get('/oauth/google/callback', OAuthController.callbackGoogle);

router.post('/oauth/twitter/start', OAuthController.startTwitter);
router.get('/oauth/twitter/callback', OAuthController.callbackTwitter);

// Connected Accounts Management
router.get('/accounts', OAuthController.listAccounts);
router.post('/accounts/mock-connect', OAuthController.mockConnect);
router.delete('/accounts/:id', OAuthController.disconnectAccount);

// AI Captions
router.post('/ai/generate-captions', generateCaptions);

// Audit Logs
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await db.getAuditLogs(50);
    res.json({ success: true, logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health & System Info
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Syncra Social Auto Poster',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    features: config.features,
    storageProvider: config.storage.provider
  });
});

export default router;

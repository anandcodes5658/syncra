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
import { authMiddleware, getExpectedToken } from '../middleware/auth.js';
import { TwitterScraperService } from '../services/TwitterScraperService.js';
import { encryptToken } from '../services/encryption.js';

const router = Router();

// --- Auth Gate (Password-Protected Private Workspace) ---
router.post('/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ success: false, error: 'Password is required.' });
    return;
  }

  if (password !== config.dashboardPassword) {
    res.status(401).json({ success: false, error: 'Incorrect password. Access denied.' });
    return;
  }

  const token = getExpectedToken();
  res.json({ success: true, token });
});

router.get('/auth/check', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7)
    : (req.headers['x-syncra-key'] as string);
  const expected = getExpectedToken();

  if (token && token === expected) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// Protect all following routes with Auth Middleware
router.use(authMiddleware);

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
router.post('/accounts/twitter/session-connect', async (req, res) => {
  try {
    const { cookies, username, password, email } = req.body;
    if (!cookies && (!username || !password)) {
      res.status(400).json({
        success: false,
        error: 'Please provide either browser session cookies (auth_token & ct0) or your Twitter username and password.'
      });
      return;
    }

    const testAccount: any = {
      platform: 'twitter',
      account_name: username ? `@${username}` : '@syncra__ai',
      metadata_json: {
        cookies: cookies ? encryptToken(cookies) : undefined,
        username,
        password: password ? encryptToken(password) : undefined,
        email
      }
    };

    const authResult = await TwitterScraperService.getAuthenticatedScraper(testAccount);
    if (!authResult) {
      res.status(400).json({
        success: false,
        error: 'Could not authenticate with Twitter. Please ensure credentials or cookies are valid.'
      });
      return;
    }

    const user = await db.getDefaultUser();
    await db.saveConnectedAccount({
      user_id: user.id,
      platform: 'twitter',
      account_name: `@${authResult.username}`,
      external_account_id: authResult.username,
      encrypted_access_token: encryptToken('scraper_session_active'),
      status: 'connected',
      scopes: 'tweet.read,tweet.write,users.read,media.write',
      metadata_json: testAccount.metadata_json
    });

    res.json({
      success: true,
      accountName: `@${authResult.username}`,
      message: `Connected @${authResult.username} via automated session! Free native video and image uploads are active.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Session connection error' });
  }
});

router.post('/accounts/twitter/test-scraper', async (req, res) => {
  try {
    const user = await db.getDefaultUser();
    const account = await db.getConnectedAccountByPlatform(user.id, 'twitter');
    const isConfig = TwitterScraperService.isConfigured(account);

    const diagnostics = {
      isConfigured: isConfig,
      hasEnvUsername: !!(process.env.TWITTER_USERNAME || config.twitter.username),
      hasEnvPassword: !!(process.env.TWITTER_PASSWORD || config.twitter.password),
      hasEnvEmail: !!(process.env.TWITTER_EMAIL || config.twitter.email),
      hasEnvCookies: !!(process.env.TWITTER_COOKIES || config.twitter.cookies),
      accountHasMetadata: !!account?.metadata_json,
      accountAuthMode: account?.metadata_json?.auth_mode || null
    };

    if (!isConfig) {
      res.json({
        success: false,
        diagnostics,
        message: 'No Twitter session cookies or username/password found in Render environment or database.'
      });
      return;
    }

    const authResult = await TwitterScraperService.getAuthenticatedScraper(account);
    if (!authResult) {
      res.json({
        success: false,
        diagnostics,
        message: 'Scraper attempted authentication but could not log in. Check credentials or use cookies.'
      });
      return;
    }

    res.json({
      success: true,
      diagnostics,
      username: authResult.username,
      message: `Twitter scraper successfully verified session as @${authResult.username}!`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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

// Database Inspection
router.get('/database/inspect', async (req, res) => {
  try {
    const raw = await db.getRawStore();
    res.json({
      success: true,
      engine: db.isUsingPostgres() ? 'PostgreSQL' : 'JSON File Store',
      counts: {
        accounts: raw.connected_accounts.length,
        posts: raw.post_drafts.length,
        targets: raw.post_targets.length,
        jobs: raw.publish_jobs.length,
        logs: raw.audit_logs.length
      },
      data: raw
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health & System Info
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Syncra Social Auto Poster',
    version: '1.0.3',
    build: '2026-10-24-longlived-meta-native-twitter-v3',
    timestamp: new Date().toISOString(),
    features: config.features,
    storageProvider: config.storage.provider,
    twitterDiagnostics: {
      hasTwitterCookiesEnv: !!(process.env.TWITTER_COOKIES || config.twitter.cookies),
      hasTwitterUsernameEnv: !!(process.env.TWITTER_USERNAME || config.twitter.username),
      hasTwitterPasswordEnv: !!(process.env.TWITTER_PASSWORD || config.twitter.password),
      hasTwitterEmailEnv: !!(process.env.TWITTER_EMAIL || config.twitter.email),
      enableTwitterReal: config.features.enableTwitterReal
    }
  });
});

export default router;

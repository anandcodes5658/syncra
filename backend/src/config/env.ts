import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory or root
dotenv.config();

const defaultBaseUrl = process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL || 'http://localhost:5000';
const defaultFrontendUrl = process.env.RENDER_EXTERNAL_URL || process.env.FRONTEND_URL || 'http://localhost:5173';

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  appBaseUrl: defaultBaseUrl,
  frontendUrl: defaultFrontendUrl,
  databaseUrl: process.env.DATABASE_URL || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', // 32 bytes hex default
  dashboardPassword: process.env.DASHBOARD_PASSWORD || 'Syncra@2026',

  // OAuth Meta / Facebook / Instagram
  meta: {
    appId: process.env.META_APP_ID || '',
    appSecret: process.env.META_APP_SECRET || '',
    redirectUri: process.env.META_REDIRECT_URI || `${defaultBaseUrl}/api/oauth/meta/callback`,
  },

  // OAuth LinkedIn
  linkedin: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.LINKEDIN_REDIRECT_URI || `${defaultBaseUrl}/api/oauth/linkedin/callback`,
  },

  // OAuth Google / YouTube
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${defaultBaseUrl}/api/oauth/google/callback`,
  },

  // OAuth Twitter / X (API v2)
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: process.env.TWITTER_REDIRECT_URI || `${defaultBaseUrl}/api/oauth/twitter/callback`,
  },

  // Feature Flags
  features: {
    enableFacebookReal: process.env.ENABLE_FACEBOOK_REAL === 'true',
    enableInstagramReal: process.env.ENABLE_INSTAGRAM_REAL === 'true',
    enableLinkedInReal: process.env.ENABLE_LINKEDIN_REAL === 'true',
    enableYouTubeReal: process.env.ENABLE_YOUTUBE_REAL === 'true',
    enableTwitterReal: process.env.ENABLE_TWITTER_REAL === 'true',
  },

  // Storage
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local',
    bucket: process.env.STORAGE_BUCKET || 'social-media-assets',
    uploadDir: path.resolve(process.cwd(), 'uploads'),
  },

  // AI captions
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
  }
};

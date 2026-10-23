import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env.js';
import { db } from '../db.js';
import { encryptToken } from '../services/encryption.js';

function getRedirectUri(req: Request, configured: string | undefined, defaultPath: string): string {
  if (configured && !configured.includes('localhost') && !configured.includes('127.0.0.1')) {
    return configured;
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}${defaultPath}`;
}

function getFrontendBaseUrl(req: Request): string {
  if (config.frontendUrl && !config.frontendUrl.includes('localhost') && !config.frontendUrl.includes('127.0.0.1')) {
    return config.frontendUrl.replace(/\/$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = req.get('host');
  return `${proto}://${host}`;
}

export class OAuthController {
  // --- Meta (Facebook & Instagram) ---
  static async startMeta(req: Request, res: Response): Promise<void> {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish'
    ].join(',');

    const redirectUri = getRedirectUri(req, config.meta.redirectUri, '/api/oauth/meta/callback');

    // auth_type=rerequest forces Meta to re-prompt for Page and Instagram selection
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${config.meta.appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes}&response_type=code&auth_type=rerequest`;

    res.json({
      authUrl,
      configured: !!config.meta.appId,
      message: config.meta.appId ? 'Redirect user to authUrl' : 'Meta App ID not configured in .env'
    });
  }

  static async callbackMeta(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;
    const frontendBase = getFrontendBaseUrl(req);
    const redirectUri = getRedirectUri(req, config.meta.redirectUri, '/api/oauth/meta/callback');

    if (error) {
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code) {
      res.redirect(`${frontendBase}/connect-accounts?error=No_code_received`);
      return;
    }

    try {
      // Exchange code for user access token
      const tokenRes = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: config.meta.appId,
          client_secret: config.meta.appSecret,
          redirect_uri: redirectUri,
          code
        }
      });

      const accessToken = tokenRes.data.access_token;

      // Fetch user profile
      const meRes = await axios.get(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`);
      const user = await db.getDefaultUser();

      // Fetch Facebook Pages managed by user
      let pages: any[] = [];
      try {
        const accountsRes = await axios.get(
          `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${accessToken}`
        );
        pages = accountsRes.data.data || [];
        console.log(`Discovered ${pages.length} Meta Facebook Pages for user ${meRes.data.name}`);
      } catch (err: any) {
        console.warn('Failed to fetch /me/accounts from Meta:', err.response?.data || err.message);
      }

      // Check New Page Experience (NPE) context where /me might directly be the Page
      if (pages.length === 0) {
        try {
          const directPageRes = await axios.get(
            `https://graph.facebook.com/v19.0/me?fields=id,name,instagram_business_account{id,username,name}&access_token=${accessToken}`
          );
          if (directPageRes.data?.instagram_business_account) {
            console.log('User logged in with Page profile context in NPE:', directPageRes.data);
            pages.push({
              id: directPageRes.data.id,
              name: directPageRes.data.name,
              access_token: accessToken,
              instagram_business_account: directPageRes.data.instagram_business_account
            });
          }
        } catch (e) {
          // ignore
        }
      }

      // Store Facebook Page (Meta Graph API requires a Facebook Page to publish)
      if (pages.length === 0) {
        res.redirect(
          `${frontendBase}/connect-accounts?error=${encodeURIComponent(
            'No Facebook Page found. When the Facebook dialog opens, please ensure you check the box next to your "Syncra Ai" Page and linked Instagram account.'
          )}`
        );
        return;
      }

      const primaryPage = pages[0];
      await db.saveConnectedAccount({
        user_id: user.id,
        platform: 'facebook',
        account_name: primaryPage.name || 'Facebook Page',
        external_account_id: primaryPage.id,
        encrypted_access_token: encryptToken(primaryPage.access_token || accessToken),
        status: 'connected',
        scopes: 'pages_manage_posts,pages_read_engagement,pages_show_list'
      });

      // Check for connected Instagram Business accounts linked to user's pages
      let foundIg = false;
      for (const p of pages) {
        if (p.instagram_business_account?.id) {
          foundIg = true;
          const igId = p.instagram_business_account.id;
          const igUsername = p.instagram_business_account.username || 'syncra.ai_';
          await db.saveConnectedAccount({
            user_id: user.id,
            platform: 'instagram',
            account_name: `@${igUsername}`,
            external_account_id: igId,
            encrypted_access_token: encryptToken(p.access_token || accessToken),
            status: 'connected',
            scopes: 'instagram_content_publish,instagram_basic'
          });
          console.log(`Connected Instagram account @${igUsername} (ID: ${igId})`);
          break;
        }
      }

      if (!foundIg) {
        console.log('No linked Instagram Business account found on discovered Facebook pages.');
      }

      res.redirect(`${frontendBase}/connect-accounts?success=meta_connected`);
    } catch (err: any) {
      console.error('Meta OAuth callback error:', err.response?.data || err.message);
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(err.message)}`);
    }
  }

  // --- LinkedIn ---
  static async startLinkedIn(req: Request, res: Response): Promise<void> {
    const scopes = encodeURIComponent('w_member_social openid profile email');
    const redirectUri = getRedirectUri(req, config.linkedin.redirectUri, '/api/oauth/linkedin/callback');
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.linkedin.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes}&state=syncra_state`;

    res.json({
      authUrl,
      configured: !!config.linkedin.clientId,
      message: config.linkedin.clientId ? 'Redirect user to authUrl' : 'LinkedIn Client ID not configured in .env'
    });
  }

  static async callbackLinkedIn(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;
    const frontendBase = getFrontendBaseUrl(req);
    const redirectUri = getRedirectUri(req, config.linkedin.redirectUri, '/api/oauth/linkedin/callback');

    if (error) {
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(String(error))}`);
      return;
    }

    try {
      const tokenRes = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: String(code),
          client_id: config.linkedin.clientId,
          client_secret: config.linkedin.clientSecret,
          redirect_uri: redirectUri
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      const accessToken = tokenRes.data.access_token;
      // Get member info via openid userinfo
      const userInfoRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const user = await db.getDefaultUser();
      await db.saveConnectedAccount({
        user_id: user.id,
        platform: 'linkedin',
        account_name: userInfoRes.data.name || 'LinkedIn User',
        external_account_id: userInfoRes.data.sub,
        encrypted_access_token: encryptToken(accessToken),
        status: 'connected',
        scopes: 'w_member_social,openid,profile'
      });

      res.redirect(`${frontendBase}/connect-accounts?success=linkedin_connected`);
    } catch (err: any) {
      console.error('LinkedIn OAuth callback error:', err.response?.data || err.message);
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(err.message)}`);
    }
  }

  // --- Google / YouTube ---
  static async startGoogle(req: Request, res: Response): Promise<void> {
    const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly');
    const redirectUri = getRedirectUri(req, config.google.redirectUri, '/api/oauth/google/callback');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.google.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

    res.json({
      authUrl,
      configured: !!config.google.clientId,
      message: config.google.clientId ? 'Redirect user to authUrl' : 'Google Client ID not configured in .env'
    });
  }

  static async callbackGoogle(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;
    const frontendBase = getFrontendBaseUrl(req);
    const redirectUri = getRedirectUri(req, config.google.redirectUri, '/api/oauth/google/callback');

    if (error) {
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(String(error))}`);
      return;
    }

    try {
      const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });

      const { access_token, refresh_token } = tokenRes.data;
      const user = await db.getDefaultUser();

      // Retrieve channel name
      let channelName = 'YouTube Channel';
      let channelId = 'channel_default';
      try {
        const channelRes = await axios.get('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        if (channelRes.data.items?.[0]) {
          channelName = channelRes.data.items[0].snippet.title;
          channelId = channelRes.data.items[0].id;
        }
      } catch (e) {
        // Fallback
      }

      await db.saveConnectedAccount({
        user_id: user.id,
        platform: 'youtube',
        account_name: channelName,
        external_account_id: channelId,
        encrypted_access_token: encryptToken(access_token),
        encrypted_refresh_token: refresh_token ? encryptToken(refresh_token) : undefined,
        status: 'connected',
        scopes: 'youtube.upload'
      });

      res.redirect(`${frontendBase}/connect-accounts?success=youtube_connected`);
    } catch (err: any) {
      console.error('Google OAuth callback error:', err.response?.data || err.message);
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(err.message)}`);
    }
  }

  // --- Twitter / X ---
  static async startTwitter(req: Request, res: Response): Promise<void> {
    const scopes = encodeURIComponent('tweet.read tweet.write users.read offline.access');
    const redirectUri = getRedirectUri(req, config.twitter.redirectUri, '/api/oauth/twitter/callback');
    const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${config.twitter.clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scopes}&state=syncra_state&code_challenge=challenge&code_challenge_method=plain`;

    res.json({
      authUrl,
      configured: !!config.twitter.clientId,
      message: config.twitter.clientId ? 'Redirect user to authUrl' : 'Twitter Client ID not configured in .env'
    });
  }

  static async callbackTwitter(req: Request, res: Response): Promise<void> {
    const { code, error } = req.query;
    const frontendBase = getFrontendBaseUrl(req);
    const redirectUri = getRedirectUri(req, config.twitter.redirectUri, '/api/oauth/twitter/callback');

    if (error) {
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(String(error))}`);
      return;
    }

    try {
      const basicAuth = Buffer.from(`${config.twitter.clientId}:${config.twitter.clientSecret}`).toString('base64');
      const tokenRes = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        new URLSearchParams({
          code: String(code),
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge'
        }).toString(),
        {
          headers: {
            Authorization: `Basic ${basicAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token } = tokenRes.data;

      // Get user profile
      const userRes = await axios.get('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      const user = await db.getDefaultUser();
      const twitterHandle = userRes.data?.data?.username ? `@${userRes.data.data.username}` : '@syncra';
      const twitterId = userRes.data?.data?.id || 'tw_default';

      await db.saveConnectedAccount({
        user_id: user.id,
        platform: 'twitter',
        account_name: twitterHandle,
        external_account_id: twitterId,
        encrypted_access_token: encryptToken(access_token),
        encrypted_refresh_token: refresh_token ? encryptToken(refresh_token) : undefined,
        status: 'connected',
        scopes: 'tweet.read,tweet.write,users.read'
      });

      res.redirect(`${frontendBase}/connect-accounts?success=twitter_connected`);
    } catch (err: any) {
      console.error('Twitter OAuth callback error:', err.response?.data || err.message);
      res.redirect(`${frontendBase}/connect-accounts?error=${encodeURIComponent(err.message)}`);
    }
  }

  // --- Account Management Endpoints ---
  static async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const user = await db.getDefaultUser();
      const accounts = await db.getConnectedAccounts(user.id);

      // Return sanitized accounts (masking secret tokens)
      const sanitized = accounts.map(a => ({
        id: a.id,
        platform: a.platform,
        account_name: a.account_name,
        external_account_id: a.external_account_id,
        scopes: a.scopes,
        status: a.status,
        expires_at: a.expires_at,
        hasAccessToken: !!a.encrypted_access_token
      }));

      res.json({
        success: true,
        accounts: sanitized
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async mockConnect(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.body;
      const validPlatforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'twitter'];
      if (!validPlatforms.includes(platform)) {
        res.status(400).json({ error: `Platform must be one of: ${validPlatforms.join(', ')}` });
        return;
      }

      const user = await db.getDefaultUser();
      const mockProfiles: Record<string, { name: string; externalId: string; scopes: string }> = {
        facebook: {
          name: 'Syncra Official Page',
          externalId: '1092837465928',
          scopes: 'pages_show_list,pages_manage_posts,publish_video'
        },
        instagram: {
          name: '@syncra.io',
          externalId: '178414009283746',
          scopes: 'instagram_basic,instagram_content_publish'
        },
        linkedin: {
          name: 'Syncra Tech (Personal)',
          externalId: 'person_syncra_829374',
          scopes: 'w_member_social,openid,profile'
        },
        youtube: {
          name: 'Syncra Studios Channel',
          externalId: 'UC9x_SyncraChannel',
          scopes: 'youtube.upload,youtube.readonly'
        },
        twitter: {
          name: '@syncra',
          externalId: '178294820194820194',
          scopes: 'tweet.read,tweet.write,offline.access'
        }
      };

      const profile = mockProfiles[platform];
      const account = await db.saveConnectedAccount({
        user_id: user.id,
        platform: platform as any,
        account_name: profile.name,
        external_account_id: profile.externalId,
        encrypted_access_token: encryptToken(`mock_token_${platform}_${Date.now()}`),
        status: 'connected',
        scopes: profile.scopes
      });

      res.json({
        success: true,
        message: `Successfully connected mock ${platform} account for instant MVP testing.`,
        account: {
          id: account.id,
          platform: account.platform,
          account_name: account.account_name,
          status: account.status,
          scopes: account.scopes
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  static async disconnectAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await db.deleteConnectedAccount(id);
      res.json({
        success,
        message: success ? 'Account disconnected successfully.' : 'Account not found.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}

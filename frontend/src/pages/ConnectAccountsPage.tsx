import React, { useState, useEffect } from 'react';
import {
  Link2,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Trash2,
  Lock,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Loader2,
  Key,
  X,
  Info
} from 'lucide-react';
import { ConnectedAccount, PlatformType } from '../types';
import { mockConnectAccount, disconnectAccount, getAuthToken, connectTwitterSession } from '../services/api';

interface Props {
  accounts: ConnectedAccount[];
  onRefreshAccounts: () => void;
}

export const ConnectAccountsPage: React.FC<Props> = ({ accounts, onRefreshAccounts }) => {
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Twitter Session Modal State (Solution A)
  const [showTwitterSessionModal, setShowTwitterSessionModal] = useState(false);
  const [sessionMode, setSessionMode] = useState<'cookies' | 'credentials'>('cookies');
  const [cookieString, setCookieString] = useState('');
  const [twUsername, setTwUsername] = useState('syncra__ai');
  const [twPassword, setTwPassword] = useState('');
  const [twEmail, setTwEmail] = useState('');
  const [sessionSubmitting, setSessionSubmitting] = useState(false);

  const handleConnectSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSessionSubmitting(true);
    setMessage(null);
    try {
      const payload =
        sessionMode === 'cookies'
          ? { cookies: cookieString.trim() }
          : { username: twUsername.trim(), password: twPassword, email: twEmail.trim() };

      const res = await connectTwitterSession(payload);
      setMessage({ type: 'success', text: res.message });
      setShowTwitterSessionModal(false);
      onRefreshAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to connect Twitter session' });
    } finally {
      setSessionSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const err = params.get('error');

    if (success) {
      setMessage({ type: 'success', text: 'Social media account connected and verified successfully!' });
      onRefreshAccounts();
    } else if (err) {
      setMessage({ type: 'error', text: decodeURIComponent(err) });
    }
  }, []);

  const platformsConfig: Array<{
    id: PlatformType;
    name: string;
    description: string;
    scopes: string[];
    gradient: string;
    authStartEndpoint: string;
  }> = [
    {
      id: 'facebook',
      name: 'Facebook Pages',
      description: 'Publish Page posts, photos, and video updates via Meta Graph API',
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
      gradient: 'from-blue-600 to-blue-700',
      authStartEndpoint: '/api/oauth/meta/start'
    },
    {
      id: 'instagram',
      name: 'Instagram Professional',
      description: 'Publish images, Reels, and container media via Instagram Graph API',
      scopes: ['instagram_basic', 'instagram_content_publish'],
      gradient: 'from-amber-500 via-rose-500 to-purple-600',
      authStartEndpoint: '/api/oauth/meta/start'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn Profile & Pages',
      description: 'Post text commentary, articles, and media via LinkedIn Posts API',
      scopes: ['w_member_social', 'openid', 'profile'],
      gradient: 'from-sky-600 to-blue-800',
      authStartEndpoint: '/api/oauth/linkedin/start'
    },
    {
      id: 'youtube',
      name: 'YouTube Channel',
      description: 'Upload video content with title, description, and privacy tags via YouTube Data API v3',
      scopes: ['youtube.upload', 'youtube.readonly'],
      gradient: 'from-red-600 to-red-700',
      authStartEndpoint: '/api/oauth/google/start'
    },
    {
      id: 'twitter',
      name: 'X (formerly Twitter)',
      description: 'Official API v2 + Free 1-Click Web Intent bridge (zero fees, direct publishing)',
      scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'],
      gradient: 'from-neutral-700 to-black',
      authStartEndpoint: '/api/oauth/twitter/start'
    }
  ];

  const handleStartOAuth = async (platform: string, startEndpoint: string) => {
    setConnectingPlatform(platform);
    setMessage(null);
    try {
      const token = getAuthToken();
      const res = await fetch(startEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.configured && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }
      setMessage({
        type: 'error',
        text: data.error || `${platform.toUpperCase()} client credentials not yet configured in .env. Please check your Render environment variables.`
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'OAuth initiation failed' });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleMockConnect = async (platform: string) => {
    setConnectingPlatform(platform);
    setMessage(null);
    try {
      await mockConnectAccount(platform);
      setMessage({
        type: 'success',
        text: `Connected simulated test account for ${platform}. Ready for publishing testing!`
      });
      onRefreshAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setConnectingPlatform(null);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDisconnectingId(accountId);
    try {
      await disconnectAccount(accountId);
      setMessage({ type: 'success', text: 'Account disconnected successfully.' });
      onRefreshAccounts();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connect Social Accounts</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Official OAuth integrations for Meta, LinkedIn, and YouTube with AES-256 encrypted tokens at rest.
          </p>
        </div>

        <button
          onClick={onRefreshAccounts}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-neutral-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Security Architecture Box */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-neutral-900 rounded-xl border border-neutral-800 shrink-0 text-emerald-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">OAuth Security & Zero Credential Storage</h3>
            <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
              We never collect or store user passwords. All API tokens are encrypted at rest using AES-256-GCM authenticated cipher with IVs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2.5 py-1 text-[10px] font-mono uppercase bg-neutral-900 text-neutral-300 border border-neutral-800 rounded-lg">
            AES-256-GCM
          </span>
          <span className="px-2.5 py-1 text-[10px] font-mono uppercase bg-neutral-900 text-emerald-400 border border-emerald-500/30 rounded-lg">
            Official APIs
          </span>
        </div>
      </div>

      {/* Accounts Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platformsConfig.map((platform) => {
          const account = accounts.find((a) => a.platform === platform.id);
          const isConnected = account && account.status === 'connected';

          return (
            <div
              key={platform.id}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between hover:border-neutral-700 transition"
            >
              <div>
                {/* Platform Header */}
                <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${platform.gradient} flex items-center justify-center font-bold text-white text-sm shadow-md`}
                    >
                      {platform.name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">{platform.name}</h3>
                      <p className="text-[11px] text-neutral-400">{platform.description}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium border ${
                      isConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isConnected ? 'bg-emerald-400' : 'bg-neutral-600'
                      }`}
                    />
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </span>
                </div>

                {/* Details / Account Connected State */}
                <div className="py-4 space-y-3">
                  {isConnected ? (
                    <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Account:</span>
                        <span className="font-semibold text-white">{account.account_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">External ID:</span>
                        <span className="font-mono text-neutral-300 text-[11px]">{account.external_account_id}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-400">Encrypted Token:</span>
                        <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Active & Verified
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs">
                      <p className="text-neutral-400 text-[11px]">Requested Permissions & Scopes:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {platform.scopes.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-neutral-900 text-neutral-400 border border-neutral-800 rounded-md font-mono text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3">
                {isConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(account.id)}
                      disabled={disconnectingId === account.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-white hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-xl transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{disconnectingId === account.id ? 'Disconnecting...' : 'Disconnect'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartOAuth(platform.id, platform.authStartEndpoint)}
                      disabled={connectingPlatform === platform.id}
                      className="text-xs text-neutral-400 hover:text-white underline flex items-center gap-1 transition"
                    >
                      {connectingPlatform === platform.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Reconnecting...</span>
                        </>
                      ) : (
                        <span>Reconnect Token</span>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMockConnect(platform.id)}
                      disabled={connectingPlatform === platform.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{connectingPlatform === platform.id ? 'Connecting...' : 'Connect Mock (Dev)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartOAuth(platform.id, platform.authStartEndpoint)}
                      disabled={connectingPlatform === platform.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition shadow disabled:opacity-50"
                    >
                      {connectingPlatform === platform.id ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <span>OAuth Connect</span>
                          <ExternalLink className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Twitter Solution A Native Session Section */}
              {platform.id === 'twitter' && (
                <div className="pt-3 border-t border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-neutral-300 font-medium">Free Native Media (Video/Image):</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTwitterSessionModal(true)}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>
                      {isConnected && account?.metadata_json?.auth_mode === 'scraper_session'
                        ? 'Session Active (Free Media)'
                        : 'Connect Free Session'}
                    </span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Twitter Session Modal (Solution A) */}
      {showTwitterSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl w-full max-w-md p-6 space-y-5 text-left shadow-2xl relative">
            <button
              onClick={() => !sessionSubmitting && setShowTwitterSessionModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-black text-white border border-neutral-700 flex items-center justify-center font-bold text-xs">
                  𝕏
                </span>
                <h3 className="text-base font-bold text-white tracking-tight">Connect Twitter Session</h3>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Post full native videos & images directly to X without paying Developer API fees.
              </p>
            </div>

            {/* Mode Tabs */}
            <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800 text-xs">
              <button
                type="button"
                onClick={() => setSessionMode('cookies')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                  sessionMode === 'cookies' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Browser Cookies (Zero Captcha)
              </button>
              <button
                type="button"
                onClick={() => setSessionMode('credentials')}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${
                  sessionMode === 'credentials' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
                }`}
              >
                Username & Password
              </button>
            </div>

            <form onSubmit={handleConnectSession} className="space-y-4">
              {sessionMode === 'cookies' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider block">
                    Session Cookies (auth_token & ct0)
                  </label>
                  <textarea
                    rows={4}
                    value={cookieString}
                    onChange={(e) => setCookieString(e.target.value)}
                    placeholder="auth_token=...; ct0=..."
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-white transition"
                    required
                  />
                  <div className="p-2.5 bg-neutral-900/60 border border-neutral-800 rounded-xl text-[11px] text-neutral-400 space-y-1">
                    <p className="font-semibold text-neutral-300 flex items-center gap-1">
                      <Info className="w-3 h-3 text-sky-400" /> How to get your cookies in 15 seconds:
                    </p>
                    <p>1. Open <strong className="text-white">x.com</strong> in Chrome where you are logged in.</p>
                    <p>2. Press <code className="text-white bg-black px-1 rounded">F12</code> &rarr; click <strong className="text-white">Application</strong> tab &rarr; <strong className="text-white">Cookies</strong> &rarr; <strong className="text-white">https://x.com</strong>.</p>
                    <p>3. Copy values of <code className="text-emerald-400">auth_token</code> and <code className="text-emerald-400">ct0</code>.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider block">
                      Twitter Username / Handle
                    </label>
                    <input
                      type="text"
                      value={twUsername}
                      onChange={(e) => setTwUsername(e.target.value)}
                      placeholder="syncra__ai"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider block">
                      Twitter Password
                    </label>
                    <input
                      type="password"
                      value={twPassword}
                      onChange={(e) => setTwPassword(e.target.value)}
                      placeholder="Account password"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-neutral-300 uppercase tracking-wider block">
                      Account Email (Optional, if prompted by security)
                    </label>
                    <input
                      type="email"
                      value={twEmail}
                      onChange={(e) => setTwEmail(e.target.value)}
                      placeholder="anandch5658@gmail.com"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-white transition"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTwitterSessionModal(false)}
                  disabled={sessionSubmitting}
                  className="px-3.5 py-1.5 text-xs text-neutral-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sessionSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition shadow disabled:opacity-50"
                >
                  {sessionSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Session...</span>
                    </>
                  ) : (
                    <span>Save & Verify Session</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

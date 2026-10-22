import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Save,
  Globe,
  Sliders,
  FileText,
  Database,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Database Inspector state
  const [dbInfo, setDbInfo] = useState<{
    engine: string;
    counts: { accounts: number; posts: number; targets: number; jobs: number; logs: number };
    data: any;
  } | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);
  const [showRawDb, setShowRawDb] = useState(false);

  const fetchDbInfo = async () => {
    try {
      setLoadingDb(true);
      const res = await fetch('/api/database/inspect');
      if (res.ok) {
        const json = await res.json();
        setDbInfo(json);
      }
    } catch (err) {
      console.error('Failed to inspect database:', err);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbInfo();
  }, []);

  // Settings state
  const [privacyUrl, setPrivacyUrl] = useState('https://syncra.io/privacy');
  const [termsUrl, setTermsUrl] = useState('https://syncra.io/terms');
  const [brandTone, setBrandTone] = useState('Professional & Thought Leadership');
  const [defaultHashtags, setDefaultHashtags] = useState('#Syncra, #TechInnovation, #ContentAutomation');
  const [timezone, setTimezone] = useState('UTC');

  const redirectUris = [
    { label: 'Meta (Facebook / Instagram)', uri: 'http://localhost:5000/api/oauth/meta/callback' },
    { label: 'LinkedIn OAuth', uri: 'http://localhost:5000/api/oauth/linkedin/callback' },
    { label: 'Google / YouTube OAuth', uri: 'http://localhost:5000/api/oauth/google/callback' },
    { label: 'Twitter / X OAuth 2.0', uri: 'http://localhost:5000/api/oauth/twitter/callback' }
  ];

  const appReviewChecklist = [
    {
      title: 'HTTPS Public Domain',
      desc: 'Deploy on public HTTPS domain (e.g. ngrok or Cloudflare tunnel for local development, or AWS/Vercel for production).'
    },
    {
      title: 'App Review Screencast Demo',
      desc: 'Record a crisp 2-minute demo showing: login, connecting platform account, creating post draft, and published post proof.'
    },
    {
      title: 'Privacy Policy & Data Deletion Instructions',
      desc: 'Publicly reachable privacy policy and data deletion callback URLs required by Meta and Google.'
    },
    {
      title: 'Minimal MVP Permissions',
      desc: 'Only request required scopes: pages_manage_posts, instagram_content_publish, w_member_social, youtube.upload.'
    },
    {
      title: 'Encrypted Token Storage at Rest',
      desc: 'Tokens encrypted with AES-256-GCM cipher before persisting into PostgreSQL database.'
    },
    {
      title: 'Rate Limit & Retry Backoff Handling',
      desc: 'Asynchronous queue workers with status tracking (Pending -> Uploading -> Published / Retrying).'
    }
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Platform Settings & Review</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Configure brand tone, default hashtags, OAuth redirect URIs, and App Review verification checklists.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition shadow"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{savedSuccess ? 'Settings Saved!' : 'Save Preferences'}</span>
        </button>
      </div>

      {/* Grid: App Config & Redirect URIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Brand & Automation Preferences */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Sliders className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-white">Brand & Publishing Defaults</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">Brand Voice & AI Tone</label>
              <input
                type="text"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">Default Hashtags (comma-separated)</label>
              <input
                type="text"
                value={defaultHashtags}
                onChange={(e) => setDefaultHashtags(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-white transition"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-300 block mb-1">Scheduled Posts Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* OAuth Redirect URIs */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-neutral-800">
            <Globe className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-semibold text-white">OAuth Redirect URIs</h3>
          </div>

          <p className="text-xs text-neutral-400">
            Add these exact redirect URIs to your Meta, LinkedIn, and Google Cloud Developer consoles:
          </p>

          <div className="space-y-3">
            {redirectUris.map((item, idx) => (
              <div key={idx} className="p-3 bg-neutral-900/70 border border-neutral-800 rounded-xl space-y-1">
                <span className="text-[11px] font-medium text-neutral-300">{item.label}</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] text-neutral-400 truncate">{item.uri}</span>
                  <button
                    onClick={() => handleCopy(item.label, item.uri)}
                    className="p-1 text-neutral-400 hover:text-white rounded transition"
                  >
                    {copiedKey === item.label ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Database & Persistence Inspector */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Database & Storage Inspector</h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
              dbInfo?.engine === 'PostgreSQL'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700'
            }`}>
              Engine: {dbInfo?.engine || 'Detecting...'}
            </span>
            <button
              onClick={fetchDbInfo}
              disabled={loadingDb}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition"
            >
              <RefreshCw className={`w-3 h-3 ${loadingDb ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Database Stats Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Posts</p>
            <p className="text-lg font-bold text-white mt-0.5">{dbInfo?.counts.posts ?? 0}</p>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Accounts</p>
            <p className="text-lg font-bold text-white mt-0.5">{dbInfo?.counts.accounts ?? 0}</p>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Platform Targets</p>
            <p className="text-lg font-bold text-white mt-0.5">{dbInfo?.counts.targets ?? 0}</p>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Queue Jobs</p>
            <p className="text-lg font-bold text-white mt-0.5">{dbInfo?.counts.jobs ?? 0}</p>
          </div>
          <div className="p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-xl col-span-2 sm:col-span-1">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Audit Logs</p>
            <p className="text-lg font-bold text-white mt-0.5">{dbInfo?.counts.logs ?? 0}</p>
          </div>
        </div>

        {/* Raw Data Toggle */}
        <div className="space-y-3">
          <button
            onClick={() => setShowRawDb(!showRawDb)}
            className="flex items-center justify-between w-full px-4 py-2.5 bg-neutral-900/70 border border-neutral-800 rounded-xl text-xs text-neutral-300 hover:text-white hover:border-neutral-700 transition"
          >
            <span className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-neutral-400" />
              {showRawDb ? 'Hide Live Database Records (JSON)' : 'View Live Database Records (JSON)'}
            </span>
            {showRawDb ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRawDb && (
            <div className="relative">
              <pre className="p-4 bg-black border border-neutral-800 rounded-xl text-[11px] font-mono text-neutral-300 max-h-72 overflow-auto leading-relaxed">
                {JSON.stringify(dbInfo?.data || {}, null, 2)}
              </pre>
              <button
                onClick={() => handleCopy('raw_db', JSON.stringify(dbInfo?.data || {}, null, 2))}
                className="absolute top-3 right-3 px-2 py-1 text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded flex items-center gap-1 transition"
              >
                {copiedKey === 'raw_db' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy JSON
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* App Review & Production Readiness Checklist */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">App Review & Production Checklist</h3>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono">
            Syncra Standard
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appReviewChecklist.map((item, idx) => (
            <div key={idx} className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-white font-medium text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{item.title}</span>
              </div>
              <p className="text-[11px] text-neutral-400 pl-5 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

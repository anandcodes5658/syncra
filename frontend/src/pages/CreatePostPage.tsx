import React, { useState } from 'react';
import { Sparkles, Calendar, Send, CheckSquare, Square, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { FileUpload } from '../components/FileUpload';
import { InstagramPreview } from '../components/PlatformPreviews/InstagramPreview';
import { FacebookPreview } from '../components/PlatformPreviews/FacebookPreview';
import { LinkedInPreview } from '../components/PlatformPreviews/LinkedInPreview';
import { YouTubePreview } from '../components/PlatformPreviews/YouTubePreview';
import { TwitterPreview } from '../components/PlatformPreviews/TwitterPreview';
import { PublishModal } from '../components/PublishModal';
import { MediaAsset, PlatformType, ConnectedAccount, PlatformCaptions } from '../types';
import { createDraft, publishDraft, generateCaptions } from '../services/api';

interface Props {
  accounts: ConnectedAccount[];
  onPublishSuccess: (draftId: string) => void;
}

export const CreatePostPage: React.FC<Props> = ({ accounts, onPublishSuccess }) => {
  const [media, setMedia] = useState<MediaAsset | null>(null);
  const [masterCaption, setMasterCaption] = useState(
    'Excited to announce our newest platform milestone at Syncra! 🚀 Automating cross-channel creator publishing with official APIs and seamless background workers.'
  );
  const [postTitle, setPostTitle] = useState('Syncra Multi-Platform Release');

  // Selected platforms
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>([
    'instagram',
    'facebook',
    'linkedin',
    'youtube',
    'twitter'
  ]);

  // Active preview tab
  const [activePlatformTab, setActivePlatformTab] = useState<PlatformType>('instagram');

  // Customized platform copies
  const [platformData, setPlatformData] = useState<PlatformCaptions>({
    instagram: {
      caption: '',
      hashtags: ['#Syncra', '#CreatorTools', '#TechStartup', '#Automation']
    },
    facebook: {
      caption: ''
    },
    linkedin: {
      commentary: '',
      hashtags: ['#Syncra', '#SaaS', '#Automation']
    },
    youtube: {
      title: 'Syncra Platform Walkthrough',
      description: '',
      tags: ['syncra', 'automation', 'posting', 'socialmedia'],
      privacy: 'public'
    },
    twitter: {
      text: '',
      hashtags: ['#Syncra', '#Tech']
    }
  });

  // Scheduling state
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');

  // AI & Publish states
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePlatform = (p: PlatformType) => {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length === 1) return; // Keep at least one
      setSelectedPlatforms(selectedPlatforms.filter(x => x !== p));
    } else {
      setSelectedPlatforms([...selectedPlatforms, p]);
    }
  };

  const handleGenerateAI = async () => {
    if (!masterCaption.trim()) return;
    setIsGeneratingAI(true);
    setError(null);
    try {
      const generated = await generateCaptions(masterCaption);
      setPlatformData(generated);
      if (generated.youtube.title) {
        setPostTitle(generated.youtube.title);
      }
    } catch (err: any) {
      setError(err.message || 'AI caption generation failed');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleConfirmPublish = async () => {
    setPublishing(true);
    setError(null);

    try {
      // 1. Prepare target inputs
      const targets = selectedPlatforms.map((p) => {
        if (p === 'instagram') {
          return {
            platform: p,
            caption: platformData.instagram.caption || masterCaption
          };
        } else if (p === 'facebook') {
          return {
            platform: p,
            caption: platformData.facebook.caption || masterCaption
          };
        } else if (p === 'linkedin') {
          return {
            platform: p,
            caption: platformData.linkedin.commentary || masterCaption
          };
        } else if (p === 'twitter') {
          return {
            platform: p,
            caption: platformData.twitter.text || masterCaption
          };
        } else {
          return {
            platform: p,
            title: platformData.youtube.title || postTitle,
            description: platformData.youtube.description || masterCaption,
            privacy: platformData.youtube.privacy
          };
        }
      });

      // 2. Create Draft in backend
      const { draftId } = await createDraft({
        title: postTitle,
        master_caption: masterCaption,
        media_asset_id: media?.id,
        platforms: targets,
        scheduled_at: isScheduling ? scheduledTime : undefined
      });

      // 3. Trigger publishing worker if not scheduled
      if (!isScheduling) {
        await publishDraft(draftId);
      }

      setIsModalOpen(false);
      onPublishSuccess(draftId);
    } catch (err: any) {
      setError(err.message || 'Failed to publish post');
    } finally {
      setPublishing(false);
    }
  };

  const platformsList: Array<{ id: PlatformType; label: string }> = [
    { id: 'instagram', label: 'Instagram' },
    { id: 'facebook', label: 'Facebook' },
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'youtube', label: 'YouTube' },
    { id: 'twitter', label: 'Twitter / X' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Create & Schedule Post</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Upload media once, customize per platform, and publish across Instagram, Facebook, LinkedIn, and YouTube.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateAI}
            disabled={isGeneratingAI || !masterCaption.trim()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-neutral-500 rounded-xl transition shadow-sm disabled:opacity-50"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>Generate Platform Captions</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Media Upload & Master Caption */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Media Upload */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              1. Upload Media
            </h2>
            <span className="text-[11px] text-neutral-500 font-mono">Image or Video</span>
          </div>
          <FileUpload media={media} onMediaUploaded={setMedia} />
        </div>

        {/* Right Column: Master Caption */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              2. Master Caption & Post Title
            </h2>
            <span className="text-[11px] text-neutral-500 font-mono">{masterCaption.length} chars</span>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder="Post title (used for YouTube and internal reference)..."
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
            />

            <textarea
              rows={5}
              value={masterCaption}
              onChange={(e) => setMasterCaption(e.target.value)}
              placeholder="Enter master caption. This can be adapted for all channels or tailored individually below..."
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
            />
          </div>
        </div>
      </div>

      {/* Step 2: Target Platforms Selection */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            3. Select Target Platforms
          </h2>
          <span className="text-[11px] text-neutral-400">
            {selectedPlatforms.length} of {platformsList.length} Selected
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {platformsList.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform.id);
            const account = accounts.find((a) => a.platform === platform.id);
            return (
              <div
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between select-none ${
                  isSelected
                    ? 'bg-neutral-900 border-white text-white'
                    : 'bg-[#0a0a0a] border-neutral-800 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-neutral-500" />
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">{platform.label}</p>
                    <p className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                      {account ? account.account_name : 'Mock Mode'}
                    </p>
                  </div>
                </div>
                <span
                  className={`w-2 h-2 rounded-full ${
                    account?.status === 'connected' ? 'bg-emerald-400' : 'bg-neutral-600'
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 3: Platform Customization & Previews */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            4. Platform Previews & Copy Customization
          </h2>
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            {selectedPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => setActivePlatformTab(p)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${
                  activePlatformTab === p
                    ? 'bg-white text-black font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Tab Content */}
        <div className="pt-2">
          {activePlatformTab === 'instagram' && (
            <InstagramPreview
              caption={platformData.instagram.caption || masterCaption}
              hashtags={platformData.instagram.hashtags}
              media={media}
              accountName={accounts.find(a => a.platform === 'instagram')?.account_name || '@syncra.ai_'}
              onCaptionChange={(caption) =>
                setPlatformData({
                  ...platformData,
                  instagram: { ...platformData.instagram, caption }
                })
              }
            />
          )}

          {activePlatformTab === 'facebook' && (
            <FacebookPreview
              caption={platformData.facebook.caption || masterCaption}
              media={media}
              accountName={accounts.find(a => a.platform === 'facebook')?.account_name || 'Syncra Official'}
              onCaptionChange={(caption) =>
                setPlatformData({
                  ...platformData,
                  facebook: { caption }
                })
              }
            />
          )}

          {activePlatformTab === 'linkedin' && (
            <LinkedInPreview
              commentary={platformData.linkedin.commentary || masterCaption}
              hashtags={platformData.linkedin.hashtags}
              media={media}
              accountName={accounts.find(a => a.platform === 'linkedin')?.account_name || 'Syncra Creator'}
              onCommentaryChange={(commentary) =>
                setPlatformData({
                  ...platformData,
                  linkedin: { ...platformData.linkedin, commentary }
                })
              }
            />
          )}

          {activePlatformTab === 'youtube' && (
            <YouTubePreview
              title={platformData.youtube.title || postTitle}
              description={platformData.youtube.description || masterCaption}
              tags={platformData.youtube.tags}
              privacy={platformData.youtube.privacy}
              media={media}
              channelName={accounts.find(a => a.platform === 'youtube')?.account_name || 'Syncra Studios'}
              onTitleChange={(title) =>
                setPlatformData({
                  ...platformData,
                  youtube: { ...platformData.youtube, title }
                })
              }
              onDescriptionChange={(description) =>
                setPlatformData({
                  ...platformData,
                  youtube: { ...platformData.youtube, description }
                })
              }
              onPrivacyChange={(privacy) =>
                setPlatformData({
                  ...platformData,
                  youtube: { ...platformData.youtube, privacy }
                })
              }
              onTagsChange={(tags) =>
                setPlatformData({
                  ...platformData,
                  youtube: { ...platformData.youtube, tags }
                })
              }
            />
          )}

          {activePlatformTab === 'twitter' && (
            <TwitterPreview
              text={platformData.twitter.text || masterCaption}
              hashtags={platformData.twitter.hashtags}
              media={media}
              accountName={accounts.find(a => a.platform === 'twitter')?.account_name || '@syncra'}
              onTextChange={(text) =>
                setPlatformData({
                  ...platformData,
                  twitter: { ...platformData.twitter, text }
                })
              }
            />
          )}
        </div>
      </div>

      {/* Step 4: Publishing Controls / Action Bar */}
      <div className="sticky bottom-6 z-30 bg-[#0d0d0d]/90 backdrop-blur-md border border-neutral-800 rounded-3xl p-4 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsScheduling(!isScheduling)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium border transition ${
              isScheduling
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isScheduling ? 'Scheduling Active' : 'Schedule for Later'}</span>
          </button>

          {isScheduling && (
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white transition"
            />
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl shadow-lg transition active:scale-95"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isScheduling ? 'Review & Schedule' : 'Post Now to All Selected'}</span>
          </button>
        </div>
      </div>

      {/* Publish Confirmation Modal */}
      <PublishModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmPublish}
        selectedPlatforms={selectedPlatforms}
        media={media}
        accounts={accounts}
        isScheduled={isScheduling}
        scheduledTime={scheduledTime}
        loading={publishing}
      />
    </div>
  );
};

import React from 'react';
import { Play, Eye, MoreVertical, Bell, ThumbsUp, ThumbsDown, Share } from 'lucide-react';
import { MediaAsset } from '../../types';
import { normalizeMediaUrl } from '../../utils/media';

interface Props {
  title: string;
  description: string;
  tags: string[];
  privacy: 'public' | 'unlisted' | 'private';
  media: MediaAsset | null;
  channelName?: string;
  onTitleChange: (val: string) => void;
  onDescriptionChange: (val: string) => void;
  onPrivacyChange: (val: 'public' | 'unlisted' | 'private') => void;
  onTagsChange: (val: string[]) => void;
}

export const YouTubePreview: React.FC<Props> = ({
  title,
  description,
  tags,
  privacy,
  media,
  channelName = 'Syncra Studios',
  onTitleChange,
  onDescriptionChange,
  onPrivacyChange,
  onTagsChange
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* YouTube Mock Card */}
      <div className="w-full max-w-md mx-auto bg-[#0f0f0f] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left">
        {/* Video Player Mock */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden border-b border-neutral-800">
          {media && media.file_type.startsWith('video/') ? (
            <video src={normalizeMediaUrl(media.file_url)} className="w-full h-full object-cover" controls playsInline />
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-6 text-neutral-500">
              <div className="w-14 h-14 rounded-full bg-red-600/90 text-white flex items-center justify-center mb-2 shadow-lg">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
              <p className="text-xs text-neutral-400">
                {media ? 'Non-video media (Video file required for YouTube)' : 'Upload a video to preview YouTube playback'}
              </p>
            </div>
          )}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 rounded text-[10px] font-mono text-white">
            03:45
          </div>
        </div>

        {/* Video Metadata */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">
              {title || 'Untitled Video - Enter Title...'}
            </h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded border border-neutral-700 shrink-0">
              {privacy}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-[11px]">
                SY
              </div>
              <div>
                <p className="font-medium text-white text-xs">{channelName}</p>
                <p className="text-[10px] text-neutral-500">12.4K subscribers</p>
              </div>
            </div>
            <button className="px-3 py-1 bg-white text-black text-xs font-semibold rounded-full hover:bg-neutral-200 transition">
              Subscribe
            </button>
          </div>

          {/* Description box */}
          <div className="p-3 bg-neutral-900/80 rounded-xl text-xs text-neutral-300 border border-neutral-800/80 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap">
            <p className="font-semibold text-neutral-200 mb-1">0 views • Published Just now</p>
            {description || 'Video description appears here...'}
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((t, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-neutral-900 text-neutral-400 rounded-md border border-neutral-800">
                  #{t.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 text-left space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-neutral-300">Video Title (max 100 chars)</label>
            <span className={`text-[11px] font-mono ${title.length > 100 ? 'text-rose-400' : 'text-neutral-500'}`}>
              {title.length} / 100
            </span>
          </div>
          <input
            type="text"
            value={title}
            maxLength={100}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. FounderLabs Social Poster Walkthrough"
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-white transition"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-neutral-300">Description</label>
            <span className="text-[11px] text-neutral-500 font-mono">{description.length} / 5,000</span>
          </div>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter YouTube description, links, and timestamps..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">Privacy Status</label>
            <select
              value={privacy}
              onChange={(e) => onPrivacyChange(e.target.value as any)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition cursor-pointer"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-neutral-300 block mb-1.5">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags.join(', ')}
              onChange={(e) => onTagsChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              placeholder="tech, ai, tutorial"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Heart, Repeat2, MessageCircle, Bookmark, Share, BadgeCheck, AlertCircle } from 'lucide-react';
import { MediaAsset } from '../../types';

interface Props {
  text: string;
  hashtags: string[];
  media: MediaAsset | null;
  accountName?: string;
  onTextChange: (val: string) => void;
}

export const TwitterPreview: React.FC<Props> = ({
  text,
  hashtags,
  media,
  accountName = '@syncra',
  onTextChange
}) => {
  const charLimit = 280;
  const charsRemaining = charLimit - text.length;
  const isOverLimit = charsRemaining < 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Twitter / X Post Card Mock */}
      <div className="w-full max-w-md mx-auto bg-black border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white text-black font-bold flex items-center justify-center text-sm shadow">
              𝕏
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white leading-tight">Syncra</span>
                <BadgeCheck className="w-4 h-4 text-sky-400 fill-sky-400/20" />
              </div>
              <p className="text-xs text-neutral-400">{accountName}</p>
            </div>
          </div>
          <span className="text-neutral-500 font-bold text-sm">𝕏</span>
        </div>

        {/* Tweet Text */}
        <div className="text-xs text-neutral-100 leading-relaxed whitespace-pre-wrap pt-1">
          {text || 'What is happening?! Type your tweet or generate with AI...'}
          {hashtags && hashtags.length > 0 && (
            <div className="mt-1.5 text-sky-400 text-xs flex flex-wrap gap-1">
              {hashtags.map((h, i) => (
                <span key={i} className="hover:underline cursor-pointer">{h}</span>
              ))}
            </div>
          )}
        </div>

        {/* Media */}
        {media && (
          <div className="relative w-full max-h-72 bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800">
            {media.file_type.startsWith('video/') ? (
              <video src={media.file_url} className="w-full h-full object-cover max-h-72" controls playsInline />
            ) : (
              <img src={media.file_url} alt="X media attachment" className="w-full h-full object-cover max-h-72" />
            )}
          </div>
        )}

        {/* Post Metadata */}
        <div className="pt-2 border-t border-neutral-900 flex items-center gap-2 text-[11px] text-neutral-500">
          <span>Just now</span>
          <span>•</span>
          <span className="text-neutral-300 font-medium">1.8K Views</span>
        </div>

        {/* Engagement Row */}
        <div className="grid grid-cols-5 py-1 text-neutral-500 text-xs border-t border-neutral-900">
          <button className="flex items-center justify-center gap-1.5 py-1.5 hover:text-sky-400 transition">
            <MessageCircle className="w-4 h-4" />
            <span className="text-[11px]">14</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-1.5 hover:text-emerald-400 transition">
            <Repeat2 className="w-4 h-4" />
            <span className="text-[11px]">38</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-1.5 hover:text-rose-400 transition">
            <Heart className="w-4 h-4" />
            <span className="text-[11px]">142</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-1.5 hover:text-sky-400 transition">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="flex items-center justify-center gap-1.5 py-1.5 hover:text-neutral-300 transition">
            <Share className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 text-left space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-white">X / Twitter Copy</h4>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className={isOverLimit ? 'text-rose-400 font-bold' : 'text-neutral-400'}>
                {text.length} / {charLimit}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isOverLimit ? 'bg-rose-500/20 text-rose-300' : 'bg-neutral-800 text-neutral-400'}`}>
                {charsRemaining} left
              </span>
            </div>
          </div>

          <textarea
            rows={5}
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Customize tweet text (max 280 characters)..."
            className={`w-full bg-neutral-900 border rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none transition leading-relaxed resize-none ${
              isOverLimit ? 'border-rose-500/60 focus:border-rose-500' : 'border-neutral-800 focus:border-white'
            }`}
          />
        </div>

        {isOverLimit && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Tweet exceeds the 280 character limit. Shorten it before publishing.</span>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">X (Twitter) API v2 Integration:</p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-500 text-[11px]">
            <li>Uses official X API v2 POST /2/tweets endpoint</li>
            <li>Requires tweet.read, tweet.write, users.read, and offline.access scopes</li>
            <li>Supports text updates and attached media (photos, videos, GIFs)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

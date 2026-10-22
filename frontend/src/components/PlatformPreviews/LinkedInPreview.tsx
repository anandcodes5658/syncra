import React from 'react';
import { ThumbsUp, MessageSquare, Repeat2, Send, Globe, MoreHorizontal } from 'lucide-react';
import { MediaAsset } from '../../types';

interface Props {
  commentary: string;
  hashtags: string[];
  media: MediaAsset | null;
  accountName?: string;
  onCommentaryChange: (val: string) => void;
}

export const LinkedInPreview: React.FC<Props> = ({
  commentary,
  hashtags,
  media,
  accountName = 'Syncra Creator',
  onCommentaryChange
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* LinkedIn Post Mock */}
      <div className="w-full max-w-md mx-auto bg-[#1b1f23] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white text-xs">
              in
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white leading-tight">{accountName}</span>
                <span className="text-neutral-500 text-xs">• 1st</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">Building Syncra • Unified Social Automation</p>
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 mt-0.5">
                <span>Just now</span>
                <span>•</span>
                <Globe className="w-3 h-3 text-neutral-500" />
              </div>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-neutral-400" />
        </div>

        {/* Commentary */}
        <div className="p-4 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">
          {commentary || 'Write your professional commentary...'}
          {hashtags && hashtags.length > 0 && (
            <div className="mt-2 text-sky-400 text-xs flex flex-wrap gap-1.5">
              {hashtags.map((h, i) => (
                <span key={i} className="hover:underline cursor-pointer">{h}</span>
              ))}
            </div>
          )}
        </div>

        {/* Media */}
        {media && (
          <div className="relative w-full max-h-80 bg-black flex items-center justify-center overflow-hidden border-y border-neutral-800">
            {media.file_type.startsWith('video/') ? (
              <video src={media.file_url} className="w-full h-full object-cover max-h-80" controls playsInline />
            ) : (
              <img src={media.file_url} alt="LinkedIn media" className="w-full h-full object-cover max-h-80" />
            )}
          </div>
        )}

        {/* Reactions Counter */}
        <div className="px-4 py-2.5 flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <span className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-[9px] text-white">👍</span>
              <span className="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] text-white">💡</span>
              <span className="w-4 h-4 rounded-full bg-rose-600 flex items-center justify-center text-[9px] text-white">❤️</span>
            </div>
            <span className="text-[11px] ml-1">96</span>
          </div>
          <span className="text-[11px]">18 comments</span>
        </div>

        {/* Action Row */}
        <div className="grid grid-cols-4 py-1 text-neutral-400 text-xs font-medium">
          <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-neutral-800/60 rounded-lg transition hover:text-white">
            <ThumbsUp className="w-4 h-4" />
            <span>Like</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-neutral-800/60 rounded-lg transition hover:text-white">
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-neutral-800/60 rounded-lg transition hover:text-white">
            <Repeat2 className="w-4 h-4" />
            <span>Repost</span>
          </button>
          <button className="flex items-center justify-center gap-1.5 py-2.5 hover:bg-neutral-800/60 rounded-lg transition hover:text-white">
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 text-left">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">LinkedIn Commentary</h4>
          <span className="text-xs text-neutral-400 font-mono">{commentary.length} / 3,000 chars</span>
        </div>
        <textarea
          rows={6}
          value={commentary}
          onChange={(e) => onCommentaryChange(e.target.value)}
          placeholder="Customize LinkedIn commentary..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
        />

        <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">LinkedIn Setup & Specs:</p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-500 text-[11px]">
            <li>w_member_social scope for personal profile publishing</li>
            <li>Uses LinkedIn REST Posts API with LinkedIn-Version header</li>
            <li>Supports rich markdown line breaks and author URN formatting</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

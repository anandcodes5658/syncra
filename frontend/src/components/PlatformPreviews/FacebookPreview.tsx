import React from 'react';
import { ThumbsUp, MessageSquare, Share2, Globe, MoreHorizontal } from 'lucide-react';
import { MediaAsset } from '../../types';
import { normalizeMediaUrl } from '../../utils/media';

interface Props {
  caption: string;
  media: MediaAsset | null;
  accountName?: string;
  onCaptionChange: (val: string) => void;
}

export const FacebookPreview: React.FC<Props> = ({
  caption,
  media,
  accountName = 'Syncra Official',
  onCaptionChange
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Facebook Card Mock */}
      <div className="w-full max-w-md mx-auto bg-[#18191a] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              f
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{accountName}</p>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                <span>Just now</span>
                <span>•</span>
                <Globe className="w-3 h-3 text-neutral-400" />
              </div>
            </div>
          </div>
          <MoreHorizontal className="w-5 h-5 text-neutral-400" />
        </div>

        {/* Caption */}
        <div className="p-3.5 text-xs text-neutral-200 leading-relaxed whitespace-pre-wrap">
          {caption || 'Enter your Facebook caption...'}
        </div>

        {/* Media */}
        {media && (
          <div className="relative w-full max-h-80 bg-black flex items-center justify-center overflow-hidden border-y border-neutral-800">
            {media.file_type.startsWith('video/') ? (
              <video src={normalizeMediaUrl(media.file_url)} className="w-full h-full object-cover max-h-80" controls playsInline />
            ) : (
              <img src={normalizeMediaUrl(media.file_url)} alt="Facebook media" className="w-full h-full object-cover max-h-80" />
            )}
          </div>
        )}

        {/* Social Metrics */}
        <div className="px-3.5 py-2 flex items-center justify-between text-xs text-neutral-400 border-b border-neutral-800">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white">👍</span>
            <span>284</span>
          </div>
          <div className="flex items-center gap-3">
            <span>42 comments</span>
            <span>18 shares</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 py-1 text-neutral-300 text-xs font-medium border-t border-neutral-800/50">
          <button className="flex items-center justify-center gap-2 py-2 hover:bg-neutral-800/60 rounded-lg transition">
            <ThumbsUp className="w-4 h-4" />
            <span>Like</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 hover:bg-neutral-800/60 rounded-lg transition">
            <MessageSquare className="w-4 h-4" />
            <span>Comment</span>
          </button>
          <button className="flex items-center justify-center gap-2 py-2 hover:bg-neutral-800/60 rounded-lg transition">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 text-left">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Facebook Page Copy</h4>
          <span className="text-xs text-neutral-400 font-mono">{caption.length} chars</span>
        </div>
        <textarea
          rows={6}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Customize Facebook copy..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
        />

        <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">Facebook Publishing Flow:</p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-500 text-[11px]">
            <li>Publishes to connected Facebook Page using Page Access Token</li>
            <li>Supports standard Feed posts, photos, and Page videos</li>
            <li>Includes pages_manage_posts and pages_read_engagement permissions</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

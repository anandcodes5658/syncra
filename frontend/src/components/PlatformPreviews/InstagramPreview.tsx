import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { MediaAsset } from '../../types';
import { normalizeMediaUrl } from '../../utils/media';

interface Props {
  caption: string;
  hashtags: string[];
  media: MediaAsset | null;
  accountName?: string;
  onCaptionChange: (val: string) => void;
}

export const InstagramPreview: React.FC<Props> = ({
  caption,
  hashtags,
  media,
  accountName = 'syncra.io',
  onCaptionChange
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* Visual Mock Phone Card */}
      <div className="w-full max-w-sm mx-auto bg-black border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-left">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-neutral-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-[1.5px]">
              <div className="w-full h-full bg-black rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">
                SY
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-white tracking-tight leading-none">{accountName}</p>
              <p className="text-[10px] text-neutral-400 mt-0.5">Original audio</p>
            </div>
          </div>
          <MoreHorizontal className="w-4 h-4 text-neutral-400" />
        </div>

        {/* Media Frame */}
        <div className="relative aspect-square w-full bg-neutral-950 flex items-center justify-center overflow-hidden border-y border-neutral-900">
          {media ? (
            media.file_type.startsWith('video/') ? (
              <video src={normalizeMediaUrl(media.file_url)} className="w-full h-full object-cover" controls playsInline />
            ) : (
              <img src={normalizeMediaUrl(media.file_url)} alt="Instagram preview" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="text-center p-6 text-neutral-600 text-xs">
              <p>No media attached.</p>
              <p className="mt-1 text-[11px]">Upload an image or video to preview</p>
            </div>
          )}
        </div>

        {/* Action icons */}
        <div className="px-3.5 pt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3.5 text-white">
            <Heart className="w-5 h-5 hover:text-rose-500 transition cursor-pointer" />
            <MessageCircle className="w-5 h-5 cursor-pointer" />
            <Send className="w-5 h-5 cursor-pointer" />
          </div>
          <Bookmark className="w-5 h-5 text-white cursor-pointer" />
        </div>

        {/* Likes */}
        <div className="px-3.5 pt-2 text-[11px] font-semibold text-white">
          Liked by <span className="font-bold">techfounders</span> and <span className="font-bold">1,420 others</span>
        </div>

        {/* Caption */}
        <div className="px-3.5 pt-1.5 pb-3 text-xs leading-relaxed text-neutral-200">
          <span className="font-semibold text-white mr-1.5">{accountName}</span>
          <span className="whitespace-pre-wrap">{caption || 'Your caption will appear here...'}</span>
          {hashtags && hashtags.length > 0 && (
            <div className="mt-2 text-blue-400 text-[11px] flex flex-wrap gap-1">
              {hashtags.map((h, i) => (
                <span key={i}>{h}</span>
              ))}
            </div>
          )}
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider mt-2">Just now</p>
        </div>
      </div>

      {/* Editor Controls */}
      <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 text-left">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Instagram Caption</h4>
          <span className="text-xs text-neutral-400 font-mono">{caption.length} / 2,200 chars</span>
        </div>
        <textarea
          rows={6}
          value={caption}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Customize Instagram caption..."
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition leading-relaxed resize-none"
        />

        <div className="mt-4 pt-4 border-t border-neutral-800 text-xs text-neutral-400">
          <p className="font-medium text-neutral-300 mb-1">Instagram Publishing Rules:</p>
          <ul className="list-disc pl-4 space-y-1 text-neutral-500 text-[11px]">
            <li>Requires a connected Professional Instagram Account</li>
            <li>Media must be a public URL during container creation</li>
            <li>Supports square (1:1), portrait (4:5), or Reels video</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

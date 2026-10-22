import React, { useRef, useState } from 'react';
import { UploadCloud, File, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { uploadMedia } from '../services/api';
import { MediaAsset } from '../types';

interface Props {
  media: MediaAsset | null;
  onMediaUploaded: (media: MediaAsset | null) => void;
}

export const FileUpload: React.FC<Props> = ({ media, onMediaUploaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const asset = await uploadMedia(file);
      onMediaUploaded(asset);
    } catch (err: any) {
      setError(err.message || 'Failed to upload media file');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {media ? (
        <div className="relative group bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-4 transition hover:border-neutral-700">
          {/* Thumbnail preview */}
          <div className="w-full md:w-36 h-28 bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-neutral-800">
            {media.file_type.startsWith('video/') ? (
              <video src={media.file_url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
            ) : (
              <img src={media.file_url} alt="Uploaded Media" className="w-full h-full object-cover" />
            )}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white truncate text-sm">
                {media.file_url.split('/').pop()}
              </span>
              <span className="text-emerald-400 flex items-center gap-1 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Type: <span className="uppercase text-neutral-300 font-mono">{media.file_type.split('/')[1]}</span> • Size: {formatBytes(media.file_size)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Accessible URL: <span className="text-neutral-400 underline truncate">{media.file_url}</span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onMediaUploaded(null)}
              className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 rounded-lg transition"
              title="Remove media"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-white bg-white/5'
              : 'border-neutral-800 hover:border-neutral-600 bg-[#0a0a0a]/50 hover:bg-[#0a0a0a]'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="w-8 h-8 text-white animate-spin mb-3" />
              <p className="text-sm font-medium text-white">Uploading media to storage...</p>
              <p className="text-xs text-neutral-500 mt-1">Generating public media endpoint</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <UploadCloud className="w-6 h-6 text-neutral-300" />
              </div>
              <p className="text-sm font-medium text-white">
                Drag and drop your image or video here, or <span className="underline decoration-neutral-500">browse</span>
              </p>
              <p className="text-xs text-neutral-500 mt-1.5">
                Supports MP4, MOV, JPEG, PNG, WEBP (Up to 150MB)
              </p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

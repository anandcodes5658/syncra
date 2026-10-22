import React from 'react';
import { AlertCircle, CheckCircle2, Send, X, Calendar } from 'lucide-react';
import { PlatformType, MediaAsset, ConnectedAccount } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedPlatforms: PlatformType[];
  media: MediaAsset | null;
  accounts: ConnectedAccount[];
  isScheduled?: boolean;
  scheduledTime?: string;
  loading: boolean;
}

export const PublishModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedPlatforms,
  media,
  accounts,
  isScheduled,
  scheduledTime,
  loading
}) => {
  if (!isOpen) return null;

  const warnings: string[] = [];

  if (selectedPlatforms.includes('youtube') && (!media || !media.file_type.startsWith('video/'))) {
    warnings.push('YouTube posting requires a video file format.');
  }

  if (selectedPlatforms.includes('instagram') && !media) {
    warnings.push('Instagram posting requires an image or video asset.');
  }

  const platformNames: Record<PlatformType, string> = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    twitter: 'Twitter / X'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0d0d0d] border border-neutral-800 rounded-3xl p-6 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              {isScheduled ? 'Schedule Multi-Platform Post' : 'Confirm Multi-Platform Publishing'}
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Review target platforms and pre-flight checks before queueing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Targets List */}
        <div className="py-4 space-y-3">
          <p className="text-xs font-medium text-neutral-300">Target Destinations ({selectedPlatforms.length})</p>
          <div className="grid grid-cols-2 gap-2">
            {selectedPlatforms.map((p) => {
              const account = accounts.find((a) => a.platform === p);
              const isConnected = account && account.status === 'connected';
              return (
                <div
                  key={p}
                  className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-semibold text-white">{platformNames[p]}</p>
                    <p className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                      {account?.account_name || 'Mock Dev Mode'}
                    </p>
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-neutral-600'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Schedule Notice */}
          {isScheduled && scheduledTime && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-2 text-blue-400 text-xs">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Will be queued for release at: {new Date(scheduledTime).toLocaleString()}</span>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2 pt-1">
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-amber-300 text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-neutral-900/50 border border-neutral-800/80 rounded-xl text-[11px] text-neutral-400">
            <p className="flex items-center gap-1.5 text-neutral-300 font-medium mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Official API & Background Worker
            </p>
            Jobs will run asynchronously in background workers so your dashboard stays fast and responsive. Every API response and proof URL will be recorded.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl shadow-lg transition active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span>Queueing...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{isScheduled ? 'Schedule Now' : 'Publish to All'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

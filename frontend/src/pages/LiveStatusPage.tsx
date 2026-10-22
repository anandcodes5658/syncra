import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  RotateCcw
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { RawResponseModal } from '../components/RawResponseModal';
import { PostDraftStatusResponse, TargetStatus, PlatformType } from '../types';
import { getPostStatus, retryJob, getPosts } from '../services/api';
import { normalizeMediaUrl } from '../utils/media';

interface Props {
  activeDraftId: string | null;
  onSelectDraft: (draftId: string) => void;
  onCreateNew: () => void;
}

export const LiveStatusPage: React.FC<Props> = ({ activeDraftId, onSelectDraft, onCreateNew }) => {
  const [statusData, setStatusData] = useState<PostDraftStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; json: any } | null>(null);
  const [recentDrafts, setRecentDrafts] = useState<Array<{ id: string; title: string; status: string; created_at: string }>>([]);

  const platformMeta: Record<PlatformType, { name: string; color: string }> = {
    instagram: { name: 'Instagram', color: 'from-amber-500 to-rose-500' },
    facebook: { name: 'Facebook', color: 'from-blue-600 to-blue-700' },
    linkedin: { name: 'LinkedIn', color: 'from-sky-600 to-blue-800' },
    youtube: { name: 'YouTube', color: 'from-red-600 to-red-700' },
    twitter: { name: 'Twitter / X', color: 'from-neutral-700 to-black' }
  };

  // Poll status while in progress
  useEffect(() => {
    if (!activeDraftId) {
      loadRecentDrafts();
      return;
    }

    let intervalId: any = null;

    const fetchStatus = async () => {
      try {
        const data = await getPostStatus(activeDraftId);
        setStatusData(data);

        // Continue polling if publishing
        const isStillRunning = data.overallStatus === 'publishing' || data.targets.some(t => t.status === 'uploading' || t.status === 'pending');
        if (!isStillRunning && intervalId) {
          clearInterval(intervalId);
        }
      } catch (err) {
        console.error('Error fetching live status:', err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 1500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeDraftId]);

  const loadRecentDrafts = async () => {
    setLoading(true);
    try {
      const posts = await getPosts();
      setRecentDrafts(posts);
      if (posts.length > 0 && !activeDraftId) {
        onSelectDraft(posts[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (jobId?: string) => {
    if (!jobId) return;
    setRetryingJobId(jobId);
    try {
      await retryJob(jobId);
      if (activeDraftId) {
        const refreshed = await getPostStatus(activeDraftId);
        setStatusData(refreshed);
      }
    } catch (err) {
      alert('Retry failed: ' + (err as Error).message);
    } finally {
      setRetryingJobId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">Live Publish Status</h1>
            {statusData && <StatusBadge status={statusData.overallStatus} />}
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time multi-platform status, external post proofs, and API debug logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {recentDrafts.length > 1 && (
            <select
              value={activeDraftId || ''}
              onChange={(e) => onSelectDraft(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-200 focus:outline-none"
            >
              {recentDrafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title || 'Untitled'} ({d.status})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={onCreateNew}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition shadow"
          >
            <span>New Post</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {statusData ? (
        <div className="space-y-6">
          {/* Post Summary Card */}
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {statusData.media && (
                <div className="w-16 h-16 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-neutral-800">
                  {statusData.media.file_type.startsWith('video/') ? (
                    <video src={normalizeMediaUrl(statusData.media.file_url)} className="w-full h-full object-cover" />
                  ) : (
                    <img src={normalizeMediaUrl(statusData.media.file_url)} alt="Post asset" className="w-full h-full object-cover" />
                  )}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-white text-sm">{statusData.title || 'Untitled Post'}</h3>
                <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1 max-w-xl">
                  {statusData.masterCaption}
                </p>
                <p className="text-[10px] text-neutral-500 font-mono mt-1">Draft ID: {statusData.draftId}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">
                {statusData.targets.filter(t => t.status === 'published').length} / {statusData.targets.length} Published
              </span>
            </div>
          </div>

          {/* Platform Status Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statusData.targets.map((target: TargetStatus) => {
              const meta = platformMeta[target.platform];
              const isPublished = target.status === 'published';
              const isFailed = target.status === 'failed';
              const isUploading = target.status === 'uploading' || target.status === 'pending';

              return (
                <div
                  key={target.targetId}
                  className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 flex flex-col justify-between hover:border-neutral-700 transition"
                >
                  <div>
                    {/* Platform Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${meta.color} flex items-center justify-center font-bold text-white text-xs`}>
                          {meta.name[0]}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm leading-tight">{meta.name}</h4>
                          <span className="text-[10px] text-neutral-500 font-mono">Attempt {target.attempts || 1}</span>
                        </div>
                      </div>
                      <StatusBadge status={target.status} size="sm" />
                    </div>

                    {/* Body Info */}
                    <div className="py-4 space-y-2">
                      {isPublished && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-1">
                          <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Successfully Published
                          </p>
                          {target.externalPostId && (
                            <p className="text-[11px] text-neutral-400 font-mono truncate">
                              ID: {target.externalPostId}
                            </p>
                          )}
                        </div>
                      )}

                      {isUploading && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                          <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Uploading & Container Processing...
                          </p>
                          <p className="text-[11px] text-neutral-400">
                            Worker is transmitting payload to official API endpoint
                          </p>
                        </div>
                      )}

                      {isFailed && (
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
                          <p className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Publish Failed
                          </p>
                          <p className="text-[11px] text-rose-300 line-clamp-2">
                            {target.lastError || 'Unknown API error occurred'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                    <button
                      type="button"
                      onClick={() =>
                        setModalData({
                          title: `${meta.name} Raw API Response`,
                          json: target.rawResponse || { error: target.lastError || 'No response recorded yet' }
                        })
                      }
                      className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Inspect JSON</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {isFailed && target.jobId && (
                        <button
                          type="button"
                          onClick={() => handleRetry(target.jobId)}
                          disabled={retryingJobId === target.jobId}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-lg transition disabled:opacity-50"
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${retryingJobId === target.jobId ? 'animate-spin' : ''}`} />
                          <span>Retry</span>
                        </button>
                      )}

                      {target.externalUrl && (
                        <a
                          href={target.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-lg transition shadow-sm"
                        >
                          <span>View Live Post</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0a0a0a] border border-neutral-800 rounded-3xl space-y-3">
          <Clock className="w-8 h-8 text-neutral-500 mx-auto" />
          <p className="text-sm font-semibold text-white">No active publish job selected</p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Create a post on the authoring page or select a post from the history list to monitor live status.
          </p>
          <button
            onClick={onCreateNew}
            className="mt-3 px-4 py-2 text-xs font-semibold text-black bg-white hover:bg-neutral-200 rounded-xl transition"
          >
            Create New Post
          </button>
        </div>
      )}

      {/* Raw JSON Modal */}
      <RawResponseModal
        isOpen={!!modalData}
        onClose={() => setModalData(null)}
        title={modalData?.title || 'API Response'}
        data={modalData?.json}
      />
    </div>
  );
};

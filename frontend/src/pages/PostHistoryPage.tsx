import React, { useEffect, useState } from 'react';
import {
  History,
  Filter,
  Search,
  ExternalLink,
  Terminal,
  RotateCcw,
  RefreshCw,
  Eye,
  Calendar,
  Layers
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { RawResponseModal } from '../components/RawResponseModal';
import { PostItem, PlatformType } from '../types';
import { getPosts, retryJob } from '../services/api';
import { normalizeMediaUrl } from '../utils/media';

interface Props {
  onSelectDraft: (draftId: string) => void;
}

export const PostHistoryPage: React.FC<Props> = ({ onSelectDraft }) => {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; json: any } | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await getPosts({ platform: platformFilter, status: statusFilter });
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [platformFilter, statusFilter]);

  const handleRetry = async (jobId: string) => {
    setRetryingJobId(jobId);
    try {
      await retryJob(jobId);
      await fetchPosts();
    } catch (err) {
      alert('Retry error: ' + (err as Error).message);
    } finally {
      setRetryingJobId(null);
    }
  };

  const filteredPosts = posts.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.master_caption && p.master_caption.toLowerCase().includes(q));
    return matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Post History & Logs</h1>
          <p className="text-xs text-neutral-400 mt-1">
            Browse published campaigns, scheduled releases, external proof links, and raw API audit logs.
          </p>
        </div>

        <button
          onClick={fetchPosts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by post title or caption snippet..."
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white transition"
          />
        </div>

        {/* Platform Filter */}
        <div className="md:col-span-3">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
            <option value="youtube">YouTube</option>
            <option value="twitter">Twitter / X</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="publishing">Publishing</option>
            <option value="scheduled">Scheduled</option>
            <option value="failed">Failed / Partial</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition space-y-4"
            >
              {/* Row 1: Header & Overall Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  {post.media && (
                    <div className="w-12 h-12 bg-neutral-900 rounded-xl overflow-hidden shrink-0 border border-neutral-800">
                      {post.media.file_type.startsWith('video/') ? (
                        <video src={normalizeMediaUrl(post.media.file_url)} className="w-full h-full object-cover" />
                      ) : (
                        <img src={normalizeMediaUrl(post.media.file_url)} alt="Media thumbnail" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-white text-sm">{post.title || 'Untitled Post'}</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1 max-w-xl">
                      {post.master_caption}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={post.status} size="sm" />
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Row 2: Target Platforms breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {post.targets.map((target) => {
                  const job = target.job;
                  const isPublished = target.status === 'published' || job?.job_status === 'published';
                  const isFailed = target.status === 'failed' || job?.job_status === 'failed';

                  return (
                    <div
                      key={target.id}
                      className="p-3 bg-neutral-900/60 border border-neutral-800 rounded-xl space-y-2 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
                          {target.platform}
                        </span>
                        <StatusBadge status={job?.job_status || target.status} size="sm" />
                      </div>

                      <div className="space-y-1">
                        {isPublished && job?.external_url && (
                          <a
                            href={job.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[11px] text-white hover:underline truncate"
                          >
                            <span>Live Proof</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        {isFailed && job?.last_error && (
                          <p className="text-[10px] text-rose-400 line-clamp-1" title={job.last_error}>
                            {job.last_error}
                          </p>
                        )}
                      </div>

                      {/* Small Actions */}
                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                        {job?.api_response_json ? (
                          <button
                            type="button"
                            onClick={() =>
                              setModalData({
                                title: `${target.platform.toUpperCase()} API Proof`,
                                json: job.api_response_json
                              })
                            }
                            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1"
                          >
                            <Terminal className="w-3 h-3" />
                            <span>Logs</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-neutral-600">No logs</span>
                        )}

                        {isFailed && job?.id && (
                          <button
                            type="button"
                            onClick={() => handleRetry(job.id)}
                            disabled={retryingJobId === job.id}
                            className="text-[10px] text-neutral-300 hover:text-white flex items-center gap-1"
                          >
                            <RotateCcw className={`w-3 h-3 ${retryingJobId === job.id ? 'animate-spin' : ''}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 3: Bottom Action Bar */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onSelectDraft(post.id)}
                  className="flex items-center gap-1.5 text-xs text-neutral-300 hover:text-white transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Live Dashboard</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0a0a0a] border border-neutral-800 rounded-3xl space-y-3">
          <History className="w-8 h-8 text-neutral-500 mx-auto" />
          <p className="text-sm font-semibold text-white">No post history matching filters</p>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Try adjusting your search query or filters above, or create your first post.
          </p>
        </div>
      )}

      {/* Raw JSON Modal */}
      <RawResponseModal
        isOpen={!!modalData}
        onClose={() => setModalData(null)}
        title={modalData?.title || 'API Audit Log'}
        data={modalData?.json}
      />
    </div>
  );
};

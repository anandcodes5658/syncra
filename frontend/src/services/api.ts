import {
  MediaAsset,
  ConnectedAccount,
  PostDraftStatusResponse,
  PostItem,
  PlatformCaptions,
  PostTargetInput
} from '../types';

const API_BASE = '/api';

export async function uploadMedia(file: File): Promise<MediaAsset> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/media/upload`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to upload media');
  }

  const data = await res.json();
  return data.media;
}

export async function createDraft(payload: {
  title?: string;
  master_caption: string;
  media_asset_id?: string;
  platforms: PostTargetInput[];
  scheduled_at?: string;
}): Promise<{ draftId: string }> {
  const res = await fetch(`${API_BASE}/posts/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create post draft');
  }

  const data = await res.json();
  return { draftId: data.draft.id };
}

export async function updateDraft(draftId: string, payload: {
  title?: string;
  master_caption?: string;
  targets?: any[];
  scheduled_at?: string;
}) {
  const res = await fetch(`${API_BASE}/posts/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to update post draft');
  }

  return res.json();
}

export async function publishDraft(draftId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${draftId}/publish`, {
    method: 'POST'
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to trigger publishing');
  }
}

export async function getPostStatus(draftId: string): Promise<PostDraftStatusResponse> {
  const res = await fetch(`${API_BASE}/posts/${draftId}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch post status');
  }
  return res.json();
}

export async function retryJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/retry`, {
    method: 'POST'
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to retry job');
  }
}

export async function getPosts(params?: { platform?: string; status?: string }): Promise<PostItem[]> {
  const query = new URLSearchParams();
  if (params?.platform && params.platform !== 'all') query.set('platform', params.platform);
  if (params?.status && params.status !== 'all') query.set('status', params.status);

  const res = await fetch(`${API_BASE}/posts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  return data.posts || [];
}

export async function getAccounts(): Promise<ConnectedAccount[]> {
  const res = await fetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error('Failed to fetch connected accounts');
  const data = await res.json();
  return data.accounts || [];
}

export async function mockConnectAccount(platform: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/mock-connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to connect test account');
  }
}

export async function disconnectAccount(accountId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/accounts/${accountId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to disconnect account');
}

export async function generateCaptions(masterCaption: string, tone = 'professional & engaging'): Promise<PlatformCaptions> {
  const res = await fetch(`${API_BASE}/ai/generate-captions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ master_caption: masterCaption, tone })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate captions');
  }

  const data = await res.json();
  return data.data;
}

export async function getHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function getAuditLogs() {
  const res = await fetch(`${API_BASE}/audit-logs`);
  const data = await res.json();
  return data.logs || [];
}

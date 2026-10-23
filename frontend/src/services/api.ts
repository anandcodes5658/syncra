import {
  MediaAsset,
  ConnectedAccount,
  PostDraftStatusResponse,
  PostItem,
  PlatformCaptions,
  PostTargetInput
} from '../types';

const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('syncra_auth_token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('syncra_auth_token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('syncra_auth_token');
  window.dispatchEvent(new Event('syncra:unauthorized'));
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (res.status === 401 && !url.includes('/auth/')) {
    clearAuthToken();
  }

  return res;
}

export async function loginWithPassword(password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      setAuthToken(data.token);
      return { success: true };
    }
    return { success: false, error: data.error || 'Incorrect password.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed.' };
  }
}

export async function checkAuth(): Promise<boolean> {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/check`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!data.authenticated;
  } catch {
    return false;
  }
}

export async function uploadMedia(file: File, onProgress?: (percent: number) => void): Promise<MediaAsset> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/media/upload`);

    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.media);
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        if (xhr.status === 401) {
          clearAuthToken();
        }
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(new Error(errorData.error || 'Failed to upload media'));
        } catch {
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during media upload'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });
}

export async function createDraft(payload: {
  title?: string;
  master_caption: string;
  media_asset_id?: string;
  platforms: PostTargetInput[];
  scheduled_at?: string;
}): Promise<{ draftId: string }> {
  const res = await authFetch(`${API_BASE}/posts/draft`, {
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
  const res = await authFetch(`${API_BASE}/posts/${draftId}`, {
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
  const res = await authFetch(`${API_BASE}/posts/${draftId}/publish`, {
    method: 'POST'
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to trigger publishing');
  }
}

export async function getPostStatus(draftId: string): Promise<PostDraftStatusResponse> {
  const res = await authFetch(`${API_BASE}/posts/${draftId}/status`);
  if (!res.ok) {
    throw new Error('Failed to fetch post status');
  }
  return res.json();
}

export async function retryJob(jobId: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/jobs/${jobId}/retry`, {
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

  const res = await authFetch(`${API_BASE}/posts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch posts');
  const data = await res.json();
  return data.posts || [];
}

export async function getAccounts(): Promise<ConnectedAccount[]> {
  const res = await authFetch(`${API_BASE}/accounts`);
  if (!res.ok) throw new Error('Failed to fetch connected accounts');
  const data = await res.json();
  return data.accounts || [];
}

export async function mockConnectAccount(platform: string): Promise<void> {
  const res = await authFetch(`${API_BASE}/accounts/mock-connect`, {
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
  const res = await authFetch(`${API_BASE}/accounts/${accountId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to disconnect account');
}

export async function generateCaptions(masterCaption: string, tone = 'professional & engaging'): Promise<PlatformCaptions> {
  const res = await authFetch(`${API_BASE}/ai/generate-captions`, {
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
  const res = await authFetch(`${API_BASE}/audit-logs`);
  const data = await res.json();
  return data.logs || [];
}

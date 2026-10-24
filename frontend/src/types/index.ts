export type PlatformType = 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'twitter';

export interface MediaAsset {
  id: string;
  user_id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  duration?: number;
  thumbnail_url?: string;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  platform: PlatformType;
  account_name: string;
  external_account_id: string;
  scopes?: string;
  status: 'connected' | 'expired' | 'disconnected';
  expires_at?: string;
  hasAccessToken?: boolean;
  metadata_json?: Record<string, any>;
}

export interface TargetStatus {
  targetId: string;
  platform: PlatformType;
  status: 'pending' | 'uploading' | 'published' | 'failed' | 'retrying';
  attempts: number;
  externalPostId?: string;
  externalUrl?: string;
  lastError?: string;
  rawResponse?: any;
  jobId?: string;
}

export interface PostDraftStatusResponse {
  draftId: string;
  title: string;
  masterCaption: string;
  overallStatus: 'draft' | 'publishing' | 'published' | 'scheduled' | 'partially_failed' | 'failed';
  media?: MediaAsset | null;
  targets: TargetStatus[];
}

export interface PostTargetInput {
  platform: PlatformType;
  caption?: string;
  title?: string;
  description?: string;
  privacy?: 'public' | 'unlisted' | 'private';
}

export interface PostItem {
  id: string;
  title: string;
  master_caption: string;
  status: string;
  scheduled_at?: string;
  created_at: string;
  media?: MediaAsset;
  targets: Array<{
    id: string;
    platform: PlatformType;
    caption?: string;
    title?: string;
    description?: string;
    privacy?: string;
    status: string;
    job?: {
      id: string;
      job_status: string;
      external_post_id?: string;
      external_url?: string;
      last_error?: string;
      api_response_json?: any;
      updated_at: string;
    };
  }>;
}

export interface PlatformCaptions {
  instagram: {
    caption: string;
    hashtags: string[];
  };
  facebook: {
    caption: string;
  };
  linkedin: {
    commentary: string;
    hashtags: string[];
  };
  youtube: {
    title: string;
    description: string;
    tags: string[];
    privacy: 'public' | 'unlisted' | 'private';
  };
  twitter: {
    text: string;
    hashtags: string[];
  };
}

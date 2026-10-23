import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config/env.js';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash?: string;
  created_at: string;
}

export interface ConnectedAccount {
  id: string;
  user_id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'twitter';
  account_name: string;
  external_account_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token?: string;
  expires_at?: string;
  scopes?: string;
  status: 'connected' | 'expired' | 'disconnected';
}

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

export interface PostDraft {
  id: string;
  user_id: string;
  title?: string;
  master_caption: string;
  media_asset_id?: string;
  status: 'draft' | 'publishing' | 'published' | 'scheduled' | 'partially_failed' | 'failed';
  scheduled_at?: string;
  created_at: string;
}

export interface PostTarget {
  id: string;
  post_draft_id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'twitter';
  account_id?: string;
  caption?: string;
  title?: string;
  description?: string;
  privacy?: string;
  status: 'pending' | 'uploading' | 'published' | 'failed' | 'retrying';
}

export interface PublishJob {
  id: string;
  post_target_id: string;
  job_status: 'pending' | 'uploading' | 'published' | 'failed' | 'retrying';
  attempts: number;
  last_error?: string;
  external_post_id?: string;
  external_url?: string;
  api_response_json?: any;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  platform?: string;
  request_id?: string;
  metadata_json?: any;
  created_at: string;
}

interface DataStore {
  users: User[];
  connected_accounts: ConnectedAccount[];
  media_assets: MediaAsset[];
  post_drafts: PostDraft[];
  post_targets: PostTarget[];
  publish_jobs: PublishJob[];
  audit_logs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_FILE = path.join(DATA_DIR, 'db.json');

class DatabaseManager {
  private pgPool: pg.Pool | null = null;
  private isPostgres = false;
  private memoryStore: DataStore = {
    users: [],
    connected_accounts: [],
    media_assets: [],
    post_drafts: [],
    post_targets: [],
    publish_jobs: [],
    audit_logs: []
  };

  constructor() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    this.loadFromFile();
  }

  private loadFromFile() {
    if (fs.existsSync(STORE_FILE)) {
      try {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        this.memoryStore = JSON.parse(raw);
      } catch (err) {
        console.warn('Could not read db.json, using fresh store:', err);
      }
    }
  }

  private saveToFile() {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }

    if (this.isPostgres && this.pgPool) {
      this.pgPool.query(
        `INSERT INTO syncra_store (key, data, updated_at) VALUES ('main', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW();`,
        [JSON.stringify(this.memoryStore)]
      ).catch((err: Error) => {
        console.error('Error persisting to PostgreSQL:', err.message);
      });
    }
  }

  async init(): Promise<void> {
    if (config.databaseUrl) {
      try {
        const isSsl = !config.databaseUrl.includes('localhost') && !config.databaseUrl.includes('127.0.0.1');
        this.pgPool = new pg.Pool({
          connectionString: config.databaseUrl,
          ssl: isSsl ? { rejectUnauthorized: false } : false
        });
        const client = await this.pgPool.connect();
        this.isPostgres = true;
        console.log('Connected to PostgreSQL successfully.');

        // Ensure table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS syncra_store (
            key VARCHAR(64) PRIMARY KEY,
            data JSONB NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          -- Relational Views for visual SQL tools (TablePlus, DBeaver, pgAdmin)
          CREATE OR REPLACE VIEW view_posts AS
          SELECT 
            d->>'id' AS id,
            d->>'title' AS title,
            d->>'master_caption' AS master_caption,
            d->>'status' AS status,
            d->>'created_at' AS created_at
          FROM syncra_store,
          LATERAL jsonb_array_elements(COALESCE(data->'post_drafts', '[]'::jsonb)) AS d;

          CREATE OR REPLACE VIEW view_connected_accounts AS
          SELECT 
            a->>'id' AS id,
            a->>'platform' AS platform,
            a->>'account_name' AS account_name,
            a->>'status' AS status
          FROM syncra_store,
          LATERAL jsonb_array_elements(COALESCE(data->'connected_accounts', '[]'::jsonb)) AS a;

          CREATE OR REPLACE VIEW view_queue_jobs AS
          SELECT 
            j->>'id' AS id,
            j->>'post_target_id' AS post_target_id,
            j->>'job_status' AS job_status,
            (j->>'attempts')::int AS attempts,
            j->>'last_error' AS last_error,
            j->>'external_url' AS proof_url,
            j->>'updated_at' AS updated_at
          FROM syncra_store,
          LATERAL jsonb_array_elements(COALESCE(data->'publish_jobs', '[]'::jsonb)) AS j;

          CREATE OR REPLACE VIEW view_audit_logs AS
          SELECT 
            l->>'id' AS id,
            l->>'action' AS action,
            l->>'platform' AS platform,
            l->>'created_at' AS created_at
          FROM syncra_store,
          LATERAL jsonb_array_elements(COALESCE(data->'audit_logs', '[]'::jsonb)) AS l;
        `);

        // Load persisted state from PostgreSQL if available
        const res = await client.query(`SELECT data FROM syncra_store WHERE key = 'main' LIMIT 1;`);
        if (res.rows.length > 0 && res.rows[0].data) {
          this.memoryStore = { ...this.memoryStore, ...res.rows[0].data };
          console.log('Synchronized state with PostgreSQL database.');
        } else {
          await client.query(
            `INSERT INTO syncra_store (key, data, updated_at) VALUES ('main', $1, NOW())
             ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW();`,
            [JSON.stringify(this.memoryStore)]
          );
        }
        client.release();
      } catch (err) {
        console.warn('PostgreSQL connection failed, falling back to JSON persistence:', (err as Error).message);
        this.isPostgres = false;
      }
    } else {
      console.log('No DATABASE_URL provided. Operating in Zero-Friction JSON persistence mode.');
    }

    // Seed default user if none exists, or ensure email is anandch5658@gmail.com
    if (this.memoryStore.users.length === 0) {
      this.memoryStore.users.push({
        id: 'usr_syncra_1',
        name: 'Syncra Admin',
        email: 'anandch5658@gmail.com',
        created_at: new Date().toISOString()
      });
      this.saveToFile();
    } else {
      for (const u of this.memoryStore.users) {
        u.email = 'anandch5658@gmail.com';
      }
      this.saveToFile();
    }
  }

  // --- Users ---
  async getDefaultUser(): Promise<User> {
    const user = this.memoryStore.users[0] || {
      id: 'usr_syncra_1',
      name: 'Syncra Admin',
      email: 'anandch5658@gmail.com',
      created_at: new Date().toISOString()
    };
    user.email = 'anandch5658@gmail.com';
    return user;
  }

  // --- Connected Accounts ---
  async getConnectedAccounts(userId: string): Promise<ConnectedAccount[]> {
    return this.memoryStore.connected_accounts.filter(a => a.user_id === userId);
  }

  async getConnectedAccountByPlatform(userId: string, platform: string): Promise<ConnectedAccount | undefined> {
    return this.memoryStore.connected_accounts.find(a => a.user_id === userId && a.platform === platform);
  }

  async saveConnectedAccount(account: Omit<ConnectedAccount, 'id'> & { id?: string }): Promise<ConnectedAccount> {
    const existingIdx = this.memoryStore.connected_accounts.findIndex(
      a => a.user_id === account.user_id && a.platform === account.platform
    );
    const saved: ConnectedAccount = {
      id: account.id || uuidv4(),
      ...account
    };

    if (existingIdx >= 0) {
      this.memoryStore.connected_accounts[existingIdx] = saved;
    } else {
      this.memoryStore.connected_accounts.push(saved);
    }
    this.saveToFile();
    return saved;
  }

  async deleteConnectedAccount(id: string): Promise<boolean> {
    const prevLen = this.memoryStore.connected_accounts.length;
    this.memoryStore.connected_accounts = this.memoryStore.connected_accounts.filter(a => a.id !== id);
    this.saveToFile();
    return this.memoryStore.connected_accounts.length !== prevLen;
  }

  // --- Media Assets ---
  async createMediaAsset(asset: Omit<MediaAsset, 'id' | 'created_at'>): Promise<MediaAsset> {
    const newAsset: MediaAsset = {
      id: uuidv4(),
      ...asset,
      created_at: new Date().toISOString()
    };
    this.memoryStore.media_assets.push(newAsset);
    this.saveToFile();
    return newAsset;
  }

  async getMediaAsset(id: string): Promise<MediaAsset | undefined> {
    return this.memoryStore.media_assets.find(m => m.id === id);
  }

  // --- Post Drafts ---
  async createPostDraft(draft: Omit<PostDraft, 'id' | 'created_at'>): Promise<PostDraft> {
    const newDraft: PostDraft = {
      id: uuidv4(),
      ...draft,
      created_at: new Date().toISOString()
    };
    this.memoryStore.post_drafts.push(newDraft);
    this.saveToFile();
    return newDraft;
  }

  async getPostDraft(id: string): Promise<PostDraft | undefined> {
    return this.memoryStore.post_drafts.find(d => d.id === id);
  }

  async updatePostDraft(id: string, updates: Partial<PostDraft>): Promise<PostDraft | undefined> {
    const draft = this.memoryStore.post_drafts.find(d => d.id === id);
    if (!draft) return undefined;
    Object.assign(draft, updates);
    this.saveToFile();
    return draft;
  }

  async listPostDrafts(userId: string): Promise<PostDraft[]> {
    return this.memoryStore.post_drafts
      .filter(d => d.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- Post Targets ---
  async createPostTarget(target: Omit<PostTarget, 'id'>): Promise<PostTarget> {
    const newTarget: PostTarget = {
      id: uuidv4(),
      ...target
    };
    this.memoryStore.post_targets.push(newTarget);
    this.saveToFile();
    return newTarget;
  }

  async getPostTargetsByDraftId(draftId: string): Promise<PostTarget[]> {
    return this.memoryStore.post_targets.filter(t => t.post_draft_id === draftId);
  }

  async updatePostTarget(id: string, updates: Partial<PostTarget>): Promise<PostTarget | undefined> {
    const target = this.memoryStore.post_targets.find(t => t.id === id);
    if (!target) return undefined;
    Object.assign(target, updates);
    this.saveToFile();
    return target;
  }

  // --- Publish Jobs ---
  async createPublishJob(job: Omit<PublishJob, 'id' | 'created_at' | 'updated_at'>): Promise<PublishJob> {
    const now = new Date().toISOString();
    const newJob: PublishJob = {
      id: uuidv4(),
      ...job,
      created_at: now,
      updated_at: now
    };
    this.memoryStore.publish_jobs.push(newJob);
    this.saveToFile();
    return newJob;
  }

  async getPublishJob(id: string): Promise<PublishJob | undefined> {
    return this.memoryStore.publish_jobs.find(j => j.id === id);
  }

  async getPublishJobByTargetId(targetId: string): Promise<PublishJob | undefined> {
    return this.memoryStore.publish_jobs.find(j => j.post_target_id === targetId);
  }

  async updatePublishJob(id: string, updates: Partial<PublishJob>): Promise<PublishJob | undefined> {
    const job = this.memoryStore.publish_jobs.find(j => j.id === id);
    if (!job) return undefined;
    Object.assign(job, { ...updates, updated_at: new Date().toISOString() });
    this.saveToFile();
    return job;
  }

  async listPublishJobs(): Promise<PublishJob[]> {
    return this.memoryStore.publish_jobs;
  }

  // --- Audit Logs ---
  async createAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const newLog: AuditLog = {
      id: uuidv4(),
      ...log,
      created_at: new Date().toISOString()
    };
    this.memoryStore.audit_logs.push(newLog);
    this.saveToFile();
    return newLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return this.memoryStore.audit_logs
      .slice(-limit)
      .reverse();
  }

  isUsingPostgres(): boolean {
    return this.isPostgres;
  }

  async getRawStore(): Promise<DataStore> {
    return this.memoryStore;
  }
}

export const db = new DatabaseManager();

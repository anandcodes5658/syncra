-- Syncra Social Auto Poster - Database Schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connected_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    external_account_id VARCHAR(255) NOT NULL,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    scopes TEXT,
    status VARCHAR(32) DEFAULT 'connected'
);

CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type VARCHAR(64) NOT NULL,
    file_size BIGINT NOT NULL,
    duration INT,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_drafts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    master_caption TEXT NOT NULL,
    media_asset_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
    status VARCHAR(32) DEFAULT 'draft',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS post_targets (
    id VARCHAR(64) PRIMARY KEY,
    post_draft_id VARCHAR(64) REFERENCES post_drafts(id) ON DELETE CASCADE,
    platform VARCHAR(32) NOT NULL,
    account_id VARCHAR(64),
    caption TEXT,
    title VARCHAR(255),
    description TEXT,
    privacy VARCHAR(32) DEFAULT 'public',
    status VARCHAR(32) DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS publish_jobs (
    id VARCHAR(64) PRIMARY KEY,
    post_target_id VARCHAR(64) REFERENCES post_targets(id) ON DELETE CASCADE,
    job_status VARCHAR(32) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    last_error TEXT,
    external_post_id VARCHAR(255),
    external_url TEXT,
    api_response_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    platform VARCHAR(32),
    request_id VARCHAR(64),
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

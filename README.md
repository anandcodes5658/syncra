# Syncra Social Auto Poster

> **Instagram + Facebook + LinkedIn + YouTube + X (Twitter)**  
> Minimal black-and-white Apple-style cross-platform social media publishing & automation web application. Upload media once, customize per platform, and publish or schedule across official APIs.

---

## 🌟 Key Features

- **Upload Once, Publish Everywhere**: Upload single image, video, or Reel and create platform-tailored variations in seconds.
- **Official APIs & Zero Credential Storage**: Built strictly using official OAuth 2.0 and official Graph / REST / Data APIs. No password scraping, no session hijacking.
- **AES-256-GCM Token Encryption**: All access and refresh tokens are encrypted at rest with authenticated IVs and encryption keys.
- **Asynchronous Background Queue**: Heavy media uploads and container processing run in non-blocking background workers. The UI never freezes.
- **AI Caption Adaptation Engine**: Automatically transforms master copy into tailored text, hashtags, character limits, YouTube titles, and descriptions.
- **Dual Engine (Mock Mode & Real APIs)**:
  - **Mock Mode**: Works immediately out-of-the-box with simulated container processing, realistic URLs, and fake external IDs for rapid demoing and testing.
  - **Real Mode**: Feature-flagged (`ENABLE_FACEBOOK_REAL=true`, etc.) official API integration with Meta Graph API v19.0, LinkedIn Posts API, and YouTube Data API v3.
- **Auditing & Raw Proof Inspection**: Every API response, post ID, timestamp, and error is stored in the database and accessible via the interactive raw inspector modal.
- **Minimal Monochrome Apple Aesthetic**: Refined black-and-white dashboard with responsive design, fluid transitions, and live polling status cards.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Node.js + Express + TypeScript (`tsx` runtime)
- **Database**: PostgreSQL (via `pg` Pool) + Zero-Config fallback file persistence (`backend/data/db.json`)
- **Worker Queue**: In-memory asynchronous queue worker with retries, status state machines, and audit logging
- **Storage**: Local filesystem storage (`/uploads/`) with public URL serving, structured for S3 / Cloudflare R2 / Google Cloud Storage

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

In the root directory, run:

```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

Or install separately:

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

Copy the example environment configuration:

```bash
cp backend/.env.example backend/.env
```

Default settings are pre-configured to run locally in Mock Mode out-of-the-box with zero credentials needed.

### 3. Start the Application

Open two terminal windows (or run via npm):

```bash
# Terminal 1: Backend Server (Port 5000)
npm run dev:backend

# Terminal 2: Frontend Vite App (Port 5173)
npm run dev:frontend
```

Now open **http://localhost:5173** in your browser!

---

## 📋 Platform Setup & Official API Flows

### 1. Meta (Facebook Pages & Instagram)
- **Facebook Setup**:
  1. Create an app on [developers.facebook.com](https://developers.facebook.com).
  2. Add **Facebook Login for Business**.
  3. Add scopes: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `publish_video`.
  4. Set redirect URI: `http://localhost:5000/api/oauth/meta/callback`.
- **Instagram Setup**:
  1. Connect your Professional / Creator Instagram account to a Facebook Page you manage.
  2. Request `instagram_basic` and `instagram_content_publish`.
  3. Media must be a publicly accessible URL when calling the media container endpoint.

### 2. LinkedIn (Personal Profile & Organizations)
- **LinkedIn Setup**:
  1. Create an app on [linkedin.com/developers](https://www.linkedin.com/developers).
  2. Enable the **Share on LinkedIn** product for `w_member_social`.
  3. Add redirect URI: `http://localhost:5000/api/oauth/linkedin/callback`.
  4. For organization pages, apply for Community Management API approval.

### 3. Google / YouTube
- **YouTube Setup**:
  1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
  2. Enable the **YouTube Data API v3**.
  3. Configure OAuth consent screen and add test users.
  4. Create OAuth 2.0 Web Client credentials and set redirect URI: `http://localhost:5000/api/oauth/google/callback`.
  5. Scopes used: `https://www.googleapis.com/auth/youtube.upload`.

### 4. Twitter / X (API v2)
- **Twitter Setup**:
  1. Create a developer project at [developer.x.com](https://developer.x.com).
  2. Enable **OAuth 2.0 with PKCE** in User Authentication Settings.
  3. Set redirect URI: `http://localhost:5000/api/oauth/twitter/callback`.
  4. Scopes requested: `tweet.read`, `tweet.write`, `users.read`, `offline.access`.
  5. API Endpoint: `POST https://api.twitter.com/2/tweets` (with 280 character limit handling).

---

## 🔒 Feature Flags for Live Publishing

Once you have received App Review approvals, enable real publishing by editing `backend/.env`:

```env
ENABLE_FACEBOOK_REAL=true
ENABLE_INSTAGRAM_REAL=true
ENABLE_LINKEDIN_REAL=true
ENABLE_YOUTUBE_REAL=true
ENABLE_TWITTER_REAL=true
```

When set to `false`, the platform service classes run in **Mock Mode**, simulating container creation, progress latency, and returning mock permalinks.

---

## 🗄️ Database Schema & Migrations

For PostgreSQL deployments, run the migration script:

```bash
psql -U postgres -d your_database -f backend/migrations/schema.sql
```

The database models:
- `users`: User profiles and authentication metadata
- `connected_accounts`: Encrypted OAuth access & refresh tokens per platform
- `media_assets`: Uploaded media files, sizes, types, and URLs
- `post_drafts`: Post master records, scheduled times, and overall status
- `post_targets`: Platform-specific targets (Instagram, Facebook, LinkedIn, YouTube)
- `publish_jobs`: Background worker jobs, attempts, error logs, and API response JSON
- `audit_logs`: Audit trail for compliance, reviews, and monitoring

---

## 🛡️ Production & App Review Checklist

- [x] AES-256-GCM token encryption at rest
- [x] Background job queue separation from HTTP requests
- [x] Per-platform character and format validation
- [x] Pre-flight confirmation modal before publishing
- [x] Raw API audit logs and response recording
- [x] Resilient retry mechanism with error tracking
- [ ] Connect production PostgreSQL instance
- [ ] Deploy frontend and backend to HTTPS domain (e.g. Vercel + Railway / AWS)
- [ ] Submit screencast to Meta, LinkedIn, and Google Cloud reviewers

# System Design: Professionalization

## 1. Authentication Hardening
**Current State**: Middleware checks `dev_bypass` cookie to skip Supabase Auth.
**Target State**: Middleware enforces `supabase.auth.getUser()`.
**Implementation**:
- Remove `dev_bypass` checks in `middleware.ts`.
- Remove `api/analytics/dashboard` bypass.
- Remove `api/dashboard/unified-stats` bypass.
- Update E2E tests to perform **Real Login** via Supabase (headless or UI).

## 2. Real Upload Pipeline
**Current State**: `UploadManager` returns fake URLs `/uploads/placeholder`.
**Target State**: `UploadManager` uploads to Supabase Storage bucket `uploads`.
**Implementation**:
- Use `supabase-js` Storage API.
- Validate MIME types and file size strictly.
- Return public/signed URL from Storage.

## 3. Real Video Processing
**Current State**: `ThumbnailGenerator` returns fake scenes.
**Target State**: Use `fluent-ffmpeg` to spawn `ffprobe` and `ffmpeg`.
**Implementation**:
- `detectScenes`: Use `ffmpeg -filter:v "select='gt(scene,0.4)',showinfo"`.
- `generateSingle`: Extract actual frame at timestamp.
- **Requirement**: `ffmpeg` binary availability in container.

## 4. Real Dashboard Stats
**Current State**: Hardcoded numbers if bypass is active.
**Target State**: SQL Queries for all metrics.
**Implementation**:
- `totalProjects`: `count(*)` from `projects`.
- `activeRenders`: `count(*)` from `render_jobs` where status in (queued, processing).
- `avgRenderTime`: SQL aggregation on `completed_at - started_at`.

## 5. Security & Secrets
- **Rule**: No secret logging.
- **Rule**: `ELEVENLABS_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY` must be loaded from `process.env`.
- **Validation**: Scripts must fail gracefully (status 401/500) if keys are missing, never crashing or logging `undefined`.

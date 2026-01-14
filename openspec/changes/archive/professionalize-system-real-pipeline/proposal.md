# Professionalize System & Real Pipeline

## Goal
To eliminate all mock, stub, and fake implementations from the codebase, ensuring the system operates with 100% real infrastructure (Persistence, Queues, Storage, Rendering, TTS) and is production-ready.

## Context
The current MVP contains numerous shortcuts:
- `dev_bypass` cookies for Auth.
- In-memory maps for Queues and Jobs.
- Fake `UploadManager` returning placeholders.
- Fake `ThumbnailGenerator` returning random data.
- Hardcoded stats in Dashboard APIs.

These prevent true end-to-end verification and production deployment.

## Scope
1.  **Auth Hardening**: Remove all `dev_bypass` logic from Middleware, APIs, and UI.
2.  **Real Uploads**: Implement S3/Supabase Storage in `UploadManager`.
3.  **Real Processing**: Implement `ffprobe`/`ffmpeg` logic in `ThumbnailGenerator`.
4.  **Real Data**: Connect Dashboard Stats to live Supabase counts (Projects, Renders).
5.  **Cleanup**: Remove unused mock files and "fake" test scripts.

## Success Criteria
- [ ] No `dev_bypass` string in codebase (except potentially specifically marked test-only helpers that mock *auth providers*, not bypass middleware).
- [ ] `UploadManager` stores actual files in cloud storage.
- [ ] `ThumbnailGenerator` extracts actual frames from video files.
- [ ] Dashboard shows real numbers from DB.
- [ ] E2E tests pass without `dev_bypass=true` cookie.

## Risks
- **Authentication**: Removing bypass might break local dev flow if not properly configured with real Supabase local/staging instance.
- **Costs**: Real storage/processing involves external services (Supabase, S3).
- **Performance**: Real `ffprobe` operations are slower than mocks.

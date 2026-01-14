# Release Notes: Production Hardening (v7-hardening)

**Date**: 2026-01-14
**Status**: Ready for Staging/Production
**OpenSpec**: `harden-video-pipeline`

## Key Features
- **Definitive Timeouts**: Enforced limits for Render (30m), TTS (60s/slide), and Upload (10m).
- **Idempotency**: Redis-backed idempotent retries for TTS and Storage operations (24h TTL).
- **Concurrency Limits**: Semaphore-based limits (Render=2, TTS=5, Storage=3) to prevent overload.
- **Local Storage Support**: Validated support for `STORAGE_TYPE=local` in production configuration.

## Configuration Changes
- New Environment Variables:
  - `ENABLE_TIMEOUT_ENFORCEMENT=true`
  - `ENABLE_IDEMPOTENCY=true`
  - `ENABLE_CONCURRENCY_LIMITS=true`
  - `REDIS_URL` (Required)
  - `TTS_CONCURRENCY`, `STORAGE_CONCURRENCY`

## Fixes
- Resolved 500 errors in PPTX/Video upload when using Local Storage in production mode.
- Fixed zombie process issues on port 3000 during deployment.

## Known Issues
- TypeScript build has ~846 suppressed errors (legacy codebase). Build succeeds with `skipLibCheck`.
- E2E tests require strict environment synchronization (`.env.production` vs `.env.local`).

## Rollback
- Disable hardening features via env vars if instability occurs.
- See `ROLLBACK_CHECKLIST.md` for details.

# Testing Guide

## Overview

This project uses Playwright for E2E testing with a **Harness (mock) mode** that runs without external dependencies (FFmpeg, Azure, Redis).

## Quick Start

```bash
# Run E2E tests with harness mode (recommended for local dev)
npm run test:e2e:harness
```

## Environment Configuration

### `.env.test` (included)

```bash
RENDER_HARNESS=true       # Use mock render pipeline
E2E_TEST_MODE=true        # Enable test authentication
E2E_TEST_TOKEN=test-token # Test bearer token
```

## Available Test Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e:harness` | Run render E2E tests with harness mode |
| `npm run test:e2e:playwright` | Run all Playwright tests |

## Harness Mode

When `RENDER_HARNESS=true`:
- **MockFrameGenerator** skips real frame generation
- **MockFFmpegExecutor** skips FFmpeg encoding
- **MockVideoUploader** returns mock URLs

Result: Fast, deterministic tests without external services.

## Test Authentication

When `E2E_TEST_MODE=true`:
- API accepts `Bearer test-token` header
- Creates mock test user for auth
- **NEVER enabled in production** (blocked by NODE_ENV check)

### Usage in tests:

```typescript
await request.post('/api/test/render', {
  headers: { 'Authorization': 'Bearer test-token' },
  data: { projectId: 'test-001', slides: [...] }
});
```

## Switching Mock/Real

| Mode | RENDER_HARNESS | Description |
|------|----------------|-------------|
| Mock | `true` | Fast, no external deps |
| Real | `false` (default) | Full pipeline with FFmpeg/Storage |

## File Structure

```
tests/
├── e2e/
│   └── render.spec.ts     # Render pipeline E2E tests
├── fixtures/
│   ├── test-data.json     # Test slide data
│   ├── dummy.mp4          # Placeholder video
│   └── dummy.mp3          # Placeholder audio
├── global-setup.ts
└── global-teardown.ts
```

## Running Tests

### Local Development

```bash
# 1. Start dev server (terminal 1)
cd estudio_ia_videos && npm run dev

# 2. Run tests (terminal 2)
npm run test:e2e:harness
```

### CI/Automated

```bash
# Uses start-server-and-test internally
npm run test:e2e:harness
```

## Troubleshooting

### Tests fail with 404 on /api/test/render

Ensure `E2E_TEST_MODE=true` is set. The test endpoint is disabled by default.

### Harness mode not working

Check `RENDER_HARNESS=true` is in your environment or `.env.test`.

### Auth failures

Verify authorization header format: `Bearer test-token` (exact).

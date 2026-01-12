# Quick Test Guide - Sprint 1 Fixes

Fast reference for verifying all 10 fixes are working correctly.

---

## 🚀 Quick Verification Commands

### Check Services Running
```bash
pm2 status
# Expected: mvp-video = online
```

### Check Database Migration
```bash
psql -h db.imwqhvidwunnsvyrltkb.supabase.co -U postgres -d postgres \
  -c "SELECT column_name FROM information_schema.columns WHERE table_name='render_jobs' AND column_name='idempotency_key';"
# Expected: idempotency_key
```

### Check Redis Connection (if local)
```bash
redis-cli ping
# Expected: PONG (or error if remote)
```

---

## 🧪 Manual Tests

### FIX #1: Real Queue
```bash
# Start render
curl -X POST https://cursostecno.com.br/api/render/start \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-auth-token=..." \
  -d '{"projectId":"YOUR_PROJECT_ID","slides":[]}'

# Expected: Real job ID (not "mock-job-123...")
```

### FIX #2: No Dummy Audio
```bash
# Trigger TTS failure (invalid text or offline service)
# Expected: Job fails with error, NOT silent video

# Check job status
curl https://cursostecno.com.br/api/render/status?jobId=JOB_ID
# Expected: { "status": "failed", "error": "TTS audio generation failed..." }
```

### FIX #3: Mock Endpoints Disabled
```bash
curl https://cursostecno.com.br/api/pptx/process
# Expected: {"error":"...desativado", "status": 501}

curl https://cursostecno.com.br/api/v1/pptx/generate-timeline
# Expected: {"error":"...desativado", "status": 501}
```

### FIX #4: Permissions Enforced
```bash
# User B tries to access User A's project
curl -X POST https://cursostecno.com.br/api/render/start \
  -H "Cookie: user-b-token=..." \
  -d '{"projectId":"user-a-project-id"}'

# Expected: {"error":"Sem permissão...", "status": 403}
```

### FIX #5: File Security
```bash
# Test 1: Invalid file type
curl -X POST https://cursostecno.com.br/api/pptx/upload \
  -F "file=@test.txt" \
  -F "projectId=YOUR_PROJECT_ID"
# Expected: {"error":"Arquivo não é um ZIP válido"}

# Test 2: Valid PPTX
curl -X POST https://cursostecno.com.br/api/pptx/upload \
  -F "file=@presentation.pptx" \
  -F "projectId=YOUR_PROJECT_ID"
# Expected: Success, slides created
```

### FIX #6: Transactions Work
```bash
# Upload PPTX with 10 slides but corrupt last one
# Expected: NO slides in database (rollback)

# Check database
psql -c "SELECT COUNT(*) FROM slides WHERE project_id='PROJECT_ID';"
# Expected: 0 (if failed) or 10 (if succeeded), never 3/10
```

### FIX #7: Optimistic Locking
```bash
# Simulate concurrent edits

# Terminal 1 - User A
curl -X GET https://cursostecno.com.br/api/v1/timeline/multi-track?projectId=ID
# Note the version number

# Terminal 2 - User B (same project)
curl -X GET https://cursostecno.com.br/api/v1/timeline/multi-track?projectId=ID
# Same version number

# Terminal 1 - User A saves
curl -X POST https://cursostecno.com.br/api/v1/timeline/multi-track \
  -d '{"projectId":"ID","tracks":[]}'
# Expected: Success, version incremented

# Terminal 2 - User B saves
curl -X POST https://cursostecno.com.br/api/v1/timeline/multi-track \
  -d '{"projectId":"ID","tracks":[]}'
# Expected: {"error":"Timeline foi modificada...", "status": 409}
```

### FIX #8: Errors Visible
```bash
# Check logs for errors
pm2 logs mvp-video --lines 100 | grep "ERROR"

# Expected: Errors logged with context (not silenced)
```

### FIX #9: Timeout Utilities Exist
```bash
# Check file exists
cat estudio_ia_videos/src/lib/utils/timeout-wrapper.ts | head -20

# Expected: File found with TimeoutError class
```

### FIX #10: Idempotency Works
```bash
# Request 1
curl -X POST https://cursostecno.com.br/api/render/start \
  -H "Idempotency-Key: test-key-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"ID","slides":[]}'
# Note the jobId returned

# Request 2 (same key)
curl -X POST https://cursostecno.com.br/api/render/start \
  -H "Idempotency-Key: test-key-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"ID","slides":[]}'
# Expected: SAME jobId

# Check database
psql -c "SELECT id, idempotency_key FROM render_jobs WHERE idempotency_key LIKE 'test-key-%';"
# Expected: Only 1 job created
```

---

## ✅ Success Indicators

All tests pass if:

1. ✅ Job IDs are real UUIDs (not "mock-job-...")
2. ✅ TTS failures throw errors (not silent videos)
3. ✅ Mock endpoints return 501
4. ✅ Unauthorized access returns 403
5. ✅ Invalid files rejected with clear errors
6. ✅ Database stays consistent (no partial data)
7. ✅ Concurrent edits return 409 conflict
8. ✅ Errors appear in logs with context
9. ✅ Timeout utilities file exists
10. ✅ Same idempotency key returns same job ID

---

## 🚨 Known Issue: Redis

**Redis is not running locally but configured to localhost.**

Fix options:

```bash
# Option A: Install Redis locally
sudo apt-get install redis-server
sudo systemctl start redis-server

# Option B: Use remote Redis
# Edit .env:
REDIS_URL=redis://your-remote-redis-url:6379

# Then restart
pm2 restart all
```

Without Redis, render queue will fail. Install before production use.

---

## 📞 Support

If any test fails:

1. Check logs: `pm2 logs mvp-video`
2. Check database connection: `psql -c "SELECT 1;"`
3. Check Redis: `redis-cli ping`
4. Review error messages in browser DevTools
5. Check [SPRINT_1_IMPLEMENTATION_COMPLETE.md](SPRINT_1_IMPLEMENTATION_COMPLETE.md) for details

---

**Last Updated:** 2026-01-12

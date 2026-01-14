# Rollback Checklist: Production Hardening

**Trigger**: High error rates (500s), persistent timeouts, or blocked deployment.

## Rapid Rollback (Feature Flags)
If issues are isolated to new features, disable them via environment variables in Vercel/Production:

1. **Disable Timeouts**
   ```bash
   ENABLE_TIMEOUT_ENFORCEMENT=false
   ```
2. **Disable Idempotency**
   ```bash
   ENABLE_IDEMPOTENCY=false
   ```
3. **Disable Concurrency Limits**
   ```bash
   ENABLE_CONCURRENCY_LIMITS=false
   ```

## Full Rollback (Code Revert)
If application fails to start or critical flows are broken despite flags:

1. **Revert Git Commit**
   ```bash
   git revert HEAD
   git push origin main
   ```
2. **Verify Previous Build**
   - Check if previous deployment is healthy in Vercel.
   - Promote previous deployment to Production.

## Verification After Rollback
- [ ] Verify Video Uploads work (p50 latency < 5s)
- [ ] Verify PPTX Processing works
- [ ] Verify Dashboard loads without 500s

## Contact
- Ops Team: @ops-team
- Lead Dev: @antigravity

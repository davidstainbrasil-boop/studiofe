# Spec Delta: Secure Authentication

## MODIFIED Requirements

### Request Authentication
- **Requirement**: All API requests to `/api/dashboard/*` and `/api/v1/*` MUST be authenticated via Supabase Session.
- **Requirement**: The `dev_bypass` cookie mechanism MUST be removed entirely.
- **Scenario**:
  - GIVEN a request to `/api/dashboard/unified-stats`
  - AND no session cookie is present
  - AND `dev_bypass=true` cookie IS present
  - ALWAYS return 401 Unauthorized (Bypass rejected/ignored).

### Test Authentication
- **Requirement**: E2E tests MUST authenticate using a real Supabase user via UI or API login helper, NOT via Cookie injection.

# Design: Harden Security - Critical Vulnerabilities

## Context

This change addresses critical security vulnerabilities identified during production readiness analysis. The vulnerabilities span multiple areas: credential management, route protection, SQL injection prevention, configuration management, and RPC function security.

## Goals

1. **Eliminate credential exposure risk** - No hardcoded credentials in source code
2. **Protect development routes** - Ensure development-only features are never accessible in production
3. **Prevent SQL injection** - Validate all dynamic table names against whitelist
4. **Improve configuration security** - Provide clear documentation for secure environment setup
5. **Document dangerous functions** - Ensure RPC functions with elevated privileges are properly secured

## Non-Goals

- Comprehensive security audit (out of scope)
- Implementation of new security features (only hardening existing code)
- Migration to different authentication system
- Complete removal of `exec_sql` function (documentation and securing only)

## Decisions

### Decision 1: Table Name Whitelist Approach

**What**: Use a static whitelist of allowed table names instead of dynamic validation or regex patterns.

**Why**: 
- Simple and explicit - easy to audit
- Prevents SQL injection through table name manipulation
- Fails fast with clear error messages
- Easy to maintain and extend

**Alternatives Considered**:
- Regex validation: Too complex, harder to audit
- Dynamic schema inspection: Performance overhead, still vulnerable
- Parameterized table names: Not supported by PostgreSQL

**Trade-offs**:
- ✅ Simple and secure
- ✅ Fast validation
- ❌ Requires manual updates when adding tables
- ❌ May break legacy code using non-standard tables

### Decision 2: Dual Protection for Auto-Login Route

**What**: Require both `NODE_ENV !== 'production'` AND `NEXT_PUBLIC_ENABLE_AUTO_LOGIN === 'true'`.

**Why**:
- Defense in depth - multiple layers of protection
- Explicit opt-in prevents accidental exposure
- `NODE_ENV` can be misconfigured, flag provides extra safety
- Logging helps detect misconfiguration

**Alternatives Considered**:
- Single `NODE_ENV` check: Too fragile, can be misconfigured
- IP whitelist: Complex, not needed for this use case
- Remove route entirely: Still needed for development

**Trade-offs**:
- ✅ Multiple layers of protection
- ✅ Explicit opt-in
- ❌ Requires environment variable configuration
- ❌ Slightly more complex

### Decision 3: Comprehensive .env.example

**What**: Create detailed `.env.example` with all variables, organized by category, with security warnings.

**Why**:
- Reduces misconfiguration risk
- Improves developer onboarding
- Documents all configuration options
- Provides security guidance

**Alternatives Considered**:
- Minimal template: Insufficient for complex system
- Separate docs: Harder to maintain, less discoverable
- Auto-generation: Complex, may miss manual configuration

**Trade-offs**:
- ✅ Comprehensive documentation
- ✅ Easy to maintain
- ❌ Large file (but acceptable)
- ❌ Requires manual updates

### Decision 4: Documentation Over Removal for exec_sql

**What**: Document security risks and provide securing scripts instead of removing the function.

**Why**:
- Function is needed for migrations in some environments
- Removal would break existing migration scripts
- Documentation provides immediate value
- Can be migrated later to Supabase Migrations

**Alternatives Considered**:
- Remove function: Would break existing workflows
- Create safer version: More complex, may not be needed
- Migrate to Supabase Migrations: Larger change, out of scope

**Trade-offs**:
- ✅ Immediate security improvement through documentation
- ✅ Doesn't break existing workflows
- ❌ Function still exists and is dangerous if misconfigured
- ❌ Requires manual verification

## Risks / Trade-offs

### Risk 1: Breaking Legacy Code

**Risk**: Table name whitelist may break code using non-standard table names.

**Mitigation**: 
- Include all known tables in whitelist
- Clear error messages guide developers
- Easy to add tables to whitelist

### Risk 2: Environment Misconfiguration

**Risk**: Developers may misconfigure environment variables.

**Mitigation**:
- Comprehensive `.env.example` with clear instructions
- Validation scripts can be added later
- Clear error messages when variables are missing

### Risk 3: exec_sql Still Dangerous

**Risk**: Function remains dangerous even with documentation.

**Mitigation**:
- Documentation includes verification scripts
- Clear warnings about risks
- Recommendation to migrate to Supabase Migrations
- Can be secured with SQL scripts provided

## Migration Plan

### Phase 1: Immediate (Completed)
- Remove hardcoded credentials
- Protect auto-login route
- Add table name validation
- Create `.env.example`
- Document RPC security

### Phase 2: Short-term (Recommended)
- Audit all database queries for non-whitelisted tables
- Add missing tables to whitelist
- Verify RPC permissions in production
- Add environment variable validation script

### Phase 3: Long-term (Future)
- Migrate to Supabase Migrations
- Remove `exec_sql` function
- Implement automated security scanning
- Add security tests to CI/CD

## Open Questions

1. **Q**: Should we add automated security scanning to CI/CD?
   **A**: Out of scope for this change, but recommended for future.

2. **Q**: Should we create a safer version of `exec_sql`?
   **A**: Documentation is sufficient for now. Migration to Supabase Migrations is preferred long-term solution.

3. **Q**: Should we add environment variable validation at startup?
   **A**: Good idea, but out of scope. Can be added in follow-up change.

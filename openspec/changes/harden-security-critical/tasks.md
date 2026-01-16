# Tasks: Harden Security - Critical Vulnerabilities

## 1. Remove Hardcoded Credentials

- [x] 1.1 Remove hardcoded `DATABASE_URL` from `estudio_ia_videos/src/app/scripts/check_user.ts`
- [x] 1.2 Add validation that throws error if `DATABASE_URL` is not set
- [x] 1.3 Verify no other hardcoded credentials exist in source code
- [x] 1.4 Test script fails gracefully when `DATABASE_URL` is missing

## 2. Protect Auto-Login Route

- [x] 2.1 Verify existing `NODE_ENV === 'production'` guard works
- [x] 2.2 Add `NEXT_PUBLIC_ENABLE_AUTO_LOGIN` flag requirement
- [x] 2.3 Add logging for unauthorized access attempts
- [x] 2.4 Test route is blocked in production environment
- [x] 2.5 Test route requires explicit flag in development

## 3. Prevent SQL Injection

- [x] 3.1 Create `ALLOWED_TABLES` whitelist constant
- [x] 3.2 Implement `validateTableName()` function
- [x] 3.3 Add validation to `findById()` function
- [x] 3.4 Add validation to `findAll()` function
- [x] 3.5 Add validation to `insert()` function
- [x] 3.6 Add validation to `update()` function
- [x] 3.7 Add validation to `remove()` function
- [x] 3.8 Add validation to `count()` function
- [x] 3.9 Add validation to `exists()` function
- [x] 3.10 Test validation throws error for non-whitelisted tables

## 4. Create Environment Template

- [x] 4.1 Create `.env.example` file structure
- [x] 4.2 Document all Supabase variables
- [x] 4.3 Document all database variables
- [x] 4.4 Document all Redis variables
- [x] 4.5 Document all authentication variables
- [x] 4.6 Document all TTS service variables
- [x] 4.7 Document all optional integrations
- [x] 4.8 Add security warnings for sensitive variables
- [x] 4.9 Add quick start guide
- [x] 4.10 Add checklist of required variables

## 5. Document RPC Security

- [x] 5.1 Create `SECURITY_RPC_EXEC_SQL.md` documentation
- [x] 5.2 Document security risks
- [x] 5.3 Provide SQL scripts to verify permissions
- [x] 5.4 Provide SQL scripts to fix permissions
- [x] 5.5 Document safe usage patterns
- [x] 5.6 Document alternatives (Supabase Migrations)
- [x] 5.7 Add examples of correct and incorrect usage
- [x] 5.8 Add maintenance and audit guidelines

## 6. Validation and Testing

- [x] 6.1 Run grep to verify no hardcoded credentials
- [x] 6.2 Test auto-login route protection
- [x] 6.3 Test SQL injection prevention
- [x] 6.4 Verify `.env.example` completeness
- [x] 6.5 Run TypeScript type checking
- [x] 6.6 Run linter validation

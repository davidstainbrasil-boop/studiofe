# Proposal: Harden Security - Critical Vulnerabilities

## Overview

This change addresses critical security vulnerabilities identified in the production readiness analysis, focusing on removing hardcoded credentials, protecting development-only routes, preventing SQL injection, and establishing secure configuration practices.

## Problem Statement

The system has several critical security issues that must be addressed before production deployment:

1. **Hardcoded Credentials**: Database connection strings with passwords are hardcoded in source code (`check_user.ts`)
2. **Unprotected Development Routes**: Auto-login route with test credentials is accessible without proper production guards
3. **SQL Injection Risk**: Database helper functions accept table names without validation, allowing potential SQL injection
4. **Missing Environment Documentation**: No comprehensive `.env.example` file, making it difficult for developers to configure the system securely
5. **Unsecured RPC Function**: The `exec_sql` RPC function has elevated privileges but lacks security documentation and proper access controls

## Impact

**Security Risk Level**: CRITICAL

If not addressed:
- Credentials could be exposed in version control
- Unauthorized access via development routes in production
- Database compromise through SQL injection
- Misconfiguration leading to security vulnerabilities
- Unauthorized SQL execution via RPC function

## Proposed Changes

### 1. Remove Hardcoded Credentials
- Remove hardcoded `DATABASE_URL` from `check_user.ts`
- Add validation that fails gracefully if `DATABASE_URL` is not set
- Ensure all scripts use environment variables exclusively

### 2. Protect Auto-Login Route
- Maintain existing `NODE_ENV === 'production'` guard
- Add explicit flag `NEXT_PUBLIC_ENABLE_AUTO_LOGIN` requirement
- Add logging for unauthorized access attempts
- Ensure route is completely disabled in production

### 3. Prevent SQL Injection
- Create whitelist of allowed table names
- Add validation function `validateTableName()`
- Apply validation to all database helper functions (`findById`, `findAll`, `insert`, `update`, `remove`, `count`, `exists`)

### 4. Create Environment Template
- Create comprehensive `.env.example` file
- Document all required and optional variables
- Include security warnings for sensitive variables
- Provide quick start guide

### 5. Document RPC Security
- Create security documentation for `exec_sql` function
- Provide SQL scripts to verify and fix permissions
- Document safe usage patterns
- Recommend migration to Supabase Migrations

## Affected Specs

- **NEW**: `security` capability - Security hardening requirements

## Breaking Changes

**MINOR**: Database helper functions will now throw errors if table name is not in whitelist. This may break legacy code that uses non-standard table names. All standard tables are included in the whitelist.

## Migration Path

1. Review any custom database queries using non-standard table names
2. Add missing tables to whitelist if they are legitimate
3. Update scripts to use environment variables instead of hardcoded values
4. Configure production environment with proper security flags

## Success Criteria

- [ ] No hardcoded credentials in source code
- [ ] Auto-login route blocked in production with logging
- [ ] All database functions validate table names
- [ ] `.env.example` file created and complete
- [ ] RPC security documented with verification scripts
- [ ] All security validations pass

# Security Hardening Specification

## ADDED Requirements

### Requirement: No Hardcoded Credentials

The system SHALL NOT contain hardcoded credentials (passwords, API keys, connection strings) in source code.

#### Scenario: Script fails when DATABASE_URL is missing

**GIVEN** a script that requires database connection  
**WHEN** the script executes without `DATABASE_URL` environment variable set  
**THEN** the script SHALL fail immediately with a clear error message  
**AND** the error message SHALL indicate which variable is missing  
**AND** the error message SHALL provide guidance on how to configure it

#### Scenario: All credentials come from environment variables

**GIVEN** any script or application code  
**WHEN** credentials are needed (database, API keys, etc.)  
**THEN** the code SHALL read credentials from environment variables only  
**AND** the code SHALL NOT contain hardcoded credential values  
**AND** the code SHALL validate that required environment variables are set before use

---

### Requirement: Protected Development Routes

Development-only routes SHALL be completely inaccessible in production environments.

#### Scenario: Auto-login route blocked in production

**GIVEN** the system is running in production (`NODE_ENV=production`)  
**WHEN** a request is made to `/api/auth/auto-login`  
**THEN** the route SHALL return HTTP 403 Forbidden  
**AND** the response SHALL include error message "Esta rota está desabilitada em produção"  
**AND** the attempt SHALL be logged with warning level

#### Scenario: Auto-login requires explicit flag in development

**GIVEN** the system is running in development (`NODE_ENV !== 'production'`)  
**WHEN** a request is made to `/api/auth/auto-login`  
**AND** `NEXT_PUBLIC_ENABLE_AUTO_LOGIN` is not set to `'true'`  
**THEN** the route SHALL return HTTP 403 Forbidden  
**AND** the response SHALL include error message "Auto-login desabilitado neste ambiente"

#### Scenario: Auto-login works only with explicit flag

**GIVEN** the system is running in development  
**AND** `NEXT_PUBLIC_ENABLE_AUTO_LOGIN` is set to `'true'`  
**AND** test users exist in the database  
**WHEN** a request is made to `/api/auth/auto-login?role=admin`  
**THEN** the route SHALL authenticate the user  
**AND** the user SHALL be redirected to the dashboard

---

### Requirement: SQL Injection Prevention

Database helper functions SHALL validate table names against a whitelist to prevent SQL injection.

#### Scenario: Valid table name is accepted

**GIVEN** a database helper function (`findById`, `findAll`, `insert`, `update`, `remove`, `count`, `exists`)  
**WHEN** the function is called with a table name that exists in the whitelist  
**THEN** the function SHALL execute the query normally  
**AND** the function SHALL return the expected result

#### Scenario: Invalid table name is rejected

**GIVEN** a database helper function  
**WHEN** the function is called with a table name that is NOT in the whitelist  
**THEN** the function SHALL throw an error immediately  
**AND** the error message SHALL indicate which table name was rejected  
**AND** the error message SHALL list the allowed table names  
**AND** no SQL query SHALL be executed

#### Scenario: Whitelist includes all standard tables

**GIVEN** the system's standard database schema  
**WHEN** the whitelist is checked  
**THEN** it SHALL include at minimum: `users`, `projects`, `slides`, `render_jobs`, `pptx_uploads`, `pptx_slides`, `analytics_events`, `nr_templates`, `nr_modules`, `courses`, `videos`, `user_progress`, `timelines`, `project_history`, `project_versions`, `avatar_models`, `notifications`, `comments`, `collaborations`

---

### Requirement: Environment Configuration Documentation

The system SHALL provide comprehensive documentation for environment variable configuration.

#### Scenario: .env.example file exists and is complete

**GIVEN** a developer setting up the system  
**WHEN** they look for environment configuration documentation  
**THEN** a `.env.example` file SHALL exist  
**AND** it SHALL contain all required environment variables  
**AND** it SHALL contain optional environment variables with descriptions  
**AND** it SHALL include security warnings for sensitive variables  
**AND** it SHALL be organized by category (Supabase, Database, Redis, etc.)  
**AND** it SHALL include a quick start guide  
**AND** it SHALL include a checklist of required variables

#### Scenario: Sensitive variables are clearly marked

**GIVEN** the `.env.example` file  
**WHEN** a developer reads it  
**THEN** variables containing secrets (API keys, passwords, tokens) SHALL be clearly marked  
**AND** warnings SHALL indicate that these values must not be committed to version control  
**AND** warnings SHALL indicate that `NEXT_PUBLIC_*` variables are exposed to the browser

---

### Requirement: RPC Function Security Documentation

Dangerous RPC functions with elevated privileges SHALL have comprehensive security documentation.

#### Scenario: exec_sql function has security documentation

**GIVEN** the `exec_sql` RPC function exists in the database  
**WHEN** a developer or administrator needs to understand its security implications  
**THEN** documentation SHALL exist explaining the security risks  
**AND** documentation SHALL provide SQL scripts to verify current permissions  
**AND** documentation SHALL provide SQL scripts to secure the function  
**AND** documentation SHALL include examples of correct and incorrect usage  
**AND** documentation SHALL recommend safer alternatives (e.g., Supabase Migrations)

#### Scenario: Security documentation includes verification steps

**GIVEN** the security documentation for `exec_sql`  
**WHEN** an administrator wants to verify the function is properly secured  
**THEN** the documentation SHALL provide SQL queries to check permissions  
**AND** the documentation SHALL provide expected results for a secure configuration  
**AND** the documentation SHALL provide steps to fix insecure configurations

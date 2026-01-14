# Spec Delta: Real Unified Dashboard Data

## MODIFIED Requirements

### Dashboard Statistics
- **Requirement**: `/api/dashboard/unified-stats` MUST query the PostgreSQL database for real-time metrics.
- **Requirement**: It MUST NOT return hardcoded mock numbers (e.g. "1234 views") based on `dev_bypass`.
- **Scenario**:
  - GIVEN 3 projects in the `projects` table for the user
  - WHEN `GET /api/dashboard/unified-stats` is called
  - THEN `totalProjects` MUST be 3.

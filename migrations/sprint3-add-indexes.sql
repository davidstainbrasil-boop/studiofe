-- Sprint 3: Database Indexes for Performance Optimization
-- Add missing indexes for commonly queried columns

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id_status
ON public.projects(user_id, status);

CREATE INDEX IF NOT EXISTS idx_projects_created_at
ON public.projects(created_at DESC);

-- Render jobs table indexes
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id_status
ON public.render_jobs(project_id, status);

CREATE INDEX IF NOT EXISTS idx_render_jobs_user_id_status
ON public.render_jobs(user_id, status);

CREATE INDEX IF NOT EXISTS idx_render_jobs_created_at
ON public.render_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_render_jobs_status_created
ON public.render_jobs(status, created_at DESC);

-- Slides table indexes
CREATE INDEX IF NOT EXISTS idx_slides_project_id_order
ON public.slides(project_id, order_index ASC);

-- Timelines table indexes (if exists)
CREATE INDEX IF NOT EXISTS idx_timelines_project_id
ON public.timelines(project_id);

CREATE INDEX IF NOT EXISTS idx_timelines_updated_at
ON public.timelines(updated_at DESC);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email
ON public.users(email);

-- Verify indexes were created
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

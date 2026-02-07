-- Migration: API Keys and Usage Tracking Tables
-- Created: 2026-02-06
-- Description: Creates tables for API key management and usage tracking

-- =============================================================================
-- API Keys Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(10) NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  rate_limit INTEGER NOT NULL DEFAULT 10,
  quota_limit INTEGER NOT NULL DEFAULT 100,
  quota_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast key lookup by prefix
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

-- =============================================================================
-- API Usage Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status INTEGER NOT NULL,
  duration INTEGER, -- milliseconds
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for reporting
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key_id ON api_usage(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- =============================================================================
-- Video Generation Jobs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(255) NOT NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  stage VARCHAR(50),
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  settings JSONB NOT NULL,
  slides JSONB NOT NULL,
  video_url TEXT,
  subtitles_url TEXT,
  duration NUMERIC,
  file_size BIGINT,
  error TEXT,
  webhook_url TEXT,
  webhook_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for job lookup
CREATE INDEX IF NOT EXISTS idx_video_jobs_project_id ON video_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_user_id ON video_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_video_jobs_created_at ON video_jobs(created_at);

-- =============================================================================
-- Functions
-- =============================================================================

-- Function to increment API quota
CREATE OR REPLACE FUNCTION increment_api_quota(key_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET quota_used = quota_used + 1,
      updated_at = NOW()
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly quotas (call from cron)
CREATE OR REPLACE FUNCTION reset_monthly_quotas()
RETURNS VOID AS $$
BEGIN
  UPDATE api_keys
  SET quota_used = 0,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER video_jobs_updated_at
  BEFORE UPDATE ON video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- Row Level Security
-- =============================================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_jobs ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Users can view own API keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- API Usage policies
CREATE POLICY "Users can view own usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Video Jobs policies
CREATE POLICY "Users can view own jobs"
  ON video_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own jobs"
  ON video_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- Service Role Bypass (for API operations)
-- =============================================================================

-- Allow service role to bypass RLS
CREATE POLICY "Service role can do anything on api_keys"
  ON api_keys
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on api_usage"
  ON api_usage
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do anything on video_jobs"
  ON video_jobs
  USING (auth.jwt() ->> 'role' = 'service_role');

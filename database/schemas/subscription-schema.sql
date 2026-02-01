-- =============================================================================
-- Subscription and Usage Tracking Tables
-- MVP Vídeos TécnicoCursos v7
-- =============================================================================

-- Subscriptions table - stores user subscription info
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Plan info
    plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete', 'expired', 'paused')),
    billing_period VARCHAR(10) DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
    
    -- Stripe IDs
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    
    -- Period tracking
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id)
);

-- Usage tracking table - monthly usage per user
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Usage counters
    videos_created INTEGER NOT NULL DEFAULT 0,
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    tts_minutes_used INTEGER NOT NULL DEFAULT 0,
    
    -- Period
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints - one record per user per period
    CONSTRAINT usage_tracking_user_period_unique UNIQUE (user_id, period_start)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(period_start, period_end);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions FOR ALL
    USING (auth.role() = 'service_role');

-- Users can read their own usage
CREATE POLICY "Users can read own usage"
    ON usage_tracking FOR SELECT
    USING (auth.uid() = user_id);

-- Service role can manage all usage
CREATE POLICY "Service role can manage usage"
    ON usage_tracking FOR ALL
    USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to usage_tracking
DROP TRIGGER IF EXISTS update_usage_tracking_updated_at ON usage_tracking;
CREATE TRIGGER update_usage_tracking_updated_at
    BEFORE UPDATE ON usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to get current plan limits
CREATE OR REPLACE FUNCTION get_plan_limits(plan_name VARCHAR)
RETURNS TABLE (
    videos_per_month INTEGER,
    storage_gb INTEGER,
    tts_minutes INTEGER,
    max_resolution VARCHAR,
    has_avatar BOOLEAN,
    has_watermark BOOLEAN,
    has_api_access BOOLEAN
) AS $$
BEGIN
    CASE plan_name
        WHEN 'free' THEN
            RETURN QUERY SELECT 1, 1, 5, '720p'::VARCHAR, FALSE, TRUE, FALSE;
        WHEN 'pro' THEN
            RETURN QUERY SELECT 10, 20, 60, '1080p'::VARCHAR, TRUE, FALSE, FALSE;
        WHEN 'business' THEN
            RETURN QUERY SELECT 999999, 100, 500, '4k'::VARCHAR, TRUE, FALSE, TRUE;
        ELSE
            RETURN QUERY SELECT 1, 1, 5, '720p'::VARCHAR, FALSE, TRUE, FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can create video
CREATE OR REPLACE FUNCTION can_create_video(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan VARCHAR;
    v_limit INTEGER;
    v_current INTEGER;
BEGIN
    -- Get user's plan
    SELECT COALESCE(plan, 'free') INTO v_plan
    FROM subscriptions
    WHERE user_id = p_user_id;
    
    IF v_plan IS NULL THEN
        v_plan := 'free';
    END IF;
    
    -- Get limit for plan
    SELECT videos_per_month INTO v_limit
    FROM get_plan_limits(v_plan);
    
    -- Get current usage this month
    SELECT COALESCE(videos_created, 0) INTO v_current
    FROM usage_tracking
    WHERE user_id = p_user_id
      AND period_start <= NOW()
      AND period_end >= NOW();
    
    IF v_current IS NULL THEN
        v_current := 0;
    END IF;
    
    RETURN v_current < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

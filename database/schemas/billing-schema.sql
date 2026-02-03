-- ============================================================================
-- BILLING TABLES FOR STRIPE INTEGRATION
-- Sistema de monetização com planos e subscriptions
-- ============================================================================

-- Drop existing tables if recreating
-- DROP TABLE IF EXISTS payment_history CASCADE;
-- DROP TABLE IF EXISTS user_billing CASCADE;

-- ============================================================================
-- USER BILLING TABLE
-- Armazena dados de billing do usuário
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe IDs
  stripe_customer_id TEXT UNIQUE,
  subscription_id TEXT,
  
  -- Plan info
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'business', 'enterprise')),
  subscription_status TEXT CHECK (subscription_status IN (
    'active', 'canceled', 'incomplete', 'incomplete_expired', 
    'past_due', 'trialing', 'unpaid', 'paused'
  )),
  
  -- Subscription dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ,
  
  -- Usage tracking
  usage JSONB DEFAULT '{"videosThisMonth": 0, "storageUsedGB": 0, "lastResetDate": null}'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_billing UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_billing_stripe_customer ON user_billing(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_user_id ON user_billing(user_id);
CREATE INDEX IF NOT EXISTS idx_user_billing_plan ON user_billing(plan);

-- ============================================================================
-- PAYMENT HISTORY TABLE
-- Histórico de pagamentos para auditoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe references
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Payment details
  amount INTEGER NOT NULL, -- em centavos
  currency TEXT DEFAULT 'brl',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
  payment_method TEXT, -- 'card', 'pix', 'boleto'
  
  -- Additional info
  description TEXT,
  attempt_count INTEGER DEFAULT 1,
  failure_reason TEXT,
  receipt_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for queries
CREATE INDEX IF NOT EXISTS idx_payment_history_user ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON payment_history(created_at DESC);

-- ============================================================================
-- COUPONS TABLE
-- Cupons de desconto (sincronizado com Stripe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe reference
  stripe_coupon_id TEXT UNIQUE,
  stripe_promotion_code TEXT,
  
  -- Coupon details
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  percent_off INTEGER CHECK (percent_off > 0 AND percent_off <= 100),
  amount_off INTEGER CHECK (amount_off > 0),
  currency TEXT DEFAULT 'brl',
  
  -- Duration
  duration TEXT NOT NULL CHECK (duration IN ('once', 'repeating', 'forever')),
  duration_in_months INTEGER,
  
  -- Limits
  max_redemptions INTEGER,
  times_redeemed INTEGER DEFAULT 0,
  
  -- Validity
  valid BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_valid ON coupons(valid);

-- ============================================================================
-- SUBSCRIPTION EVENTS TABLE
-- Log de eventos de subscription para auditoria
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE,
  
  -- Data
  previous_plan TEXT,
  new_plan TEXT,
  amount INTEGER,
  
  -- Raw event data
  event_data JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- ============================================================================
-- BILLING ROLES (extend existing roles table)
-- ============================================================================

-- Add billing-specific roles if not exists
INSERT INTO roles (name, description, created_at)
VALUES 
  ('pro_user', 'Usuário com plano Pro', NOW()),
  ('business_user', 'Usuário com plano Business', NOW()),
  ('enterprise_user', 'Usuário com plano Enterprise', NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE user_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- User billing policies
CREATE POLICY "Users can view own billing" ON user_billing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage billing" ON user_billing
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Payment history policies
CREATE POLICY "Users can view own payments" ON payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments" ON payment_history
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Coupons are public read
CREATE POLICY "Anyone can view valid coupons" ON coupons
  FOR SELECT USING (valid = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

CREATE POLICY "Service role can manage coupons" ON coupons
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Subscription events
CREATE POLICY "Users can view own events" ON subscription_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage events" ON subscription_events
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to increment video usage
CREATE OR REPLACE FUNCTION increment_video_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE user_billing
  SET 
    usage = jsonb_set(
      usage,
      '{videosThisMonth}',
      to_jsonb(COALESCE((usage->>'videosThisMonth')::int, 0) + 1)
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset monthly usage (called by cron)
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS VOID AS $$
BEGIN
  UPDATE user_billing
  SET 
    usage = jsonb_set(
      jsonb_set(usage, '{videosThisMonth}', '0'),
      '{lastResetDate}',
      to_jsonb(NOW()::text)
    ),
    updated_at = NOW()
  WHERE subscription_status = 'active'
    AND current_period_start <= NOW()
    AND (usage->>'lastResetDate')::timestamptz < current_period_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can create video
CREATE OR REPLACE FUNCTION can_create_video(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan TEXT;
  v_usage INT;
  v_limit INT;
BEGIN
  SELECT plan, (usage->>'videosThisMonth')::int
  INTO v_plan, v_usage
  FROM user_billing
  WHERE user_id = p_user_id;
  
  -- Get limit based on plan
  v_limit := CASE v_plan
    WHEN 'free' THEN 1
    WHEN 'pro' THEN 10
    WHEN 'business' THEN 50
    WHEN 'enterprise' THEN -1 -- unlimited
    ELSE 1
  END;
  
  -- Check if under limit
  IF v_limit = -1 THEN
    RETURN TRUE;
  END IF;
  
  RETURN COALESCE(v_usage, 0) < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-create billing record on user creation
CREATE OR REPLACE FUNCTION create_user_billing()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_billing (user_id, plan)
  VALUES (NEW.id, 'free')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_billing ON auth.users;
CREATE TRIGGER on_auth_user_created_billing
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_billing();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE user_billing IS 'Dados de billing e subscription dos usuários';
COMMENT ON TABLE payment_history IS 'Histórico de pagamentos para auditoria';
COMMENT ON TABLE coupons IS 'Cupons de desconto sincronizados com Stripe';
COMMENT ON TABLE subscription_events IS 'Log de eventos de subscription';

COMMENT ON FUNCTION increment_video_usage IS 'Incrementa contador de vídeos do mês';
COMMENT ON FUNCTION reset_monthly_usage IS 'Reseta contadores mensais (executar via cron)';
COMMENT ON FUNCTION can_create_video IS 'Verifica se usuário pode criar vídeo baseado no plano';

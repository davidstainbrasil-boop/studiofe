-- ============================================
-- MONETIZAÇÃO: Tabelas de Subscriptions e Plans
-- Executar no Supabase SQL Editor
-- ============================================

-- Tabela de Planos
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_brl INT NOT NULL DEFAULT 0, -- em centavos (9700 = R$ 97,00)
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  video_limit INT NOT NULL DEFAULT 1, -- -1 = ilimitado
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO plans (id, name, description, price_brl, video_limit, features) VALUES
  ('free', 'Grátis', 'Para experimentar a plataforma', 0, 1, '{
    "resolution": "720p",
    "templates": 5,
    "tts_voices": 2,
    "avatar": false,
    "watermark": true,
    "support": "community"
  }'),
  ('pro', 'Pro', 'Para profissionais e pequenas equipes', 9700, 10, '{
    "resolution": "1080p",
    "templates": 38,
    "tts_voices": 10,
    "avatar": true,
    "lip_sync": true,
    "watermark": false,
    "scorm_export": true,
    "support": "email"
  }'),
  ('business', 'Business', 'Para consultorias e empresas', 29700, -1, '{
    "resolution": "4k",
    "templates": "all",
    "tts_voices": "all",
    "voice_cloning": true,
    "avatar": true,
    "lip_sync": true,
    "watermark": false,
    "whitelabel": true,
    "api_access": true,
    "multi_user": true,
    "scorm_export": true,
    "support": "priority"
  }')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_brl = EXCLUDED.price_brl,
  video_limit = EXCLUDED.video_limit,
  features = EXCLUDED.features,
  updated_at = NOW();

-- Tabela de Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Plano atual
  plan TEXT NOT NULL DEFAULT 'free' REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  
  -- Período de billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Usage tracking
  videos_used_this_month INT DEFAULT 0,
  videos_used_total INT DEFAULT 0,
  last_video_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_timestamp ON subscriptions;
CREATE TRIGGER update_subscriptions_timestamp
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_subscription_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver apenas sua própria subscription
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Usuário pode inserir sua própria subscription (criada no signup)
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Updates são feitos pelo service_role (webhook do Stripe)
-- Não permitir update direto pelo usuário
CREATE POLICY "Service role can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (true); -- service_role bypassa RLS

-- Todos podem ver os planos (são públicos)
CREATE POLICY "Anyone can view plans"
  ON plans FOR SELECT
  USING (true);

-- Apenas admins podem modificar planos
CREATE POLICY "Admins can modify plans"
  ON plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- ============================================
-- FUNÇÃO: Verificar limite de vídeos
-- ============================================

CREATE OR REPLACE FUNCTION check_video_limit(p_user_id UUID)
RETURNS TABLE (
  can_create BOOLEAN,
  videos_used INT,
  video_limit INT,
  plan_name TEXT
) AS $$
DECLARE
  v_subscription RECORD;
  v_plan RECORD;
BEGIN
  -- Buscar subscription do usuário
  SELECT * INTO v_subscription
  FROM subscriptions
  WHERE user_id = p_user_id;
  
  -- Se não tem subscription, criar uma free
  IF NOT FOUND THEN
    INSERT INTO subscriptions (user_id, plan, status)
    VALUES (p_user_id, 'free', 'active')
    RETURNING * INTO v_subscription;
  END IF;
  
  -- Buscar plano
  SELECT * INTO v_plan
  FROM plans
  WHERE id = v_subscription.plan;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    (v_plan.video_limit = -1 OR v_subscription.videos_used_this_month < v_plan.video_limit) AS can_create,
    v_subscription.videos_used_this_month AS videos_used,
    v_plan.video_limit,
    v_plan.name AS plan_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: Incrementar uso de vídeo
-- ============================================

CREATE OR REPLACE FUNCTION increment_video_usage(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_can_create BOOLEAN;
BEGIN
  -- Verificar limite
  SELECT can_create INTO v_can_create
  FROM check_video_limit(p_user_id);
  
  IF NOT v_can_create THEN
    RETURN FALSE;
  END IF;
  
  -- Incrementar contadores
  UPDATE subscriptions
  SET 
    videos_used_this_month = videos_used_this_month + 1,
    videos_used_total = videos_used_total + 1,
    last_video_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNÇÃO: Reset mensal de uso (para cron job)
-- ============================================

CREATE OR REPLACE FUNCTION reset_monthly_video_usage()
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE subscriptions
  SET videos_used_this_month = 0
  WHERE current_period_end <= NOW()
  OR current_period_end IS NULL;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- VIEW: Subscription com detalhes do plano
-- ============================================

CREATE OR REPLACE VIEW subscription_details AS
SELECT 
  s.id,
  s.user_id,
  s.plan,
  s.status,
  s.videos_used_this_month,
  s.videos_used_total,
  s.current_period_end,
  p.name AS plan_name,
  p.price_brl,
  p.video_limit,
  p.features,
  CASE 
    WHEN p.video_limit = -1 THEN TRUE
    WHEN s.videos_used_this_month < p.video_limit THEN TRUE
    ELSE FALSE
  END AS can_create_video,
  CASE 
    WHEN p.video_limit = -1 THEN -1
    ELSE p.video_limit - s.videos_used_this_month
  END AS videos_remaining
FROM subscriptions s
JOIN plans p ON s.plan = p.id;

-- ============================================
-- AUTO-CREATE subscription para novos usuários
-- ============================================

CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger na tabela users (se existir)
DROP TRIGGER IF EXISTS create_subscription_on_user_create ON users;
CREATE TRIGGER create_subscription_on_user_create
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_for_new_user();

-- ============================================
-- GRANT permissions
-- ============================================

GRANT SELECT ON plans TO authenticated;
GRANT SELECT ON subscription_details TO authenticated;
GRANT SELECT, INSERT ON subscriptions TO authenticated;
GRANT EXECUTE ON FUNCTION check_video_limit TO authenticated;
GRANT EXECUTE ON FUNCTION increment_video_usage TO authenticated;

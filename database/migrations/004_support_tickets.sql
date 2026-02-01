-- Migration 004: Support Tickets and Contextual Tooltips
-- Created: 2026-01-31
-- Description: Adds support ticket system and tooltip preferences

-- =========================================
-- 1. SUPPORT TICKETS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(20) DEFAULT 'chat' CHECK (source IN ('chat', 'contact', 'help')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_email ON support_tickets(email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at DESC);

-- =========================================
-- 2. TICKET RESPONSES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS ticket_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    responder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    responder_name VARCHAR(100),
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes vs customer-facing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);

-- =========================================
-- 3. USER TOOLTIP PREFERENCES
-- =========================================

CREATE TABLE IF NOT EXISTS user_tooltip_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tooltips_enabled BOOLEAN DEFAULT TRUE,
    dismissed_tooltips TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- =========================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =========================================

-- Support tickets: Users can see their own, admins can see all
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON support_tickets
    FOR SELECT USING (
        auth.uid() = user_id OR 
        email = (SELECT email FROM users WHERE id = auth.uid()) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Anyone can create tickets" ON support_tickets
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update tickets" ON support_tickets
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Ticket responses: Users see responses to their tickets
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket responses" ON ticket_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_responses.ticket_id 
            AND (user_id = auth.uid() OR email = (SELECT email FROM users WHERE id = auth.uid()))
        ) OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can insert responses" ON ticket_responses
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- User tooltip preferences: Users can manage their own
ALTER TABLE user_tooltip_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tooltip preferences" ON user_tooltip_preferences
    FOR ALL USING (auth.uid() = user_id);

-- =========================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =========================================

CREATE OR REPLACE FUNCTION update_ticket_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ticket_timestamp
    BEFORE UPDATE ON support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_updated_at();

CREATE TRIGGER trigger_update_tooltip_preferences_timestamp
    BEFORE UPDATE ON user_tooltip_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_ticket_updated_at();

-- =========================================
-- 6. HELPER FUNCTIONS
-- =========================================

-- Get ticket count by status for admin dashboard
CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
    status VARCHAR,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        support_tickets.status,
        COUNT(*)::BIGINT
    FROM support_tickets
    GROUP BY support_tickets.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get average response time
CREATE OR REPLACE FUNCTION get_avg_response_time()
RETURNS INTERVAL AS $$
DECLARE
    avg_time INTERVAL;
BEGIN
    SELECT AVG(resolved_at - created_at)
    INTO avg_time
    FROM support_tickets
    WHERE resolved_at IS NOT NULL;
    
    RETURN COALESCE(avg_time, INTERVAL '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 7. SAMPLE DATA (Development Only)
-- =========================================

-- Uncomment for development testing
/*
INSERT INTO support_tickets (name, email, message, source, priority, status) VALUES
('João Silva', 'joao@example.com', 'Como faço para exportar em SCORM?', 'chat', 'medium', 'open'),
('Maria Santos', 'maria@company.com', 'O render está demorando muito, preciso de ajuda urgente!', 'contact', 'urgent', 'in_progress'),
('Pedro Oliveira', 'pedro@empresa.com', 'Gostaria de saber sobre planos enterprise', 'help', 'low', 'open');
*/

-- =========================================
-- MIGRATION COMPLETE
-- =========================================

-- Migration: Add timeline_track_locks table
-- Date: 2026-01-30
-- Description: Persiste locks de tracks de timeline para colaboração multi-usuário

-- Tabela de locks de tracks
CREATE TABLE IF NOT EXISTS timeline_track_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    track_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 minutes'),
    
    -- Apenas um lock por track por projeto
    CONSTRAINT unique_track_lock UNIQUE (project_id, track_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_timeline_track_locks_project ON timeline_track_locks(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_track_locks_user ON timeline_track_locks(user_id);
CREATE INDEX IF NOT EXISTS idx_timeline_track_locks_expires ON timeline_track_locks(expires_at);

-- Tabela de presença para colaboração em tempo real
CREATE TABLE IF NOT EXISTS timeline_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cursor_position JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Apenas uma presença por usuário por projeto
    CONSTRAINT unique_user_presence UNIQUE (project_id, user_id)
);

-- Índices para presença
CREATE INDEX IF NOT EXISTS idx_timeline_presence_project ON timeline_presence(project_id);
CREATE INDEX IF NOT EXISTS idx_timeline_presence_last_seen ON timeline_presence(last_seen_at);

-- RLS Policies
ALTER TABLE timeline_track_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_presence ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver locks de projetos que possuem
CREATE POLICY "Users can view locks on their projects" ON timeline_track_locks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = timeline_track_locks.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Usuários podem criar locks em projetos que possuem
CREATE POLICY "Users can create locks on their projects" ON timeline_track_locks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = timeline_track_locks.project_id 
            AND projects.user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

-- Usuários só podem deletar seus próprios locks
CREATE POLICY "Users can delete their own locks" ON timeline_track_locks
    FOR DELETE
    USING (user_id = auth.uid());

-- Usuários podem atualizar seus próprios locks
CREATE POLICY "Users can update their own locks" ON timeline_track_locks
    FOR UPDATE
    USING (user_id = auth.uid());

-- Políticas similares para presença
CREATE POLICY "Users can view presence on their projects" ON timeline_presence
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = timeline_presence.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their own presence" ON timeline_presence
    FOR ALL
    USING (user_id = auth.uid());

-- Função para limpar locks expirados (pode ser chamada por cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM timeline_track_locks 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para limpar presença inativa (última atividade > 5 minutos)
CREATE OR REPLACE FUNCTION cleanup_inactive_presence()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM timeline_presence 
    WHERE last_seen_at < NOW() - INTERVAL '5 minutes';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE timeline_track_locks IS 'Locks de tracks de timeline para colaboração multi-usuário';
COMMENT ON TABLE timeline_presence IS 'Presença de usuários em projetos para colaboração em tempo real';

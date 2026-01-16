-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'video',
    thumbnail_url TEXT,
    preview_url TEXT,
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    is_public BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_featured ON templates(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(is_public) WHERE is_public = true;

-- Seed initial templates
INSERT INTO templates (name, description, category, type, is_featured, metadata) VALUES
('NR-12 Segurança em Máquinas', 'Template profissional para treinamento NR-12', 'safety', 'pptx', true, '{"duration": 180, "slides": 15}'),
('NR-35 Trabalho em Altura', 'Template profissional para treinamento NR-35', 'safety', 'pptx', true, '{"duration": 240, "slides": 20}'),
('NR-10 Segurança Elétrica', 'Template profissional para treinamento NR-10', 'safety', 'pptx', true, '{"duration": 200, "slides": 18}'),
('Apresentação Corporativa', 'Template moderno para apresentações empresariais', 'business', 'pptx', false, '{"duration": 120, "slides": 10}'),
('Vídeo Marketing', 'Template para vídeos promocionais', 'marketing', 'video', true, '{"duration": 60, "slides": 5}')
ON CONFLICT DO NOTHING;

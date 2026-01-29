-- ============================================
-- SCHEMA COMPLETO PARA POSTGRESQL LOCAL
-- MVP Video TécnicoCursos v7
-- ============================================
-- Este schema é independente e não requer Supabase
-- Criado em: 18/12/2025
-- Versão: 2.0.0 (Melhorado)
-- 
-- RECURSOS INCLUÍDOS:
-- - Sistema completo de autenticação local
-- - Gerenciamento de projetos e slides
-- - Sistema de renderização de vídeos
-- - Text-to-Speech (TTS) integrado
-- - Cursos NR (Normas Regulamentadoras)
-- - Sistema de colaboração
-- - Analytics e auditoria
-- - Notificações
-- - API Keys
-- - Views e funções auxiliares
-- - Triggers automáticos
-- - Procedimentos de manutenção
-- ============================================

-- ============================================
-- EXTENSÕES NECESSÁRIAS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin"; -- Para índices GIN em campos numéricos

-- ============================================
-- TIPOS ENUM
-- ============================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'manager', 'editor', 'viewer', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE project_type AS ENUM ('pptx', 'template-nr', 'talking-photo', 'custom', 'ai-generated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('draft', 'in-progress', 'review', 'completed', 'archived', 'error');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE collaboration_role AS ENUM ('owner', 'editor', 'viewer', 'reviewer');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE video_quality AS ENUM ('720p', '1080p', '4k');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tts_provider AS ENUM ('elevenlabs', 'azure', 'google', 'openai', 'edge-tts');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================
-- TABELA: users (Sistema de Autenticação Local)
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0 CHECK (login_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT users_name_length CHECK (name IS NULL OR (char_length(name) >= 1 AND char_length(name) <= 255))
);

COMMENT ON TABLE public.users IS 'Tabela de usuários do sistema com autenticação local';
COMMENT ON COLUMN public.users.email IS 'Email único do usuário (usado para login)';
COMMENT ON COLUMN public.users.password_hash IS 'Hash bcrypt da senha do usuário';
COMMENT ON COLUMN public.users.role IS 'Papel do usuário no sistema (admin, manager, editor, viewer, user)';
COMMENT ON COLUMN public.users.metadata IS 'Metadados adicionais em formato JSON';

-- ============================================
-- TABELA: sessions (Gerenciamento de Sessões)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: projects
-- ============================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type project_type NOT NULL DEFAULT 'custom',
    status project_status DEFAULT 'draft',
    description TEXT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{
        "tags": [],
        "category": "general",
        "priority": "medium",
        "custom_fields": {}
    }'::jsonb,
    current_version VARCHAR(20) DEFAULT '1.0.0',
    is_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    collaboration_enabled BOOLEAN DEFAULT false,
    render_settings JSONB DEFAULT '{}'::jsonb,
    thumbnail_url TEXT,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT projects_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 255),
    CONSTRAINT projects_version_format CHECK (current_version ~* '^\d+\.\d+\.\d+$')
);

COMMENT ON TABLE public.projects IS 'Projetos de vídeo e apresentações dos usuários';
COMMENT ON COLUMN public.projects.type IS 'Tipo do projeto (pptx, template-nr, talking-photo, custom, ai-generated)';
COMMENT ON COLUMN public.projects.status IS 'Status atual do projeto (draft, in-progress, review, completed, archived, error)';
COMMENT ON COLUMN public.projects.metadata IS 'Metadados adicionais incluindo tags, categoria e campos customizados';
COMMENT ON COLUMN public.projects.render_settings IS 'Configurações de renderização do projeto em formato JSON';

-- ============================================
-- TABELA: project_versions
-- ============================================
CREATE TABLE IF NOT EXISTS public.project_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    changes_summary TEXT,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version_number),
    CONSTRAINT project_versions_name_not_empty CHECK (char_length(name) > 0)
);

COMMENT ON TABLE public.project_versions IS 'Histórico de versões dos projetos';
COMMENT ON COLUMN public.project_versions.version_number IS 'Número da versão no formato semântico (ex: 1.0.0)';
COMMENT ON COLUMN public.project_versions.changes_summary IS 'Resumo das mudanças nesta versão';

-- ============================================
-- TABELA: slides
-- ============================================
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    slide_order INTEGER NOT NULL DEFAULT 0,
    title VARCHAR(255),
    content JSONB DEFAULT '{}'::jsonb,
    layout_type VARCHAR(50) DEFAULT 'blank',
    background JSONB DEFAULT '{"type": "color", "value": "#ffffff"}'::jsonb,
    notes TEXT,
    duration_seconds INTEGER DEFAULT 5 CHECK (duration_seconds > 0),
    transition_type VARCHAR(50) DEFAULT 'none',
    transition_duration INTEGER DEFAULT 500 CHECK (transition_duration >= 0),
    audio_url TEXT,
    audio_script TEXT,
    tts_settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT slides_order_positive CHECK (slide_order >= 0)
);

COMMENT ON TABLE public.slides IS 'Slides individuais que compõem um projeto';
COMMENT ON COLUMN public.slides.slide_order IS 'Ordem do slide no projeto (0-indexed)';
COMMENT ON COLUMN public.slides.content IS 'Conteúdo do slide em formato JSON estruturado';
COMMENT ON COLUMN public.slides.duration_seconds IS 'Duração do slide em segundos';

-- ============================================
-- TABELA: video_projects
-- ============================================
CREATE TABLE IF NOT EXISTS public.video_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSONB DEFAULT '{
        "resolution": "1080p",
        "fps": 30,
        "format": "mp4",
        "codec": "h264"
    }'::jsonb,
    timeline_data JSONB DEFAULT '{"tracks": [], "duration": 0}'::jsonb,
    status project_status DEFAULT 'draft',
    output_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: render_jobs (Fila de Renderização)
-- ============================================
CREATE TABLE IF NOT EXISTS public.render_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    video_project_id UUID REFERENCES public.video_projects(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status job_status DEFAULT 'pending',
    priority priority_level DEFAULT 'medium',
    quality video_quality DEFAULT '1080p',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    settings JSONB DEFAULT '{}'::jsonb,
    output_url TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_duration INTEGER CHECK (estimated_duration IS NULL OR estimated_duration > 0),
    actual_duration INTEGER CHECK (actual_duration IS NULL OR actual_duration > 0),
    worker_id VARCHAR(100),
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT render_jobs_completion_check CHECK (
        (status = 'completed' AND completed_at IS NOT NULL) OR 
        (status != 'completed' AND completed_at IS NULL) OR
        completed_at IS NULL
    ),
    CONSTRAINT render_jobs_retry_limit CHECK (retry_count <= max_retries)
);

COMMENT ON TABLE public.render_jobs IS 'Fila de jobs de renderização de vídeos';
COMMENT ON COLUMN public.render_jobs.progress IS 'Progresso do job de 0 a 100';
COMMENT ON COLUMN public.render_jobs.retry_count IS 'Número de tentativas de processamento';

-- ============================================
-- TABELA: tts_jobs (Text-to-Speech)
-- ============================================
CREATE TABLE IF NOT EXISTS public.tts_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    slide_id UUID REFERENCES public.slides(id) ON DELETE SET NULL,
    text_content TEXT NOT NULL CHECK (char_length(text_content) > 0),
    provider tts_provider DEFAULT 'edge-tts',
    voice_id VARCHAR(100),
    voice_settings JSONB DEFAULT '{}'::jsonb,
    status job_status DEFAULT 'pending',
    output_url TEXT,
    duration_seconds DECIMAL(10,2) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.tts_jobs IS 'Jobs de conversão de texto em fala (Text-to-Speech)';
COMMENT ON COLUMN public.tts_jobs.provider IS 'Provedor TTS utilizado (elevenlabs, azure, google, openai, edge-tts)';
COMMENT ON COLUMN public.tts_jobs.duration_seconds IS 'Duração do áudio gerado em segundos';

-- ============================================
-- TABELA: storage_files (Gerenciamento de Arquivos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.storage_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    bucket VARCHAR(100) NOT NULL DEFAULT 'uploads',
    file_path TEXT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT CHECK (file_size IS NULL OR file_size >= 0),
    checksum VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0 CHECK (download_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bucket, file_path),
    CONSTRAINT storage_files_path_not_empty CHECK (char_length(file_path) > 0),
    CONSTRAINT storage_files_name_not_empty CHECK (char_length(original_name) > 0)
);

COMMENT ON TABLE public.storage_files IS 'Arquivos armazenados no sistema';
COMMENT ON COLUMN public.storage_files.bucket IS 'Bucket/container onde o arquivo está armazenado';
COMMENT ON COLUMN public.storage_files.checksum IS 'Hash SHA-256 do arquivo para verificação de integridade';

-- ============================================
-- TABELA: templates
-- ============================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    thumbnail_url TEXT,
    preview_url TEXT,
    template_data JSONB NOT NULL,
    is_premium BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT templates_name_not_empty CHECK (char_length(name) > 0)
);

COMMENT ON TABLE public.templates IS 'Templates reutilizáveis para projetos';
COMMENT ON COLUMN public.templates.template_data IS 'Dados do template em formato JSON estruturado';
COMMENT ON COLUMN public.templates.usage_count IS 'Contador de quantas vezes o template foi usado';

-- ============================================
-- TABELA: nr_courses (Cursos NR)
-- ============================================
CREATE TABLE IF NOT EXISTS public.nr_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    difficulty_level VARCHAR(50) DEFAULT 'intermediate',
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT nr_courses_code_not_empty CHECK (char_length(code) > 0),
    CONSTRAINT nr_courses_name_not_empty CHECK (char_length(name) > 0)
);

COMMENT ON TABLE public.nr_courses IS 'Cursos de Normas Regulamentadoras (NR)';
COMMENT ON COLUMN public.nr_courses.code IS 'Código único da norma (ex: NR12, NR33, NR35)';
COMMENT ON COLUMN public.nr_courses.duration_minutes IS 'Duração total do curso em minutos';

-- ============================================
-- TABELA: nr_modules
-- ============================================
CREATE TABLE IF NOT EXISTS public.nr_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.nr_courses(id) ON DELETE CASCADE,
    module_order INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content JSONB DEFAULT '{}'::jsonb,
    video_url TEXT,
    duration_minutes INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(course_id, module_order)
);

-- ============================================
-- TABELA: user_progress (Progresso do Usuário)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.nr_courses(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.nr_modules(id) ON DELETE CASCADE,
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    completed_at TIMESTAMPTZ,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, course_id, module_id),
    CONSTRAINT user_progress_completion_check CHECK (
        (progress_percent = 100 AND completed_at IS NOT NULL) OR
        (progress_percent < 100 AND completed_at IS NULL) OR
        completed_at IS NULL
    )
);

COMMENT ON TABLE public.user_progress IS 'Rastreamento do progresso dos usuários em cursos e módulos';
COMMENT ON COLUMN public.user_progress.progress_percent IS 'Percentual de conclusão (0-100)';

-- ============================================
-- TABELA: collaborators
-- ============================================
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role collaboration_role DEFAULT 'viewer',
    invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, user_id),
    CONSTRAINT collaborators_not_self_invite CHECK (user_id != invited_by OR invited_by IS NULL)
);

COMMENT ON TABLE public.collaborators IS 'Colaboradores e permissões de acesso aos projetos';
COMMENT ON COLUMN public.collaborators.role IS 'Papel do colaborador (owner, editor, viewer, reviewer)';
COMMENT ON COLUMN public.collaborators.accepted_at IS 'Data de aceitação do convite de colaboração';

-- ============================================
-- TABELA: analytics_events
-- ============================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(100),
    event_data JSONB DEFAULT '{}'::jsonb,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT analytics_events_type_not_empty CHECK (char_length(event_type) > 0)
);

COMMENT ON TABLE public.analytics_events IS 'Eventos de analytics e rastreamento do sistema';
COMMENT ON COLUMN public.analytics_events.event_type IS 'Tipo do evento (ex: page_view, video_play, project_create)';
COMMENT ON COLUMN public.analytics_events.event_data IS 'Dados adicionais do evento em formato JSON';

-- ============================================
-- TABELA: notifications
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: api_keys
-- ============================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_prefix VARCHAR(20) NOT NULL,
    permissions JSONB DEFAULT '["read"]'::jsonb,
    rate_limit INTEGER DEFAULT 1000 CHECK (rate_limit > 0),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT api_keys_name_not_empty CHECK (char_length(name) > 0),
    CONSTRAINT api_keys_expires_check CHECK (expires_at IS NULL OR expires_at > created_at)
);

COMMENT ON TABLE public.api_keys IS 'Chaves de API para autenticação de aplicações';
COMMENT ON COLUMN public.api_keys.key_hash IS 'Hash da chave de API (nunca armazenar a chave em texto plano)';
COMMENT ON COLUMN public.api_keys.key_prefix IS 'Prefixo da chave para identificação (ex: mvpk_)';

-- ============================================
-- TABELA: system_settings
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT system_settings_key_not_empty CHECK (char_length(key) > 0)
);

COMMENT ON TABLE public.system_settings IS 'Configurações globais do sistema';
COMMENT ON COLUMN public.system_settings.key IS 'Chave única da configuração';
COMMENT ON COLUMN public.system_settings.value IS 'Valor da configuração em formato JSON';
COMMENT ON COLUMN public.system_settings.is_public IS 'Se true, a configuração pode ser acessada sem autenticação';

-- ============================================
-- TABELA: audit_logs
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT audit_logs_action_not_empty CHECK (char_length(action) > 0)
);

COMMENT ON TABLE public.audit_logs IS 'Log de auditoria de ações do sistema';
COMMENT ON COLUMN public.audit_logs.action IS 'Ação realizada (ex: create, update, delete, login)';
COMMENT ON COLUMN public.audit_logs.old_values IS 'Valores anteriores (para updates)';
COMMENT ON COLUMN public.audit_logs.new_values IS 'Novos valores (para creates/updates)';

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_active_verified ON public.users(is_active, is_verified) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_metadata_gin ON public.users USING gin(metadata);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON public.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON public.sessions(user_id, expires_at) WHERE expires_at > NOW();

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(type);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_name_search ON public.projects USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON public.projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_user_created ON public.projects(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_metadata_gin ON public.projects USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_projects_public ON public.projects(is_public, created_at DESC) WHERE is_public = true;

-- Project Versions
CREATE INDEX IF NOT EXISTS idx_project_versions_project_id ON public.project_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_versions_created_at ON public.project_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_versions_project_created ON public.project_versions(project_id, created_at DESC);

-- Slides
CREATE INDEX IF NOT EXISTS idx_slides_project_id ON public.slides(project_id);
CREATE INDEX IF NOT EXISTS idx_slides_order ON public.slides(project_id, slide_order);
CREATE INDEX IF NOT EXISTS idx_slides_content_gin ON public.slides USING gin(content);
CREATE INDEX IF NOT EXISTS idx_slides_project_order ON public.slides(project_id, slide_order) WHERE slide_order >= 0;

-- Video Projects
CREATE INDEX IF NOT EXISTS idx_video_projects_user_id ON public.video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_project_id ON public.video_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_status ON public.video_projects(status);
CREATE INDEX IF NOT EXISTS idx_video_projects_user_status ON public.video_projects(user_id, status);

-- Render Jobs
CREATE INDEX IF NOT EXISTS idx_render_jobs_status ON public.render_jobs(status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_user_id ON public.render_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_created_at ON public.render_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_render_jobs_pending ON public.render_jobs(status, priority, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_render_jobs_user_status ON public.render_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_render_jobs_project_id ON public.render_jobs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_render_jobs_video_project_id ON public.render_jobs(video_project_id) WHERE video_project_id IS NOT NULL;

-- TTS Jobs
CREATE INDEX IF NOT EXISTS idx_tts_jobs_status ON public.tts_jobs(status);
CREATE INDEX IF NOT EXISTS idx_tts_jobs_user_id ON public.tts_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_tts_jobs_project_id ON public.tts_jobs(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tts_jobs_slide_id ON public.tts_jobs(slide_id) WHERE slide_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tts_jobs_user_status ON public.tts_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tts_jobs_pending ON public.tts_jobs(status, created_at) WHERE status = 'pending';

-- Storage Files
CREATE INDEX IF NOT EXISTS idx_storage_files_user_id ON public.storage_files(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_files_bucket ON public.storage_files(bucket);
CREATE INDEX IF NOT EXISTS idx_storage_files_user_bucket ON public.storage_files(user_id, bucket);
CREATE INDEX IF NOT EXISTS idx_storage_files_mime_type ON public.storage_files(mime_type) WHERE mime_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_storage_files_public ON public.storage_files(is_public, created_at DESC) WHERE is_public = true;

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON public.templates(is_public, category) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON public.templates(created_by) WHERE created_by IS NOT NULL;

-- NR Courses
CREATE INDEX IF NOT EXISTS idx_nr_courses_code ON public.nr_courses(code);
CREATE INDEX IF NOT EXISTS idx_nr_courses_active ON public.nr_courses(is_active);
CREATE INDEX IF NOT EXISTS idx_nr_courses_active_category ON public.nr_courses(is_active, category) WHERE is_active = true;

-- NR Modules
CREATE INDEX IF NOT EXISTS idx_nr_modules_course_id ON public.nr_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_nr_modules_order ON public.nr_modules(course_id, module_order);
CREATE INDEX IF NOT EXISTS idx_nr_modules_active ON public.nr_modules(course_id, is_active) WHERE is_active = true;

-- User Progress
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_course_id ON public.user_progress(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_progress_module_id ON public.user_progress(module_id) WHERE module_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_progress_user_course ON public.user_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON public.user_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- Collaborators
CREATE INDEX IF NOT EXISTS idx_collaborators_project_id ON public.collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON public.collaborators(project_id, role);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_type_category ON public.analytics_events(event_type, event_category);
CREATE INDEX IF NOT EXISTS idx_analytics_resource ON public.analytics_events(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_event_data_gin ON public.analytics_events USING gin(event_data);
CREATE INDEX IF NOT EXISTS idx_analytics_date_range ON public.analytics_events(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, created_at DESC) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- API Keys
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active, expires_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON public.api_keys(key_prefix);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id) WHERE resource_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON public.audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON public.audit_logs(created_at DESC) WHERE created_at > NOW() - INTERVAL '90 days';

-- ============================================
-- FUNÇÕES AUXILIARES
-- ============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para hash de senha
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 12));
END;
$$ LANGUAGE plpgsql;

-- Função para verificar senha
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Função para gerar token aleatório
CREATE OR REPLACE FUNCTION generate_token(length INTEGER DEFAULT 64)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Função para limpar sessões expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Função para calcular progresso do curso
CREATE OR REPLACE FUNCTION calculate_course_progress(p_user_id UUID, p_course_id UUID)
RETURNS INTEGER AS $$
DECLARE
    total_modules INTEGER;
    completed_modules INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_modules
    FROM public.nr_modules
    WHERE course_id = p_course_id AND is_active = true;
    
    SELECT COUNT(*) INTO completed_modules
    FROM public.user_progress
    WHERE user_id = p_user_id 
      AND course_id = p_course_id 
      AND progress_percent = 100;
    
    IF total_modules = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN ROUND((completed_modules::DECIMAL / total_modules::DECIMAL) * 100);
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do projeto
CREATE OR REPLACE FUNCTION get_project_stats(p_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    slide_count INTEGER;
    total_duration INTEGER;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0)
    INTO slide_count, total_duration
    FROM public.slides
    WHERE project_id = p_project_id;
    
    stats := jsonb_build_object(
        'slide_count', slide_count,
        'total_duration_seconds', total_duration,
        'total_duration_minutes', ROUND(total_duration / 60.0, 2)
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Função para validar formato de email
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar last_accessed_at automaticamente
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para registrar eventos de auditoria
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50),
    p_resource_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    audit_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_ip_address, p_user_agent
    ) RETURNING id INTO audit_id;
    
    RETURN audit_id;
END;
$$ LANGUAGE plpgsql;

-- Função para criar notificação
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT DEFAULT NULL,
    p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, data
    ) VALUES (
        p_user_id, p_type, p_title, p_message, p_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Função para incrementar contador de uso de template
CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.templates
    SET usage_count = usage_count + 1
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar progresso do usuário
CREATE OR REPLACE FUNCTION update_user_progress(
    p_user_id UUID,
    p_module_id UUID,
    p_progress_percent INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_course_id UUID;
    v_completed BOOLEAN;
BEGIN
    -- Obter course_id do módulo
    SELECT course_id INTO v_course_id
    FROM public.nr_modules
    WHERE id = p_module_id;
    
    -- Determinar se foi completado
    v_completed := (p_progress_percent = 100);
    
    -- Inserir ou atualizar progresso
    INSERT INTO public.user_progress (
        user_id, course_id, module_id, progress_percent, completed_at, last_accessed_at
    ) VALUES (
        p_user_id, v_course_id, p_module_id, p_progress_percent,
        CASE WHEN v_completed THEN NOW() ELSE NULL END,
        NOW()
    )
    ON CONFLICT (user_id, course_id, module_id)
    DO UPDATE SET
        progress_percent = EXCLUDED.progress_percent,
        completed_at = CASE WHEN EXCLUDED.progress_percent = 100 THEN NOW() ELSE NULL END,
        last_accessed_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas do usuário
CREATE OR REPLACE FUNCTION get_user_stats(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
    project_count INTEGER;
    completed_projects INTEGER;
    total_storage_bytes BIGINT;
    active_render_jobs INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO project_count, completed_projects
    FROM public.projects
    WHERE user_id = p_user_id;
    
    SELECT COALESCE(SUM(file_size), 0)
    INTO total_storage_bytes
    FROM public.storage_files
    WHERE user_id = p_user_id;
    
    SELECT COUNT(*)
    INTO active_render_jobs
    FROM public.render_jobs
    WHERE user_id = p_user_id AND status IN ('pending', 'processing');
    
    stats := jsonb_build_object(
        'project_count', project_count,
        'completed_projects', completed_projects,
        'total_storage_bytes', total_storage_bytes,
        'total_storage_mb', ROUND(total_storage_bytes / 1048576.0, 2),
        'active_render_jobs', active_render_jobs
    );
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar dados antigos (manutenção)
CREATE OR REPLACE FUNCTION cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 90
)
RETURNS TABLE(
    table_name TEXT,
    deleted_count BIGINT
) AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    -- Limpar sessões expiradas
    DELETE FROM public.sessions WHERE expires_at < cutoff_date;
    table_name := 'sessions';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN NEXT;
    
    -- Limpar analytics antigos (manter apenas últimos 90 dias por padrão)
    DELETE FROM public.analytics_events WHERE created_at < cutoff_date;
    table_name := 'analytics_events';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN NEXT;
    
    -- Limpar audit logs antigos (manter apenas últimos 90 dias por padrão)
    DELETE FROM public.audit_logs WHERE created_at < cutoff_date;
    table_name := 'audit_logs';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN NEXT;
    
    -- Limpar notificações lidas antigas (manter apenas últimos 30 dias)
    DELETE FROM public.notifications 
    WHERE is_read = true AND read_at < (NOW() - INTERVAL '30 days');
    table_name := 'notifications';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_slides_updated_at
    BEFORE UPDATE ON public.slides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_video_projects_updated_at
    BEFORE UPDATE ON public.video_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_render_jobs_updated_at
    BEFORE UPDATE ON public.render_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tts_jobs_updated_at
    BEFORE UPDATE ON public.tts_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_storage_files_updated_at
    BEFORE UPDATE ON public.storage_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_nr_courses_updated_at
    BEFORE UPDATE ON public.nr_courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_nr_modules_updated_at
    BEFORE UPDATE ON public.nr_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_progress_updated_at
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON public.templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_system_settings_updated_at
    BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_accessed_at em projects
CREATE OR REPLACE TRIGGER update_projects_last_accessed
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_last_accessed();

-- Trigger para atualizar last_accessed_at em user_progress
CREATE OR REPLACE TRIGGER update_user_progress_last_accessed
    BEFORE UPDATE ON public.user_progress
    FOR EACH ROW
    WHEN (OLD.progress_percent IS DISTINCT FROM NEW.progress_percent)
    EXECUTE FUNCTION update_last_accessed();

-- Trigger para validar email ao inserir/atualizar usuário
CREATE OR REPLACE FUNCTION validate_user_email()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT is_valid_email(NEW.email) THEN
        RAISE EXCEPTION 'Email inválido: %', NEW.email;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER validate_users_email_trigger
    BEFORE INSERT OR UPDATE OF email ON public.users
    FOR EACH ROW EXECUTE FUNCTION validate_user_email();

-- Trigger para registrar criação de projeto
CREATE OR REPLACE FUNCTION log_project_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_audit_event(
        NEW.user_id,
        'project_create',
        'project',
        NEW.id,
        NULL,
        row_to_json(NEW)::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER log_project_creation_trigger
    AFTER INSERT ON public.projects
    FOR EACH ROW EXECUTE FUNCTION log_project_creation();

-- Trigger para registrar atualização de projeto
CREATE OR REPLACE FUNCTION log_project_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.* IS DISTINCT FROM NEW.* THEN
        PERFORM log_audit_event(
            NEW.user_id,
            'project_update',
            'project',
            NEW.id,
            row_to_json(OLD)::jsonb,
            row_to_json(NEW)::jsonb
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER log_project_update_trigger
    AFTER UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION log_project_update();

-- Trigger para notificar quando render job é completado
CREATE OR REPLACE FUNCTION notify_render_completion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        PERFORM create_notification(
            NEW.user_id,
            'render_complete',
            'Renderização Concluída',
            'Seu projeto foi renderizado com sucesso!',
            jsonb_build_object(
                'render_job_id', NEW.id,
                'project_id', NEW.project_id,
                'video_project_id', NEW.video_project_id,
                'output_url', NEW.output_url
            )
        );
    END IF;
    
    IF OLD.status != 'failed' AND NEW.status = 'failed' THEN
        PERFORM create_notification(
            NEW.user_id,
            'render_failed',
            'Renderização Falhou',
            COALESCE(NEW.error_message, 'Ocorreu um erro durante a renderização'),
            jsonb_build_object(
                'render_job_id', NEW.id,
                'project_id', NEW.project_id,
                'error_message', NEW.error_message
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER notify_render_completion_trigger
    AFTER UPDATE OF status ON public.render_jobs
    FOR EACH ROW EXECUTE FUNCTION notify_render_completion();

-- ============================================
-- DADOS INICIAIS
-- ============================================

-- Usuário admin padrão (senha: Admin@2025!)
INSERT INTO public.users (email, password_hash, name, role, is_active, is_verified)
VALUES (
    'admin@mvpvideos.com',
    crypt('Admin@2025!', gen_salt('bf', 12)),
    'Administrador',
    'admin',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Usuário demo (senha: Demo@2025!)
INSERT INTO public.users (email, password_hash, name, role, is_active, is_verified)
VALUES (
    'demo@mvpvideos.com',
    crypt('Demo@2025!', gen_salt('bf', 12)),
    'Usuário Demo',
    'user',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Cursos NR
INSERT INTO public.nr_courses (code, name, description, category, duration_minutes, difficulty_level) VALUES
('NR12', 'Segurança em Máquinas e Equipamentos', 'Norma regulamentadora que estabelece requisitos mínimos para prevenção de acidentes e doenças do trabalho nas fases de projeto, fabricação, importação, comercialização, exposição e cessão a qualquer título, em todas as atividades econômicas.', 'Segurança do Trabalho', 480, 'intermediate'),
('NR33', 'Segurança em Espaços Confinados', 'Estabelece os requisitos mínimos para identificação de espaços confinados, reconhecimento, avaliação, monitoramento e controle dos riscos existentes.', 'Segurança do Trabalho', 480, 'advanced'),
('NR35', 'Trabalho em Altura', 'Estabelece os requisitos mínimos e as medidas de proteção para o trabalho em altura, envolvendo o planejamento, a organização e a execução.', 'Segurança do Trabalho', 480, 'intermediate')
ON CONFLICT (code) DO NOTHING;

-- Módulos NR12
INSERT INTO public.nr_modules (course_id, module_order, title, description, duration_minutes) 
SELECT c.id, m.module_order, m.title, m.description, m.duration_minutes
FROM public.nr_courses c
CROSS JOIN (VALUES
    (1, 'Introdução à NR12', 'Conceitos básicos e objetivos da norma', 45),
    (2, 'Arranjo Físico e Instalações', 'Requisitos para layout e instalações', 60),
    (3, 'Dispositivos de Partida e Parada', 'Sistemas de acionamento seguros', 55),
    (4, 'Sistemas de Segurança', 'Proteções e dispositivos de segurança', 65),
    (5, 'Meios de Acesso Permanentes', 'Escadas, rampas e plataformas', 50),
    (6, 'Aspectos Ergonômicos', 'Ergonomia no trabalho com máquinas', 45),
    (7, 'Riscos Adicionais', 'Riscos elétricos, químicos e térmicos', 55),
    (8, 'Manutenção e Inspeção', 'Procedimentos de manutenção segura', 50),
    (9, 'Capacitação', 'Treinamento e documentação', 55)
) AS m(module_order, title, description, duration_minutes)
WHERE c.code = 'NR12'
ON CONFLICT (course_id, module_order) DO NOTHING;

-- Módulos NR33
INSERT INTO public.nr_modules (course_id, module_order, title, description, duration_minutes) 
SELECT c.id, m.module_order, m.title, m.description, m.duration_minutes
FROM public.nr_courses c
CROSS JOIN (VALUES
    (1, 'Conceitos e Definições', 'O que são espaços confinados', 50),
    (2, 'Identificação de Espaços Confinados', 'Como identificar e classificar', 60),
    (3, 'Análise de Riscos', 'Avaliação de perigos e riscos', 70),
    (4, 'Medidas de Controle', 'Prevenção e proteção', 65),
    (5, 'Procedimentos de Entrada', 'Permissão e controle de acesso', 60),
    (6, 'Equipamentos de Proteção', 'EPIs e equipamentos específicos', 55),
    (7, 'Resgate e Emergência', 'Procedimentos de emergência', 60),
    (8, 'Capacitação e Documentação', 'Treinamento obrigatório', 60)
) AS m(module_order, title, description, duration_minutes)
WHERE c.code = 'NR33'
ON CONFLICT (course_id, module_order) DO NOTHING;

-- Módulos NR35
INSERT INTO public.nr_modules (course_id, module_order, title, description, duration_minutes) 
SELECT c.id, m.module_order, m.title, m.description, m.duration_minutes
FROM public.nr_courses c
CROSS JOIN (VALUES
    (1, 'Introdução ao Trabalho em Altura', 'Conceitos e definições', 45),
    (2, 'Legislação Aplicável', 'NR35 e normas complementares', 50),
    (3, 'Análise de Riscos', 'Identificação e avaliação de perigos', 55),
    (4, 'Sistemas de Proteção Coletiva', 'Guarda-corpos, redes e plataformas', 60),
    (5, 'Equipamentos de Proteção Individual', 'Cintos, talabartes e conectores', 65),
    (6, 'Sistemas de Ancoragem', 'Pontos de ancoragem e linhas de vida', 60),
    (7, 'Técnicas de Trabalho', 'Procedimentos seguros em altura', 55),
    (8, 'Acesso por Cordas', 'Técnicas de rapel e escalada', 50),
    (9, 'Resgate em Altura', 'Procedimentos de emergência', 55),
    (10, 'Capacitação e Certificação', 'Requisitos de treinamento', 45)
) AS m(module_order, title, description, duration_minutes)
WHERE c.code = 'NR35'
ON CONFLICT (course_id, module_order) DO NOTHING;

-- Configurações do sistema
INSERT INTO public.system_settings (key, value, description, is_public) VALUES
('app_name', '"MVP Video TécnicoCursos"', 'Nome da aplicação', true),
('app_version', '"2.4.0"', 'Versão atual', true),
('max_upload_size_mb', '500', 'Tamanho máximo de upload em MB', false),
('max_video_duration_minutes', '120', 'Duração máxima de vídeo em minutos', false),
('default_video_quality', '"1080p"', 'Qualidade padrão de vídeo', false),
('tts_default_provider', '"edge-tts"', 'Provedor TTS padrão', false),
('enable_analytics', 'true', 'Habilitar analytics', false),
('enable_notifications', 'true', 'Habilitar notificações', false),
('maintenance_mode', 'false', 'Modo de manutenção', false)
ON CONFLICT (key) DO NOTHING;

-- Templates iniciais
INSERT INTO public.templates (name, description, category, template_data, is_public) VALUES
('Apresentação Corporativa', 'Template profissional para apresentações empresariais', 'business', 
 '{"slides": [{"type": "title", "layout": "centered"}, {"type": "content", "layout": "two-column"}], "theme": {"primary": "#1a365d", "secondary": "#2d3748"}}', true),
('Treinamento de Segurança', 'Template para cursos de segurança do trabalho', 'education',
 '{"slides": [{"type": "title", "layout": "full-image"}, {"type": "content", "layout": "list"}], "theme": {"primary": "#c53030", "secondary": "#2d3748"}}', true),
('Tutorial Técnico', 'Template para tutoriais e guias técnicos', 'technical',
 '{"slides": [{"type": "title", "layout": "minimal"}, {"type": "content", "layout": "code-block"}], "theme": {"primary": "#2b6cb0", "secondary": "#1a202c"}}', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- VIEWS ÚTEIS
-- ============================================

-- View de projetos com informações do usuário
CREATE OR REPLACE VIEW v_projects_with_user AS
SELECT 
    p.*,
    u.name as user_name,
    u.email as user_email,
    COUNT(DISTINCT s.id) as slide_count,
    COUNT(DISTINCT c.id) as collaborator_count
FROM public.projects p
JOIN public.users u ON p.user_id = u.id
LEFT JOIN public.slides s ON s.project_id = p.id
LEFT JOIN public.collaborators c ON c.project_id = p.id
GROUP BY p.id, u.name, u.email;

COMMENT ON VIEW v_projects_with_user IS 'View com projetos e informações agregadas do usuário';

-- View de jobs de renderização pendentes
CREATE OR REPLACE VIEW v_pending_render_jobs AS
SELECT 
    rj.*,
    u.email as user_email,
    p.name as project_name,
    vp.name as video_project_name
FROM public.render_jobs rj
JOIN public.users u ON rj.user_id = u.id
LEFT JOIN public.projects p ON rj.project_id = p.id
LEFT JOIN public.video_projects vp ON rj.video_project_id = vp.id
WHERE rj.status = 'pending'
ORDER BY 
    CASE rj.priority 
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    rj.created_at ASC;

COMMENT ON VIEW v_pending_render_jobs IS 'View de jobs de renderização pendentes ordenados por prioridade';

-- View de progresso de cursos por usuário
CREATE OR REPLACE VIEW v_user_course_progress AS
SELECT 
    up.user_id,
    u.email as user_email,
    up.course_id,
    c.code as course_code,
    c.name as course_name,
    COUNT(DISTINCT m.id) as total_modules,
    COUNT(DISTINCT CASE WHEN up.progress_percent = 100 THEN up.module_id END) as completed_modules,
    calculate_course_progress(up.user_id, up.course_id) as course_progress_percent,
    MAX(up.last_accessed_at) as last_accessed_at
FROM public.user_progress up
JOIN public.users u ON up.user_id = u.id
JOIN public.nr_courses c ON up.course_id = c.id
LEFT JOIN public.nr_modules m ON m.course_id = c.id AND m.is_active = true
GROUP BY up.user_id, u.email, up.course_id, c.code, c.name;

COMMENT ON VIEW v_user_course_progress IS 'View com progresso agregado dos usuários nos cursos';

-- View de estatísticas de renderização
CREATE OR REPLACE VIEW v_render_statistics AS
SELECT 
    DATE(created_at) as render_date,
    status,
    quality,
    COUNT(*) as job_count,
    AVG(progress) as avg_progress,
    AVG(actual_duration) as avg_duration_seconds,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM public.render_jobs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), status, quality
ORDER BY render_date DESC, status;

COMMENT ON VIEW v_render_statistics IS 'Estatísticas de renderização agrupadas por data, status e qualidade';

-- View de arquivos por tipo MIME
CREATE OR REPLACE VIEW v_storage_by_type AS
SELECT 
    mime_type,
    COUNT(*) as file_count,
    SUM(file_size) as total_size_bytes,
    ROUND(SUM(file_size) / 1048576.0, 2) as total_size_mb,
    AVG(file_size) as avg_file_size_bytes,
    MAX(created_at) as last_upload
FROM public.storage_files
WHERE mime_type IS NOT NULL
GROUP BY mime_type
ORDER BY total_size_bytes DESC;

COMMENT ON VIEW v_storage_by_type IS 'Estatísticas de armazenamento agrupadas por tipo MIME';

-- View de projetos mais acessados
CREATE OR REPLACE VIEW v_popular_projects AS
SELECT 
    p.*,
    u.name as user_name,
    u.email as user_email,
    COUNT(DISTINCT c.user_id) as collaborator_count,
    COUNT(DISTINCT s.id) as slide_count,
    p.last_accessed_at
FROM public.projects p
JOIN public.users u ON p.user_id = u.id
LEFT JOIN public.collaborators c ON c.project_id = p.id
LEFT JOIN public.slides s ON s.project_id = p.id
WHERE p.is_public = true OR p.last_accessed_at > NOW() - INTERVAL '30 days'
GROUP BY p.id, u.name, u.email
ORDER BY p.last_accessed_at DESC NULLS LAST
LIMIT 100;

COMMENT ON VIEW v_popular_projects IS 'Projetos mais acessados e populares';

-- View de usuários ativos
CREATE OR REPLACE VIEW v_active_users AS
SELECT 
    u.*,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT rj.id) FILTER (WHERE rj.status IN ('pending', 'processing')) as active_jobs,
    MAX(p.last_accessed_at) as last_project_access,
    MAX(u.last_login) as last_login
FROM public.users u
LEFT JOIN public.projects p ON p.user_id = u.id
LEFT JOIN public.render_jobs rj ON rj.user_id = u.id
WHERE u.is_active = true
GROUP BY u.id
HAVING COUNT(DISTINCT p.id) > 0 OR MAX(u.last_login) > NOW() - INTERVAL '30 days'
ORDER BY last_project_access DESC NULLS LAST;

COMMENT ON VIEW v_active_users IS 'Usuários ativos com estatísticas agregadas';

-- View de templates mais usados
CREATE OR REPLACE VIEW v_popular_templates AS
SELECT 
    t.*,
    u.name as creator_name,
    u.email as creator_email
FROM public.templates t
LEFT JOIN public.users u ON t.created_by = u.id
WHERE t.is_public = true
ORDER BY t.usage_count DESC, t.created_at DESC;

COMMENT ON VIEW v_popular_templates IS 'Templates públicos ordenados por uso';

-- ============================================
-- PROCEDIMENTOS ARMAZENADOS
-- ============================================

-- Procedimento para limpeza automática de dados antigos
CREATE OR REPLACE PROCEDURE sp_cleanup_old_data(
    p_days_to_keep INTEGER DEFAULT 90
)
LANGUAGE plpgsql
AS $$
DECLARE
    result RECORD;
BEGIN
    RAISE NOTICE 'Iniciando limpeza de dados antigos (mantendo últimos % dias)...', p_days_to_keep;
    
    FOR result IN SELECT * FROM cleanup_old_data(p_days_to_keep) LOOP
        RAISE NOTICE 'Tabela %: % registros deletados', result.table_name, result.deleted_count;
    END LOOP;
    
    RAISE NOTICE 'Limpeza concluída!';
END;
$$;

COMMENT ON PROCEDURE sp_cleanup_old_data IS 'Procedimento para limpar dados antigos do sistema';

-- Procedimento para atualizar estatísticas de templates
CREATE OR REPLACE PROCEDURE sp_update_template_stats()
LANGUAGE plpgsql
AS $$
DECLARE
    template_record RECORD;
    usage_count INTEGER;
BEGIN
    RAISE NOTICE 'Atualizando estatísticas de uso dos templates...';
    
    FOR template_record IN SELECT id FROM public.templates LOOP
        -- Contar quantos projetos usam este template
        SELECT COUNT(*) INTO usage_count
        FROM public.projects
        WHERE metadata->>'template_id' = template_record.id::TEXT;
        
        UPDATE public.templates
        SET usage_count = usage_count
        WHERE id = template_record.id;
    END LOOP;
    
    RAISE NOTICE 'Estatísticas atualizadas!';
END;
$$;

COMMENT ON PROCEDURE sp_update_template_stats IS 'Atualiza contadores de uso dos templates baseado nos projetos';

-- Procedimento para resetar senha de usuário
CREATE OR REPLACE PROCEDURE sp_reset_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    password_hash TEXT;
BEGIN
    -- Gerar hash da nova senha
    password_hash := crypt(p_new_password, gen_salt('bf', 12));
    
    -- Atualizar senha e limpar tokens de reset
    UPDATE public.users
    SET 
        password_hash = password_hash,
        reset_token = NULL,
        reset_token_expires = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuário não encontrado: %', p_user_id;
    END IF;
    
    RAISE NOTICE 'Senha resetada com sucesso para o usuário %', p_user_id;
END;
$$;

COMMENT ON PROCEDURE sp_reset_user_password IS 'Procedimento seguro para resetar senha de usuário';

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    function_count INTEGER;
    procedure_count INTEGER;
    view_count INTEGER;
    trigger_count INTEGER;
    user_count INTEGER;
    course_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO function_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'f';
    
    SELECT COUNT(*) INTO procedure_count 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.prokind = 'p';
    
    SELECT COUNT(*) INTO view_count 
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND NOT t.tgisinternal;
    
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO course_count FROM public.nr_courses;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  SCHEMA CRIADO COM SUCESSO!';
    RAISE NOTICE '============================================';
    RAISE NOTICE '  Tabelas:          %', table_count;
    RAISE NOTICE '  Índices:          %', index_count;
    RAISE NOTICE '  Funções:          %', function_count;
    RAISE NOTICE '  Procedimentos:    %', procedure_count;
    RAISE NOTICE '  Views:             %', view_count;
    RAISE NOTICE '  Triggers:          %', trigger_count;
    RAISE NOTICE '  Usuários iniciais: %', user_count;
    RAISE NOTICE '  Cursos NR:         %', course_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Próximos passos:';
    RAISE NOTICE '  1. Execute: SELECT * FROM v_projects_with_user LIMIT 10;';
    RAISE NOTICE '  2. Execute: SELECT get_user_stats(id) FROM users LIMIT 1;';
    RAISE NOTICE '  3. Configure manutenção: CALL sp_cleanup_old_data(90);';
    RAISE NOTICE '';
END $$;

-- ============================================
-- ÍNDICES ÚNICOS ADICIONAIS
-- ============================================

-- Garantir que não há slides duplicados na mesma ordem
CREATE UNIQUE INDEX IF NOT EXISTS idx_slides_project_order_unique 
ON public.slides(project_id, slide_order) 
WHERE slide_order >= 0;

-- Garantir unicidade de versões de projeto
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_versions_unique 
ON public.project_versions(project_id, version_number);

-- ============================================
-- COMENTÁRIOS ADICIONAIS
-- ============================================

COMMENT ON EXTENSION "uuid-ossp" IS 'Geração de UUIDs';
COMMENT ON EXTENSION "pgcrypto" IS 'Funções criptográficas para hash de senhas';
COMMENT ON EXTENSION "pg_trgm" IS 'Busca de texto com similaridade trigram';
COMMENT ON EXTENSION "btree_gin" IS 'Índices GIN para tipos numéricos';

-- ============================================
-- DICAS DE PERFORMANCE
-- ============================================
-- 
-- 1. ANALYZE: Execute regularmente para atualizar estatísticas
--    ANALYZE;
--
-- 2. VACUUM: Execute periodicamente para limpar espaço
--    VACUUM ANALYZE;
--
-- 3. Manutenção: Configure cron job para limpeza automática
--    CALL sp_cleanup_old_data(90);
--
-- 4. Monitoramento: Use as views para relatórios
--    SELECT * FROM v_render_statistics;
--    SELECT * FROM v_active_users;
--
-- 5. Índices: Monitore uso com pg_stat_user_indexes
--    SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
--
-- ============================================
-- FIM DO SCHEMA
-- ============================================


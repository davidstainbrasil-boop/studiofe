-- Migration: Add certificates and SCORM exports tables
-- Created: Session 9 - Additional Features

-- =============================================
-- CERTIFICATES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_number VARCHAR(50) UNIQUE NOT NULL,
  recipient_name VARCHAR(255) NOT NULL,
  course_name VARCHAR(255) NOT NULL,
  course_description TEXT,
  nr_code VARCHAR(20),
  duration VARCHAR(50),
  instructor_name VARCHAR(255),
  company_name VARCHAR(255),
  company_logo TEXT,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT certificates_number_unique UNIQUE (certificate_number)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON public.certificates(user_id);

-- Index for certificate verification by number
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.certificates(certificate_number);

-- RLS Policies for certificates
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own certificates
CREATE POLICY "Users can create own certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Public can verify certificates (read-only, limited fields)
CREATE POLICY "Public can verify certificates"
  ON public.certificates FOR SELECT
  USING (true);

-- =============================================
-- SCORM EXPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.scorm_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  course_id VARCHAR(100) NOT NULL,
  scorm_version VARCHAR(10) NOT NULL CHECK (scorm_version IN ('1.2', '2004')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_url TEXT,
  file_size_bytes BIGINT,
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT scorm_exports_course_unique UNIQUE (course_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_scorm_exports_user_id ON public.scorm_exports(user_id);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_scorm_exports_project_id ON public.scorm_exports(project_id);

-- RLS Policies for SCORM exports
ALTER TABLE public.scorm_exports ENABLE ROW LEVEL SECURITY;

-- Users can view their own SCORM exports
CREATE POLICY "Users can view own SCORM exports"
  ON public.scorm_exports FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own SCORM exports
CREATE POLICY "Users can create own SCORM exports"
  ON public.scorm_exports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own SCORM exports
CREATE POLICY "Users can update own SCORM exports"
  ON public.scorm_exports FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- MUSIC TRACKS TABLE (Background Music Library)
-- =============================================
CREATE TABLE IF NOT EXISTS public.music_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  duration_seconds INTEGER NOT NULL,
  category VARCHAR(50) NOT NULL,
  mood VARCHAR(50) NOT NULL,
  tempo VARCHAR(20) NOT NULL CHECK (tempo IN ('slow', 'medium', 'fast')),
  preview_url TEXT,
  download_url TEXT,
  waveform JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_music_tracks_category ON public.music_tracks(category);

-- Index for mood filtering
CREATE INDEX IF NOT EXISTS idx_music_tracks_mood ON public.music_tracks(mood);

-- Index for premium content
CREATE INDEX IF NOT EXISTS idx_music_tracks_premium ON public.music_tracks(is_premium);

-- RLS Policies for music tracks
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Everyone can view music tracks (public library)
CREATE POLICY "Public can view music tracks"
  ON public.music_tracks FOR SELECT
  USING (true);

-- Only admins can insert/update/delete music tracks
CREATE POLICY "Admins can manage music tracks"
  ON public.music_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- =============================================
-- USER MUSIC FAVORITES (Junction Table)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_music_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.music_tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (user_id, track_id)
);

-- RLS Policies for user favorites
ALTER TABLE public.user_music_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.user_music_favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add favorites
CREATE POLICY "Users can add favorites"
  ON public.user_music_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove favorites
CREATE POLICY "Users can remove favorites"
  ON public.user_music_favorites FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- TOUR COMPLETION TRACKING
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_tour_completions (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tour_id VARCHAR(100) NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  skipped BOOLEAN DEFAULT FALSE,
  
  PRIMARY KEY (user_id, tour_id)
);

-- RLS Policies for tour completions
ALTER TABLE public.user_tour_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own tour completions
CREATE POLICY "Users can view own tour completions"
  ON public.user_tour_completions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tour completions
CREATE POLICY "Users can insert tour completions"
  ON public.user_tour_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tour completions
CREATE POLICY "Users can update tour completions"
  ON public.user_tour_completions FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- SEED DATA: Sample Music Tracks
-- =============================================
INSERT INTO public.music_tracks (name, artist, duration_seconds, category, mood, tempo, is_premium)
VALUES
  ('Business Forward', 'Studio IA', 180, 'corporate', 'professional', 'medium', false),
  ('Clean Presentation', 'Studio IA', 150, 'corporate', 'neutral', 'slow', false),
  ('Rising Success', 'Studio IA', 200, 'inspirational', 'uplifting', 'medium', false),
  ('Achieve Together', 'Studio IA', 165, 'inspirational', 'hopeful', 'medium', false),
  ('Soft Focus', 'Studio IA', 240, 'ambient', 'calm', 'slow', false),
  ('Mindful Space', 'Studio IA', 210, 'ambient', 'calm', 'slow', false),
  ('Epic Training', 'Studio IA', 190, 'cinematic', 'serious', 'medium', true),
  ('Documentary Style', 'Studio IA', 220, 'cinematic', 'neutral', 'slow', false),
  ('Tech Innovation', 'Studio IA', 175, 'electronic', 'energetic', 'fast', false),
  ('Digital Progress', 'Studio IA', 160, 'electronic', 'professional', 'medium', false),
  ('Warm Welcome', 'Studio IA', 145, 'acoustic', 'hopeful', 'medium', false),
  ('Simple & Clear', 'Studio IA', 130, 'minimal', 'neutral', 'slow', false)
ON CONFLICT DO NOTHING;

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to increment music track play count
CREATE OR REPLACE FUNCTION increment_track_play_count(track_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.music_tracks
  SET play_count = play_count + 1
  WHERE id = track_uuid;
END;
$$;

-- Function to increment SCORM download count
CREATE OR REPLACE FUNCTION increment_scorm_download_count(export_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.scorm_exports
  SET download_count = download_count + 1
  WHERE id = export_uuid;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_track_play_count TO authenticated;
GRANT EXECUTE ON FUNCTION increment_scorm_download_count TO authenticated;

-- =============================================
-- COMMENTS
-- =============================================
COMMENT ON TABLE public.certificates IS 'Stores generated course completion certificates';
COMMENT ON TABLE public.scorm_exports IS 'Tracks SCORM package exports for LMS integration';
COMMENT ON TABLE public.music_tracks IS 'Background music library for video projects';
COMMENT ON TABLE public.user_music_favorites IS 'User favorite music tracks';
COMMENT ON TABLE public.user_tour_completions IS 'Tracks which guided tours users have completed';

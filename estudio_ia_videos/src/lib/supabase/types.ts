/**
 * Re-export types from the auto-generated database.types.ts
 * This file provides convenience aliases used throughout the codebase.
 * 
 * DO NOT define Database types here — they come from Supabase CLI:
 *   npx supabase gen types typescript --db-url "$DIRECT_DATABASE_URL"
 */
export type { Json, Database } from './database.types'
import type { Database } from './database.types'

// Convenience row type aliases
export type Project = Database['public']['Tables']['projects']['Row']
export type Slide = Database['public']['Tables']['slides']['Row']
export type RenderJob = Database['public']['Tables']['render_jobs']['Row']
export type Avatar3D = Database['public']['Tables']['avatars']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type TimelineTrack = Database['public']['Tables']['timeline_tracks']['Row']
export type TimelineElement = Database['public']['Tables']['timeline_elements']['Row']
export type ProjectHistory = Database['public']['Tables']['project_history']['Row']
export type PptxUpload = Database['public']['Tables']['pptx_uploads']['Row']
export type PptxSlide = Database['public']['Tables']['pptx_slides']['Row']
export type NotificationPreferences = Database['public']['Tables']['notification_preferences']['Row']
export type UserRenderSettings = Database['public']['Tables']['user_render_settings']['Row']

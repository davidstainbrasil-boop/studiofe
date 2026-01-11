export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          role: string | null
          metadata: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          role?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          role?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      avatars_3d: {
        Row: {
          id: string
          name: string
          userId: string | null
          projectId: string | null
          provider: string | null
          avatar_id: string | null
          ready_player_me_url: string | null
          avatar_type: string | null
          gender: string | null
          style: string | null
          animations: Json | null
          voice_settings: Json | null
          properties: Json | null
          modelUrl: string | null
          thumbnailUrl: string | null
          metadata: Json | null
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          name: string
          user_id?: string | null
          project_id?: string | null
          provider?: string | null
          avatar_id?: string | null
          ready_player_me_url?: string | null
          avatar_type?: string | null
          gender?: string | null
          style?: string | null
          animations?: Json | null
          voice_settings?: Json | null
          properties?: Json | null
          model_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          user_id?: string | null
          project_id?: string | null
          provider?: string | null
          avatar_id?: string | null
          ready_player_me_url?: string | null
          avatar_type?: string | null
          gender?: string | null
          style?: string | null
          animations?: Json | null
          voice_settings?: Json | null
          properties?: Json | null
          model_url?: string | null
          thumbnail_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatars_3d_project_id_fkey"
            columns: ["projectId"]
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avatars_3d_user_id_fkey"
            columns: ["userId"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      courses: {
        Row: {
          id: string
          title: string
          description: string | null
          thumbnailUrl: string | null
          createdAt: string
          updatedAt: string | null
          author_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string | null
          author_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string | null
          author_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          id: string
          title: string
          description: string | null
          video_url: string
          thumbnailUrl: string | null
          duration: number | null
          courseId: string
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          video_url: string
          thumbnail_url?: string | null
          duration?: number | null
          courseId: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          video_url?: string
          thumbnail_url?: string | null
          duration?: number | null
          course_id?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          id: string
          userId: string
          videoId: string
          progress_percentage: number
          completed: boolean
          last_watched_at: string
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          userId: string
          videoId: string
          progress_percentage: number
          completed: boolean
          last_watched_at: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          progress_percentage?: number
          completed?: boolean
          last_watched_at?: string
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          id: string
          userId: string
          owner_id: string | null
          name: string
          type: 'pptx' | 'template-nr' | 'talking-photo' | 'custom' | 'ai-generated'
          description: string | null
          status: string
          metadata: Json
          render_settings: Json
          thumbnailUrl: string | null
          preview_url: string | null
          current_version: string
          is_template: boolean
          is_public: boolean
          collaboration_enabled: boolean
          collaborators: string[] | null
          settings: Json | null
          createdAt: string
          updatedAt: string | null
          last_accessed_at: string | null
        }
        Insert: {
          id?: string
          userId: string
          owner_id?: string | null
          name: string
          type?: 'pptx' | 'template-nr' | 'talking-photo' | 'custom' | 'ai-generated'
          description?: string | null
          status?: string
          metadata?: Json
          render_settings?: Json
          thumbnail_url?: string | null
          preview_url?: string | null
          current_version?: string
          is_template?: boolean
          is_public?: boolean
          collaboration_enabled?: boolean
          collaborators?: string[] | null
          settings?: Json | null
          created_at?: string
          updated_at?: string | null
          last_accessed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          owner_id?: string | null
          name?: string
          type?: 'pptx' | 'template-nr' | 'talking-photo' | 'custom' | 'ai-generated'
          description?: string | null
          status?: string
          metadata?: Json
          render_settings?: Json
          thumbnail_url?: string | null
          preview_url?: string | null
          current_version?: string
          is_template?: boolean
          is_public?: boolean
          collaboration_enabled?: boolean
          collaborators?: string[] | null
          settings?: Json | null
          created_at?: string
          updated_at?: string | null
          last_accessed_at?: string | null
        }
        Relationships: []
      }
      slides: {
        Row: {
          id: string
          projectId: string
          order_index: number
          title: string | null
          content: string | null
          duration: number
          background_color: string | null
          background_image: string | null
          avatar_config: Json
          audio_config: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          projectId: string
          order_index: number
          title?: string | null
          content?: string | null
          duration?: number
          background_color?: string | null
          background_image?: string | null
          avatar_config?: Json
          audio_config?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          order_index?: number
          title?: string | null
          content?: string | null
          duration?: number
          background_color?: string | null
          background_image?: string | null
          avatar_config?: Json
          audio_config?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      render_jobs: {
        Row: {
          id: string
          projectId: string
          status: string
          progress: number
          output_url: string | null
          error_message: string | null
          render_settings: Json
          attempts: number
          duration_ms: number | null
          started_at: string | null
          completed_at: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          projectId: string
          status?: string
          progress?: number
          output_url?: string | null
          error_message?: string | null
          render_settings?: Json
          attempts?: number
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          status?: string
          progress?: number
          output_url?: string | null
          error_message?: string | null
          render_settings?: Json
          attempts?: number
          duration_ms?: number | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          id: string
          userId: string | null
          eventType: string
          eventData: Json
          sessionId: string | null
          ipAddress: string | null
          userAgent: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          userId: string | null
          eventType: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          event_type?: string
          event_data?: Json
          session_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      nr_courses: {
        Row: {
          id: string
          course_code: string
          title: string
          description: string | null
          thumbnailUrl: string | null
          duration: number | null
          modules_count: number
          status: string
          metadata: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          course_code: string
          title: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          modules_count?: number
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_code?: string
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          duration?: number | null
          modules_count?: number
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nr_modules: {
        Row: {
          id: string
          courseId: string
          order_index: number
          title: string
          description: string | null
          thumbnailUrl: string | null
          video_url: string | null
          duration: number | null
          content: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          courseId: string
          order_index: number
          title: string
          description?: string | null
          thumbnail_url?: string | null
          video_url?: string | null
          duration?: number | null
          content?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          order_index?: number
          title?: string
          description?: string | null
          thumbnail_url?: string | null
          video_url?: string | null
          duration?: number | null
          content?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nr_templates: {
        Row: {
          id: string
          nr_number: string
          title: string
          description: string | null
          slide_count: number
          duration_seconds: number
          template_config: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          nr_number: string
          title: string
          description?: string | null
          slide_count?: number
          duration_seconds?: number
          template_config?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          nr_number?: string
          title?: string
          description?: string | null
          slide_count?: number
          duration_seconds?: number
          template_config?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      timelines: {
        Row: {
          id: string
          projectId: string
          tracks: Json
          settings: Json
          total_duration: number
          version: number
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          projectId: string
          tracks?: Json
          settings?: Json
          total_duration?: number
          version?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          tracks?: Json
          settings?: Json
          total_duration?: number
          version?: number
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      timeline_tracks: {
        Row: {
          id: string
          projectId: string
          name: string
          type: string
          order_index: number
          color: string | null
          height: number
          visible: boolean
          locked: boolean
          muted: boolean
          properties: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          projectId: string
          name: string
          type: string
          order_index: number
          color?: string | null
          height?: number
          visible?: boolean
          locked?: boolean
          muted?: boolean
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          type?: string
          order_index?: number
          color?: string | null
          height?: number
          visible?: boolean
          locked?: boolean
          muted?: boolean
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      timeline_elements: {
        Row: {
          id: string
          track_id: string
          type: string
          start_time: number
          duration: number
          content: Json
          properties: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          track_id: string
          type: string
          start_time: number
          duration: number
          content?: Json
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          track_id?: string
          type?: string
          start_time?: number
          duration?: number
          content?: Json
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pptx_uploads: {
        Row: {
          id: string
          projectId: string
          original_filename: string | null
          status: string
          slide_count: number
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          projectId: string
          original_filename?: string | null
          status?: string
          slide_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          original_filename?: string | null
          status?: string
          slide_count?: number
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pptx_slides: {
        Row: {
          id: string
          upload_id: string
          slide_number: number
          title: string | null
          content: string | null
          duration: number
          transition_type: string
          thumbnailUrl: string | null
          notes: string | null
          properties: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          upload_id: string
          slide_number: number
          title?: string | null
          content?: string | null
          duration?: number
          transition_type?: string
          thumbnail_url?: string | null
          notes?: string | null
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          upload_id?: string
          slide_number?: number
          title?: string | null
          content?: string | null
          duration?: number
          transition_type?: string
          thumbnail_url?: string | null
          notes?: string | null
          properties?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      project_history: {
        Row: {
          id: string
          projectId: string
          userId: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          description: string | null
          changes: Json
          createdAt: string
        }
        Insert: {
          id?: string
          projectId: string
          user_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          description?: string | null
          changes?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          description?: string | null
          changes?: Json
          created_at?: string
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          id: string
          projectId: string
          version_number: string
          name: string
          description: string | null
          changes_summary: string | null
          created_by: string
          createdAt: string
          metadata: Json
        }
        Insert: {
          id?: string
          projectId: string
          version_number: string
          name: string
          description?: string | null
          changes_summary?: string | null
          created_by: string
          created_at?: string
          metadata?: Json
        }
        Update: {
          id?: string
          project_id?: string
          version_number?: string
          name?: string
          description?: string | null
          changes_summary?: string | null
          created_by?: string
          created_at?: string
          metadata?: Json
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          id: string
          projectId: string
          userId: string
          role: string
          permissions: string[]
          invited_by: string
          joined_at: string
          last_activity: string | null
        }
        Insert: {
          id?: string
          projectId: string
          userId: string
          role: string
          permissions?: string[]
          invited_by: string
          joined_at?: string
          last_activity?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          permissions?: string[]
          invited_by?: string
          joined_at?: string
          last_activity?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: Json
          createdAt: string
          updatedAt: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: Json
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          userId: string
          type: string
          title: string
          message: string
          category: string | null
          priority: string | null
          status: string
          projectId: string | null
          metadata: Json
          actions: Json
          createdAt: string
          updatedAt: string | null
          expiresAt: string | null
          read_at: string | null
        }
        Insert: {
          id?: string
          userId: string
          type: string
          title: string
          message: string
          category?: string | null
          priority?: string | null
          status?: string
          project_id?: string | null
          metadata?: Json
          actions?: Json
          created_at?: string
          updated_at?: string | null
          expires_at?: string | null
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          category?: string | null
          priority?: string | null
          status?: string
          project_id?: string | null
          metadata?: Json
          actions?: Json
          created_at?: string
          updated_at?: string | null
          expires_at?: string | null
          read_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          userId: string
          role_id: string
          createdAt: string
        }
        Insert: {
          id?: string
          userId: string
          role_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
    }
    Functions: {
      get_project_analytics: {
        Args: {
          projectId: string
        }
        Returns: Json
      }
    }
    Enums: {
    }
    CompositeTypes: {
    }
  }
}
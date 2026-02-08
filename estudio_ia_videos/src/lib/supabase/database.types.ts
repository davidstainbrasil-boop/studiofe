export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_reports: {
        Row: {
          created_at: string
          description: string | null
          export_url: string | null
          id: string
          insights: Json
          metrics: Json
          period_end: string
          period_start: string
          recommendations: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          export_url?: string | null
          id?: string
          insights?: Json
          metrics?: Json
          period_end: string
          period_start: string
          recommendations?: Json
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          export_url?: string | null
          id?: string
          insights?: Json
          metrics?: Json
          period_end?: string
          period_start?: string
          recommendations?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          project_id: string | null
          size: number | null
          source_file_id: string | null
          source_provider: string | null
          storage_key: string | null
          type: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          project_id?: string | null
          size?: number | null
          source_file_id?: string | null
          source_provider?: string | null
          storage_key?: string | null
          type: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          project_id?: string | null
          size?: number | null
          source_file_id?: string | null
          source_provider?: string | null
          storage_key?: string | null
          type?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      audio2face_sessions: {
        Row: {
          accuracy_score: number | null
          arkit_curves_url: string | null
          audio_file_path: string
          blend_shapes_data: Json | null
          blend_shapes_file_path: string | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          model_name: string
          processing_time_seconds: number | null
          render_job_id: string
          sample_rate: number | null
          session_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["render_status"] | null
          updated_at: string | null
        }
        Insert: {
          accuracy_score?: number | null
          arkit_curves_url?: string | null
          audio_file_path: string
          blend_shapes_data?: Json | null
          blend_shapes_file_path?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_name: string
          processing_time_seconds?: number | null
          render_job_id: string
          sample_rate?: number | null
          session_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["render_status"] | null
          updated_at?: string | null
        }
        Update: {
          accuracy_score?: number | null
          arkit_curves_url?: string | null
          audio_file_path?: string
          blend_shapes_data?: Json | null
          blend_shapes_file_path?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          model_name?: string
          processing_time_seconds?: number | null
          render_job_id?: string
          sample_rate?: number | null
          session_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["render_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audio2face_sessions_render_job_id_fkey"
            columns: ["render_job_id"]
            isOneToOne: false
            referencedRelation: "render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_analytics: {
        Row: {
          avatar_model_id: string | null
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown
          render_job_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          avatar_model_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          render_job_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_model_id?: string | null
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          render_job_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_analytics_avatar_model_id_fkey"
            columns: ["avatar_model_id"]
            isOneToOne: false
            referencedRelation: "avatar_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avatar_analytics_render_job_id_fkey"
            columns: ["render_job_id"]
            isOneToOne: false
            referencedRelation: "render_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      avatar_customizations: {
        Row: {
          avatar_id: string
          background: Json | null
          created_at: string | null
          customization: Json
          id: string
          is_default: boolean
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_id: string
          background?: Json | null
          created_at?: string | null
          customization?: Json
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_id?: string
          background?: Json | null
          created_at?: string | null
          customization?: Json
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      avatar_models: {
        Row: {
          age_range: string | null
          animation_file_url: string | null
          avatar_type: Database["public"]["Enums"]["avatar_type"]
          blend_shapes_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          ethnicity: string | null
          eye_color: string | null
          file_size: number | null
          gender: Database["public"]["Enums"]["avatar_gender"]
          hair_color: string | null
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          model_file_url: string
          model_version: string | null
          name: string
          supports_audio2face: boolean | null
          supports_real_time: boolean | null
          supports_voice_cloning: boolean | null
          texture_file_url: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          age_range?: string | null
          animation_file_url?: string | null
          avatar_type?: Database["public"]["Enums"]["avatar_type"]
          blend_shapes_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          ethnicity?: string | null
          eye_color?: string | null
          file_size?: number | null
          gender: Database["public"]["Enums"]["avatar_gender"]
          hair_color?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          model_file_url: string
          model_version?: string | null
          name: string
          supports_audio2face?: boolean | null
          supports_real_time?: boolean | null
          supports_voice_cloning?: boolean | null
          texture_file_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          age_range?: string | null
          animation_file_url?: string | null
          avatar_type?: Database["public"]["Enums"]["avatar_type"]
          blend_shapes_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          ethnicity?: string | null
          eye_color?: string | null
          file_size?: number | null
          gender?: Database["public"]["Enums"]["avatar_gender"]
          hair_color?: string | null
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          model_file_url?: string
          model_version?: string | null
          name?: string
          supports_audio2face?: boolean | null
          supports_real_time?: boolean | null
          supports_voice_cloning?: boolean | null
          texture_file_url?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      avatars: {
        Row: {
          category: string | null
          created_at: string | null
          external_id: string | null
          gender: string | null
          id: string
          is_premium: boolean
          is_public: boolean
          metadata: Json | null
          name: string
          preview_url: string | null
          provider: string
          style: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          external_id?: string | null
          gender?: string | null
          id?: string
          is_premium?: boolean
          is_public?: boolean
          metadata?: Json | null
          name: string
          preview_url?: string | null
          provider: string
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          external_id?: string | null
          gender?: string | null
          id?: string
          is_premium?: boolean
          is_public?: boolean
          metadata?: Json | null
          name?: string
          preview_url?: string | null
          provider?: string
          style?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      batch_items: {
        Row: {
          batch_job_id: string
          created_at: string
          error: string | null
          id: string
          input: Json
          item_id: string
          item_type: string
          output: Json | null
          processed_at: string | null
          status: string
        }
        Insert: {
          batch_job_id: string
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          item_id: string
          item_type: string
          output?: Json | null
          processed_at?: string | null
          status?: string
        }
        Update: {
          batch_job_id?: string
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          item_id?: string
          item_type?: string
          output?: Json | null
          processed_at?: string | null
          status?: string
        }
        Relationships: []
      }
      batch_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_items: number
          id: string
          name: string
          processed_items: number
          results: Json | null
          settings: Json
          started_at: string | null
          status: string
          total_items: number
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          id?: string
          name: string
          processed_items?: number
          results?: Json | null
          settings?: Json
          started_at?: string | null
          status?: string
          total_items?: number
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_items?: number
          id?: string
          name?: string
          processed_items?: number
          results?: Json | null
          settings?: Json
          started_at?: string | null
          status?: string
          total_items?: number
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      brand_kits: {
        Row: {
          accent_color: string
          background_color: string
          body_font: string
          created_at: string
          custom_css: string | null
          description: string | null
          favicon_url: string | null
          heading_font: string
          id: string
          intro_video_url: string | null
          is_default: boolean
          logo_light_url: string | null
          logo_url: string | null
          metadata: Json | null
          name: string
          outro_video_url: string | null
          primary_color: string
          secondary_color: string
          text_color: string
          updated_at: string
          user_id: string
          watermark_opacity: number | null
          watermark_position: string | null
          watermark_url: string | null
        }
        Insert: {
          accent_color?: string
          background_color?: string
          body_font?: string
          created_at?: string
          custom_css?: string | null
          description?: string | null
          favicon_url?: string | null
          heading_font?: string
          id?: string
          intro_video_url?: string | null
          is_default?: boolean
          logo_light_url?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          outro_video_url?: string | null
          primary_color?: string
          secondary_color?: string
          text_color?: string
          updated_at?: string
          user_id: string
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_url?: string | null
        }
        Update: {
          accent_color?: string
          background_color?: string
          body_font?: string
          created_at?: string
          custom_css?: string | null
          description?: string | null
          favicon_url?: string | null
          heading_font?: string
          id?: string
          intro_video_url?: string | null
          is_default?: boolean
          logo_light_url?: string | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          outro_video_url?: string | null
          primary_color?: string
          secondary_color?: string
          text_color?: string
          updated_at?: string
          user_id?: string
          watermark_opacity?: number | null
          watermark_position?: string | null
          watermark_url?: string | null
        }
        Relationships: []
      }
      certificates: {
        Row: {
          certificate_url: string | null
          code: string
          course_name: string
          created_at: string | null
          id: string
          issued_at: string | null
          metadata: Json | null
          nr_record_id: string | null
          project_id: string
          student_name: string
          updated_at: string | null
          user_id: string
          valid_until: string | null
        }
        Insert: {
          certificate_url?: string | null
          code: string
          course_name: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          metadata?: Json | null
          nr_record_id?: string | null
          project_id: string
          student_name: string
          updated_at?: string | null
          user_id: string
          valid_until?: string | null
        }
        Update: {
          certificate_url?: string | null
          code?: string
          course_name?: string
          created_at?: string | null
          id?: string
          issued_at?: string | null
          metadata?: Json | null
          nr_record_id?: string | null
          project_id?: string
          student_name?: string
          updated_at?: string | null
          user_id?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      cloud_storage_connections: {
        Row: {
          access_token: string
          account_email: string | null
          account_name: string | null
          connected_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          last_used_at: string | null
          metadata: Json | null
          provider: string
          refresh_token: string
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          account_email?: string | null
          account_name?: string | null
          connected_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          provider: string
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          account_email?: string | null
          account_name?: string | null
          connected_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json | null
          provider?: string
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cloud_storage_imports: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          project_id: string | null
          provider: string
          source_file_id: string
          source_file_name: string
          source_file_path: string | null
          source_mime_type: string | null
          source_size: number | null
          status: string | null
          storage_file_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          provider: string
          source_file_id: string
          source_file_name: string
          source_file_path?: string | null
          source_mime_type?: string | null
          source_size?: number | null
          status?: string | null
          storage_file_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          project_id?: string | null
          provider?: string
          source_file_id?: string
          source_file_name?: string
          source_file_path?: string | null
          source_mime_type?: string | null
          source_size?: number | null
          status?: string | null
          storage_file_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      comment_reactions: {
        Row: {
          comment_id: string
          created_at: string | null
          emoji: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          emoji: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          emoji?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          metadata: Json | null
          parent_id: string | null
          project_id: string
          slide_index: number | null
          timestamp_sec: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          project_id: string
          slide_index?: number | null
          timestamp_sec?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          metadata?: Json | null
          parent_id?: string | null
          project_id?: string
          slide_index?: number | null
          timestamp_sec?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string | null
          created_at: string | null
          description: string | null
          id: string
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interactive_elements: {
        Row: {
          action: Json
          click_count: number
          conditions: Json | null
          content: Json
          created_at: string
          duration: number | null
          height: number | null
          id: string
          order_index: number
          position_x: number
          position_y: number
          styling: Json | null
          timestamp: number
          type: string
          updated_at: string
          video_id: string
          width: number | null
        }
        Insert: {
          action?: Json
          click_count?: number
          conditions?: Json | null
          content?: Json
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          order_index?: number
          position_x?: number
          position_y?: number
          styling?: Json | null
          timestamp: number
          type: string
          updated_at?: string
          video_id: string
          width?: number | null
        }
        Update: {
          action?: Json
          click_count?: number
          conditions?: Json | null
          content?: Json
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          order_index?: number
          position_x?: number
          position_y?: number
          styling?: Json | null
          timestamp?: number
          type?: string
          updated_at?: string
          video_id?: string
          width?: number | null
        }
        Relationships: []
      }
      interactive_events: {
        Row: {
          created_at: string
          element_id: string | null
          event_data: Json | null
          event_type: string
          id: string
          session_id: string
          user_id: string | null
          video_id: string
          video_time: number
        }
        Insert: {
          created_at?: string
          element_id?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          session_id: string
          user_id?: string | null
          video_id: string
          video_time: number
        }
        Update: {
          created_at?: string
          element_id?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          session_id?: string
          user_id?: string | null
          video_id?: string
          video_time?: number
        }
        Relationships: []
      }
      interactive_video_sessions: {
        Row: {
          completed: boolean
          duration: number
          ended_at: string | null
          id: string
          metadata: Json | null
          progress: number
          score: number | null
          session_token: string
          started_at: string
          user_id: string | null
          video_id: string
        }
        Insert: {
          completed?: boolean
          duration?: number
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          score?: number | null
          session_token: string
          started_at?: string
          user_id?: string | null
          video_id: string
        }
        Update: {
          completed?: boolean
          duration?: number
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          progress?: number
          score?: number | null
          session_token?: string
          started_at?: string
          user_id?: string | null
          video_id?: string
        }
        Relationships: []
      }
      interactive_videos: {
        Row: {
          average_engagement: number
          completion_rate: number
          created_at: string
          description: string | null
          duration: number
          id: string
          is_published: boolean
          settings: Json
          thumbnail_url: string | null
          title: string
          total_views: number
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          average_engagement?: number
          completion_rate?: number
          created_at?: string
          description?: string | null
          duration: number
          id?: string
          is_published?: boolean
          settings?: Json
          thumbnail_url?: string | null
          title: string
          total_views?: number
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          average_engagement?: number
          completion_rate?: number
          created_at?: string
          description?: string | null
          duration?: number
          id?: string
          is_published?: boolean
          settings?: Json
          thumbnail_url?: string | null
          title?: string
          total_views?: number
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      lti_grades: {
        Row: {
          activity_progress: string | null
          comment: string | null
          grading_progress: string | null
          id: string
          lineitem_url: string | null
          lms_response_body: string | null
          lms_response_code: number | null
          lti_user_id: string
          score_given: number | null
          score_maximum: number | null
          session_id: string | null
          submitted_at: string | null
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          activity_progress?: string | null
          comment?: string | null
          grading_progress?: string | null
          id?: string
          lineitem_url?: string | null
          lms_response_body?: string | null
          lms_response_code?: number | null
          lti_user_id: string
          score_given?: number | null
          score_maximum?: number | null
          session_id?: string | null
          submitted_at?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          activity_progress?: string | null
          comment?: string | null
          grading_progress?: string | null
          id?: string
          lineitem_url?: string | null
          lms_response_body?: string | null
          lms_response_code?: number | null
          lti_user_id?: string
          score_given?: number | null
          score_maximum?: number | null
          session_id?: string | null
          submitted_at?: string | null
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      lti_platforms: {
        Row: {
          auth_login_url: string
          auth_token_url: string
          client_id: string
          created_at: string | null
          created_by: string | null
          deployment_id: string | null
          id: string
          is_active: boolean | null
          issuer: string
          key_set_url: string
          name: string
          private_key_pem: string | null
          public_key_pem: string | null
          updated_at: string | null
        }
        Insert: {
          auth_login_url: string
          auth_token_url: string
          client_id: string
          created_at?: string | null
          created_by?: string | null
          deployment_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer: string
          key_set_url: string
          name: string
          private_key_pem?: string | null
          public_key_pem?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_login_url?: string
          auth_token_url?: string
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          deployment_id?: string | null
          id?: string
          is_active?: boolean | null
          issuer?: string
          key_set_url?: string
          name?: string
          private_key_pem?: string | null
          public_key_pem?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lti_sessions: {
        Row: {
          ags_endpoint: Json | null
          context_id: string | null
          context_title: string | null
          custom_params: Json | null
          expires_at: string | null
          id: string
          launched_at: string | null
          lti_user_id: string
          nonce: string | null
          nrps_endpoint: Json | null
          platform_id: string | null
          resource_link_id: string | null
          roles: string[] | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          ags_endpoint?: Json | null
          context_id?: string | null
          context_title?: string | null
          custom_params?: Json | null
          expires_at?: string | null
          id?: string
          launched_at?: string | null
          lti_user_id: string
          nonce?: string | null
          nrps_endpoint?: Json | null
          platform_id?: string | null
          resource_link_id?: string | null
          roles?: string[] | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          ags_endpoint?: Json | null
          context_id?: string | null
          context_title?: string | null
          custom_params?: Json | null
          expires_at?: string | null
          id?: string
          launched_at?: string | null
          lti_user_id?: string
          nonce?: string | null
          nrps_endpoint?: Json | null
          platform_id?: string | null
          resource_link_id?: string | null
          roles?: string[] | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_moderation_logs: {
        Row: {
          action: string
          automated_check_results: Json | null
          created_at: string
          id: string
          is_automated: boolean
          metadata: Json
          moderator_id: string
          new_status: string
          notes: string | null
          previous_status: string | null
          product_id: string
        }
        Insert: {
          action: string
          automated_check_results?: Json | null
          created_at?: string
          id?: string
          is_automated?: boolean
          metadata?: Json
          moderator_id: string
          new_status: string
          notes?: string | null
          previous_status?: string | null
          product_id: string
        }
        Update: {
          action?: string
          automated_check_results?: Json | null
          created_at?: string
          id?: string
          is_automated?: boolean
          metadata?: Json
          moderator_id?: string
          new_status?: string
          notes?: string | null
          previous_status?: string | null
          product_id?: string
        }
        Relationships: []
      }
      marketplace_payouts: {
        Row: {
          adjustments: number
          amount: number
          created_at: string
          currency: string
          failure_reason: string | null
          gross_amount: number
          id: string
          last_retry_at: string | null
          metadata: Json
          period_end: string
          period_start: string
          platform_fees: number
          processed_at: string | null
          purchase_count: number
          retry_count: number
          seller_id: string
          status: string
          stripe_fees: number
          stripe_payout_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          adjustments?: number
          amount: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gross_amount: number
          id?: string
          last_retry_at?: string | null
          metadata?: Json
          period_end: string
          period_start: string
          platform_fees?: number
          processed_at?: string | null
          purchase_count?: number
          retry_count?: number
          seller_id: string
          status?: string
          stripe_fees?: number
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          adjustments?: number
          amount?: number
          created_at?: string
          currency?: string
          failure_reason?: string | null
          gross_amount?: number
          id?: string
          last_retry_at?: string | null
          metadata?: Json
          period_end?: string
          period_start?: string
          platform_fees?: number
          processed_at?: string | null
          purchase_count?: number
          retry_count?: number
          seller_id?: string
          status?: string
          stripe_fees?: number
          stripe_payout_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_products: {
        Row: {
          average_rating: number
          created_at: string
          currency: string
          documentation_url: string | null
          download_count: number
          featured_priority: number
          featured_until: string | null
          gallery_images: string[] | null
          id: string
          is_active: boolean
          is_featured: boolean
          license_type: string
          max_price: number | null
          metadata: Json
          min_price: number | null
          moderated_at: string | null
          moderation_status: string
          moderator_id: string | null
          moderator_notes: string | null
          preview_video_url: string | null
          price: number | null
          pricing_type: string
          published_at: string | null
          purchase_count: number
          rejection_reason: string | null
          revenue_split_platform: number
          revenue_split_seller: number
          review_count: number
          revision_feedback: string | null
          search_keywords: string[] | null
          seller_id: string
          seo_description: string | null
          seo_title: string | null
          support_url: string | null
          template_id: string
          total_revenue: number
          unpublished_at: string | null
          updated_at: string
          view_count: number
        }
        Insert: {
          average_rating?: number
          created_at?: string
          currency?: string
          documentation_url?: string | null
          download_count?: number
          featured_priority?: number
          featured_until?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          license_type?: string
          max_price?: number | null
          metadata?: Json
          min_price?: number | null
          moderated_at?: string | null
          moderation_status?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          preview_video_url?: string | null
          price?: number | null
          pricing_type?: string
          published_at?: string | null
          purchase_count?: number
          rejection_reason?: string | null
          revenue_split_platform?: number
          revenue_split_seller?: number
          review_count?: number
          revision_feedback?: string | null
          search_keywords?: string[] | null
          seller_id: string
          seo_description?: string | null
          seo_title?: string | null
          support_url?: string | null
          template_id: string
          total_revenue?: number
          unpublished_at?: string | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          average_rating?: number
          created_at?: string
          currency?: string
          documentation_url?: string | null
          download_count?: number
          featured_priority?: number
          featured_until?: string | null
          gallery_images?: string[] | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          license_type?: string
          max_price?: number | null
          metadata?: Json
          min_price?: number | null
          moderated_at?: string | null
          moderation_status?: string
          moderator_id?: string | null
          moderator_notes?: string | null
          preview_video_url?: string | null
          price?: number | null
          pricing_type?: string
          published_at?: string | null
          purchase_count?: number
          rejection_reason?: string | null
          revenue_split_platform?: number
          revenue_split_seller?: number
          review_count?: number
          revision_feedback?: string | null
          search_keywords?: string[] | null
          seller_id?: string
          seo_description?: string | null
          seo_title?: string | null
          support_url?: string | null
          template_id?: string
          total_revenue?: number
          unpublished_at?: string | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      marketplace_purchases: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string
          currency: string
          download_count: number
          download_expires_at: string | null
          download_token: string | null
          first_download_at: string | null
          gross_amount: number
          id: string
          last_download_at: string | null
          license_key: string
          license_type: string
          metadata: Json
          net_amount: number
          payment_method: string | null
          payment_status: string
          payout_id: string | null
          payout_status: string
          platform_amount: number
          product_id: string
          refund_amount: number | null
          refund_reason: string | null
          refund_stripe_id: string | null
          refunded_at: string | null
          seller_amount: number
          seller_id: string
          stripe_charge_id: string | null
          stripe_fee: number
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string
          currency?: string
          download_count?: number
          download_expires_at?: string | null
          download_token?: string | null
          first_download_at?: string | null
          gross_amount: number
          id?: string
          last_download_at?: string | null
          license_key?: string
          license_type?: string
          metadata?: Json
          net_amount: number
          payment_method?: string | null
          payment_status?: string
          payout_id?: string | null
          payout_status?: string
          platform_amount: number
          product_id: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_stripe_id?: string | null
          refunded_at?: string | null
          seller_amount: number
          seller_id: string
          stripe_charge_id?: string | null
          stripe_fee?: number
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string
          currency?: string
          download_count?: number
          download_expires_at?: string | null
          download_token?: string | null
          first_download_at?: string | null
          gross_amount?: number
          id?: string
          last_download_at?: string | null
          license_key?: string
          license_type?: string
          metadata?: Json
          net_amount?: number
          payment_method?: string | null
          payment_status?: string
          payout_id?: string | null
          payout_status?: string
          platform_amount?: number
          product_id?: string
          refund_amount?: number | null
          refund_reason?: string | null
          refund_stripe_id?: string | null
          refunded_at?: string | null
          seller_amount?: number
          seller_id?: string
          stripe_charge_id?: string | null
          stripe_fee?: number
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_reviews: {
        Row: {
          content: string | null
          created_at: string
          ease_of_use_rating: number | null
          flag_reason: string | null
          helpful_count: number
          hidden_reason: string | null
          id: string
          images: string[] | null
          is_flagged: boolean
          is_hidden: boolean
          is_verified_purchase: boolean
          metadata: Json
          not_helpful_count: number
          product_id: string
          purchase_id: string
          quality_rating: number | null
          rating: number
          seller_responded_at: string | null
          seller_response: string | null
          support_rating: number | null
          title: string | null
          updated_at: string
          user_id: string
          value_rating: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          ease_of_use_rating?: number | null
          flag_reason?: string | null
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          images?: string[] | null
          is_flagged?: boolean
          is_hidden?: boolean
          is_verified_purchase?: boolean
          metadata?: Json
          not_helpful_count?: number
          product_id: string
          purchase_id: string
          quality_rating?: number | null
          rating: number
          seller_responded_at?: string | null
          seller_response?: string | null
          support_rating?: number | null
          title?: string | null
          updated_at?: string
          user_id: string
          value_rating?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string
          ease_of_use_rating?: number | null
          flag_reason?: string | null
          helpful_count?: number
          hidden_reason?: string | null
          id?: string
          images?: string[] | null
          is_flagged?: boolean
          is_hidden?: boolean
          is_verified_purchase?: boolean
          metadata?: Json
          not_helpful_count?: number
          product_id?: string
          purchase_id?: string
          quality_rating?: number | null
          rating?: number
          seller_responded_at?: string | null
          seller_response?: string | null
          support_rating?: number | null
          title?: string | null
          updated_at?: string
          user_id?: string
          value_rating?: number | null
        }
        Relationships: []
      }
      marketplace_seller_profiles: {
        Row: {
          auto_publish: boolean
          avatar_url: string | null
          average_rating: number
          bio: string | null
          created_at: string
          default_revenue_split: number
          display_name: string
          email_notifications: boolean
          id: string
          metadata: Json
          payout_enabled: boolean
          payout_schedule: string
          social_links: Json
          stripe_connect_account_id: string | null
          total_products: number
          total_revenue: number
          total_reviews: number
          total_sales: number
          updated_at: string
          user_id: string
          verification_documents: Json
          verification_status: string
          verified_at: string | null
          website_url: string | null
        }
        Insert: {
          auto_publish?: boolean
          avatar_url?: string | null
          average_rating?: number
          bio?: string | null
          created_at?: string
          default_revenue_split?: number
          display_name: string
          email_notifications?: boolean
          id?: string
          metadata?: Json
          payout_enabled?: boolean
          payout_schedule?: string
          social_links?: Json
          stripe_connect_account_id?: string | null
          total_products?: number
          total_revenue?: number
          total_reviews?: number
          total_sales?: number
          updated_at?: string
          user_id: string
          verification_documents?: Json
          verification_status?: string
          verified_at?: string | null
          website_url?: string | null
        }
        Update: {
          auto_publish?: boolean
          avatar_url?: string | null
          average_rating?: number
          bio?: string | null
          created_at?: string
          default_revenue_split?: number
          display_name?: string
          email_notifications?: boolean
          id?: string
          metadata?: Json
          payout_enabled?: boolean
          payout_schedule?: string
          social_links?: Json
          stripe_connect_account_id?: string | null
          total_products?: number
          total_revenue?: number
          total_reviews?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          verification_documents?: Json
          verification_status?: string
          verified_at?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_product_updates: boolean
          email_project_shared: boolean
          email_render_complete: boolean
          email_render_failed: boolean
          email_team_invites: boolean
          email_weekly_digest: boolean
          id: string
          push_enabled: boolean
          push_render_complete: boolean
          slack_enabled: boolean
          slack_webhook_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_product_updates?: boolean
          email_project_shared?: boolean
          email_render_complete?: boolean
          email_render_failed?: boolean
          email_team_invites?: boolean
          email_weekly_digest?: boolean
          id?: string
          push_enabled?: boolean
          push_render_complete?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_product_updates?: boolean
          email_project_shared?: boolean
          email_render_complete?: boolean
          email_render_failed?: boolean
          email_team_invites?: boolean
          email_weekly_digest?: boolean
          id?: string
          push_enabled?: boolean
          push_render_complete?: boolean
          slack_enabled?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nr_compliance_records: {
        Row: {
          ai_analysis: Json | null
          ai_score: number | null
          confidence: number | null
          created_at: string
          critical_points: Json | null
          final_score: number
          id: string
          metadata: Json | null
          nr: string
          nr_name: string
          project_id: string
          recommendations: Json | null
          requirements_met: number
          requirements_total: number
          score: number
          status: string
          updated_at: string
          validated_at: string
          validated_by: string
        }
        Insert: {
          ai_analysis?: Json | null
          ai_score?: number | null
          confidence?: number | null
          created_at?: string
          critical_points?: Json | null
          final_score: number
          id?: string
          metadata?: Json | null
          nr: string
          nr_name: string
          project_id: string
          recommendations?: Json | null
          requirements_met: number
          requirements_total: number
          score: number
          status: string
          updated_at?: string
          validated_at?: string
          validated_by: string
        }
        Update: {
          ai_analysis?: Json | null
          ai_score?: number | null
          confidence?: number | null
          created_at?: string
          critical_points?: Json | null
          final_score?: number
          id?: string
          metadata?: Json | null
          nr?: string
          nr_name?: string
          project_id?: string
          recommendations?: Json | null
          requirements_met?: number
          requirements_total?: number
          score?: number
          status?: string
          updated_at?: string
          validated_at?: string
          validated_by?: string
        }
        Relationships: []
      }
      nr_courses: {
        Row: {
          course_code: string
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          metadata: Json | null
          modules_count: number | null
          status: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_code: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          modules_count?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          metadata?: Json | null
          modules_count?: number | null
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      nr_modules: {
        Row: {
          content: Json | null
          course_id: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          order_index: number
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: Json | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          order_index: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: Json | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          order_index?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nr_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "nr_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      nr_templates: {
        Row: {
          created_at: string | null
          description: string | null
          duration_seconds: number
          id: string
          nr_number: string
          slide_count: number
          template_config: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          nr_number: string
          slide_count?: number
          template_config?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_seconds?: number
          id?: string
          nr_number?: string
          slide_count?: number
          template_config?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          org_id: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          org_id: string
          role?: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          org_id?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          last_active_at: string | null
          org_id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          last_active_at?: string | null
          org_id: string
          permissions?: Json
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          last_active_at?: string | null
          org_id?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_projects: {
        Row: {
          added_at: string
          added_by: string
          id: string
          org_id: string
          project_id: string
        }
        Insert: {
          added_at?: string
          added_by: string
          id?: string
          org_id: string
          project_id: string
        }
        Update: {
          added_at?: string
          added_by?: string
          id?: string
          org_id?: string
          project_id?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          billing_email: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_projects: number
          max_users: number
          name: string
          plan: string
          settings: Json
          slug: string
          storage_gb_limit: number
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_projects?: number
          max_users?: number
          name: string
          plan?: string
          settings?: Json
          slug: string
          storage_gb_limit?: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_projects?: number
          max_users?: number
          name?: string
          plan?: string
          settings?: Json
          slug?: string
          storage_gb_limit?: number
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource?: string
        }
        Relationships: []
      }
      pptx_slides: {
        Row: {
          content: string | null
          created_at: string | null
          duration: number | null
          id: string
          notes: string | null
          properties: Json | null
          slide_number: number
          thumbnail_url: string | null
          title: string | null
          transition_type: string | null
          updated_at: string | null
          upload_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          properties?: Json | null
          slide_number: number
          thumbnail_url?: string | null
          title?: string | null
          transition_type?: string | null
          updated_at?: string | null
          upload_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          notes?: string | null
          properties?: Json | null
          slide_number?: number
          thumbnail_url?: string | null
          title?: string | null
          transition_type?: string | null
          updated_at?: string | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pptx_slides_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "pptx_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      pptx_uploads: {
        Row: {
          created_at: string | null
          id: string
          original_filename: string | null
          project_id: string | null
          slide_count: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          original_filename?: string | null
          project_id?: string | null
          slide_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          original_filename?: string | null
          project_id?: string | null
          slide_count?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pptx_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_analytics: {
        Row: {
          created_at: string | null
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          ip_address: unknown
          metadata: Json | null
          project_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          project_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          project_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          permissions: Json | null
          project_id: string
          role: Database["public"]["Enums"]["collaboration_role"] | null
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          project_id: string
          role?: Database["public"]["Enums"]["collaboration_role"] | null
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          permissions?: Json | null
          project_id?: string
          role?: Database["public"]["Enums"]["collaboration_role"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          parent_id: string | null
          project_id: string
          resolved: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          project_id: string
          resolved?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parent_id?: string | null
          project_id?: string
          resolved?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_history: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          project_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          project_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_reviews: {
        Row: {
          completed_at: string | null
          description: string | null
          due_date: string | null
          id: string
          metadata: Json
          priority: string
          project_id: string
          requester_id: string
          status: string
          submitted_at: string
          title: string
          version_id: string | null
        }
        Insert: {
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string
          project_id: string
          requester_id: string
          status?: string
          submitted_at?: string
          title: string
          version_id?: string | null
        }
        Update: {
          completed_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          metadata?: Json
          priority?: string
          project_id?: string
          requester_id?: string
          status?: string
          submitted_at?: string
          title?: string
          version_id?: string | null
        }
        Relationships: []
      }
      project_tags: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      project_templates: {
        Row: {
          brand_kit_id: string | null
          category: string
          created_at: string
          description: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          metadata: Json
          name: string
          org_id: string | null
          preview_url: string | null
          project_data: Json
          rating: number
          render_settings: Json
          scene_data: Json
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
          user_id: string
          version: number
        }
        Insert: {
          brand_kit_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          metadata?: Json
          name: string
          org_id?: string | null
          preview_url?: string | null
          project_data: Json
          rating?: number
          render_settings?: Json
          scene_data?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
          version?: number
        }
        Update: {
          brand_kit_id?: string | null
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          metadata?: Json
          name?: string
          org_id?: string | null
          preview_url?: string | null
          project_data?: Json
          rating?: number
          render_settings?: Json
          scene_data?: Json
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      project_translations: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          provider: string
          source_content: Json
          source_language: string
          status: string
          target_language: string
          translated_content: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          provider?: string
          source_content: Json
          source_language: string
          status?: string
          target_language: string
          translated_content: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          provider?: string
          source_content?: Json
          source_language?: string
          status?: string
          target_language?: string
          translated_content?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      project_version_snapshots: {
        Row: {
          checksum: string | null
          created_at: string
          delta_from_prev: Json | null
          description: string | null
          file_size: number
          id: string
          is_bookmarked: boolean
          name: string | null
          project_id: string
          project_state: Json
          restored_at: string | null
          scenes_state: Json
          snapshot_type: string
          timeline_state: Json | null
          user_id: string
          version: number
        }
        Insert: {
          checksum?: string | null
          created_at?: string
          delta_from_prev?: Json | null
          description?: string | null
          file_size?: number
          id?: string
          is_bookmarked?: boolean
          name?: string | null
          project_id: string
          project_state: Json
          restored_at?: string | null
          scenes_state?: Json
          snapshot_type?: string
          timeline_state?: Json | null
          user_id: string
          version: number
        }
        Update: {
          checksum?: string | null
          created_at?: string
          delta_from_prev?: Json | null
          description?: string | null
          file_size?: number
          id?: string
          is_bookmarked?: boolean
          name?: string | null
          project_id?: string
          project_state?: Json
          restored_at?: string | null
          scenes_state?: Json
          snapshot_type?: string
          timeline_state?: Json | null
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          changes_summary: string | null
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          metadata: Json | null
          name: string
          project_id: string
          version_number: string
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          project_id: string
          version_number: string
        }
        Update: {
          changes_summary?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          project_id?: string
          version_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          collaboration_enabled: boolean | null
          created_at: string | null
          current_version: string | null
          description: string | null
          id: string
          is_public: boolean | null
          is_template: boolean | null
          last_accessed_at: string | null
          metadata: Json | null
          name: string
          preview_url: string | null
          render_settings: Json | null
          status: Database["public"]["Enums"]["project_status"] | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["project_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          collaboration_enabled?: boolean | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          name: string
          preview_url?: string | null
          render_settings?: Json | null
          status?: Database["public"]["Enums"]["project_status"] | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          collaboration_enabled?: boolean | null
          created_at?: string | null
          current_version?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string
          preview_url?: string | null
          render_settings?: Json | null
          status?: Database["public"]["Enums"]["project_status"] | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["project_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quiz_answers: {
        Row: {
          answer: Json
          attempt_id: string
          created_at: string | null
          id: string
          is_correct: boolean
          points_earned: number
          question_id: string
          time_spent_seconds: number
        }
        Insert: {
          answer: Json
          attempt_id: string
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id: string
          time_spent_seconds?: number
        }
        Update: {
          answer?: Json
          attempt_id?: string
          created_at?: string | null
          id?: string
          is_correct?: boolean
          points_earned?: number
          question_id?: string
          time_spent_seconds?: number
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string | null
          earned_points: number
          id: string
          passed: boolean
          quiz_id: string
          score: number | null
          started_at: string | null
          time_spent_seconds: number
          total_points: number
          user_id: string
        }
        Insert: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          earned_points?: number
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number | null
          started_at?: string | null
          time_spent_seconds?: number
          total_points?: number
          user_id: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string | null
          earned_points?: number
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number | null
          started_at?: string | null
          time_spent_seconds?: number
          total_points?: number
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_answer: Json | null
          created_at: string | null
          duration_seconds: number | null
          explanation: string | null
          id: string
          options: Json | null
          order_index: number
          points: number
          question: string
          quiz_id: string
          required: boolean
          timestamp: number
          type: string
        }
        Insert: {
          correct_answer?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question: string
          quiz_id: string
          required?: boolean
          timestamp: number
          type: string
        }
        Update: {
          correct_answer?: Json | null
          created_at?: string | null
          duration_seconds?: number | null
          explanation?: string | null
          id?: string
          options?: Json | null
          order_index?: number
          points?: number
          question?: string
          quiz_id?: string
          required?: boolean
          timestamp?: number
          type?: string
        }
        Relationships: []
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean
          is_published: boolean
          max_attempts: number
          passing_score: number
          project_id: string
          show_correct_answers: boolean
          show_feedback: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          time_limit_seconds: number | null
          title: string
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          max_attempts?: number
          passing_score?: number
          project_id: string
          show_correct_answers?: boolean
          show_feedback?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          time_limit_seconds?: number | null
          title: string
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_published?: boolean
          max_attempts?: number
          passing_score?: number
          project_id?: string
          show_correct_answers?: boolean
          show_feedback?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      render_jobs: {
        Row: {
          actual_duration: number | null
          attempts: number | null
          avatar_model_id: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_message: string | null
          estimated_duration: number | null
          id: string
          idempotency_key: string | null
          max_retries: number | null
          output_url: string | null
          priority: Database["public"]["Enums"]["PriorityLevel"] | null
          progress: number | null
          project_id: string | null
          quality: Database["public"]["Enums"]["video_quality"] | null
          render_settings: Json | null
          retry_count: number | null
          settings: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["JobStatus"] | null
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string | null
          video_project_id: string | null
          worker_id: string | null
        }
        Insert: {
          actual_duration?: number | null
          attempts?: number | null
          avatar_model_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_duration?: number | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          output_url?: string | null
          priority?: Database["public"]["Enums"]["PriorityLevel"] | null
          progress?: number | null
          project_id?: string | null
          quality?: Database["public"]["Enums"]["video_quality"] | null
          render_settings?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["JobStatus"] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_project_id?: string | null
          worker_id?: string | null
        }
        Update: {
          actual_duration?: number | null
          attempts?: number | null
          avatar_model_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_message?: string | null
          estimated_duration?: number | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          output_url?: string | null
          priority?: Database["public"]["Enums"]["PriorityLevel"] | null
          progress?: number | null
          project_id?: string | null
          quality?: Database["public"]["Enums"]["video_quality"] | null
          render_settings?: Json | null
          retry_count?: number | null
          settings?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["JobStatus"] | null
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string | null
          video_project_id?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "render_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "render_jobs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      review_assignments: {
        Row: {
          assigned_at: string
          decision: string | null
          feedback: string | null
          id: string
          priority: number
          responded_at: string | null
          review_id: string
          reviewer_id: string
          status: string
        }
        Insert: {
          assigned_at?: string
          decision?: string | null
          feedback?: string | null
          id?: string
          priority?: number
          responded_at?: string | null
          review_id: string
          reviewer_id: string
          status?: string
        }
        Update: {
          assigned_at?: string
          decision?: string | null
          feedback?: string | null
          id?: string
          priority?: number
          responded_at?: string | null
          review_id?: string
          reviewer_id?: string
          status?: string
        }
        Relationships: []
      }
      review_comments: {
        Row: {
          attachments: Json
          content: string
          coordinates: Json | null
          created_at: string
          id: string
          is_resolved: boolean
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          scene_id: string | null
          timestamp: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachments?: Json
          content: string
          coordinates?: Json | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          scene_id?: string | null
          timestamp?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachments?: Json
          content?: string
          coordinates?: Json | null
          created_at?: string
          id?: string
          is_resolved?: boolean
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          scene_id?: string | null
          timestamp?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_helpfulness_votes: {
        Row: {
          created_at: string
          id: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_helpful: boolean
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_helpful?: boolean
          review_id?: string
          user_id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      scenes: {
        Row: {
          animations: Json | null
          avatar_emotion: string | null
          avatar_id: string | null
          avatar_position: Json | null
          avatar_provider: string | null
          avatar_script: string | null
          avatar_settings: Json | null
          background_color: string | null
          background_image: string | null
          background_music: string | null
          background_type: string | null
          background_video: string | null
          created_at: string | null
          ducking: boolean | null
          duration: number
          id: string
          locked: boolean | null
          music_volume: number | null
          name: string
          notes: string | null
          order_index: number
          project_id: string
          sound_effects: Json | null
          start_time: number
          subtitles: Json | null
          text_elements: Json | null
          thumbnail_url: string | null
          transition_in: Json | null
          transition_out: Json | null
          updated_at: string | null
          version: number | null
          visual_elements: Json | null
          voice_config: Json | null
        }
        Insert: {
          animations?: Json | null
          avatar_emotion?: string | null
          avatar_id?: string | null
          avatar_position?: Json | null
          avatar_provider?: string | null
          avatar_script?: string | null
          avatar_settings?: Json | null
          background_color?: string | null
          background_image?: string | null
          background_music?: string | null
          background_type?: string | null
          background_video?: string | null
          created_at?: string | null
          ducking?: boolean | null
          duration?: number
          id?: string
          locked?: boolean | null
          music_volume?: number | null
          name?: string
          notes?: string | null
          order_index: number
          project_id: string
          sound_effects?: Json | null
          start_time?: number
          subtitles?: Json | null
          text_elements?: Json | null
          thumbnail_url?: string | null
          transition_in?: Json | null
          transition_out?: Json | null
          updated_at?: string | null
          version?: number | null
          visual_elements?: Json | null
          voice_config?: Json | null
        }
        Update: {
          animations?: Json | null
          avatar_emotion?: string | null
          avatar_id?: string | null
          avatar_position?: Json | null
          avatar_provider?: string | null
          avatar_script?: string | null
          avatar_settings?: Json | null
          background_color?: string | null
          background_image?: string | null
          background_music?: string | null
          background_type?: string | null
          background_video?: string | null
          created_at?: string | null
          ducking?: boolean | null
          duration?: number
          id?: string
          locked?: boolean | null
          music_volume?: number | null
          name?: string
          notes?: string | null
          order_index?: number
          project_id?: string
          sound_effects?: Json | null
          start_time?: number
          subtitles?: Json | null
          text_elements?: Json | null
          thumbnail_url?: string | null
          transition_in?: Json | null
          transition_out?: Json | null
          updated_at?: string | null
          version?: number | null
          visual_elements?: Json | null
          voice_config?: Json | null
        }
        Relationships: []
      }
      slides: {
        Row: {
          audio_config: Json | null
          avatar_config: Json | null
          background_color: string | null
          background_image: string | null
          content: string | null
          created_at: string | null
          duration: number | null
          id: string
          order_index: number
          project_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          audio_config?: Json | null
          avatar_config?: Json | null
          background_color?: string | null
          background_image?: string | null
          content?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          order_index: number
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          audio_config?: Json | null
          avatar_config?: Json | null
          background_color?: string | null
          background_image?: string | null
          content?: string | null
          created_at?: string | null
          duration?: number | null
          id?: string
          order_index?: number
          project_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slides_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_files: {
        Row: {
          bucket: string
          checksum: string | null
          created_at: string | null
          download_count: number | null
          file_path: string
          file_size: number | null
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string | null
          original_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bucket?: string
          checksum?: string | null
          created_at?: string | null
          download_count?: number | null
          file_path: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          original_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bucket?: string
          checksum?: string | null
          created_at?: string | null
          download_count?: number | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string | null
          original_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subtitle_tracks: {
        Row: {
          created_at: string | null
          id: string
          language: string
          segments: Json
          srt_url: string | null
          transcription_id: string
          updated_at: string | null
          vtt_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          language: string
          segments?: Json
          srt_url?: string | null
          transcription_id: string
          updated_at?: string | null
          vtt_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          language?: string
          segments?: Json
          srt_url?: string | null
          transcription_id?: string
          updated_at?: string | null
          vtt_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subtitle_tracks_transcription_id_fkey"
            columns: ["transcription_id"]
            isOneToOne: false
            referencedRelation: "transcriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_stats: {
        Row: {
          active_jobs: number | null
          audio2face_status: string | null
          avg_lipsync_accuracy: number | null
          avg_render_time_seconds: number | null
          completed_jobs: number | null
          cpu_usage: number | null
          database_status: string | null
          disk_usage: number | null
          failed_jobs: number | null
          gpu_usage: number | null
          id: string
          memory_usage: number | null
          recorded_at: string | null
          redis_status: string | null
          success_rate: number | null
          total_renders: number | null
        }
        Insert: {
          active_jobs?: number | null
          audio2face_status?: string | null
          avg_lipsync_accuracy?: number | null
          avg_render_time_seconds?: number | null
          completed_jobs?: number | null
          cpu_usage?: number | null
          database_status?: string | null
          disk_usage?: number | null
          failed_jobs?: number | null
          gpu_usage?: number | null
          id?: string
          memory_usage?: number | null
          recorded_at?: string | null
          redis_status?: string | null
          success_rate?: number | null
          total_renders?: number | null
        }
        Update: {
          active_jobs?: number | null
          audio2face_status?: string | null
          avg_lipsync_accuracy?: number | null
          avg_render_time_seconds?: number | null
          completed_jobs?: number | null
          cpu_usage?: number | null
          database_status?: string | null
          disk_usage?: number | null
          failed_jobs?: number | null
          gpu_usage?: number | null
          id?: string
          memory_usage?: number | null
          recorded_at?: string | null
          redis_status?: string | null
          success_rate?: number | null
          total_renders?: number | null
        }
        Relationships: []
      }
      template_categories: {
        Row: {
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      templates: {
        Row: {
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_public: boolean | null
          metadata: Json | null
          name: string
          preview_url: string | null
          settings: Json | null
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name: string
          preview_url?: string | null
          settings?: Json | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_public?: boolean | null
          metadata?: Json | null
          name?: string
          preview_url?: string | null
          settings?: Json | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      timeline_elements: {
        Row: {
          created_at: string
          duration: number
          id: string
          locked: boolean
          metadata: Json | null
          muted: boolean
          name: string | null
          project_id: string
          properties: Json
          start_time: number
          track_id: string
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          duration: number
          id?: string
          locked?: boolean
          metadata?: Json | null
          muted?: boolean
          name?: string | null
          project_id: string
          properties?: Json
          start_time: number
          track_id: string
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          duration?: number
          id?: string
          locked?: boolean
          metadata?: Json | null
          muted?: boolean
          name?: string | null
          project_id?: string
          properties?: Json
          start_time?: number
          track_id?: string
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      timeline_tracks: {
        Row: {
          created_at: string
          height: number | null
          id: string
          locked: boolean
          metadata: Json | null
          muted: boolean
          name: string
          order_index: number
          project_id: string
          type: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          locked?: boolean
          metadata?: Json | null
          muted?: boolean
          name: string
          order_index?: number
          project_id: string
          type: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          locked?: boolean
          metadata?: Json | null
          muted?: boolean
          name?: string
          order_index?: number
          project_id?: string
          type?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      timelines: {
        Row: {
          created_at: string | null
          id: string
          project_id: string | null
          settings: Json | null
          total_duration: number | null
          tracks: Json | null
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          settings?: Json | null
          total_duration?: number | null
          tracks?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string | null
          settings?: Json | null
          total_duration?: number | null
          tracks?: Json | null
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timelines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transcriptions: {
        Row: {
          audio_path: string | null
          confidence: number | null
          created_at: string | null
          duration: number | null
          id: string
          karaoke_enabled: boolean
          karaoke_url: string | null
          language: string
          project_id: string | null
          segments: Json
          speaker_diarization_enabled: boolean
          srt_url: string | null
          updated_at: string | null
          user_id: string
          vtt_url: string | null
          word_count: number | null
        }
        Insert: {
          audio_path?: string | null
          confidence?: number | null
          created_at?: string | null
          duration?: number | null
          id?: string
          karaoke_enabled?: boolean
          karaoke_url?: string | null
          language: string
          project_id?: string | null
          segments?: Json
          speaker_diarization_enabled?: boolean
          srt_url?: string | null
          updated_at?: string | null
          user_id: string
          vtt_url?: string | null
          word_count?: number | null
        }
        Update: {
          audio_path?: string | null
          confidence?: number | null
          created_at?: string | null
          duration?: number | null
          id?: string
          karaoke_enabled?: boolean
          karaoke_url?: string | null
          language?: string
          project_id?: string | null
          segments?: Json
          speaker_diarization_enabled?: boolean
          srt_url?: string | null
          updated_at?: string | null
          user_id?: string
          vtt_url?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_logs: {
        Row: {
          characters_billed: number | null
          cost_usd: number | null
          created_at: string | null
          from_language: string
          id: string
          provider: string
          source_length: number
          to_language: string
          translated_length: number
          user_id: string
        }
        Insert: {
          characters_billed?: number | null
          cost_usd?: number | null
          created_at?: string | null
          from_language: string
          id?: string
          provider?: string
          source_length?: number
          to_language: string
          translated_length?: number
          user_id: string
        }
        Update: {
          characters_billed?: number | null
          cost_usd?: number | null
          created_at?: string | null
          from_language?: string
          id?: string
          provider?: string
          source_length?: number
          to_language?: string
          translated_length?: number
          user_id?: string
        }
        Relationships: []
      }
      tts_jobs: {
        Row: {
          audio_url: string | null
          completed_at: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          provider: string
          status: string
          text: string
          user_id: string
          voice: string
        }
        Insert: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          provider: string
          status?: string
          text: string
          user_id: string
          voice: string
        }
        Update: {
          audio_url?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          provider?: string
          status?: string
          text?: string
          user_id?: string
          voice?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          last_watched_at: string | null
          progress_percentage: number | null
          updated_at: string | null
          user_id: string | null
          video_id: string | null
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          last_watched_at?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
          user_id?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_render_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_usage: {
        Row: {
          created_at: string | null
          id: string
          month: string
          renders_count: number
          storage_used_bytes: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: string
          renders_count?: number
          storage_used_bytes?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: string
          renders_count?: number
          storage_used_bytes?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          metadata: Json | null
          name: string | null
          plan_tier: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id: string
          metadata?: Json | null
          name?: string | null
          plan_tier?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          metadata?: Json | null
          name?: string | null
          plan_tier?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          order_index: number | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          order_index?: number | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          order_index?: number | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_library: {
        Row: {
          category: string
          created_at: string
          description: string | null
          gender: string
          id: string
          is_default: boolean
          is_favorite: boolean
          language: string
          metadata: Json
          name: string
          preview_url: string | null
          provider: string
          quality_settings: Json
          samples: Json
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_stats: Json
          user_id: string
          voice_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          language?: string
          metadata?: Json
          name: string
          preview_url?: string | null
          provider?: string
          quality_settings?: Json
          samples?: Json
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_stats?: Json
          user_id: string
          voice_id: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          gender?: string
          id?: string
          is_default?: boolean
          is_favorite?: boolean
          language?: string
          metadata?: Json
          name?: string
          preview_url?: string | null
          provider?: string
          quality_settings?: Json
          samples?: Json
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_stats?: Json
          user_id?: string
          voice_id?: string
        }
        Relationships: []
      }
      voice_models: {
        Row: {
          created_at: string | null
          gender: string | null
          id: string
          is_custom: boolean | null
          language: string | null
          metadata: Json | null
          name: string
          preview_url: string | null
          provider: string
          style: string | null
          updated_at: string | null
          user_id: string | null
          voice_id: string
        }
        Insert: {
          created_at?: string | null
          gender?: string | null
          id?: string
          is_custom?: boolean | null
          language?: string | null
          metadata?: Json | null
          name: string
          preview_url?: string | null
          provider: string
          style?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_id: string
        }
        Update: {
          created_at?: string | null
          gender?: string | null
          id?: string
          is_custom?: boolean | null
          language?: string | null
          metadata?: Json | null
          name?: string
          preview_url?: string | null
          provider?: string
          style?: string | null
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_models_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_profiles: {
        Row: {
          accent: string | null
          age_range: string | null
          bit_depth: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_name: string
          duration_seconds: number | null
          gender: Database["public"]["Enums"]["avatar_gender"]
          id: string
          is_active: boolean | null
          is_premium: boolean | null
          language: Database["public"]["Enums"]["supported_language"]
          name: string
          naturalness_score: number | null
          quality_score: number | null
          sample_audio_url: string
          sample_rate: number | null
          similarity_score: number | null
          training_data_url: string | null
          updated_at: string | null
        }
        Insert: {
          accent?: string | null
          age_range?: string | null
          bit_depth?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name: string
          duration_seconds?: number | null
          gender: Database["public"]["Enums"]["avatar_gender"]
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          language?: Database["public"]["Enums"]["supported_language"]
          name: string
          naturalness_score?: number | null
          quality_score?: number | null
          sample_audio_url: string
          sample_rate?: number | null
          similarity_score?: number | null
          training_data_url?: string | null
          updated_at?: string | null
        }
        Update: {
          accent?: string | null
          age_range?: string | null
          bit_depth?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_name?: string
          duration_seconds?: number | null
          gender?: Database["public"]["Enums"]["avatar_gender"]
          id?: string
          is_active?: boolean | null
          is_premium?: boolean | null
          language?: Database["public"]["Enums"]["supported_language"]
          name?: string
          naturalness_score?: number | null
          quality_score?: number | null
          sample_audio_url?: string
          sample_rate?: number | null
          similarity_score?: number | null
          training_data_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string | null
          delivered_at: string | null
          error: string | null
          event: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_code: number | null
          response_time: number | null
          scheduled_for: string | null
          status: string
          updated_at: string | null
          url: string
          webhook_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          event: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_code?: number | null
          response_time?: number | null
          scheduled_for?: string | null
          status: string
          updated_at?: string | null
          url: string
          webhook_id: string
        }
        Update: {
          attempts?: number
          created_at?: string | null
          delivered_at?: string | null
          error?: string | null
          event?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          response_time?: number | null
          scheduled_for?: string | null
          status?: string
          updated_at?: string | null
          url?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          active: boolean
          created_at: string | null
          events: Json
          failed_deliveries: number
          id: string
          last_delivery_at: string | null
          retry_interval: number | null
          secret: string
          successful_deliveries: number
          total_deliveries: number
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          events?: Json
          failed_deliveries?: number
          id?: string
          last_delivery_at?: string | null
          retry_interval?: number | null
          secret: string
          successful_deliveries?: number
          total_deliveries?: number
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string | null
          events?: Json
          failed_deliveries?: number
          id?: string
          last_delivery_at?: string | null
          retry_interval?: number | null
          secret?: string
          successful_deliveries?: number
          total_deliveries?: number
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_permissions: {
        Args: { user_id: string }
        Returns: {
          action: string
          permission_name: string
          resource: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      user_has_permission: {
        Args: { permission_name: string; user_id: string }
        Returns: boolean
      }
      user_has_role: {
        Args: { role_name: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      analytics_event_type:
        | "project_created"
        | "project_updated"
        | "project_deleted"
        | "project_viewed"
        | "project_shared"
        | "project_duplicated"
        | "version_created"
        | "collaboration_added"
      avatar_gender: "male" | "female" | "neutral"
      avatar_type: "realistic" | "stylized" | "cartoon" | "professional"
      collaboration_role: "owner" | "editor" | "viewer" | "reviewer"
      JobStatus:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "queued"
      priority_level: "low" | "medium" | "high" | "urgent"
      PriorityLevel: "low" | "medium" | "high" | "urgent"
      project_status:
        | "draft"
        | "in-progress"
        | "review"
        | "completed"
        | "archived"
        | "error"
      project_type:
        | "pptx"
        | "template-nr"
        | "talking-photo"
        | "custom"
        | "ai-generated"
      render_quality: "draft" | "standard" | "high" | "ultra"
      render_status:
        | "pending"
        | "queued"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      supported_language:
        | "pt-BR"
        | "en-US"
        | "es-ES"
        | "fr-FR"
        | "de-DE"
        | "it-IT"
        | "ja-JP"
        | "ko-KR"
        | "zh-CN"
      video_quality: "p360" | "p480" | "p720" | "p1080" | "p1440" | "p2160"
      video_resolution: "480p" | "720p" | "1080p" | "1440p" | "4k"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      analytics_event_type: [
        "project_created",
        "project_updated",
        "project_deleted",
        "project_viewed",
        "project_shared",
        "project_duplicated",
        "version_created",
        "collaboration_added",
      ],
      avatar_gender: ["male", "female", "neutral"],
      avatar_type: ["realistic", "stylized", "cartoon", "professional"],
      collaboration_role: ["owner", "editor", "viewer", "reviewer"],
      JobStatus: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "queued",
      ],
      priority_level: ["low", "medium", "high", "urgent"],
      PriorityLevel: ["low", "medium", "high", "urgent"],
      project_status: [
        "draft",
        "in-progress",
        "review",
        "completed",
        "archived",
        "error",
      ],
      project_type: [
        "pptx",
        "template-nr",
        "talking-photo",
        "custom",
        "ai-generated",
      ],
      render_quality: ["draft", "standard", "high", "ultra"],
      render_status: [
        "pending",
        "queued",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      supported_language: [
        "pt-BR",
        "en-US",
        "es-ES",
        "fr-FR",
        "de-DE",
        "it-IT",
        "ja-JP",
        "ko-KR",
        "zh-CN",
      ],
      video_quality: ["p360", "p480", "p720", "p1080", "p1440", "p2160"],
      video_resolution: ["480p", "720p", "1080p", "1440p", "4k"],
    },
  },
} as const


/**
 * 🎬 Render Settings API
 * Manages user render preferences and settings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseForRequest } from '@lib/supabase/server'
import { z } from 'zod'
import { logger } from '@lib/logger'
import { applyRateLimit } from '@/lib/rate-limit'

// Validation schema for render settings
const RenderSettingsSchema = z.object({
  auto_retry: z.boolean().optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  priority_boost: z.boolean().optional(),
  quality_preset: z.enum(['draft', 'standard', 'high', 'ultra']).optional(),
  notifications: z.object({
    on_completion: z.boolean().optional(),
    on_failure: z.boolean().optional(),
    on_queue_position: z.boolean().optional()
  }).optional(),
  resource_limits: z.object({
    max_cpu_usage: z.number().min(10).max(100).optional(),
    max_memory_usage: z.number().min(10).max(100).optional(),
    max_duration: z.number().min(60).max(86400).optional() // 1 minute to 24 hours
  }).optional()
})

// Default settings
const defaultSettings = {
  auto_retry: true,
  maxRetries: 3,
  priority_boost: false,
  quality_preset: 'standard' as const,
  notifications: {
    on_completion: true,
    on_failure: true,
    on_queue_position: false
  },
  resource_limits: {
    max_cpu_usage: 80,
    max_memory_usage: 70,
    max_duration: 3600 // 1 hour
  }
}

// Interface for records from user_render_settings table (not in generated Supabase types)
interface RenderSettingsValue {
  auto_retry?: boolean;
  maxRetries?: number;
  priority_boost?: boolean;
  quality_preset?: string;
  notifications?: {
    on_completion?: boolean;
    on_failure?: boolean;
    on_queue_position?: boolean;
  };
  resource_limits?: {
    max_cpu_usage?: number;
    max_memory_usage?: number;
    max_duration?: number;
  };
  [key: string]: unknown;
}

interface UserRenderSettingsRecord {
  user_id: string;
  settings: RenderSettingsValue;
  createdAt?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's render settings
    const { data: settings, error } = await supabase
      .from('user_render_settings' as never)
      .select('*')
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    // If no settings exist, create default settings
    if (!settings) {
      const { data: newSettings, error: createError } = await supabase
        .from('user_render_settings' as never)
        .insert({
          user_id: user.id,
          settings: defaultSettings,
          createdAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      return NextResponse.json({
        success: true,
        data: (newSettings as unknown as UserRenderSettingsRecord | null)?.settings,
        message: 'Default render settings created'
      })
    }

    return NextResponse.json({
      success: true,
      data: (settings as unknown as UserRenderSettingsRecord | null)?.settings,
      message: 'Render settings retrieved successfully'
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Get render settings API error', err, { component: 'API: render/settings' })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve render settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const blocked = await applyRateLimit(request, 'render-settings', 20);
    if (blocked) return blocked;

    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const settingsUpdate = RenderSettingsSchema.parse(body)

    // Get current settings
    const { data: currentSettings, error: fetchError } = await supabase
      .from('user_render_settings' as never)
      .select('*')
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    let updatedSettings: Record<string, unknown>

    if (!currentSettings) {
      // Create new settings if none exist
      updatedSettings = { ...defaultSettings, ...settingsUpdate }
      
      const { data: newSettings, error: createError } = await supabase
        .from('user_render_settings' as never)
        .insert({
          user_id: user.id,
          settings: updatedSettings,
          createdAt: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) throw createError

      updatedSettings = (newSettings as unknown as UserRenderSettingsRecord | null)?.settings ?? updatedSettings
    } else {
      // Update existing settings (deep merge)
      const currentRecord = currentSettings as unknown as UserRenderSettingsRecord | null;
      updatedSettings = {
        ...currentRecord?.settings,
        ...settingsUpdate,
        notifications: {
          ...currentRecord?.settings?.notifications,
          ...settingsUpdate.notifications
        },
        resource_limits: {
          ...currentRecord?.settings?.resource_limits,
          ...settingsUpdate.resource_limits
        }
      }

      const { data: updated, error: updateError } = await supabase
        .from('user_render_settings' as never)
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", user.id)
        .select()
        .single()

      if (updateError) throw updateError

      // Extract settings from updated record
      const updatedRecord = updated as unknown as { settings: Record<string, unknown> } | null;
      updatedSettings = updatedRecord?.settings ?? updatedSettings;
    }

    // Log the action for analytics
    try {
      await supabase
        .from('analytics_events')
        .insert({
          userId: user.id,
          eventType: 'settings_updated',
          event_data: {
            scope: 'render',
            updated_fields: Object.keys(settingsUpdate),
            timestamp: new Date().toISOString()
          }
        })
    } catch (analyticsError) {
      logger.warn('Failed to log render settings update', { component: 'API: render/settings' })
    }

    return NextResponse.json({
      success: true,
      data: updatedSettings,
      message: 'Render settings updated successfully'
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Update render settings API error', err, { component: 'API: render/settings' })
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid settings data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update render settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseForRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Reset to default settings
    const { data: resetSettings, error } = await supabase
      .from('user_render_settings' as never)
      .upsert({
        user_id: user.id,
        settings: defaultSettings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Log the action for analytics
    try {
      await supabase
        .from('analytics_events')
        .insert({
          userId: user.id,
          eventType: 'settings_reset',
          event_data: {
            scope: 'render',
            timestamp: new Date().toISOString()
          }
        })
    } catch (analyticsError) {
      logger.warn('Failed to log render settings reset', { component: 'API: render/settings' })
    }

    // Extract settings from reset record
    const resetRecord = resetSettings as unknown as { settings: Record<string, unknown> } | null;

    return NextResponse.json({
      success: true,
      data: resetRecord?.settings ?? defaultSettings,
      message: 'Render settings reset to defaults'
    })

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error)); logger.error('Reset render settings API error', err, { component: 'API: render/settings' })
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset render settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

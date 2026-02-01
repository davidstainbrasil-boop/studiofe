import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

/**
 * User Preferences API
 * 
 * GET /api/user/preferences - Get user preferences
 * PUT /api/user/preferences - Update user preferences
 * PATCH /api/user/preferences - Partial update preferences
 */

// Schemas
const preferencesSchema = z.object({
  // Display preferences
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.enum(['pt-BR', 'en-US', 'es-ES']).optional(),
  timezone: z.string().max(100).optional(),
  
  // Editor preferences
  autoSave: z.boolean().optional(),
  autoSaveInterval: z.number().min(10).max(300).optional(), // seconds
  defaultVideoQuality: z.enum(['720p', '1080p', '4k']).optional(),
  defaultAspectRatio: z.enum(['16:9', '9:16', '4:3', '1:1']).optional(),
  showGridlines: z.boolean().optional(),
  snapToGrid: z.boolean().optional(),
  
  // Notification preferences
  emailNotifications: z.object({
    projectUpdates: z.boolean().optional(),
    renderComplete: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
    marketing: z.boolean().optional(),
  }).optional(),
  pushNotifications: z.object({
    renderComplete: z.boolean().optional(),
    projectShared: z.boolean().optional(),
    comments: z.boolean().optional(),
  }).optional(),
  
  // Accessibility
  accessibility: z.object({
    reducedMotion: z.boolean().optional(),
    highContrast: z.boolean().optional(),
    fontSize: z.enum(['small', 'medium', 'large']).optional(),
  }).optional(),
  
  // Keyboard shortcuts customization
  shortcuts: z.record(z.string(), z.string()).optional(),
});

// Types
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  timezone: string;
  autoSave: boolean;
  autoSaveInterval: number;
  defaultVideoQuality: '720p' | '1080p' | '4k';
  defaultAspectRatio: '16:9' | '9:16' | '4:3' | '1:1';
  showGridlines: boolean;
  snapToGrid: boolean;
  emailNotifications: {
    projectUpdates: boolean;
    renderComplete: boolean;
    weeklyDigest: boolean;
    marketing: boolean;
  };
  pushNotifications: {
    renderComplete: boolean;
    projectShared: boolean;
    comments: boolean;
  };
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  shortcuts: Record<string, string>;
  updated_at: string;
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  autoSave: true,
  autoSaveInterval: 30,
  defaultVideoQuality: '1080p',
  defaultAspectRatio: '16:9',
  showGridlines: true,
  snapToGrid: true,
  emailNotifications: {
    projectUpdates: true,
    renderComplete: true,
    weeklyDigest: false,
    marketing: false,
  },
  pushNotifications: {
    renderComplete: true,
    projectShared: true,
    comments: true,
  },
  accessibility: {
    reducedMotion: false,
    highContrast: false,
    fontSize: 'medium',
  },
  shortcuts: {
    save: 'ctrl+s',
    undo: 'ctrl+z',
    redo: 'ctrl+shift+z',
    preview: 'ctrl+p',
    export: 'ctrl+e',
    newSlide: 'ctrl+n',
    deleteSlide: 'del',
    duplicate: 'ctrl+d',
    playPause: 'space',
  },
  updated_at: new Date().toISOString(),
};

// GET - Get preferences
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const storedPreferences = user.user_metadata?.preferences as Partial<UserPreferences> | undefined;
    
    // Merge with defaults to ensure all fields exist
    const preferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...storedPreferences,
      emailNotifications: {
        ...DEFAULT_PREFERENCES.emailNotifications,
        ...storedPreferences?.emailNotifications,
      },
      pushNotifications: {
        ...DEFAULT_PREFERENCES.pushNotifications,
        ...storedPreferences?.pushNotifications,
      },
      accessibility: {
        ...DEFAULT_PREFERENCES.accessibility,
        ...storedPreferences?.accessibility,
      },
      shortcuts: {
        ...DEFAULT_PREFERENCES.shortcuts,
        ...storedPreferences?.shortcuts,
      },
    };

    return NextResponse.json({
      preferences,
      defaults: DEFAULT_PREFERENCES,
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Full update preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    // Merge with defaults
    const newPreferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...parsed.data,
      emailNotifications: {
        ...DEFAULT_PREFERENCES.emailNotifications,
        ...parsed.data.emailNotifications,
      },
      pushNotifications: {
        ...DEFAULT_PREFERENCES.pushNotifications,
        ...parsed.data.pushNotifications,
      },
      accessibility: {
        ...DEFAULT_PREFERENCES.accessibility,
        ...parsed.data.accessibility,
      },
      shortcuts: {
        ...DEFAULT_PREFERENCES.shortcuts,
        ...parsed.data.shortcuts,
      },
      updated_at: new Date().toISOString(),
    };

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { preferences: newPreferences },
    });

    if (updateError) {
      console.error('Preferences update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: newPreferences,
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Partial update preferences
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = preferencesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const existingPreferences = user.user_metadata?.preferences as Partial<UserPreferences> | undefined;

    // Deep merge preferences
    const updatedPreferences: UserPreferences = {
      ...DEFAULT_PREFERENCES,
      ...existingPreferences,
      ...parsed.data,
      emailNotifications: {
        ...DEFAULT_PREFERENCES.emailNotifications,
        ...existingPreferences?.emailNotifications,
        ...parsed.data.emailNotifications,
      },
      pushNotifications: {
        ...DEFAULT_PREFERENCES.pushNotifications,
        ...existingPreferences?.pushNotifications,
        ...parsed.data.pushNotifications,
      },
      accessibility: {
        ...DEFAULT_PREFERENCES.accessibility,
        ...existingPreferences?.accessibility,
        ...parsed.data.accessibility,
      },
      shortcuts: {
        ...DEFAULT_PREFERENCES.shortcuts,
        ...existingPreferences?.shortcuts,
        ...parsed.data.shortcuts,
      },
      updated_at: new Date().toISOString(),
    };

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { preferences: updatedPreferences },
    });

    if (updateError) {
      console.error('Preferences update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences: updatedPreferences,
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

// Type for brand kit stored in user metadata
interface BrandKit {
  id: string;
  name: string;
  logo?: {
    url: string;
    width: number;
    height: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  watermark: {
    enabled: boolean;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity: number;
    size: number;
  };
  updated_at: string;
}

/**
 * Brand Kit API
 * 
 * GET /api/brand-kit - Get user's brand kit
 * POST /api/brand-kit - Create/update brand kit
 */

const brandKitSchema = z.object({
  name: z.string().min(1).max(100),
  logo: z.object({
    url: z.string().url(),
    width: z.number().positive(),
    height: z.number().positive(),
  }).optional(),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  fonts: z.object({
    heading: z.string(),
    body: z.string(),
  }),
  watermark: z.object({
    enabled: z.boolean(),
    position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
    opacity: z.number().min(0).max(1),
    size: z.number().min(16).max(300),
  }),
});

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get brand kit from user metadata
    const metadata = (user.user_metadata || {}) as Record<string, unknown>;
    const brandKit = metadata.brand_kit as BrandKit | undefined;

    // Return default brand kit if none exists
    if (!brandKit) {
      return NextResponse.json({
        id: null,
        name: 'Minha Marca',
        logo: null,
        colors: {
          primary: '#8B5CF6',
          secondary: '#6366F1',
          accent: '#F59E0B',
          background: '#FFFFFF',
          text: '#1F2937',
        },
        fonts: {
          heading: 'Inter',
          body: 'Inter',
        },
        watermark: {
          enabled: false,
          position: 'bottom-right',
          opacity: 0.5,
          size: 80,
        },
      });
    }

    return NextResponse.json(brandKit);
  } catch (error) {
    logger.error('Brand kit GET error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validationResult = brandKitSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const brandKitData: BrandKit = {
      id: user.id,
      ...validationResult.data,
      updated_at: new Date().toISOString(),
    };

    // Store brand kit in user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        brand_kit: brandKitData,
      },
    });

    if (updateError) {
      logger.error('Error saving brand kit:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to save brand kit' },
        { status: 500 }
      );
    }

    return NextResponse.json(brandKitData);
  } catch (error) {
    logger.error('Brand kit POST error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';

/**
 * User Profile API
 * 
 * GET /api/user/profile - Get user profile
 * PATCH /api/user/profile - Update user profile
 */

// Schemas
const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().max(500).optional(),
  socialLinks: z.object({
    linkedin: z.string().url().optional().or(z.literal('')),
    twitter: z.string().url().optional().or(z.literal('')),
    github: z.string().url().optional().or(z.literal('')),
  }).optional(),
});

// Types
interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  displayName: string;
  bio: string;
  company: string;
  jobTitle: string;
  phone: string;
  website: string;
  location: string;
  avatarUrl: string;
  socialLinks: {
    linkedin: string;
    twitter: string;
    github: string;
  };
  createdAt: string;
  updatedAt: string;
  lastSignIn: string;
  emailVerified: boolean;
}

// GET - Get profile
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metadata = user.user_metadata || {};

    const profile: UserProfile = {
      id: user.id,
      email: user.email || '',
      fullName: metadata.full_name || metadata.name || '',
      displayName: metadata.display_name || metadata.name?.split(' ')[0] || '',
      bio: metadata.bio || '',
      company: metadata.company || '',
      jobTitle: metadata.job_title || '',
      phone: metadata.phone || user.phone || '',
      website: metadata.website || '',
      location: metadata.location || '',
      avatarUrl: metadata.avatar_url || metadata.picture || '',
      socialLinks: {
        linkedin: metadata.social_links?.linkedin || '',
        twitter: metadata.social_links?.twitter || '',
        github: metadata.social_links?.github || '',
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
      lastSignIn: user.last_sign_in_at || user.created_at,
      emailVerified: !!user.email_confirmed_at,
    };

    // Get additional stats
    const projects = (metadata.projects_count as number) || 0;
    const videos = (metadata.videos_rendered as number) || 0;
    const storage = (metadata.storage_used as number) || 0;

    return NextResponse.json({
      profile,
      stats: {
        projectsCount: projects,
        videosRendered: videos,
        storageUsedMB: Math.round(storage / (1024 * 1024)),
      },
    });
  } catch (error) {
    logger.error('Profile fetch error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update profile
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    const existingMetadata = user.user_metadata || {};

    // Build updated metadata
    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
    };

    if (updates.fullName !== undefined) {
      updatedMetadata.full_name = updates.fullName;
      updatedMetadata.name = updates.fullName;
    }
    if (updates.displayName !== undefined) {
      updatedMetadata.display_name = updates.displayName;
    }
    if (updates.bio !== undefined) {
      updatedMetadata.bio = updates.bio;
    }
    if (updates.company !== undefined) {
      updatedMetadata.company = updates.company;
    }
    if (updates.jobTitle !== undefined) {
      updatedMetadata.job_title = updates.jobTitle;
    }
    if (updates.phone !== undefined) {
      updatedMetadata.phone = updates.phone;
    }
    if (updates.website !== undefined) {
      updatedMetadata.website = updates.website;
    }
    if (updates.location !== undefined) {
      updatedMetadata.location = updates.location;
    }
    if (updates.avatarUrl !== undefined) {
      updatedMetadata.avatar_url = updates.avatarUrl;
    }
    if (updates.socialLinks !== undefined) {
      updatedMetadata.social_links = {
        ...(existingMetadata.social_links as Record<string, string> || {}),
        ...updates.socialLinks,
      };
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase.auth.updateUser({
      data: updatedMetadata,
    });

    if (updateError) {
      logger.error('Profile update error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const newMetadata = updatedUser.user?.user_metadata || {};

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        email: user.email,
        fullName: newMetadata.full_name || '',
        displayName: newMetadata.display_name || '',
        bio: newMetadata.bio || '',
        company: newMetadata.company || '',
        jobTitle: newMetadata.job_title || '',
        phone: newMetadata.phone || '',
        website: newMetadata.website || '',
        location: newMetadata.location || '',
        avatarUrl: newMetadata.avatar_url || '',
        socialLinks: newMetadata.social_links || {},
      },
    });
  } catch (error) {
    logger.error('Profile update error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

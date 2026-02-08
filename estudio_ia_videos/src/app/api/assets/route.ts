import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * Assets Management API
 * 
 * GET /api/assets - List user's assets with filtering
 * DELETE /api/assets?id=xxx - Delete an asset
 * PATCH /api/assets - Update asset metadata (rename, tags, favorite)
 */

// Schemas
const updateAssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().max(255).optional(),
  tags: z.array(z.string().max(50)).optional(),
  favorite: z.boolean().optional(),
  folder: z.string().max(100).optional(),
});

// Types
interface AssetRecord {
  id: string;
  user_id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'other';
  url: string;
  thumbnail_url?: string;
  size: number;
  mime_type: string;
  width?: number;
  height?: number;
  duration?: number;
  tags: string[];
  favorite: boolean;
  folder?: string;
  created_at: string;
  updated_at: string;
}

// GET - List assets with filtering
export async function GET(request: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(request, 'assets-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const folder = searchParams.get('folder');
    const search = searchParams.get('search');
    const favoriteOnly = searchParams.get('favorite') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Get assets from user metadata (since assets table may not exist)
    const userAssets = (user.user_metadata?.assets || []) as AssetRecord[];

    // Filter assets
    let filteredAssets = userAssets.filter(a => {
      // Type filter
      if (type && type !== 'all' && a.type !== type) return false;
      
      // Folder filter
      if (folder && a.folder !== folder) return false;
      
      // Favorite filter
      if (favoriteOnly && !a.favorite) return false;
      
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = a.name.toLowerCase().includes(searchLower);
        const matchesTags = a.tags?.some(t => t.toLowerCase().includes(searchLower));
        if (!matchesName && !matchesTags) return false;
      }
      
      return true;
    });

    // Sort assets
    filteredAssets.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'created_at':
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Paginate
    const total = filteredAssets.length;
    const paginatedAssets = filteredAssets.slice(offset, offset + limit);

    // Get unique folders
    const folders = [...new Set(userAssets.map(a => a.folder).filter(Boolean))];

    // Get counts by type
    const typeCounts = {
      image: userAssets.filter(a => a.type === 'image').length,
      audio: userAssets.filter(a => a.type === 'audio').length,
      video: userAssets.filter(a => a.type === 'video').length,
      document: userAssets.filter(a => a.type === 'document').length,
      other: userAssets.filter(a => a.type === 'other').length,
    };

    return NextResponse.json({
      assets: paginatedAssets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        url: a.url,
        thumbnailUrl: a.thumbnail_url,
        size: a.size,
        mimeType: a.mime_type,
        dimensions: a.width && a.height ? { width: a.width, height: a.height } : undefined,
        duration: a.duration,
        tags: a.tags || [],
        favorite: a.favorite,
        folder: a.folder,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
      folders,
      typeCounts,
    });
  } catch (error) {
    logger.error('Assets list error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update asset metadata
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateAssetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { id, name, tags, favorite, folder } = parsed.data;

    // Get existing assets
    const userAssets = (user.user_metadata?.assets || []) as AssetRecord[];
    const assetIndex = userAssets.findIndex(a => a.id === id);

    if (assetIndex === -1) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Update asset
    const updatedAsset: AssetRecord = {
      ...userAssets[assetIndex],
      ...(name !== undefined && { name }),
      ...(tags !== undefined && { tags }),
      ...(favorite !== undefined && { favorite }),
      ...(folder !== undefined && { folder }),
      updated_at: new Date().toISOString(),
    };

    userAssets[assetIndex] = updatedAsset;

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { assets: userAssets },
    });

    if (updateError) {
      logger.error('Asset update error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to update asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: updatedAsset.id,
        name: updatedAsset.name,
        tags: updatedAsset.tags,
        favorite: updatedAsset.favorite,
        folder: updatedAsset.folder,
        updatedAt: updatedAsset.updated_at,
      },
    });
  } catch (error) {
    logger.error('Asset update error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an asset
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Asset ID required' },
        { status: 400 }
      );
    }

    // Get existing assets
    const userAssets = (user.user_metadata?.assets || []) as AssetRecord[];
    const assetIndex = userAssets.findIndex(a => a.id === id);

    if (assetIndex === -1) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    const assetToDelete = userAssets[assetIndex];

    // Try to delete from storage if URL is from Supabase
    if (assetToDelete.url.includes('supabase')) {
      try {
        // Extract bucket and path from URL
        const urlParts = assetToDelete.url.split('/storage/v1/object/public/');
        if (urlParts.length > 1) {
          const [bucket, ...pathParts] = urlParts[1].split('/');
          const path = pathParts.join('/');
          await supabase.storage.from(bucket).remove([path]);
        }
      } catch (storageError) {
        logger.warn('Failed to delete from storage:', { detail: storageError });
        // Continue with metadata deletion even if storage deletion fails
      }
    }

    // Remove asset from user metadata
    userAssets.splice(assetIndex, 1);

    const { error: updateError } = await supabase.auth.updateUser({
      data: { assets: userAssets },
    });

    if (updateError) {
      logger.error('Asset deletion error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to delete asset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error) {
    logger.error('Asset deletion error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

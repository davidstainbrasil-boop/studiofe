import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { applyRateLimit } from '@/lib/rate-limit';

/**
 * Asset Folders Management API
 * 
 * GET /api/assets/folders - List all folders
 * POST /api/assets/folders - Create a folder
 * PATCH /api/assets/folders - Rename a folder
 * DELETE /api/assets/folders?name=xxx - Delete a folder (moves assets to root)
 */

// Schemas
const createFolderSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

const renameFolderSchema = z.object({
  oldName: z.string().min(1).max(100),
  newName: z.string().min(1).max(100).trim(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

// Types
interface FolderRecord {
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

interface AssetRecord {
  id: string;
  folder?: string;
  [key: string]: unknown;
}

// GET - List folders
export async function GET(req: NextRequest) {
  try {
    const rateLimitBlocked = await applyRateLimit(req, 'assets-folders-get', 60);
    if (rateLimitBlocked) return rateLimitBlocked;

    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const folders = (user.user_metadata?.asset_folders || []) as FolderRecord[];
    const assets = (user.user_metadata?.assets || []) as AssetRecord[];

    // Count assets per folder
    const foldersWithCount = folders.map(folder => ({
      name: folder.name,
      color: folder.color,
      assetCount: assets.filter(a => a.folder === folder.name).length,
      createdAt: folder.created_at,
      updatedAt: folder.updated_at,
    }));

    // Add root folder info
    const rootCount = assets.filter(a => !a.folder).length;

    return NextResponse.json({
      folders: foldersWithCount,
      rootAssetCount: rootCount,
      totalAssets: assets.length,
    });
  } catch (error) {
    logger.error('Folders list error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create folder
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { name, color } = parsed.data;
    const folders = (user.user_metadata?.asset_folders || []) as FolderRecord[];

    // Check for duplicate
    if (folders.some(f => f.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { error: 'Folder already exists' },
        { status: 409 }
      );
    }

    // Create folder
    const newFolder: FolderRecord = {
      name,
      color: color || '#6366f1', // Default indigo
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    folders.push(newFolder);

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { asset_folders: folders },
    });

    if (updateError) {
      logger.error('Folder creation error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: {
        name: newFolder.name,
        color: newFolder.color,
        assetCount: 0,
        createdAt: newFolder.created_at,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error('Folder creation error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Rename folder
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = renameFolderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { oldName, newName, color } = parsed.data;
    const folders = (user.user_metadata?.asset_folders || []) as FolderRecord[];
    const assets = (user.user_metadata?.assets || []) as AssetRecord[];

    // Find folder
    const folderIndex = folders.findIndex(f => f.name === oldName);
    if (folderIndex === -1) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Check if new name already exists (if renaming)
    if (oldName !== newName && folders.some(f => f.name.toLowerCase() === newName.toLowerCase())) {
      return NextResponse.json(
        { error: 'Folder name already exists' },
        { status: 409 }
      );
    }

    // Update folder
    folders[folderIndex] = {
      ...folders[folderIndex],
      name: newName,
      ...(color && { color }),
      updated_at: new Date().toISOString(),
    };

    // Update assets in folder (if renamed)
    if (oldName !== newName) {
      for (const asset of assets) {
        if (asset.folder === oldName) {
          asset.folder = newName;
        }
      }
    }

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        asset_folders: folders,
        assets: assets,
      },
    });

    if (updateError) {
      logger.error('Folder update error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to update folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: {
        name: folders[folderIndex].name,
        color: folders[folderIndex].color,
        updatedAt: folders[folderIndex].updated_at,
      },
    });
  } catch (error) {
    logger.error('Folder update error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete folder
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { error: 'Folder name required' },
        { status: 400 }
      );
    }

    const folders = (user.user_metadata?.asset_folders || []) as FolderRecord[];
    const assets = (user.user_metadata?.assets || []) as AssetRecord[];

    // Find folder
    const folderIndex = folders.findIndex(f => f.name === name);
    if (folderIndex === -1) {
      return NextResponse.json(
        { error: 'Folder not found' },
        { status: 404 }
      );
    }

    // Move assets to root
    let movedAssets = 0;
    for (const asset of assets) {
      if (asset.folder === name) {
        delete asset.folder;
        movedAssets++;
      }
    }

    // Remove folder
    folders.splice(folderIndex, 1);

    // Update user metadata
    const { error: updateError } = await supabase.auth.updateUser({
      data: { 
        asset_folders: folders,
        assets: assets,
      },
    });

    if (updateError) {
      logger.error('Folder deletion error:', updateError instanceof Error ? updateError : new Error(String(updateError)));
      return NextResponse.json(
        { error: 'Failed to delete folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Folder deleted successfully',
      movedAssets,
    });
  } catch (error) {
    logger.error('Folder deletion error:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

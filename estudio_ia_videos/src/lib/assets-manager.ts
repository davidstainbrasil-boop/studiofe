/**
 * Assets Manager Library
 * 
 * Gerenciamento centralizado de assets (imagens, áudio, vídeo, fontes)
 * Integração com Unsplash, Freesound e uploads locais
 */

import { AssetLibrary, AssetProvider } from './assets/asset-library-integration';
import { prisma } from './prisma';
import { StorageSystemReal } from './storage-system-real';
import { logger } from './logger';

export interface AssetItem {
  id: string;
  title?: string;
  type: 'image' | 'audio' | 'video' | 'font' | 'template';
  url: string;
  thumbnailUrl?: string;
  source: 'unsplash' | 'freesound' | 'local' | 'custom' | 'system' | 'pexels' | 'pixabay';
  category?: string;
  tags: string[];
  license: 'free' | 'creative-commons' | 'royalty-free' | 'paid' | string;
  width?: number;
  height?: number;
  duration?: number; // em segundos
  size?: number; // em bytes
  favorites?: number;
  author?: {
    name: string;
    url?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface AssetCollection {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  assetsCount: number;
  isSystem?: boolean;
  userId?: string;
}

export interface SearchFilters {
  category?: string;
  type?: 'image' | 'audio' | 'video' | 'font' | 'template';
  license?: 'all' | 'free' | 'creative-commons' | 'royalty-free';
  orientation?: 'landscape' | 'portrait' | 'square';
  quality?: 'high' | 'medium' | 'low';
  safeSearch?: boolean;
  color?: string;
}

export const SEARCH_PRESETS = {
  'corporate-bg': {
    query: 'corporate office background',
    filters: { type: 'image', orientation: 'landscape' }
  },
  'upbeat-music': {
    query: 'upbeat corporate music',
    filters: { type: 'audio', license: 'royalty-free' }
  },
  'nature-video': {
    query: 'nature landscape drone',
    filters: { type: 'video', quality: 'high' }
  },
  'tech-icons': {
    query: 'technology icons minimal',
    filters: { type: 'image', license: 'free' }
  }
};

class AssetsManager {
  private library: AssetLibrary;
  private storage: StorageSystemReal;

  constructor() {
    this.library = new AssetLibrary({
      pexelsApiKey: process.env.PEXELS_API_KEY,
      pixabayApiKey: process.env.PIXABAY_API_KEY,
      unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
      freesoundApiKey: process.env.FREESOUND_API_KEY
    });
    this.storage = new StorageSystemReal();
  }

  async searchAll(query: string, filters?: SearchFilters): Promise<AssetItem[]> {
    try {
      // 1. Search DB (Local Assets)
      const where: any = {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ]
      };
      
      if (filters?.type) where.type = filters.type;
      if (filters?.category) where.category = filters.category;
      
      let localAssets: AssetItem[] = [];
      try {
        const dbAssets = await prisma.assets.findMany({
          where,
          take: 20,
          orderBy: { createdAt: 'desc' }
        });
        localAssets = dbAssets.map(this.mapPrismaToAssetItem);
      } catch (dbError) {
        logger.warn('Failed to search local assets', dbError);
      }
      
      // 2. Search External APIs
      let externalAssets: AssetItem[] = [];
      try {
        const providers: AssetProvider[] = ['unsplash', 'pexels', 'pixabay', 'freesound'];
        
        // Optimize provider selection based on type
        const activeProviders = providers.filter(p => {
            if (filters?.type === 'audio' && p === 'freesound') return true;
            if (filters?.type === 'audio' && p !== 'freesound') return false;
            
            if (filters?.type === 'image' && p === 'freesound') return false;
            if (filters?.type === 'image') return true; // unsplash, pexels, pixabay
            
            if (filters?.type === 'video' && (p === 'pexels' || p === 'pixabay')) return true;
            if (filters?.type === 'video') return false;
            
            if (!filters?.type) return true;
            return false;
        });

        if (activeProviders.length > 0) {
            const libraryResults = await this.library.search({
                query,
                type: filters?.type as any,
                page: 1,
                perPage: 20,
                orientation: filters?.orientation,
                color: filters?.color
            }, activeProviders);
            
            // Map library results to AssetItem
            externalAssets = libraryResults.assets.map(asset => ({
                id: asset.id,
                title: asset.title,
                type: asset.type as any,
                url: asset.url,
                thumbnailUrl: asset.thumbnailUrl,
                source: asset.provider as any,
                tags: asset.tags || [],
                license: asset.license,
                width: asset.width,
                height: asset.height,
                duration: asset.duration,
                favorites: 0,
                author: {
                    name: asset.author,
                    url: asset.authorUrl
                },
                metadata: {
                    downloadUrls: asset.downloadUrls
                }
            }));
        }
      } catch (e) {
        logger.error('Failed to search external assets', e instanceof Error ? e : new Error(String(e)));
      }

      return [...localAssets, ...externalAssets];
    } catch (error) {
      logger.error('AssetsManager searchAll failed', error instanceof Error ? error : new Error(String(error)));
      return []; 
    }
  }

  async getAllCollections(userId?: string): Promise<AssetCollection[]> {
      try {
          const where: any = {
              OR: [
                  { isSystem: true }
              ]
          };
          if (userId) {
              where.OR.push({ userId });
          }

          const collections = await prisma.asset_collections.findMany({
              where,
              include: {
                  _count: {
                      select: { assets: true }
                  }
              }
          });

          return collections.map(col => ({
              id: col.id,
              name: col.name,
              description: col.description || undefined,
              coverImage: col.coverImage || undefined,
              assetsCount: col._count.assets,
              isSystem: col.isSystem,
              userId: col.userId || undefined
          }));
      } catch (error) {
          logger.error('Failed to get collections', error instanceof Error ? error : new Error(String(error)));
          throw error;
      }
  }

  async getFavorites(userId: string): Promise<string[]> {
      // TODO: Implement user_favorites table
      return []; 
  }

  async addToFavorites(assetId: string, userId: string): Promise<void> {
      try {
          await prisma.assets.updateMany({
              where: { id: assetId },
              data: { favorites: { increment: 1 } }
          });
      } catch (e) {
          // Ignore if not found
      }
  }

  async removeFromFavorites(assetId: string, userId: string): Promise<void> {
      try {
          await prisma.assets.updateMany({
              where: { id: assetId },
              data: { favorites: { decrement: 1 } }
          });
      } catch (e) {
          // Ignore
      }
  }

  async uploadCustomAsset(file: File, data: Partial<AssetItem>): Promise<AssetItem> {
      try {
          const bucket = 'assets';
          const path = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          const publicUrl = await this.storage.upload({
              bucket,
              path,
              file,
              contentType: file.type
          });

          const newAsset = await prisma.assets.create({
              data: {
                  title: data.title || file.name,
                  type: data.type || (file.type.startsWith('image/') ? 'image' : 'audio'),
                  url: publicUrl,
                  source: 'custom',
                  category: data.category || 'custom',
                  tags: ['upload', 'custom'],
                  license: 'proprietary',
                  size: file.size,
                  favorites: 0,
                  authorName: 'User',
                  metadata: {}
              }
          });

          return this.mapPrismaToAssetItem(newAsset);
      } catch (error) {
          logger.error('Failed to upload asset', error instanceof Error ? error : new Error(String(error)));
          throw error;
      }
  }

  private mapPrismaToAssetItem(record: {
    id: string;
    title: string | null;
    type: string | null;
    url: string;
    thumbnailUrl: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    favorites: number;
    authorName: string | null;
    authorUrl: string | null;
    metadata: unknown;
    tags: string[];
    license: string | null;
    source: string | null;
  }): AssetItem {
      return {
          id: record.id,
          title: record.title || undefined,
          type: (record.type || 'image') as AssetItem['type'],
          url: record.url,
          thumbnailUrl: record.thumbnailUrl || undefined,
          source: record.source as any,
          category: record.category || undefined,
          tags: record.tags,
          license: record.license || 'unknown',
          width: record.width || undefined,
          height: record.height || undefined,
          duration: record.duration || undefined,
          size: record.size || undefined,
          favorites: record.favorites,
          author: {
              name: record.authorName || 'Unknown',
              url: record.authorUrl || undefined
          },
          metadata: (record.metadata as Record<string, unknown>) || undefined
      };
  }
}

export const assetsManager = new AssetsManager();

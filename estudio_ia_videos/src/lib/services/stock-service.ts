import { assetsManager } from '../assets-manager';
import { AssetItem } from '../assets-manager';
import { logger } from '../logger';

// Re-export for compatibility
export type StockMedia = AssetItem;

export const StockService = {
  /**
   * Search for stock assets (images, videos, etc)
   * @param query Search term
   * @param type 'image' | 'video'
   */
  search: async (query: string, type: 'image' | 'video' = 'image'): Promise<AssetItem[]> => {
    try {
      return await assetsManager.searchAll(query, { type });
    } catch (error) {
      logger.error('StockService.search failed', error as Error, { query, type });
      return [];
    }
  },

  /**
   * Batch search for multiple queries
   */
  searchBatch: async (queries: string[], type: 'image' | 'video' = 'image'): Promise<AssetItem[][]> => {
    return Promise.all(
      queries.map(q => StockService.search(q, type))
    );
  }
};

/**
 * Legacy method for compatibility
 * Returns simplified objects { url }
 */
export const searchBatchMedia = async (queries: string[]) => {
  const results = await StockService.searchBatch(queries, 'image');
  return results.map(items => {
    if (items.length > 0) {
      return { url: items[0].url };
    }
    return { url: '' }; // Or handle empty results
  });
};

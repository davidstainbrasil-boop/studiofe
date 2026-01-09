
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const BASE_URL = 'https://api.pexels.com';

interface StockMedia {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
  video_files?: {
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    link: string;
  }[];
  image: string; // Preview image for video
}

export const StockService = {
  search: async (query: string, type: 'photos' | 'videos' = 'photos', page = 1, perPage = 20) => {
    if (!PEXELS_API_KEY) {
      console.warn('StockService: PEXELS_API_KEY not configured');
      return [];
    }

    const endpoint = type === 'videos' ? '/videos/search' : '/v1/search';
    
    try {
      const response = await fetch(`${BASE_URL}${endpoint}?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`, {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Pexels API error: ${response.statusText}`);
      }

      const data = await response.json();
      return (type === 'videos' ? data.videos : data.photos) || [];
    } catch (error) {
      console.error('StockService search error:', error);
      return [];
    }
  },

  getTrending: async (type: 'photos' | 'videos' = 'photos', perPage = 20) => {
    if (!PEXELS_API_KEY) {
      return [];
    }

    const endpoint = type === 'videos' ? '/videos/popular' : '/v1/curated';

    try {
        const response = await fetch(`${BASE_URL}${endpoint}?per_page=${perPage}`, {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        });
  
        if (!response.ok) {
          throw new Error(`Pexels API error: ${response.statusText}`);
        }
  
        const data = await response.json();
        return (type === 'videos' ? data.videos : data.photos) || [];
      } catch (error) {
        console.error('StockService trending error:', error);
        return [];
      }
  }
};

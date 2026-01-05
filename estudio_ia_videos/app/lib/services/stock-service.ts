
import { logger } from '@/lib/logger';

export interface StockMedia {
    id: string;
    type: 'image' | 'video' | 'audio';
    url: string; // Preview URL
    downloadUrl: string; // Full quality
    thumbnail: string;
    duration?: number; // For videos
    width: number;
    height: number;
    author: string;
}

export class StockService {
    private static PEXELS_API_KEY = process.env.PEXELS_API_KEY;

    static async search(query: string, type: 'image' | 'video' | 'audio' = 'image'): Promise<StockMedia[]> {
        // Mock Implementation for MVP robustness (and lacking API Key in environment currently)
        // In production, we would check for API Key and fetch real data.
        
        console.log(`Searching stock ${type} for: ${query}`);

        // Return curated mocks based on query keywords or generic fallback
        return this.getMockResults(query, type);
    }

    private static getMockResults(query: string, type: 'image' | 'video' | 'audio'): StockMedia[] {
        const mocks: StockMedia[] = [];
        const isVideo = type === 'video';
        const isAudio = type === 'audio';
        
        // Generate 10 mock items
        for (let i = 1; i <= 10; i++) {
            const id = `mock-${type}-${i}-${Date.now()}`;
            const width = 1920;
            const height = 1080;
            
            // Use picsum for images, generic visuals for video placeholders
            // For video previews, we can use a sample mp4 if available, or just an image ref for now if playing is complex.
            // Let's use a static video key for reliable testing if type is video.
            
            let url = `https://picsum.photos/seed/${query}${i}/1920/1080`;
            let downloadUrl = url;
            let thumbnail = `https://picsum.photos/seed/${query}${i}/300/200`;

            if (isVideo) {
                 // Use a reliable open source video for testing (Big Buck Bunny or similar short clips)
                 // Or a placeholder. Let's use a reliable MP4 link.
                 url = 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4';
                 downloadUrl = url;
                 // Thumb remains image
            }

            if (isAudio) {
                 // Free Music Archive sample or reliable CDN
                 url = 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=fun-life-112188.mp3'; 
                 downloadUrl = url;
                 thumbnail = `https://picsum.photos/seed/audio${i}/200/200`; // Cover art
            }

            mocks.push({
                id,
                type: type as any,
                url,
                downloadUrl,
                thumbnail,
                width,
                height,
                duration: isVideo ? 10 : isAudio ? 120 : 5, // Default duration
                author: `Artist ${i}`
            });
        }
        return mocks;
    }

    /**
     * Busca múltiplos termos de mídia em lote
     * @param queries Array de queries para buscar
     * @param type Tipo de mídia
     * @returns Map com query como chave e resultados como valor
     */
    static async searchBatch(
        queries: string[],
        type: 'image' | 'video' | 'audio' = 'image'
    ): Promise<Map<string, StockMedia[]>> {
        const results = new Map<string, StockMedia[]>();
        
        for (const query of queries) {
            try {
                const media = await this.search(query, type);
                results.set(query, media);
            } catch (error) {
                logger.error(`Failed to search stock media for: ${query}`, error as Error);
                results.set(query, []);
            }
        }
        
        return results;
    }
}

// Export helper function for backward compatibility
export async function searchBatchMedia(
    queries: string[],
    type: 'image' | 'video' | 'audio' = 'image'
): Promise<Map<string, StockMedia[]>> {
    return StockService.searchBatch(queries, type);
}

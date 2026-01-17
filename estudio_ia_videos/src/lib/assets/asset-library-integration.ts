/**
 * Asset Library Integration
 * Integração com Pexels, Pixabay e outras fontes de mídia
 * Fornece busca unificada de imagens, vídeos, música e ícones
 */

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = 'image' | 'video' | 'music' | 'icon' | 'sfx'

export type AssetProvider = 'pexels' | 'pixabay' | 'unsplash' | 'freesound' | 'custom'

export interface Asset {
  id: string
  provider: AssetProvider
  type: AssetType
  url: string
  thumbnailUrl: string
  previewUrl?: string

  // Metadata
  title?: string
  description?: string
  author?: string
  authorUrl?: string
  tags?: string[]

  // Dimensions (for images/videos)
  width?: number
  height?: number
  aspectRatio?: string

  // Duration (for videos/audio)
  duration?: number

  // License
  license: string
  licenseUrl?: string
  attribution?: string

  // Download URLs
  downloadUrls?: {
    small?: string
    medium?: string
    large?: string
    original?: string
  }
}

export interface SearchOptions {
  query: string
  type: AssetType
  page?: number
  perPage?: number
  orientation?: 'landscape' | 'portrait' | 'square'
  color?: string
  locale?: string
}

export interface SearchResult {
  assets: Asset[]
  totalResults: number
  page: number
  perPage: number
  hasMore: boolean
}

// ============================================================================
// PEXELS INTEGRATION
// ============================================================================

class PexelsProvider {
  private apiKey: string
  private baseUrl = 'https://api.pexels.com/v1'
  private videoBaseUrl = 'https://api.pexels.com/videos'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request(url: string): Promise<any> {
    const response = await fetch(url, {
      headers: {
        'Authorization': this.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Pexels API error: ${response.statusText}`)
    }

    return response.json()
  }

  async searchPhotos(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20, orientation, color, locale = 'en-US' } = options

    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
      locale
    })

    if (orientation) params.append('orientation', orientation)
    if (color) params.append('color', color)

    const url = `${this.baseUrl}/search?${params}`
    const data = await this.request(url)

    return {
      assets: data.photos.map((photo: any) => this.mapPhotoToAsset(photo)),
      totalResults: data.total_results,
      page: data.page,
      perPage: data.per_page,
      hasMore: data.page * data.per_page < data.total_results
    }
  }

  async searchVideos(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20, orientation, locale = 'en-US' } = options

    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString(),
      locale
    })

    if (orientation) params.append('orientation', orientation)

    const url = `${this.videoBaseUrl}/search?${params}`
    const data = await this.request(url)

    return {
      assets: data.videos.map((video: any) => this.mapVideoToAsset(video)),
      totalResults: data.total_results,
      page: data.page,
      perPage: data.per_page,
      hasMore: data.page * data.per_page < data.total_results
    }
  }

  private mapPhotoToAsset(photo: any): Asset {
    return {
      id: `pexels-photo-${photo.id}`,
      provider: 'pexels',
      type: 'image',
      url: photo.src.original,
      thumbnailUrl: photo.src.small,
      previewUrl: photo.src.large,
      title: photo.alt || 'Untitled',
      author: photo.photographer,
      authorUrl: photo.photographer_url,
      width: photo.width,
      height: photo.height,
      license: 'Pexels License',
      licenseUrl: 'https://www.pexels.com/license/',
      attribution: `Photo by ${photo.photographer} on Pexels`,
      downloadUrls: {
        small: photo.src.small,
        medium: photo.src.medium,
        large: photo.src.large,
        original: photo.src.original
      }
    }
  }

  private mapVideoToAsset(video: any): Asset {
    const videoFile = video.video_files[0] || {}

    return {
      id: `pexels-video-${video.id}`,
      provider: 'pexels',
      type: 'video',
      url: videoFile.link,
      thumbnailUrl: video.image,
      previewUrl: video.image,
      title: video.user?.name ? `Video by ${video.user.name}` : 'Untitled',
      author: video.user?.name,
      authorUrl: video.user?.url,
      width: videoFile.width,
      height: videoFile.height,
      duration: video.duration,
      license: 'Pexels License',
      licenseUrl: 'https://www.pexels.com/license/',
      attribution: video.user?.name ? `Video by ${video.user.name} on Pexels` : undefined,
      downloadUrls: {
        small: video.video_files.find((f: any) => f.quality === 'sd')?.link,
        medium: video.video_files.find((f: any) => f.quality === 'hd')?.link,
        original: videoFile.link
      }
    }
  }
}

// ============================================================================
// PIXABAY INTEGRATION
// ============================================================================

class PixabayProvider {
  private apiKey: string
  private baseUrl = 'https://pixabay.com/api'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request(endpoint: string, params: URLSearchParams): Promise<any> {
    params.append('key', this.apiKey)

    const response = await fetch(`${this.baseUrl}/${endpoint}?${params}`)

    if (!response.ok) {
      throw new Error(`Pixabay API error: ${response.statusText}`)
    }

    return response.json()
  }

  async searchImages(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20, orientation, color } = options

    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      per_page: perPage.toString(),
      safesearch: 'true'
    })

    if (orientation) params.append('orientation', orientation)
    if (color) params.append('colors', color)

    const data = await this.request('', params)

    return {
      assets: data.hits.map((hit: any) => this.mapImageToAsset(hit)),
      totalResults: data.totalHits,
      page,
      perPage,
      hasMore: page * perPage < data.totalHits
    }
  }

  async searchVideos(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20 } = options

    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      per_page: perPage.toString()
    })

    const data = await this.request('videos', params)

    return {
      assets: data.hits.map((hit: any) => this.mapVideoToAsset(hit)),
      totalResults: data.totalHits,
      page,
      perPage,
      hasMore: page * perPage < data.totalHits
    }
  }

  private mapImageToAsset(hit: any): Asset {
    return {
      id: `pixabay-image-${hit.id}`,
      provider: 'pixabay',
      type: 'image',
      url: hit.largeImageURL,
      thumbnailUrl: hit.previewURL,
      previewUrl: hit.webformatURL,
      tags: hit.tags?.split(', '),
      author: hit.user,
      width: hit.imageWidth,
      height: hit.imageHeight,
      license: 'Pixabay License',
      licenseUrl: 'https://pixabay.com/service/license/',
      downloadUrls: {
        small: hit.previewURL,
        medium: hit.webformatURL,
        large: hit.largeImageURL,
        original: hit.largeImageURL
      }
    }
  }

  private mapVideoToAsset(hit: any): Asset {
    const video = hit.videos?.medium || hit.videos?.small || {}

    return {
      id: `pixabay-video-${hit.id}`,
      provider: 'pixabay',
      type: 'video',
      url: video.url,
      thumbnailUrl: hit.userImageURL,
      tags: hit.tags?.split(', '),
      author: hit.user,
      width: video.width,
      height: video.height,
      duration: hit.duration,
      license: 'Pixabay License',
      licenseUrl: 'https://pixabay.com/service/license/',
      downloadUrls: {
        small: hit.videos?.tiny?.url,
        medium: hit.videos?.small?.url,
        large: hit.videos?.medium?.url,
        original: hit.videos?.large?.url || video.url
      }
    }
  }
}

// ============================================================================
// UNIFIED ASSET LIBRARY
// ============================================================================

export class AssetLibrary {
  private pexels: PexelsProvider | null = null
  private pixabay: PixabayProvider | null = null

  constructor(config?: {
    pexelsApiKey?: string
    pixabayApiKey?: string
  }) {
    if (config?.pexelsApiKey) {
      this.pexels = new PexelsProvider(config.pexelsApiKey)
    }
    if (config?.pixabayApiKey) {
      this.pixabay = new PixabayProvider(config.pixabayApiKey)
    }
  }

  async search(options: SearchOptions, providers: AssetProvider[] = ['pexels', 'pixabay']): Promise<SearchResult> {
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        switch (provider) {
          case 'pexels':
            if (!this.pexels) throw new Error('Pexels not configured')
            return options.type === 'video'
              ? this.pexels.searchVideos(options)
              : this.pexels.searchPhotos(options)

          case 'pixabay':
            if (!this.pixabay) throw new Error('Pixabay not configured')
            return options.type === 'video'
              ? this.pixabay.searchVideos(options)
              : this.pixabay.searchImages(options)

          default:
            throw new Error(`Provider ${provider} not implemented`)
        }
      })
    )

    // Merge results
    const allAssets: Asset[] = []
    let totalResults = 0

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allAssets.push(...result.value.assets)
        totalResults += result.value.totalResults
      }
    })

    return {
      assets: allAssets,
      totalResults,
      page: options.page || 1,
      perPage: options.perPage || 20,
      hasMore: allAssets.length < totalResults
    }
  }

  async searchImages(query: string, options?: Partial<SearchOptions>): Promise<SearchResult> {
    return this.search({ query, type: 'image', ...options })
  }

  async searchVideos(query: string, options?: Partial<SearchOptions>): Promise<SearchResult> {
    return this.search({ query, type: 'video', ...options })
  }

  async downloadAsset(asset: Asset, quality: 'small' | 'medium' | 'large' | 'original' = 'large'): Promise<Blob> {
    const url = asset.downloadUrls?.[quality] || asset.url

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`)
    }

    return response.blob()
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let assetLibraryInstance: AssetLibrary | null = null

export function getAssetLibrary(): AssetLibrary {
  if (!assetLibraryInstance) {
    assetLibraryInstance = new AssetLibrary({
      pexelsApiKey: process.env.NEXT_PUBLIC_PEXELS_API_KEY,
      pixabayApiKey: process.env.NEXT_PUBLIC_PIXABAY_API_KEY
    })
  }
  return assetLibraryInstance
}

export default AssetLibrary

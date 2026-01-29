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
// UNSPLASH INTEGRATION
// ============================================================================

class UnsplashProvider {
  private accessKey: string
  private baseUrl = 'https://api.unsplash.com'

  constructor(accessKey: string) {
    this.accessKey = accessKey
  }

  private async request(endpoint: string, params: URLSearchParams): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${endpoint}?${params}`, {
      headers: {
        'Authorization': `Client-ID ${this.accessKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.statusText}`)
    }

    return response.json()
  }

  async searchPhotos(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20, orientation, color } = options

    const params = new URLSearchParams({
      query,
      page: page.toString(),
      per_page: perPage.toString()
    })

    if (orientation) params.append('orientation', orientation)
    if (color) params.append('color', color)

    const data = await this.request('search/photos', params)

    return {
      assets: data.results.map((photo: any) => this.mapPhotoToAsset(photo)),
      totalResults: data.total,
      page,
      perPage,
      hasMore: page * perPage < data.total
    }
  }

  private mapPhotoToAsset(photo: any): Asset {
    return {
      id: `unsplash-photo-${photo.id}`,
      provider: 'unsplash',
      type: 'image',
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      previewUrl: photo.urls.regular,
      title: photo.description || photo.alt_description || 'Untitled',
      author: photo.user.name,
      authorUrl: photo.user.links.html,
      width: photo.width,
      height: photo.height,
      license: 'Unsplash License',
      licenseUrl: 'https://unsplash.com/license',
      attribution: `Photo by ${photo.user.name} on Unsplash`,
      downloadUrls: {
        small: photo.urls.small,
        medium: photo.urls.regular,
        large: photo.urls.full,
        original: photo.urls.raw
      }
    }
  }
}

// ============================================================================
// FREESOUND INTEGRATION
// ============================================================================

class FreesoundProvider {
  private apiKey: string
  private baseUrl = 'https://freesound.org/apiv2'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private async request(endpoint: string, params: URLSearchParams): Promise<any> {
    params.append('token', this.apiKey)
    const response = await fetch(`${this.baseUrl}/${endpoint}?${params}`)

    if (!response.ok) {
      throw new Error(`Freesound API error: ${response.statusText}`)
    }

    return response.json()
  }

  async searchAudio(options: SearchOptions): Promise<SearchResult> {
    const { query, page = 1, perPage = 20 } = options

    const params = new URLSearchParams({
      query,
      page: page.toString(),
      page_size: perPage.toString(),
      fields: 'id,name,username,previews,duration,license,tags,url'
    })

    const data = await this.request('search/text/', params)

    return {
      assets: data.results.map((sound: any) => this.mapSoundToAsset(sound)),
      totalResults: data.count,
      page,
      perPage,
      hasMore: data.next !== null
    }
  }

  private mapSoundToAsset(sound: any): Asset {
    return {
      id: `freesound-audio-${sound.id}`,
      provider: 'freesound',
      type: 'music',
      url: sound.previews['preview-hq-mp3'],
      thumbnailUrl: '', 
      previewUrl: sound.previews['preview-hq-mp3'],
      title: sound.name,
      author: sound.username,
      authorUrl: sound.url,
      duration: sound.duration,
      tags: sound.tags,
      license: sound.license,
      licenseUrl: sound.license,
      attribution: `Sound by ${sound.username} on Freesound`,
      downloadUrls: {
        original: sound.previews['preview-hq-mp3']
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
  private unsplash: UnsplashProvider | null = null
  private freesound: FreesoundProvider | null = null

  constructor(config?: {
    pexelsApiKey?: string
    pixabayApiKey?: string
    unsplashAccessKey?: string
    freesoundApiKey?: string
  }) {
    if (config?.pexelsApiKey) {
      this.pexels = new PexelsProvider(config.pexelsApiKey)
    }
    if (config?.pixabayApiKey) {
      this.pixabay = new PixabayProvider(config.pixabayApiKey)
    }
    if (config?.unsplashAccessKey) {
      this.unsplash = new UnsplashProvider(config.unsplashAccessKey)
    }
    if (config?.freesoundApiKey) {
      this.freesound = new FreesoundProvider(config.freesoundApiKey)
    }
  }

  async search(options: SearchOptions, providers: AssetProvider[] = ['pexels', 'pixabay', 'unsplash', 'freesound']): Promise<SearchResult> {
    const results = await Promise.allSettled(
      providers.map(async (provider) => {
        switch (provider) {
          case 'pexels':
            if (!this.pexels) return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
            return options.type === 'video'
              ? this.pexels.searchVideos(options)
              : this.pexels.searchPhotos(options)

          case 'pixabay':
            if (!this.pixabay) return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
            return options.type === 'video'
              ? this.pixabay.searchVideos(options)
              : this.pixabay.searchImages(options)

          case 'unsplash':
             if (!this.unsplash) return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
             if (options.type !== 'image') return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
             return this.unsplash.searchPhotos(options)

          case 'freesound':
            if (!this.freesound) return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
            if (options.type !== 'music' && options.type !== 'sfx') return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
            return this.freesound.searchAudio(options)

          default:
            return { assets: [], totalResults: 0, page: 0, perPage: 0, hasMore: false }
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
      pixabayApiKey: process.env.NEXT_PUBLIC_PIXABAY_API_KEY,
      unsplashAccessKey: process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_ACCESS_KEY,
      freesoundApiKey: process.env.NEXT_PUBLIC_FREESOUND_API_KEY || process.env.FREESOUND_API_KEY
    })
  }
  return assetLibraryInstance
}

export default AssetLibrary

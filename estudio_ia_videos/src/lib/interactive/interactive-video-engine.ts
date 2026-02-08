/**
 * Interactive Video Engine - Fase 5: Integrações Premium
 * Sistema completo de vídeos interativos com branches, quizzes, CTAs e hotspots
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface InteractiveElement {
  id: string
  type: 'hotspot' | 'button' | 'quiz' | 'cta' | 'branch' | 'form' | 'annotation'
  timestamp: number // When to show (seconds)
  duration?: number // How long to show (seconds), undefined = until clicked
  position: {
    x: number // 0-100 (percentage)
    y: number // 0-100 (percentage)
    width?: number
    height?: number
  }
  content: InteractiveElementContent
  action: InteractiveAction
  styling?: {
    backgroundColor?: string
    textColor?: string
    borderColor?: string
    borderRadius?: number
    fontSize?: number
    fontWeight?: string
    animation?: 'fade' | 'slide' | 'bounce' | 'pulse'
  }
  conditions?: {
    showIf?: string // JavaScript expression
    hideAfter?: number // Hide after N seconds
    requirePrevious?: string[] // IDs of elements that must be completed first
  }
}

export type InteractiveElementContent =
  | HotspotContent
  | ButtonContent
  | QuizContent
  | CTAContent
  | BranchContent
  | FormContent
  | AnnotationContent

export interface HotspotContent {
  type: 'hotspot'
  title: string
  description?: string
  image?: string
  link?: string
}

export interface ButtonContent {
  type: 'button'
  text: string
  icon?: string
}

export interface QuizContent {
  type: 'quiz'
  question: string
  options: Array<{
    id: string
    text: string
    isCorrect: boolean
    feedback?: string
  }>
  timeLimit?: number // seconds
  points?: number
  explanation?: string
}

export interface CTAContent {
  type: 'cta'
  title: string
  description?: string
  buttonText: string
  link: string
  trackingId?: string
}

export interface BranchContent {
  type: 'branch'
  question: string
  choices: Array<{
    id: string
    text: string
    jumpTo: number // timestamp in seconds
    thumbnail?: string
  }>
}

export interface FormContent {
  type: 'form'
  title: string
  fields: Array<{
    id: string
    label: string
    type: 'text' | 'email' | 'tel' | 'select' | 'checkbox'
    required?: boolean
    options?: string[] // For select
  }>
  submitText: string
  webhookUrl?: string
}

export interface AnnotationContent {
  type: 'annotation'
  text: string
  style: 'tooltip' | 'callout' | 'highlight'
}

export interface InteractiveAction {
  type: 'pause' | 'jump' | 'link' | 'submit' | 'track' | 'none'
  pauseVideo?: boolean
  jumpTo?: number // timestamp
  openLink?: string
  openInNewTab?: boolean
  submitData?: boolean
  trackEvent?: {
    category: string
    action: string
    label?: string
  }
}

export interface InteractiveVideo {
  id: string
  videoUrl: string
  duration: number
  elements: InteractiveElement[]
  metadata: {
    title: string
    description?: string
    thumbnail?: string
    created: Date
    updated: Date
  }
  settings: {
    pauseOnInteraction?: boolean
    showProgress?: boolean
    allowSkip?: boolean
    requireCompletion?: boolean
  }
  analytics?: {
    totalViews: number
    averageEngagement: number // 0-100
    completionRate: number // 0-100
    interactions: Record<string, number> // elementId -> click count
  }
}

export interface InteractionEvent {
  videoId: string
  elementId: string
  userId?: string
  sessionId: string
  timestamp: number // When interaction happened
  videoTime: number // Current video time
  type: string
  data?: any
  createdAt: Date
}

export interface VideoSession {
  sessionId: string
  videoId: string
  userId?: string
  startedAt: Date
  endedAt?: Date
  duration: number // Total watch time
  progress: number // 0-100
  interactions: InteractionEvent[]
  completed: boolean
  score?: number // For quiz videos
}

// ============================================================================
// INTERACTIVE VIDEO ENGINE
// ============================================================================

export class InteractiveVideoEngine {
  private videos: Map<string, InteractiveVideo> = new Map()
  private sessions: Map<string, VideoSession> = new Map()

  // ============================================================================
  // VIDEO MANAGEMENT
  // ============================================================================

  /**
   * Create interactive video
   */
  async createInteractiveVideo(params: {
    videoUrl: string
    title: string
    description?: string
    duration: number
  }): Promise<InteractiveVideo> {
    const video: InteractiveVideo = {
      id: `video-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      videoUrl: params.videoUrl,
      duration: params.duration,
      elements: [],
      metadata: {
        title: params.title,
        description: params.description,
        created: new Date(),
        updated: new Date()
      },
      settings: {
        pauseOnInteraction: true,
        showProgress: true,
        allowSkip: true,
        requireCompletion: false
      },
      analytics: {
        totalViews: 0,
        averageEngagement: 0,
        completionRate: 0,
        interactions: {}
      }
    }

    this.videos.set(video.id, video)

    // Persist to database
    await this.saveVideo(video)

    return video
  }

  /**
   * Get interactive video
   */
  async getVideo(videoId: string): Promise<InteractiveVideo | null> {
    // Try cache first
    const cached = this.videos.get(videoId)
    if (cached) return cached

    // Load from database
    return await this.loadVideo(videoId)
  }

  /**
   * Update interactive video
   */
  async updateVideo(
    videoId: string,
    updates: Partial<InteractiveVideo>
  ): Promise<InteractiveVideo> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    const updated: InteractiveVideo = {
      ...video,
      ...updates,
      metadata: {
        ...video.metadata,
        updated: new Date()
      }
    }

    this.videos.set(videoId, updated)
    await this.saveVideo(updated)

    return updated
  }

  /**
   * Delete interactive video
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    this.videos.delete(videoId)
    // TODO: Delete from database
    return true
  }

  // ============================================================================
  // INTERACTIVE ELEMENTS
  // ============================================================================

  /**
   * Add interactive element
   */
  async addElement(
    videoId: string,
    element: Omit<InteractiveElement, 'id'>
  ): Promise<InteractiveElement> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    const newElement: InteractiveElement = {
      ...element,
      id: `elem-${Date.now()}-${Math.random().toString(36).substring(7)}`
    }

    video.elements.push(newElement)
    await this.updateVideo(videoId, { elements: video.elements })

    return newElement
  }

  /**
   * Update interactive element
   */
  async updateElement(
    videoId: string,
    elementId: string,
    updates: Partial<InteractiveElement>
  ): Promise<InteractiveElement> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    const elementIndex = video.elements.findIndex(e => e.id === elementId)
    if (elementIndex === -1) {
      throw new Error(`Element ${elementId} not found`)
    }

    video.elements[elementIndex] = {
      ...video.elements[elementIndex],
      ...updates
    }

    await this.updateVideo(videoId, { elements: video.elements })

    return video.elements[elementIndex]
  }

  /**
   * Remove interactive element
   */
  async removeElement(videoId: string, elementId: string): Promise<boolean> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    video.elements = video.elements.filter(e => e.id !== elementId)
    await this.updateVideo(videoId, { elements: video.elements })

    return true
  }

  /**
   * Get elements for timestamp
   */
  getElementsAtTime(video: InteractiveVideo, currentTime: number): InteractiveElement[] {
    return video.elements.filter(element => {
      const startTime = element.timestamp
      const endTime = element.duration
        ? element.timestamp + element.duration
        : video.duration

      return currentTime >= startTime && currentTime <= endTime
    })
  }

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Start video session
   */
  async startSession(videoId: string, userId?: string): Promise<VideoSession> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    const session: VideoSession = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      videoId,
      userId,
      startedAt: new Date(),
      duration: 0,
      progress: 0,
      interactions: [],
      completed: false
    }

    this.sessions.set(session.sessionId, session)

    // Update analytics
    if (video.analytics) {
      video.analytics.totalViews++
      await this.updateVideo(videoId, { analytics: video.analytics })
    }

    return session
  }

  /**
   * End video session
   */
  async endSession(sessionId: string): Promise<VideoSession> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    session.endedAt = new Date()
    session.completed = session.progress >= 90 // Consider 90%+ as completed

    // Calculate score for quiz videos
    if (session.interactions.some(i => i.type === 'quiz')) {
      session.score = this.calculateQuizScore(session)
    }

    // Persist session
    await this.saveSession(session)

    // Update video analytics
    await this.updateVideoAnalytics(session.videoId, session)

    return session
  }

  /**
   * Track interaction
   */
  async trackInteraction(
    sessionId: string,
    elementId: string,
    videoTime: number,
    data?: any
  ): Promise<InteractionEvent> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const video = await this.getVideo(session.videoId)
    if (!video) {
      throw new Error(`Video ${session.videoId} not found`)
    }

    const element = video.elements.find(e => e.id === elementId)
    if (!element) {
      throw new Error(`Element ${elementId} not found`)
    }

    const interaction: InteractionEvent = {
      videoId: session.videoId,
      elementId,
      userId: session.userId,
      sessionId,
      timestamp: Date.now(),
      videoTime,
      type: element.type,
      data,
      createdAt: new Date()
    }

    session.interactions.push(interaction)

    // Track event
    if (element.action.trackEvent) {
      await this.trackAnalyticsEvent({
        ...element.action.trackEvent,
        sessionId,
        elementId
      })
    }

    return interaction
  }

  /**
   * Update session progress
   */
  updateProgress(sessionId: string, progress: number, duration: number): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.progress = Math.min(100, progress)
      session.duration = duration
    }
  }

  // ============================================================================
  // QUIZ MANAGEMENT
  // ============================================================================

  /**
   * Submit quiz answer
   */
  async submitQuizAnswer(
    sessionId: string,
    elementId: string,
    optionId: string
  ): Promise<{
    correct: boolean
    feedback?: string
    points: number
  }> {
    const session = this.sessions.get(sessionId)
    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const video = await this.getVideo(session.videoId)
    if (!video) {
      throw new Error('Video not found')
    }

    const element = video.elements.find(e => e.id === elementId)
    if (!element || element.type !== 'quiz') {
      throw new Error('Quiz element not found')
    }

    const quizContent = element.content as QuizContent
    const selectedOption = quizContent.options.find(o => o.id === optionId)

    if (!selectedOption) {
      throw new Error('Invalid option')
    }

    // Track interaction
    await this.trackInteraction(sessionId, elementId, 0, {
      optionId,
      correct: selectedOption.isCorrect
    })

    return {
      correct: selectedOption.isCorrect,
      feedback: selectedOption.feedback || quizContent.explanation,
      points: selectedOption.isCorrect ? (quizContent.points || 10) : 0
    }
  }

  /**
   * Calculate quiz score
   */
  private calculateQuizScore(session: VideoSession): number {
    const quizInteractions = session.interactions.filter(i => i.type === 'quiz')

    if (quizInteractions.length === 0) return 0

    const totalPoints = quizInteractions.reduce((sum, interaction) => {
      return sum + (interaction.data?.correct ? 10 : 0)
    }, 0)

    const maxPoints = quizInteractions.length * 10

    return Math.round((totalPoints / maxPoints) * 100)
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Update video analytics
   */
  private async updateVideoAnalytics(
    videoId: string,
    session: VideoSession
  ): Promise<void> {
    const video = await this.getVideo(videoId)
    if (!video || !video.analytics) return

    // Update completion rate
    const allSessions = Array.from(this.sessions.values())
      .filter(s => s.videoId === videoId && s.endedAt)

    const completedCount = allSessions.filter(s => s.completed).length
    video.analytics.completionRate = allSessions.length > 0
      ? Math.round((completedCount / allSessions.length) * 100)
      : 0

    // Update average engagement
    const totalProgress = allSessions.reduce((sum, s) => sum + s.progress, 0)
    video.analytics.averageEngagement = allSessions.length > 0
      ? Math.round(totalProgress / allSessions.length)
      : 0

    // Update interaction counts
    session.interactions.forEach(interaction => {
      video.analytics!.interactions[interaction.elementId] =
        (video.analytics!.interactions[interaction.elementId] || 0) + 1
    })

    await this.updateVideo(videoId, { analytics: video.analytics })
  }

  /**
   * Get video analytics
   */
  async getVideoAnalytics(videoId: string): Promise<{
    views: number
    uniqueViewers: number
    averageWatchTime: number
    completionRate: number
    engagementRate: number
    topInteractions: Array<{ elementId: string; count: number }>
    quizPerformance?: {
      averageScore: number
      passRate: number
    }
  }> {
    const video = await this.getVideo(videoId)
    if (!video) {
      throw new Error(`Video ${videoId} not found`)
    }

    const allSessions = Array.from(this.sessions.values())
      .filter(s => s.videoId === videoId)

    const uniqueUsers = new Set(allSessions.map(s => s.userId).filter(Boolean))

    const averageWatchTime = allSessions.length > 0
      ? allSessions.reduce((sum, s) => sum + s.duration, 0) / allSessions.length
      : 0

    const topInteractions = Object.entries(video.analytics?.interactions || {})
      .map(([elementId, count]) => ({ elementId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Quiz performance
    let quizPerformance
    const sessionsWithScore = allSessions.filter(s => s.score !== undefined)
    if (sessionsWithScore.length > 0) {
      const averageScore = sessionsWithScore.reduce((sum, s) => sum + (s.score || 0), 0) / sessionsWithScore.length
      const passRate = sessionsWithScore.filter(s => (s.score || 0) >= 70).length / sessionsWithScore.length

      quizPerformance = {
        averageScore: Math.round(averageScore),
        passRate: Math.round(passRate * 100)
      }
    }

    return {
      views: video.analytics?.totalViews || 0,
      uniqueViewers: uniqueUsers.size,
      averageWatchTime,
      completionRate: video.analytics?.completionRate || 0,
      engagementRate: video.analytics?.averageEngagement || 0,
      topInteractions,
      quizPerformance
    }
  }

  /**
   * Track analytics event
   */
  private async trackAnalyticsEvent(event: {
    category: string
    action: string
    label?: string
    sessionId?: string
    elementId?: string
  }): Promise<void> {
    // TODO: Send to analytics service (Google Analytics, Mixpanel, etc.)
    logger.info('[InteractiveVideoEngine] Analytics event:', event)
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Save video to database
   */
  private async saveVideo(video: InteractiveVideo): Promise<void> {
    // TODO: Implement database persistence
    logger.info('[InteractiveVideoEngine] Saving video:', video.id)
  }

  /**
   * Load video from database
   */
  private async loadVideo(videoId: string): Promise<InteractiveVideo | null> {
    // TODO: Implement database loading
    logger.info('[InteractiveVideoEngine] Loading video:', videoId)
    return null
  }

  /**
   * Save session to database
   */
  private async saveSession(session: VideoSession): Promise<void> {
    // TODO: Implement database persistence
    logger.info('[InteractiveVideoEngine] Saving session:', session.sessionId)
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const interactiveVideoEngine = new InteractiveVideoEngine()

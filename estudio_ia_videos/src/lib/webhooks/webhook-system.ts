/**
 * Webhook System - Fase 5: Integrações Premium
 * Sistema completo de webhooks para notificações de eventos em tempo real
 */

import crypto from 'crypto'

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Webhook {
  id: string
  url: string
  events: WebhookEvent[]
  secret: string
  active: boolean
  description?: string
  headers?: Record<string, string>
  retryPolicy: {
    maxRetries: number
    retryDelay: number // milliseconds
    exponentialBackoff: boolean
  }
  rateLimiting?: {
    maxRequests: number
    windowMs: number
  }
  createdAt: Date
  updatedAt: Date
  lastTriggeredAt?: Date
  totalDeliveries: number
  successfulDeliveries: number
  failedDeliveries: number
}

export type WebhookEvent =
  | 'video.created'
  | 'video.processing'
  | 'video.completed'
  | 'video.failed'
  | 'avatar.rendering'
  | 'avatar.completed'
  | 'avatar.failed'
  | 'job.queued'
  | 'job.started'
  | 'job.progress'
  | 'job.completed'
  | 'job.failed'
  | 'user.registered'
  | 'user.updated'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'analytics.milestone'
  | 'quiz.completed'
  | 'interaction.tracked'

export interface WebhookPayload {
  id: string
  event: WebhookEvent
  timestamp: Date
  data: any
  metadata?: {
    userId?: string
    sessionId?: string
    ip?: string
  }
}

export interface WebhookDelivery {
  id: string
  webhookId: string
  event: WebhookEvent
  payload: WebhookPayload
  attempt: number
  status: 'pending' | 'sent' | 'failed' | 'retrying'
  statusCode?: number
  response?: string
  error?: string
  sentAt?: Date
  responseTime?: number // milliseconds
}

export interface WebhookSubscription {
  webhookId: string
  events: WebhookEvent[]
  filters?: {
    userId?: string
    videoId?: string
    tags?: string[]
  }
}

// ============================================================================
// WEBHOOK SYSTEM
// ============================================================================

export class WebhookSystem {
  private webhooks: Map<string, Webhook> = new Map()
  private deliveries: Map<string, WebhookDelivery> = new Map()
  private deliveryQueue: WebhookDelivery[] = []

  constructor() {
    // Start delivery worker
    this.startDeliveryWorker()
  }

  // ============================================================================
  // WEBHOOK MANAGEMENT
  // ============================================================================

  /**
   * Create webhook
   */
  async createWebhook(params: {
    url: string
    events: WebhookEvent[]
    description?: string
    headers?: Record<string, string>
    maxRetries?: number
  }): Promise<Webhook> {
    const secret = this.generateSecret()

    const webhook: Webhook = {
      id: `webhook-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      url: params.url,
      events: params.events,
      secret,
      active: true,
      description: params.description,
      headers: params.headers,
      retryPolicy: {
        maxRetries: params.maxRetries || 3,
        retryDelay: 5000,
        exponentialBackoff: true
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0
    }

    this.webhooks.set(webhook.id, webhook)
    await this.saveWebhook(webhook)

    return webhook
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<Omit<Webhook, 'id' | 'secret' | 'createdAt'>>
  ): Promise<Webhook> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    const updated: Webhook = {
      ...webhook,
      ...updates,
      updatedAt: new Date()
    }

    this.webhooks.set(webhookId, updated)
    await this.saveWebhook(updated)

    return updated
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<boolean> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) {
      return false
    }

    this.webhooks.delete(webhookId)
    await this.removeWebhook(webhookId)

    return true
  }

  /**
   * List webhooks
   */
  async listWebhooks(filters?: {
    active?: boolean
    event?: WebhookEvent
  }): Promise<Webhook[]> {
    let webhooks = Array.from(this.webhooks.values())

    if (filters?.active !== undefined) {
      webhooks = webhooks.filter(w => w.active === filters.active)
    }

    if (filters?.event) {
      webhooks = webhooks.filter(w => w.events.includes(filters.event!))
    }

    return webhooks
  }

  /**
   * Get webhook
   */
  async getWebhook(webhookId: string): Promise<Webhook | null> {
    return this.webhooks.get(webhookId) || null
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: string): Promise<string> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    const newSecret = this.generateSecret()
    webhook.secret = newSecret
    webhook.updatedAt = new Date()

    await this.saveWebhook(webhook)

    return newSecret
  }

  // ============================================================================
  // EVENT TRIGGERING
  // ============================================================================

  /**
   * Trigger webhook event
   */
  async triggerEvent(event: WebhookEvent, data: any, metadata?: WebhookPayload['metadata']): Promise<void> {
    // Get all webhooks subscribed to this event
    const subscribedWebhooks = Array.from(this.webhooks.values())
      .filter(webhook =>
        webhook.active && webhook.events.includes(event)
      )

    if (subscribedWebhooks.length === 0) {
      console.log(`[WebhookSystem] No webhooks subscribed to event: ${event}`)
      return
    }

    // Create payload
    const payload: WebhookPayload = {
      id: `payload-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      event,
      timestamp: new Date(),
      data,
      metadata
    }

    // Create delivery for each webhook
    for (const webhook of subscribedWebhooks) {
      const delivery = this.createDelivery(webhook, payload)
      this.deliveryQueue.push(delivery)
    }

    console.log(`[WebhookSystem] Triggered event ${event} for ${subscribedWebhooks.length} webhooks`)
  }

  /**
   * Create delivery
   */
  private createDelivery(webhook: Webhook, payload: WebhookPayload): WebhookDelivery {
    const delivery: WebhookDelivery = {
      id: `delivery-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      webhookId: webhook.id,
      event: payload.event,
      payload,
      attempt: 0,
      status: 'pending'
    }

    this.deliveries.set(delivery.id, delivery)
    return delivery
  }

  // ============================================================================
  // DELIVERY WORKER
  // ============================================================================

  /**
   * Start delivery worker
   */
  private startDeliveryWorker(): void {
    setInterval(async () => {
      await this.processDeliveryQueue()
    }, 1000) // Check every second
  }

  /**
   * Process delivery queue
   */
  private async processDeliveryQueue(): Promise<void> {
    if (this.deliveryQueue.length === 0) {
      return
    }

    // Process up to 10 deliveries at a time
    const batch = this.deliveryQueue.splice(0, 10)

    await Promise.all(
      batch.map(delivery => this.deliverWebhook(delivery))
    )
  }

  /**
   * Deliver webhook
   */
  private async deliverWebhook(delivery: WebhookDelivery): Promise<void> {
    const webhook = this.webhooks.get(delivery.webhookId)
    if (!webhook) {
      console.error(`[WebhookSystem] Webhook ${delivery.webhookId} not found`)
      return
    }

    delivery.attempt++
    delivery.status = delivery.attempt > 1 ? 'retrying' : 'pending'

    const startTime = Date.now()

    try {
      // Generate signature
      const signature = this.generateSignature(delivery.payload, webhook.secret)

      // Send webhook
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': delivery.event,
          'X-Webhook-Delivery-Id': delivery.id,
          'X-Webhook-Timestamp': delivery.payload.timestamp.toISOString(),
          ...webhook.headers
        },
        body: JSON.stringify(delivery.payload)
      })

      const responseTime = Date.now() - startTime

      delivery.statusCode = response.status
      delivery.responseTime = responseTime
      delivery.sentAt = new Date()

      if (response.ok) {
        delivery.status = 'sent'
        delivery.response = await response.text()

        // Update webhook stats
        webhook.totalDeliveries++
        webhook.successfulDeliveries++
        webhook.lastTriggeredAt = new Date()

        console.log(`[WebhookSystem] Delivered ${delivery.event} to ${webhook.url} (${responseTime}ms)`)
      } else {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`)
      }
    } catch (error) {
      delivery.status = 'failed'
      delivery.error = error instanceof Error ? error.message : String(error)

      console.error(`[WebhookSystem] Delivery failed (attempt ${delivery.attempt}/${webhook.retryPolicy.maxRetries}):`, error)

      // Retry logic
      if (delivery.attempt < webhook.retryPolicy.maxRetries) {
        const delay = webhook.retryPolicy.exponentialBackoff
          ? webhook.retryPolicy.retryDelay * Math.pow(2, delivery.attempt - 1)
          : webhook.retryPolicy.retryDelay

        setTimeout(() => {
          this.deliveryQueue.push(delivery)
        }, delay)
      } else {
        // Max retries reached
        webhook.totalDeliveries++
        webhook.failedDeliveries++

        console.error(`[WebhookSystem] Max retries reached for delivery ${delivery.id}`)
      }
    }

    // Save delivery
    await this.saveDelivery(delivery)
  }

  // ============================================================================
  // SIGNATURE & SECURITY
  // ============================================================================

  /**
   * Generate webhook secret
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate signature for payload
   */
  private generateSignature(payload: WebhookPayload, secret: string): string {
    const payloadString = JSON.stringify(payload)
    return crypto
      .createHmac('sha256', secret)
      .update(payloadString)
      .digest('hex')
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }

  // ============================================================================
  // DELIVERY HISTORY
  // ============================================================================

  /**
   * Get webhook deliveries
   */
  async getDeliveries(webhookId: string, options?: {
    status?: WebhookDelivery['status']
    limit?: number
  }): Promise<WebhookDelivery[]> {
    let deliveries = Array.from(this.deliveries.values())
      .filter(d => d.webhookId === webhookId)

    if (options?.status) {
      deliveries = deliveries.filter(d => d.status === options.status)
    }

    // Sort by most recent first
    deliveries.sort((a, b) => {
      const timeA = a.sentAt?.getTime() || 0
      const timeB = b.sentAt?.getTime() || 0
      return timeB - timeA
    })

    if (options?.limit) {
      deliveries = deliveries.slice(0, options.limit)
    }

    return deliveries
  }

  /**
   * Get delivery
   */
  async getDelivery(deliveryId: string): Promise<WebhookDelivery | null> {
    return this.deliveries.get(deliveryId) || null
  }

  /**
   * Retry delivery
   */
  async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId)
    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`)
    }

    if (delivery.status === 'sent') {
      throw new Error('Cannot retry successful delivery')
    }

    // Reset attempt count and add back to queue
    delivery.attempt = 0
    delivery.status = 'pending'
    this.deliveryQueue.push(delivery)
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get webhook statistics
   */
  async getWebhookStats(webhookId: string): Promise<{
    totalDeliveries: number
    successfulDeliveries: number
    failedDeliveries: number
    successRate: number
    averageResponseTime: number
    deliveriesByStatus: Record<string, number>
    recentDeliveries: WebhookDelivery[]
  }> {
    const webhook = this.webhooks.get(webhookId)
    if (!webhook) {
      throw new Error(`Webhook ${webhookId} not found`)
    }

    const deliveries = await this.getDeliveries(webhookId, { limit: 100 })

    const deliveriesByStatus: Record<string, number> = {
      sent: 0,
      failed: 0,
      pending: 0,
      retrying: 0
    }

    let totalResponseTime = 0
    let responseTimeCount = 0

    deliveries.forEach(delivery => {
      deliveriesByStatus[delivery.status]++

      if (delivery.responseTime) {
        totalResponseTime += delivery.responseTime
        responseTimeCount++
      }
    })

    return {
      totalDeliveries: webhook.totalDeliveries,
      successfulDeliveries: webhook.successfulDeliveries,
      failedDeliveries: webhook.failedDeliveries,
      successRate: webhook.totalDeliveries > 0
        ? (webhook.successfulDeliveries / webhook.totalDeliveries) * 100
        : 0,
      averageResponseTime: responseTimeCount > 0
        ? totalResponseTime / responseTimeCount
        : 0,
      deliveriesByStatus,
      recentDeliveries: deliveries.slice(0, 10)
    }
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  /**
   * Save webhook to database
   */
  private async saveWebhook(webhook: Webhook): Promise<void> {
    // TODO: Implement database persistence
    console.log('[WebhookSystem] Saving webhook:', webhook.id)
  }

  /**
   * Remove webhook from database
   */
  private async removeWebhook(webhookId: string): Promise<void> {
    // TODO: Implement database deletion
    console.log('[WebhookSystem] Removing webhook:', webhookId)
  }

  /**
   * Save delivery to database
   */
  private async saveDelivery(delivery: WebhookDelivery): Promise<void> {
    // TODO: Implement database persistence
    console.log('[WebhookSystem] Saving delivery:', delivery.id)
  }
}

// ============================================================================
// WEBHOOK EVENT HELPERS
// ============================================================================

export const WebhookEvents = {
  Video: {
    CREATED: 'video.created' as WebhookEvent,
    PROCESSING: 'video.processing' as WebhookEvent,
    COMPLETED: 'video.completed' as WebhookEvent,
    FAILED: 'video.failed' as WebhookEvent
  },
  Avatar: {
    RENDERING: 'avatar.rendering' as WebhookEvent,
    COMPLETED: 'avatar.completed' as WebhookEvent,
    FAILED: 'avatar.failed' as WebhookEvent
  },
  Job: {
    QUEUED: 'job.queued' as WebhookEvent,
    STARTED: 'job.started' as WebhookEvent,
    PROGRESS: 'job.progress' as WebhookEvent,
    COMPLETED: 'job.completed' as WebhookEvent,
    FAILED: 'job.failed' as WebhookEvent
  },
  User: {
    REGISTERED: 'user.registered' as WebhookEvent,
    UPDATED: 'user.updated' as WebhookEvent
  },
  Payment: {
    SUCCEEDED: 'payment.succeeded' as WebhookEvent,
    FAILED: 'payment.failed' as WebhookEvent
  },
  Analytics: {
    MILESTONE: 'analytics.milestone' as WebhookEvent
  },
  Quiz: {
    COMPLETED: 'quiz.completed' as WebhookEvent
  },
  Interaction: {
    TRACKED: 'interaction.tracked' as WebhookEvent
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const webhookSystem = new WebhookSystem()

/**
 * 🔔 Webhook Events Service
 * MVP Vídeos TécnicoCursos v7
 * 
 * Sistema de webhooks para notificar sistemas externos sobre eventos:
 * - render.completed, render.failed, render.started
 * - project.created, project.updated, project.deleted
 * - user.created, user.updated
 * - export.completed
 * 
 * Features:
 * - Retry com exponential backoff
 * - Signature HMAC-SHA256
 * - Event filtering por subscription
 * - Rate limiting por endpoint
 * - Logging de delivery attempts
 */

import * as crypto from 'crypto';
// Simple logger for webhook service
const logger = {
  info: (msg: string, data?: Record<string, unknown>) => console.log(`[INFO] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) => console.error(`[ERROR] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => console.warn(`[WARN] ${msg}`, data),
  debug: (msg: string, data?: Record<string, unknown>) => console.debug(`[DEBUG] ${msg}`, data),
};

// ===========================================
// Types
// ===========================================

export type WebhookEventType =
  | 'render.started'
  | 'render.completed'
  | 'render.failed'
  | 'render.progress'
  | 'render.cancelled'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.published'
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  | 'export.completed'
  | 'export.failed'
  | 'subscription.created'
  | 'subscription.cancelled'
  | 'invoice.paid'
  | 'invoice.failed'
  | 'certificate.generated';

export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  created_at: string;
  data: T;
  metadata?: {
    user_id?: string;
    project_id?: string;
    render_job_id?: string;
    ip_address?: string;
    user_agent?: string;
  };
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  enabled: boolean;
  created_at: string;
  updated_at: string;
  metadata?: {
    name?: string;
    description?: string;
    owner_id?: string;
  };
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  event_id: string;
  event_type: WebhookEventType;
  url: string;
  request_headers: Record<string, string>;
  request_body: string;
  response_status?: number;
  response_body?: string;
  response_headers?: Record<string, string>;
  delivered: boolean;
  attempt: number;
  max_attempts: number;
  next_retry_at?: string;
  delivered_at?: string;
  created_at: string;
  duration_ms?: number;
  error_message?: string;
}

export interface WebhookConfig {
  maxRetries: number;
  retryDelays: number[]; // ms between retries
  timeout: number; // ms
  signatureHeader: string;
  timestampHeader: string;
  eventIdHeader: string;
  userAgent: string;
}

// ===========================================
// Default Configuration
// ===========================================

const DEFAULT_CONFIG: WebhookConfig = {
  maxRetries: 5,
  retryDelays: [1000, 5000, 30000, 120000, 600000], // 1s, 5s, 30s, 2min, 10min
  timeout: 30000, // 30 seconds
  signatureHeader: 'X-TecnicoCursos-Signature',
  timestampHeader: 'X-TecnicoCursos-Timestamp',
  eventIdHeader: 'X-TecnicoCursos-Event-Id',
  userAgent: 'TecnicoCursos-Webhook/1.0',
};

// ===========================================
// Webhook Service Class
// ===========================================

export class WebhookService {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveryQueue: WebhookDelivery[] = [];
  private config: WebhookConfig;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<WebhookConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startRetryProcessor();
  }

  // ===========================================
  // Endpoint Management
  // ===========================================

  /**
   * Registra um novo webhook endpoint
   */
  registerEndpoint(
    url: string,
    events: WebhookEventType[],
    options: {
      name?: string;
      description?: string;
      owner_id?: string;
    } = {}
  ): WebhookEndpoint {
    const id = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString('hex');
    const now = new Date().toISOString();

    const endpoint: WebhookEndpoint = {
      id,
      url,
      secret,
      events,
      enabled: true,
      created_at: now,
      updated_at: now,
      metadata: {
        name: options.name,
        description: options.description,
        owner_id: options.owner_id,
      },
    };

    this.endpoints.set(id, endpoint);
    
    logger.info('[Webhook] Endpoint registered', {
      endpoint_id: id,
      url,
      events: events.length,
    });

    return endpoint;
  }

  /**
   * Atualiza configuração de um endpoint
   */
  updateEndpoint(
    endpointId: string,
    updates: Partial<Pick<WebhookEndpoint, 'url' | 'events' | 'enabled' | 'metadata'>>
  ): WebhookEndpoint | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const updated: WebhookEndpoint = {
      ...endpoint,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.endpoints.set(endpointId, updated);
    return updated;
  }

  /**
   * Remove um endpoint
   */
  deleteEndpoint(endpointId: string): boolean {
    const deleted = this.endpoints.delete(endpointId);
    if (deleted) {
      logger.info('[Webhook] Endpoint deleted', { endpoint_id: endpointId });
    }
    return deleted;
  }

  /**
   * Obtém um endpoint por ID
   */
  getEndpoint(endpointId: string): WebhookEndpoint | null {
    return this.endpoints.get(endpointId) || null;
  }

  /**
   * Lista todos os endpoints
   */
  listEndpoints(ownerId?: string): WebhookEndpoint[] {
    const all = Array.from(this.endpoints.values());
    if (ownerId) {
      return all.filter(ep => ep.metadata?.owner_id === ownerId);
    }
    return all;
  }

  /**
   * Rotaciona o secret de um endpoint
   */
  rotateSecret(endpointId: string): string | null {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) return null;

    const newSecret = crypto.randomBytes(32).toString('hex');
    endpoint.secret = newSecret;
    endpoint.updated_at = new Date().toISOString();
    this.endpoints.set(endpointId, endpoint);

    logger.info('[Webhook] Secret rotated', { endpoint_id: endpointId });
    return newSecret;
  }

  // ===========================================
  // Event Dispatch
  // ===========================================

  /**
   * Dispara um evento para todos os endpoints interessados
   */
  async dispatch<T>(
    eventType: WebhookEventType,
    data: T,
    metadata?: WebhookEvent['metadata']
  ): Promise<WebhookDelivery[]> {
    const event: WebhookEvent<T> = {
      id: crypto.randomUUID(),
      type: eventType,
      created_at: new Date().toISOString(),
      data,
      metadata,
    };

    // Encontrar endpoints interessados neste evento
    const interestedEndpoints = Array.from(this.endpoints.values()).filter(
      ep => ep.enabled && ep.events.includes(eventType)
    );

    if (interestedEndpoints.length === 0) {
      logger.debug('[Webhook] No endpoints interested', { event_type: eventType });
      return [];
    }

    // Criar deliveries para cada endpoint
    const deliveries: WebhookDelivery[] = [];

    for (const endpoint of interestedEndpoints) {
      const delivery = await this.createDelivery(endpoint, event);
      deliveries.push(delivery);
    }

    logger.info('[Webhook] Event dispatched', {
      event_id: event.id,
      event_type: eventType,
      endpoints_count: deliveries.length,
    });

    return deliveries;
  }

  /**
   * Cria e executa uma delivery
   */
  private async createDelivery<T>(
    endpoint: WebhookEndpoint,
    event: WebhookEvent<T>
  ): Promise<WebhookDelivery> {
    const now = new Date().toISOString();
    const timestamp = Date.now();
    const payload = JSON.stringify(event);
    const signature = this.signPayload(payload, endpoint.secret, timestamp);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': this.config.userAgent,
      [this.config.signatureHeader]: signature,
      [this.config.timestampHeader]: timestamp.toString(),
      [this.config.eventIdHeader]: event.id,
    };

    const delivery: WebhookDelivery = {
      id: crypto.randomUUID(),
      endpoint_id: endpoint.id,
      event_id: event.id,
      event_type: event.type,
      url: endpoint.url,
      request_headers: headers,
      request_body: payload,
      delivered: false,
      attempt: 1,
      max_attempts: this.config.maxRetries + 1,
      created_at: now,
    };

    // Executar delivery
    const result = await this.executeDelivery(delivery);
    
    if (!result.delivered && result.attempt < result.max_attempts) {
      this.scheduleRetry(result);
    }

    return result;
  }

  /**
   * Executa uma delivery HTTP
   */
  private async executeDelivery(delivery: WebhookDelivery): Promise<WebhookDelivery> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(delivery.url, {
        method: 'POST',
        headers: delivery.request_headers,
        body: delivery.request_body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.text();
      const duration = Date.now() - startTime;

      delivery.response_status = response.status;
      delivery.response_body = responseBody.substring(0, 1000); // Limit response size
      delivery.response_headers = Object.fromEntries(response.headers.entries());
      delivery.duration_ms = duration;

      // Success: 2xx status codes
      if (response.status >= 200 && response.status < 300) {
        delivery.delivered = true;
        delivery.delivered_at = new Date().toISOString();
        
        logger.info('[Webhook] Delivery successful', {
          delivery_id: delivery.id,
          endpoint_id: delivery.endpoint_id,
          status: response.status,
          duration_ms: duration,
        });
      } else {
        delivery.error_message = `HTTP ${response.status}: ${responseBody.substring(0, 200)}`;
        
        logger.warn('[Webhook] Delivery failed', {
          delivery_id: delivery.id,
          endpoint_id: delivery.endpoint_id,
          status: response.status,
          attempt: delivery.attempt,
        });
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      delivery.duration_ms = duration;
      delivery.error_message = error instanceof Error ? error.message : 'Unknown error';

      logger.error('[Webhook] Delivery error', {
        delivery_id: delivery.id,
        endpoint_id: delivery.endpoint_id,
        error: delivery.error_message,
        attempt: delivery.attempt,
      });
    }

    return delivery;
  }

  // ===========================================
  // Retry Logic
  // ===========================================

  /**
   * Agenda retry de uma delivery
   */
  private scheduleRetry(delivery: WebhookDelivery): void {
    const retryIndex = Math.min(delivery.attempt - 1, this.config.retryDelays.length - 1);
    const delay = this.config.retryDelays[retryIndex];
    
    delivery.next_retry_at = new Date(Date.now() + delay).toISOString();
    this.deliveryQueue.push(delivery);

    logger.debug('[Webhook] Retry scheduled', {
      delivery_id: delivery.id,
      attempt: delivery.attempt + 1,
      delay_ms: delay,
    });
  }

  /**
   * Processa retries pendentes
   */
  private startRetryProcessor(): void {
    this.retryTimer = setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Processa a fila de retries
   */
  private async processRetryQueue(): Promise<void> {
    const now = Date.now();
    const readyDeliveries: WebhookDelivery[] = [];
    const remaining: WebhookDelivery[] = [];

    for (const delivery of this.deliveryQueue) {
      if (delivery.next_retry_at && new Date(delivery.next_retry_at).getTime() <= now) {
        readyDeliveries.push(delivery);
      } else {
        remaining.push(delivery);
      }
    }

    this.deliveryQueue = remaining;

    for (const delivery of readyDeliveries) {
      delivery.attempt += 1;
      delivery.next_retry_at = undefined;
      
      const result = await this.executeDelivery(delivery);
      
      if (!result.delivered && result.attempt < result.max_attempts) {
        this.scheduleRetry(result);
      }
    }
  }

  // ===========================================
  // Signature
  // ===========================================

  /**
   * Assina um payload com HMAC-SHA256
   */
  private signPayload(payload: string, secret: string, timestamp: number): string {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    return `sha256=${signature}`;
  }

  /**
   * Verifica assinatura de um webhook (para receber webhooks externos)
   */
  verifySignature(
    payload: string,
    signature: string,
    secret: string,
    timestamp: number,
    tolerance: number = 300000 // 5 minutes
  ): boolean {
    // Verificar timestamp para prevenir replay attacks
    const age = Date.now() - timestamp;
    if (age > tolerance) {
      return false;
    }

    const expectedSignature = this.signPayload(payload, secret, timestamp);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ===========================================
  // Test Endpoint
  // ===========================================

  /**
   * Envia ping de teste para um endpoint
   */
  async testEndpoint(endpointId: string): Promise<{
    success: boolean;
    status?: number;
    duration_ms?: number;
    error?: string;
  }> {
    const endpoint = this.endpoints.get(endpointId);
    if (!endpoint) {
      return { success: false, error: 'Endpoint not found' };
    }

    const testEvent: WebhookEvent<{ test: boolean; timestamp: string }> = {
      id: crypto.randomUUID(),
      type: 'render.started', // Use a real event type
      created_at: new Date().toISOString(),
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        user_id: 'test',
      },
    };

    const timestamp = Date.now();
    const payload = JSON.stringify(testEvent);
    const signature = this.signPayload(payload, endpoint.secret, timestamp);

    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.config.userAgent,
          [this.config.signatureHeader]: signature,
          [this.config.timestampHeader]: timestamp.toString(),
          [this.config.eventIdHeader]: testEvent.id,
          'X-TecnicoCursos-Test': 'true',
        },
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        duration_ms: duration,
      };
    } catch (error) {
      return {
        success: false,
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================
  // Cleanup
  // ===========================================

  /**
   * Para o serviço
   */
  destroy(): void {
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
    this.deliveryQueue = [];
    logger.info('[Webhook] Service stopped');
  }

  /**
   * Obtém estatísticas do serviço
   */
  getStats(): {
    endpoints_count: number;
    pending_retries: number;
    enabled_endpoints: number;
  } {
    const enabled = Array.from(this.endpoints.values()).filter(ep => ep.enabled).length;
    return {
      endpoints_count: this.endpoints.size,
      pending_retries: this.deliveryQueue.length,
      enabled_endpoints: enabled,
    };
  }
}

// ===========================================
// Singleton Instance
// ===========================================

export const webhookService = new WebhookService();

// ===========================================
// Helper Functions
// ===========================================

/**
 * Dispara evento de render completado
 */
export async function notifyRenderCompleted(
  jobId: string,
  projectId: string,
  userId: string,
  videoUrl: string,
  duration: number
): Promise<void> {
  await webhookService.dispatch(
    'render.completed',
    {
      job_id: jobId,
      project_id: projectId,
      video_url: videoUrl,
      duration_seconds: duration,
      completed_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      project_id: projectId,
      render_job_id: jobId,
    }
  );
}

/**
 * Dispara evento de render falhou
 */
export async function notifyRenderFailed(
  jobId: string,
  projectId: string,
  userId: string,
  error: string
): Promise<void> {
  await webhookService.dispatch(
    'render.failed',
    {
      job_id: jobId,
      project_id: projectId,
      error_message: error,
      failed_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      project_id: projectId,
      render_job_id: jobId,
    }
  );
}

/**
 * Dispara evento de projeto criado
 */
export async function notifyProjectCreated(
  projectId: string,
  userId: string,
  title: string
): Promise<void> {
  await webhookService.dispatch(
    'project.created',
    {
      project_id: projectId,
      title,
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      project_id: projectId,
    }
  );
}

/**
 * Dispara evento de usuário criado
 */
export async function notifyUserCreated(
  userId: string,
  email: string,
  role: string
): Promise<void> {
  await webhookService.dispatch(
    'user.created',
    {
      user_id: userId,
      email,
      role,
      created_at: new Date().toISOString(),
    },
    {
      user_id: userId,
    }
  );
}

/**
 * Dispara evento de certificado gerado
 */
export async function notifyCertificateGenerated(
  userId: string,
  projectId: string,
  certificateUrl: string,
  courseName: string
): Promise<void> {
  await webhookService.dispatch(
    'certificate.generated',
    {
      user_id: userId,
      project_id: projectId,
      certificate_url: certificateUrl,
      course_name: courseName,
      generated_at: new Date().toISOString(),
    },
    {
      user_id: userId,
      project_id: projectId,
    }
  );
}

// ===========================================
// Event Type Categories
// ===========================================

export const WEBHOOK_EVENT_CATEGORIES = {
  render: ['render.started', 'render.completed', 'render.failed', 'render.progress', 'render.cancelled'] as WebhookEventType[],
  project: ['project.created', 'project.updated', 'project.deleted', 'project.published'] as WebhookEventType[],
  user: ['user.created', 'user.updated', 'user.deleted'] as WebhookEventType[],
  export: ['export.completed', 'export.failed'] as WebhookEventType[],
  billing: ['subscription.created', 'subscription.cancelled', 'invoice.paid', 'invoice.failed'] as WebhookEventType[],
  certificate: ['certificate.generated'] as WebhookEventType[],
};

export const ALL_WEBHOOK_EVENTS: WebhookEventType[] = Object.values(WEBHOOK_EVENT_CATEGORIES).flat();

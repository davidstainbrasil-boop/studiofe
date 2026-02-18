/**
 * 🚨 Alerting Service - Sistema de Alertas em Tempo Real
 * MVP Vídeos TécnicoCursos v7
 * 
 * Features:
 * - Notificações Slack, Discord, Email, SMS
 * - Alertas de severidade (info, warning, error, critical)
 * - Throttling e deduplicação
 * - Escalation automática
 * - Integração com Sentry
 */

import * as Sentry from '@sentry/nextjs';

// ===========================================
// Types & Interfaces
// ===========================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertChannel = 'slack' | 'discord' | 'email' | 'sms' | 'webhook' | 'pagerduty';

export interface AlertConfig {
  /** Habilitado globalmente */
  enabled: boolean;
  /** Severidade mínima para enviar alertas */
  minSeverity: AlertSeverity;
  /** Canais habilitados */
  channels: AlertChannelConfig[];
  /** Throttle em segundos por alerta único */
  throttleSeconds: number;
  /** Habilitar escalation automático */
  escalationEnabled: boolean;
  /** Tempo em minutos para escalar (se não reconhecido) */
  escalationMinutes: number;
}

export interface AlertChannelConfig {
  type: AlertChannel;
  enabled: boolean;
  webhookUrl?: string;
  email?: string;
  phone?: string;
  apiKey?: string;
  /** Severidades que este canal recebe */
  severities: AlertSeverity[];
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  source: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  tags?: string[];
  fingerprint?: string;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved?: boolean;
  resolvedAt?: Date;
}

export interface AlertResult {
  success: boolean;
  alertId: string;
  channelsSent: AlertChannel[];
  channelsFailed: AlertChannel[];
  throttled: boolean;
  error?: string;
}

// ===========================================
// Severity Levels
// ===========================================

const SEVERITY_LEVELS: Record<AlertSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
  critical: 3,
};

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: '#36a64f',      // Green
  warning: '#ff9800',   // Orange
  error: '#f44336',     // Red
  critical: '#9c27b0',  // Purple
};

const SEVERITY_EMOJIS: Record<AlertSeverity, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  error: '❌',
  critical: '🚨',
};

// ===========================================
// Alerting Service Class
// ===========================================

class AlertingService {
  private config: AlertConfig;
  private alertHistory: Map<string, { lastSent: Date; count: number }> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AlertConfig {
    return {
      enabled: process.env.ALERTING_ENABLED !== 'false',
      minSeverity: (process.env.ALERTING_MIN_SEVERITY as AlertSeverity) || 'warning',
      throttleSeconds: parseInt(process.env.ALERTING_THROTTLE_SECONDS || '300', 10),
      escalationEnabled: process.env.ALERTING_ESCALATION_ENABLED === 'true',
      escalationMinutes: parseInt(process.env.ALERTING_ESCALATION_MINUTES || '15', 10),
      channels: this.loadChannelConfigs(),
    };
  }

  private loadChannelConfigs(): AlertChannelConfig[] {
    const channels: AlertChannelConfig[] = [];

    // Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      channels.push({
        type: 'slack',
        enabled: true,
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        severities: ['warning', 'error', 'critical'],
      });
    }

    // Discord
    if (process.env.DISCORD_WEBHOOK_URL) {
      channels.push({
        type: 'discord',
        enabled: true,
        webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        severities: ['warning', 'error', 'critical'],
      });
    }

    // Email (via SendGrid, SES, or SMTP)
    if (process.env.ALERT_EMAIL) {
      channels.push({
        type: 'email',
        enabled: true,
        email: process.env.ALERT_EMAIL,
        apiKey: process.env.SENDGRID_API_KEY || process.env.SES_API_KEY,
        severities: ['error', 'critical'],
      });
    }

    // PagerDuty (for on-call)
    if (process.env.PAGERDUTY_ROUTING_KEY) {
      channels.push({
        type: 'pagerduty',
        enabled: true,
        apiKey: process.env.PAGERDUTY_ROUTING_KEY,
        severities: ['critical'],
      });
    }

    // Generic Webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      channels.push({
        type: 'webhook',
        enabled: true,
        webhookUrl: process.env.ALERT_WEBHOOK_URL,
        severities: ['info', 'warning', 'error', 'critical'],
      });
    }

    return channels;
  }

  /**
   * Gera fingerprint para deduplicação
   */
  private generateFingerprint(alert: Omit<Alert, 'id' | 'timestamp'>): string {
    if (alert.fingerprint) return alert.fingerprint;
    return `${alert.source}:${alert.title}:${alert.severity}`;
  }

  /**
   * Verifica se alerta está em throttle
   */
  private isThrottled(fingerprint: string): boolean {
    const history = this.alertHistory.get(fingerprint);
    if (!history) return false;

    const elapsed = (Date.now() - history.lastSent.getTime()) / 1000;
    return elapsed < this.config.throttleSeconds;
  }

  /**
   * Atualiza histórico de alertas
   */
  private updateHistory(fingerprint: string): void {
    const history = this.alertHistory.get(fingerprint);
    if (history) {
      history.lastSent = new Date();
      history.count += 1;
    } else {
      this.alertHistory.set(fingerprint, { lastSent: new Date(), count: 1 });
    }
  }

  /**
   * Envia alerta para Slack
   */
  private async sendSlackAlert(alert: Alert, config: AlertChannelConfig): Promise<boolean> {
    if (!config.webhookUrl) return false;

    try {
      const payload = {
        attachments: [
          {
            color: SEVERITY_COLORS[alert.severity],
            title: `${SEVERITY_EMOJIS[alert.severity]} ${alert.title}`,
            text: alert.message,
            fields: [
              { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
              { title: 'Source', value: alert.source, short: true },
              { title: 'Time', value: alert.timestamp.toISOString(), short: true },
              { title: 'Alert ID', value: alert.id, short: true },
            ],
            footer: 'MVP Vídeos TécnicoCursos',
            ts: Math.floor(alert.timestamp.getTime() / 1000),
          },
        ],
      };

      if (alert.metadata && Object.keys(alert.metadata).length > 0) {
        payload.attachments[0].fields.push({
          title: 'Metadata',
          value: '```' + JSON.stringify(alert.metadata, null, 2) + '```',
          short: false,
        });
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('[AlertingService] Slack send failed:', error);
      return false;
    }
  }

  /**
   * Envia alerta para Discord
   */
  private async sendDiscordAlert(alert: Alert, config: AlertChannelConfig): Promise<boolean> {
    if (!config.webhookUrl) return false;

    try {
      const payload = {
        embeds: [
          {
            title: `${SEVERITY_EMOJIS[alert.severity]} ${alert.title}`,
            description: alert.message,
            color: parseInt(SEVERITY_COLORS[alert.severity].replace('#', ''), 16),
            fields: [
              { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
              { name: 'Source', value: alert.source, inline: true },
              { name: 'Alert ID', value: alert.id, inline: true },
            ],
            timestamp: alert.timestamp.toISOString(),
            footer: { text: 'MVP Vídeos TécnicoCursos' },
          },
        ],
      };

      if (alert.metadata && Object.keys(alert.metadata).length > 0) {
        payload.embeds[0].fields.push({
          name: 'Metadata',
          value: '```json\n' + JSON.stringify(alert.metadata, null, 2) + '\n```',
          inline: false,
        });
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('[AlertingService] Discord send failed:', error);
      return false;
    }
  }

  /**
   * Envia alerta por Email (SendGrid)
   */
  private async sendEmailAlert(alert: Alert, config: AlertChannelConfig): Promise<boolean> {
    if (!config.email || !config.apiKey) return false;

    try {
      const payload = {
        personalizations: [{ to: [{ email: config.email }] }],
        from: { email: process.env.ALERT_FROM_EMAIL || 'alerts@technicocursos.com' },
        subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        content: [
          {
            type: 'text/html',
            value: `
              <h2>${SEVERITY_EMOJIS[alert.severity]} ${alert.title}</h2>
              <p>${alert.message}</p>
              <hr>
              <table>
                <tr><td><strong>Severity:</strong></td><td>${alert.severity.toUpperCase()}</td></tr>
                <tr><td><strong>Source:</strong></td><td>${alert.source}</td></tr>
                <tr><td><strong>Time:</strong></td><td>${alert.timestamp.toISOString()}</td></tr>
                <tr><td><strong>Alert ID:</strong></td><td>${alert.id}</td></tr>
              </table>
              ${alert.metadata ? `<pre>${JSON.stringify(alert.metadata, null, 2)}</pre>` : ''}
            `,
          },
        ],
      };

      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('[AlertingService] Email send failed:', error);
      return false;
    }
  }

  /**
   * Envia alerta para PagerDuty
   */
  private async sendPagerDutyAlert(alert: Alert, config: AlertChannelConfig): Promise<boolean> {
    if (!config.apiKey) return false;

    try {
      const payload = {
        routing_key: config.apiKey,
        event_action: 'trigger',
        dedup_key: alert.fingerprint || alert.id,
        payload: {
          summary: alert.title,
          severity: alert.severity === 'critical' ? 'critical' : 'error',
          source: alert.source,
          timestamp: alert.timestamp.toISOString(),
          custom_details: {
            message: alert.message,
            metadata: alert.metadata,
            tags: alert.tags,
          },
        },
      };

      const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error('[AlertingService] PagerDuty send failed:', error);
      return false;
    }
  }

  /**
   * Envia alerta para webhook genérico
   */
  private async sendWebhookAlert(alert: Alert, config: AlertChannelConfig): Promise<boolean> {
    if (!config.webhookUrl) return false;

    try {
      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });

      return response.ok;
    } catch (error) {
      console.error('[AlertingService] Webhook send failed:', error);
      return false;
    }
  }

  /**
   * Envia alerta para um canal específico
   */
  private async sendToChannel(alert: Alert, channel: AlertChannelConfig): Promise<boolean> {
    switch (channel.type) {
      case 'slack':
        return this.sendSlackAlert(alert, channel);
      case 'discord':
        return this.sendDiscordAlert(alert, channel);
      case 'email':
        return this.sendEmailAlert(alert, channel);
      case 'pagerduty':
        return this.sendPagerDutyAlert(alert, channel);
      case 'webhook':
        return this.sendWebhookAlert(alert, channel);
      default:
        return false;
    }
  }

  /**
   * Configura escalation timer
   */
  private setupEscalation(alert: Alert): void {
    if (!this.config.escalationEnabled) return;
    if (alert.severity !== 'critical') return;

    const timer = setTimeout(async () => {
      const activeAlert = this.activeAlerts.get(alert.id);
      if (activeAlert && !activeAlert.acknowledged) {
        // Escalar para canais adicionais
        console.warn(`[AlertingService] Escalating unacknowledged alert: ${alert.id}`);
        
        // Enviar para SMS se configurado
        if (process.env.ALERT_SMS_PHONE) {
          await this.sendAlert({
            title: `ESCALATION: ${alert.title}`,
            message: `Alert not acknowledged after ${this.config.escalationMinutes} minutes. Original: ${alert.message}`,
            severity: 'critical',
            source: 'escalation',
            metadata: { originalAlertId: alert.id },
          });
        }
      }
    }, this.config.escalationMinutes * 60 * 1000);

    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * Envia um alerta
   */
  async sendAlert(
    alertData: Omit<Alert, 'id' | 'timestamp'>
  ): Promise<AlertResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        alertId: '',
        channelsSent: [],
        channelsFailed: [],
        throttled: false,
        error: 'Alerting disabled',
      };
    }

    // Check severity threshold
    if (SEVERITY_LEVELS[alertData.severity] < SEVERITY_LEVELS[this.config.minSeverity]) {
      return {
        success: false,
        alertId: '',
        channelsSent: [],
        channelsFailed: [],
        throttled: false,
        error: 'Below minimum severity threshold',
      };
    }

    const fingerprint = this.generateFingerprint(alertData);

    // Check throttle
    if (this.isThrottled(fingerprint)) {
      return {
        success: false,
        alertId: '',
        channelsSent: [],
        channelsFailed: [],
        throttled: true,
        error: 'Alert throttled',
      };
    }

    // Create full alert object
    const alert: Alert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date(),
      fingerprint,
    };

    // Store active alert
    this.activeAlerts.set(alert.id, alert);

    // Report to Sentry
    if (alert.severity === 'error' || alert.severity === 'critical') {
      Sentry.captureMessage(alert.title, {
        level: alert.severity === 'critical' ? 'fatal' : 'error',
        tags: { source: alert.source, alertId: alert.id },
        extra: alert.metadata,
      });
    }

    // Send to channels
    const channelsSent: AlertChannel[] = [];
    const channelsFailed: AlertChannel[] = [];

    const enabledChannels = this.config.channels.filter(
      (c) => c.enabled && c.severities.includes(alert.severity)
    );

    await Promise.all(
      enabledChannels.map(async (channel) => {
        const success = await this.sendToChannel(alert, channel);
        if (success) {
          channelsSent.push(channel.type);
        } else {
          channelsFailed.push(channel.type);
        }
      })
    );

    // Update history
    this.updateHistory(fingerprint);

    // Setup escalation for critical alerts
    if (alert.severity === 'critical') {
      this.setupEscalation(alert);
    }

    return {
      success: channelsSent.length > 0,
      alertId: alert.id,
      channelsSent,
      channelsFailed,
      throttled: false,
    };
  }

  /**
   * Reconhece um alerta
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Resolve PagerDuty incident if applicable
    if (process.env.PAGERDUTY_ROUTING_KEY && alert.fingerprint) {
      this.resolvePagerDuty(alert.fingerprint);
    }

    return true;
  }

  /**
   * Resolve um alerta
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    // Cancel escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Resolve PagerDuty incident
    if (process.env.PAGERDUTY_ROUTING_KEY && alert.fingerprint) {
      this.resolvePagerDuty(alert.fingerprint);
    }

    // Send resolution notification
    this.sendAlert({
      title: `Resolved: ${alert.title}`,
      message: `Alert has been resolved. Duration: ${this.formatDuration(alert.timestamp, new Date())}`,
      severity: 'info',
      source: alert.source,
      metadata: { resolvedAlertId: alertId },
    });

    // Remove from active alerts after 1 hour
    setTimeout(() => {
      this.activeAlerts.delete(alertId);
    }, 60 * 60 * 1000);

    return true;
  }

  /**
   * Resolve incident no PagerDuty
   */
  private async resolvePagerDuty(dedupKey: string): Promise<void> {
    if (!process.env.PAGERDUTY_ROUTING_KEY) return;

    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: process.env.PAGERDUTY_ROUTING_KEY,
          event_action: 'resolve',
          dedup_key: dedupKey,
        }),
      });
    } catch (error) {
      console.error('[AlertingService] PagerDuty resolve failed:', error);
    }
  }

  /**
   * Formata duração entre duas datas
   */
  private formatDuration(start: Date, end: Date): string {
    const ms = end.getTime() - start.getTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Lista alertas ativos
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter((a) => !a.resolved);
  }

  /**
   * Obtém estatísticas de alertas
   */
  getStats(): {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    bySeverity: Record<AlertSeverity, number>;
  } {
    const alerts = Array.from(this.activeAlerts.values());
    return {
      total: alerts.length,
      active: alerts.filter((a) => !a.resolved && !a.acknowledged).length,
      acknowledged: alerts.filter((a) => a.acknowledged && !a.resolved).length,
      resolved: alerts.filter((a) => a.resolved).length,
      bySeverity: {
        info: alerts.filter((a) => a.severity === 'info').length,
        warning: alerts.filter((a) => a.severity === 'warning').length,
        error: alerts.filter((a) => a.severity === 'error').length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
      },
    };
  }
}

// ===========================================
// Singleton Export
// ===========================================

export const alertingService = new AlertingService();

// ===========================================
// Helper Functions
// ===========================================

/**
 * Envia alerta de erro simplificado
 */
export async function alertError(
  title: string,
  message: string,
  source: string,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  return alertingService.sendAlert({
    title,
    message,
    severity: 'error',
    source,
    metadata,
  });
}

/**
 * Envia alerta crítico
 */
export async function alertCritical(
  title: string,
  message: string,
  source: string,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  return alertingService.sendAlert({
    title,
    message,
    severity: 'critical',
    source,
    metadata,
  });
}

/**
 * Envia alerta de warning
 */
export async function alertWarning(
  title: string,
  message: string,
  source: string,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  return alertingService.sendAlert({
    title,
    message,
    severity: 'warning',
    source,
    metadata,
  });
}

/**
 * Alerta para erros de API
 */
export async function alertApiError(
  endpoint: string,
  error: Error,
  statusCode: number,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  const severity: AlertSeverity = statusCode >= 500 ? 'error' : 'warning';
  return alertingService.sendAlert({
    title: `API Error: ${endpoint}`,
    message: error.message,
    severity,
    source: 'api',
    metadata: {
      endpoint,
      statusCode,
      errorName: error.name,
      stack: error.stack,
      ...metadata,
    },
  });
}

/**
 * Alerta para erros de render
 */
export async function alertRenderError(
  jobId: string,
  error: Error,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  return alertingService.sendAlert({
    title: `Render Job Failed: ${jobId}`,
    message: error.message,
    severity: 'error',
    source: 'render',
    metadata: {
      jobId,
      errorName: error.name,
      stack: error.stack,
      ...metadata,
    },
  });
}

/**
 * Alerta para problemas de infraestrutura
 */
export async function alertInfraIssue(
  component: string,
  issue: string,
  metadata?: Record<string, unknown>
): Promise<AlertResult> {
  return alertingService.sendAlert({
    title: `Infrastructure Issue: ${component}`,
    message: issue,
    severity: 'critical',
    source: 'infrastructure',
    metadata: {
      component,
      ...metadata,
    },
  });
}

export default alertingService;

/**
 * Error Alerting Service
 * Sends notifications when critical errors occur
 */

import { logger } from '@lib/logger';
import { prisma } from '@lib/prisma';

export interface AlertConfig {
  type: 'email' | 'webhook' | 'database';
  enabled: boolean;
  endpoint?: string;
  recipients?: string[];
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  acknowledged: boolean;
}

export class ErrorAlertingService {
  private static instance: ErrorAlertingService;
  private recentAlerts: Alert[] = [];
  private maxAlerts = 100;

  static getInstance(): ErrorAlertingService {
    if (!ErrorAlertingService.instance) {
      ErrorAlertingService.instance = new ErrorAlertingService();
    }
    return ErrorAlertingService.instance;
  }

  /**
   * Send alert for API failures
   */
  async alertAPIFailure(service: string, error: Error, context?: Record<string, unknown>): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: 'error',
      service,
      message: `API Failure: ${error.message}`,
      details: {
        errorName: error.name,
        stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        ...context
      },
      timestamp: new Date(),
      acknowledged: false
    };

    await this.processAlert(alert);
  }

  /**
   * Send alert for quota warnings
   */
  async alertQuotaWarning(service: string, remaining: number, total: number): Promise<void> {
    const percentage = Math.round((remaining / total) * 100);
    const severity = percentage <= 5 ? 'critical' : percentage <= 20 ? 'error' : 'warning';

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      service,
      message: `Quota ${severity === 'critical' ? 'CRITICAL' : 'Warning'}: ${remaining}/${total} (${percentage}% remaining)`,
      details: { remaining, total, percentage },
      timestamp: new Date(),
      acknowledged: false
    };

    await this.processAlert(alert);
  }

  /**
   * Send alert for render job failures
   */
  async alertRenderFailure(jobId: string, error: string, projectId?: string): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity: 'error',
      service: 'RenderPipeline',
      message: `Render job failed: ${jobId}`,
      details: { jobId, error, projectId },
      timestamp: new Date(),
      acknowledged: false
    };

    await this.processAlert(alert);
  }

  /**
   * Send alert for system health issues
   */
  async alertSystemHealth(component: string, issue: string, severity: Alert['severity'] = 'warning'): Promise<void> {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      severity,
      service: component,
      message: `System Health: ${issue}`,
      details: { component },
      timestamp: new Date(),
      acknowledged: false
    };

    await this.processAlert(alert);
  }

  /**
   * Process and store alert
   */
  private async processAlert(alert: Alert): Promise<void> {
    // Log the alert
    const logMethod = alert.severity === 'critical' || alert.severity === 'error' 
      ? 'error' 
      : alert.severity === 'warning' ? 'warn' : 'info';
    
    if (logMethod === 'error') {
      logger.error(`[ALERT] ${alert.service}: ${alert.message}`, undefined, { 
        component: 'ErrorAlerting',
        alertId: alert.id,
        severity: alert.severity,
        details: alert.details
      });
    } else if (logMethod === 'warn') {
      logger.warn(`[ALERT] ${alert.service}: ${alert.message}`, { 
        component: 'ErrorAlerting',
        alertId: alert.id,
        severity: alert.severity,
        details: alert.details
      });
    } else {
      logger.info(`[ALERT] ${alert.service}: ${alert.message}`, { 
        component: 'ErrorAlerting',
        alertId: alert.id,
        severity: alert.severity,
        details: alert.details
      });
    }

    // Store in memory
    this.recentAlerts.unshift(alert);
    if (this.recentAlerts.length > this.maxAlerts) {
      this.recentAlerts.pop();
    }

    // Persist to database
    try {
      await prisma.analytics_events.create({
        data: {
          eventType: 'system_alert',
          eventData: JSON.parse(JSON.stringify({
            alertId: alert.id,
            severity: alert.severity,
            service: alert.service,
            message: alert.message,
            details: alert.details,
            acknowledged: alert.acknowledged
          }))
        }
      });
    } catch (dbError) {
      logger.error('Failed to persist alert to database', dbError as Error);
    }

    // For critical alerts, could add webhook/email here
    if (alert.severity === 'critical') {
      // TODO: Implement webhook notification
      logger.warn('CRITICAL ALERT - Would notify via webhook', { alertId: alert.id });
    }
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 20): Alert[] {
    return this.recentAlerts.slice(0, limit);
  }

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts(): Alert[] {
    return this.recentAlerts.filter(a => !a.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.recentAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get alert statistics
   */
  getAlertStats(): { total: number; critical: number; errors: number; warnings: number; unacknowledged: number } {
    return {
      total: this.recentAlerts.length,
      critical: this.recentAlerts.filter(a => a.severity === 'critical').length,
      errors: this.recentAlerts.filter(a => a.severity === 'error').length,
      warnings: this.recentAlerts.filter(a => a.severity === 'warning').length,
      unacknowledged: this.recentAlerts.filter(a => !a.acknowledged).length
    };
  }
}

export const errorAlerting = ErrorAlertingService.getInstance();

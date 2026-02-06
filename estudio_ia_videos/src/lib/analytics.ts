/**
 * Analytics Service Module
 * Handles tracking and analytics with REAL backend integration
 * 
 * Uses the analytics metrics system for persistent tracking
 */

import { Analytics as RealAnalytics } from './analytics/analytics';
import { metricsSystem } from './analytics/analytics-metrics-system';
import { logger } from './logger';

export interface AnalyticsEvent {
  name: string;
  category: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface PageView {
  path: string;
  title?: string;
  referrer?: string;
  userId?: string;
  sessionId?: string;
}

export interface UserIdentity {
  userId: string;
  email?: string;
  name?: string;
  traits?: Record<string, unknown>;
}

class AnalyticsService {
  private isInitialized = false;
  private userId?: string;
  private sessionId?: string;
  private debug = false;

  init(options: { apiKey?: string; debug?: boolean } = {}): void {
    this.debug = options.debug || false;
    this.isInitialized = true;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.debug) {
      logger.info('Analytics initialized', { sessionId: this.sessionId });
    }
  }

  identify(identity: UserIdentity): void {
    if (!this.isInitialized) {
      this.init();
    }
    this.userId = identity.userId;
    
    // Track user identification
    RealAnalytics.trackEvent('user_identified', {
      userId: identity.userId,
      email: identity.email,
      name: identity.name,
      ...identity.traits
    });
    
    if (this.debug) {
      logger.info('User identified', { userId: identity.userId });
    }
  }

  track(event: AnalyticsEvent): void {
    if (!this.isInitialized) {
      this.init();
    }
    
    // Use real analytics backend
    RealAnalytics.trackEvent(event.name, {
      category: event.category,
      ...event.properties,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: (event.timestamp || new Date()).toISOString()
    });
    
    if (this.debug) {
      logger.info('Event tracked', { event: event.name, category: event.category });
    }
  }

  page(pageView: PageView): void {
    if (!this.isInitialized) {
      this.init();
    }
    
    // Track page view as event
    RealAnalytics.trackEvent('page_view', {
      path: pageView.path,
      title: pageView.title,
      referrer: pageView.referrer,
      userId: this.userId,
      sessionId: this.sessionId
    });
    
    if (this.debug) {
      logger.info('Page view tracked', { path: pageView.path });
    }
  }

  trackEvent(name: string, properties?: Record<string, unknown>): void {
    this.track({
      name,
      category: 'general',
      properties
    });
  }

  trackError(error: Error, context?: Record<string, unknown>): void {
    this.track({
      name: 'error',
      category: 'error',
      properties: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    });
  }

  trackTiming(category: string, variable: string, value: number): void {
    this.track({
      name: 'timing',
      category,
      properties: {
        variable,
        value
      }
    });
  }

  // Real metrics access
  async getMetrics(filters: { startDate?: Date; endDate?: Date; eventTypes?: string[] } = {}) {
    return metricsSystem.getMetrics(filters);
  }

  reset(): void {
    this.userId = undefined;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    if (this.debug) {
      logger.info('Analytics session reset', { newSessionId: this.sessionId });
    }
  }
}

export const analytics = new AnalyticsService();

export function trackEvent(name: string, properties?: Record<string, unknown>): void {
  analytics.trackEvent(name, properties);
}

export function trackPage(path: string, title?: string): void {
  analytics.page({ path, title });
}

export default analytics;

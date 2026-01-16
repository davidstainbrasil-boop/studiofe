/**
 * 📈 Telemetry Service
 * User action tracking and analytics aggregation
 */

import { prisma } from '@lib/prisma';
import { logger } from '@lib/logger';

export enum TelemetryEvent {
  // User actions
  USER_SIGNED_UP = 'user.signed_up',
  USER_LOGGED_IN = 'user.logged_in',
  
  // Project actions
  PROJECT_CREATED = 'project.created',
  PROJECT_DELETED = 'project.deleted',
  PROJECT_SHARED = 'project.shared',
  
  // Video actions
  VIDEO_EXPORTED = 'video.exported',
  VIDEO_EXPORT_FAILED = 'video.export_failed',
  
  // Editor actions
  ELEMENT_ADDED = 'editor.element_added',
  TEMPLATE_APPLIED = 'editor.template_applied',
  
  // Feature usage
  AI_VOICE_USED = 'feature.ai_voice',
  AI_AVATAR_USED = 'feature.ai_avatar',
  COLLABORATION_STARTED = 'feature.collaboration'
}

interface TelemetryPayload {
  event: TelemetryEvent;
  userId?: string;
  projectId?: string;
  properties?: Record<string, unknown>;
}

/**
 * Track a telemetry event
 */
export async function trackEvent(payload: TelemetryPayload): Promise<void> {
  try {
    await prisma.analytics_events.create({
      data: {
        userId: payload.userId,
        eventType: payload.event,
        eventData: {
          projectId: payload.projectId,
          ...payload.properties,
          timestamp: new Date().toISOString()
        }
      }
    });

    logger.debug(`Telemetry: ${payload.event}`, {
      component: 'TelemetryService',
      userId: payload.userId
    });
  } catch (error) {
    // Don't throw - telemetry should not break the app
    logger.warn('Telemetry tracking failed', {
      component: 'TelemetryService',
      event: payload.event,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Get daily active users count
 */
export async function getDailyActiveUsers(date?: Date): Promise<number> {
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await prisma.analytics_events.groupBy({
    by: ['userId'],
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay
      },
      userId: { not: null }
    }
  });

  return result.length;
}

/**
 * Get event counts for a time period
 */
export async function getEventCounts(
  startDate: Date,
  endDate: Date,
  eventTypes?: TelemetryEvent[]
): Promise<Record<string, number>> {
  const where: Record<string, unknown> = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (eventTypes && eventTypes.length > 0) {
    where.eventType = { in: eventTypes };
  }

  const results = await prisma.analytics_events.groupBy({
    by: ['eventType'],
    where,
    _count: { id: true }
  });

  const counts: Record<string, number> = {};
  for (const result of results) {
    counts[result.eventType] = result._count.id;
  }

  return counts;
}

/**
 * Get user activity summary
 */
export async function getUserActivitySummary(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalEvents, projectsCreated, videosExported] = await Promise.all([
    prisma.analytics_events.count({
      where: {
        userId,
        createdAt: { gte: startDate }
      }
    }),
    prisma.analytics_events.count({
      where: {
        userId,
        eventType: TelemetryEvent.PROJECT_CREATED,
        createdAt: { gte: startDate }
      }
    }),
    prisma.analytics_events.count({
      where: {
        userId,
        eventType: TelemetryEvent.VIDEO_EXPORTED,
        createdAt: { gte: startDate }
      }
    })
  ]);

  return {
    totalEvents,
    projectsCreated,
    videosExported,
    periodDays: days
  };
}

/**
 * Track error for monitoring
 */
export async function trackError(
  error: Error,
  context?: {
    userId?: string;
    component?: string;
    action?: string;
  }
): Promise<void> {
  try {
    await prisma.analytics_events.create({
      data: {
        userId: context?.userId,
        eventType: 'error.occurred',
        eventData: {
          message: error.message,
          stack: error.stack?.slice(0, 1000), // Limit stack trace length
          component: context?.component,
          action: context?.action,
          timestamp: new Date().toISOString()
        }
      }
    });

    // Also log with Sentry if available
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context });
    }
  } catch (err) {
    logger.error('Failed to track error', err instanceof Error ? err : new Error(String(err)));
  }
}

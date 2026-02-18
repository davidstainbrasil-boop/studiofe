import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface NotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Create a notification using the proper Notification model.
 * Has indexed `read` field and proper query performance.
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data ?? {},
      },
    });
  } catch (error) {
    logger.warn('Failed to create notification', {
      userId: payload.userId,
      type: payload.type,
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

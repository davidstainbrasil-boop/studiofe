/**
 * Temporary type augmentation for the Notification model.
 *
 * The Notification model exists in prisma/schema.prisma (line 304) but the
 * generated Prisma client hasn't been regenerated since it was added.
 * This declaration merging provides type safety until the client is regenerated.
 *
 * SETUP REQUIRED: cd mvp && npx prisma generate
 * After running the command above, DELETE this file — the generated client
 * will include proper Notification types and this augmentation becomes redundant.
 */
import type { Prisma } from '@prisma/client';

/** Shape of a Notification record as defined in schema.prisma */
interface NotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: Prisma.JsonValue;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

/** Minimal delegate interface matching Prisma's generated pattern */
interface NotificationDelegate {
  findMany(args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown> | Record<string, unknown>[];
    take?: number;
    skip?: number;
    select?: Record<string, boolean | Record<string, unknown>>;
  }): Promise<NotificationRecord[]>;

  count(args?: {
    where?: Record<string, unknown>;
  }): Promise<number>;

  create(args: {
    data: Record<string, unknown>;
  }): Promise<NotificationRecord>;

  updateMany(args: {
    where?: Record<string, unknown>;
    data: Record<string, unknown>;
  }): Promise<{ count: number }>;

  deleteMany(args?: {
    where?: Record<string, unknown>;
  }): Promise<{ count: number }>;
}

declare module '@prisma/client' {
  interface PrismaClient {
    notification: NotificationDelegate;
  }
}

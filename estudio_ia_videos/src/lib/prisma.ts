/**
 * Prisma Client Instance
 * Cliente Prisma singleton para acesso ao banco
 * Optimized for serverless environments (Vercel)
 */

import { PrismaClient } from '@prisma/client';
import { cacheInvalidationMiddleware } from './prisma-middleware';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Serverless-optimized Prisma configuration
const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;
  return new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });
};

export const prisma = global.prisma || prismaClientSingleton();

// Apply cache invalidation middleware
prisma.$use(cacheInvalidationMiddleware);

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

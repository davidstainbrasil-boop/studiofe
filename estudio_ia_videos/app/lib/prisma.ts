/**
 * Prisma Client Instance
 * Cliente Prisma singleton para acesso ao banco
 */

import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient({
  log: ['error', 'warn'], // Disabled query logs for cleaner output
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

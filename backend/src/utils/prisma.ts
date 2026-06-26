import { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// ── Why this type alias exists ─────────────────────────────────
// PrismaClient infers which event names are valid for $on('error' | 'warn', ...)
// from the literal `log` array passed into `new PrismaClient({...})`. That
// inference only works when TypeScript can see the options object directly
// at the constructor call site. The moment the result is combined with
// something else of a *different* (or untyped) PrismaClient type — such as
// `globalForPrisma.prisma ?? new PrismaClient({...})` below — TypeScript
// widens the combined expression back to the base PrismaClient type, whose
// $on() event-name parameter defaults to `never`. That's the exact cause of
// TS2345 / TS2339 on prisma.$on('error', ...) and prisma.$on('warn', ...).
//
// Naming the type explicitly (AppPrismaClient) and giving the global cache
// variable that same explicit type keeps the literal `log` shape attached
// to both sides of the `??`, so inference for $on() survives the union.
type AppPrismaClient = PrismaClient<{
  log: [{ emit: 'event'; level: 'error' }, { emit: 'event'; level: 'warn' }];
}>;

const globalForPrisma = globalThis as unknown as {
  prisma: AppPrismaClient | undefined;
};

export const prisma: AppPrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn(`Prisma Warning: ${e.message}`);
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
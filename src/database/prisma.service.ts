import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService extends PrismaClient and hooks into NestJS lifecycle.
 *
 * DESIGN DECISIONS:
 *
 * 1. Singleton — Prisma manages its own connection pool. One client instance
 *    per process is correct. Never instantiate PrismaClient in services directly.
 *
 * 2. Soft-delete awareness — We don't auto-filter deleted_at here because
 *    Prisma middleware applies globally and can cause subtle bugs in admin
 *    queries. Instead, services explicitly filter `where: { deletedAt: null }`.
 *    This keeps queries readable and predictable.
 *
 * 3. Logging — In development, log slow queries (>100ms) so we catch N+1
 *    and missing indexes early. In production, only log errors.
 *
 * 4. $transaction helper — Exposed so services can use typed transactions
 *    without importing PrismaClient directly.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'event', level: 'error' },
              { emit: 'event', level: 'warn' },
            ]
          : [{ emit: 'event', level: 'error' }],
    });

    if (process.env.NODE_ENV === 'development') {
      // Log slow queries in development to catch performance issues early
      (this as any).$on('query', (e: { query: string; duration: number }) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }

    (this as any).$on('error', (e: { message: string }) => {
      this.logger.error('Prisma error', e.message);
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error; // Fail fast — app cannot run without DB
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Helper for interactive transactions with proper typing.
   * Use this in services that need to perform multiple operations atomically.
   *
   * Example:
   *   await this.prisma.runTransaction(async (tx) => {
   *     await tx.investment.create({ ... });
   *     await tx.idea.update({ ... }); // increment raised_amount atomically
   *   });
   */
  async runTransaction<T>(
    fn: (tx: Omit<PrismaService, 'runTransaction' | '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
    options?: Parameters<PrismaClient['$transaction']>[1],
  ): Promise<T> {
    return this.$transaction(fn as any, options) as unknown as Promise<T>;
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EmailOutboxStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppLogger } from '../../logger/app-logger.service';
import { EmailSenderService } from './email-sender.service';

const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;

@Injectable()
export class EmailWorkerService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: EmailSenderService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(EmailWorkerService.name);
  }

  onModuleInit(): void {
    this.recoverStuckJobs().then(() => {
      this.timer = setInterval(() => void this.processOutbox(), POLL_INTERVAL_MS);
      this.logger.log('Email worker started');
    });
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('Email worker stopped');
  }

  /**
   * Reset any rows left in PROCESSING from a previous crash so they are
   * retried on the next poll cycle.
   */
  private async recoverStuckJobs(): Promise<void> {
    const { count } = await this.prisma.emailOutbox.updateMany({
      where: { status: EmailOutboxStatus.PROCESSING },
      data: { status: EmailOutboxStatus.PENDING },
    });
    if (count > 0) {
      this.logger.warn(`Recovered ${count} stuck email job(s) from previous run`);
    }
  }

  private async processOutbox(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const claimed = await this.claimBatch();
      if (claimed.length === 0) return;

      this.logger.log(`Processing ${claimed.length} email(s)`);

      await Promise.allSettled(
        claimed.map((row) => this.processOne(row)),
      );
    } catch (err) {
      this.logger.error('Email worker poll error', (err as Error).message);
    } finally {
      this.running = false;
    }
  }

  /**
   * Atomically claim a batch: find PENDING rows and flip them to PROCESSING
   * inside a transaction so concurrent workers (future scale-out) cannot
   * double-process the same row.
   */
  private async claimBatch() {
    return this.prisma.runTransaction(async (tx) => {
      const rows = await tx.emailOutbox.findMany({
        where: {
          status: EmailOutboxStatus.PENDING,
          scheduledAt: { lte: new Date() },
          attempts: { lt: MAX_ATTEMPTS },
        },
        orderBy: { scheduledAt: 'asc' },
        take: BATCH_SIZE,
      });

      if (rows.length === 0) return [];

      await tx.emailOutbox.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: EmailOutboxStatus.PROCESSING },
      });

      return rows;
    });
  }

  private async processOne(row: Awaited<ReturnType<typeof this.claimBatch>>[number]): Promise<void> {
    try {
      await this.sender.send(row);
      await this.prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: EmailOutboxStatus.SENT,
          processedAt: new Date(),
        },
      });
    } catch (err) {
      const nextAttempts = row.attempts + 1;
      const failed = nextAttempts >= row.maxAttempts;

      // Exponential backoff: 2^attempt minutes (2m, 4m, 8m, …)
      const scheduledAt = new Date(Date.now() + Math.pow(2, nextAttempts) * 60_000);

      await this.prisma.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: failed ? EmailOutboxStatus.FAILED : EmailOutboxStatus.PENDING,
          attempts: nextAttempts,
          lastError: (err as Error).message,
          scheduledAt: failed ? row.scheduledAt : scheduledAt,
        },
      });

      this.logger.warn(
        failed
          ? `Email permanently failed after ${nextAttempts} attempts`
          : `Email attempt ${nextAttempts} failed, retrying at ${scheduledAt.toISOString()}`,
        { id: row.id, to: row.to, error: (err as Error).message },
      );
    }
  }
}

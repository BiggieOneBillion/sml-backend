import { Module } from '@nestjs/common';
import { AppLogger } from '../../logger/app-logger.service';
import { EmailOutboxService } from './email-outbox.service';
import { EmailSenderService } from './email-sender.service';
import { EmailWorkerService } from './email-worker.service';

@Module({
  providers: [
    AppLogger,
    EmailOutboxService,
    EmailSenderService,
    EmailWorkerService,
  ],
  exports: [EmailOutboxService],
})
export class EmailModule {}

import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailOutbox } from '@prisma/client';
import { AppConfigService } from '../../config/app-config.service';
import { AppLogger } from '../../logger/app-logger.service';
import { EmailTemplate } from './email-template.enum';
import { renderTemplate } from './templates/template.renderer';

@Injectable()
export class EmailSenderService {
  private readonly resend: Resend | null;

  constructor(
    private readonly config: AppConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(EmailSenderService.name);
    this.resend = config.email.apiKey ? new Resend(config.email.apiKey) : null;

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged only (dev mode)');
    }
  }

  async send(row: EmailOutbox): Promise<void> {
    const { subject, html } = renderTemplate(
      row.template as EmailTemplate,
      row.payload as Record<string, unknown> as any,
    );

    if (!this.resend) {
      this.logger.log(`[DEV] Email skipped (no API key) — to=${row.to} subject="${subject}"`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.config.email.from,
      to: row.to,
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    this.logger.log(`Email sent`, { to: row.to, template: row.template });
  }
}

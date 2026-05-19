import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailTemplate } from './email-template.enum';
import { renderTemplate } from './templates/template.renderer';

type TemplatePayloadMap = {
  [EmailTemplate.VERIFY_EMAIL]: Parameters<typeof renderTemplate<EmailTemplate.VERIFY_EMAIL>>[1];
  [EmailTemplate.WELCOME]: Parameters<typeof renderTemplate<EmailTemplate.WELCOME>>[1];
};

@Injectable()
export class EmailOutboxService {
  constructor(private readonly prisma: PrismaService) {}

  async queue<T extends EmailTemplate>(
    to: string,
    template: T,
    payload: TemplatePayloadMap[T],
  ): Promise<void> {
    const { subject } = renderTemplate(template, payload);
    await this.prisma.emailOutbox.create({
      data: { to, template, subject, payload: payload as object },
    });
  }

  /**
   * Use this overload inside a Prisma interactive transaction so the outbox
   * write is atomic with the business operation.
   *
   * Example:
   *   await prisma.runTransaction(async (tx) => {
   *     const user = await tx.user.create({ ... });
   *     await emailOutbox.queueInTx(tx, user.email, EmailTemplate.VERIFY_EMAIL, { ... });
   *   });
   */
  async queueInTx<T extends EmailTemplate>(
    tx: Omit<PrismaService, 'runTransaction' | '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>,
    to: string,
    template: T,
    payload: TemplatePayloadMap[T],
  ): Promise<void> {
    const { subject } = renderTemplate(template, payload);
    await tx.emailOutbox.create({
      data: { to, template, subject, payload: payload as object },
    });
  }
}

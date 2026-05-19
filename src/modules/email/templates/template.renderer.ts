import { EmailTemplate } from '../email-template.enum';
import { renderVerifyEmail, VerifyEmailPayload } from './verify-email.template';
import { renderWelcome, WelcomePayload } from './welcome.template';

type TemplatePayloadMap = {
  [EmailTemplate.VERIFY_EMAIL]: VerifyEmailPayload;
  [EmailTemplate.WELCOME]: WelcomePayload;
};

export function renderTemplate<T extends EmailTemplate>(
  template: T,
  payload: TemplatePayloadMap[T],
): { subject: string; html: string } {
  switch (template) {
    case EmailTemplate.VERIFY_EMAIL:
      return renderVerifyEmail(payload as VerifyEmailPayload);
    case EmailTemplate.WELCOME:
      return renderWelcome(payload as WelcomePayload);
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

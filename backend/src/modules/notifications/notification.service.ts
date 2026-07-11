import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      this.logger.warn(`RESEND_API_KEY not set — email not sent (subject: ${options.subject})`);
      return;
    }

    // No domain yet — Resend onboarding sender can only deliver to the account owner
    const html = `<div dir="rtl" style="font-family:Arial,sans-serif">${options.body.replace(/\n/g, '<br>')}</div>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'malka.develop3949@gmail.com',
        subject: options.subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Resend error ${res.status}: ${err}`);
    } else {
      this.logger.log(`Email sent via Resend, subject: ${options.subject}`);
    }
  }
}

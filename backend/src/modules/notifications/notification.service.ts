import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  text?: string;
  attachments?: { filename: string; content: string }[];
}

export function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F8FAFC">
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAFC">
  <tr><td align="center" style="padding:40px 16px;font-family:Arial,Helvetica,sans-serif;direction:rtl">
    <table cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
      <tr>
        <td bgcolor="#1E3A8A" style="border-radius:12px 12px 0 0;padding:24px 32px;text-align:center">
          <p style="margin:0;color:rgba(255,255,255,0.55);font-size:10px;letter-spacing:3px;font-family:Arial,sans-serif">HOTEL MANAGEMENT</p>
          <p style="margin:8px 0 0 0;color:#FFFFFF;font-size:21px;font-weight:bold;font-family:Arial,sans-serif">מערכת ניהול מלון</p>
        </td>
      </tr>
      <tr>
        <td bgcolor="#FFFFFF" style="padding:36px 32px;border-left:1px solid #E2E8F0;border-right:1px solid #E2E8F0;font-family:Arial,Helvetica,sans-serif">
          ${body}
        </td>
      </tr>
      <tr>
        <td bgcolor="#1E3A8A" style="border-radius:0 0 12px 12px;padding:16px 32px;text-align:center">
          <p style="margin:0;color:#93C5FD;font-size:12px;font-family:Arial,sans-serif">&#169; 2026 מערכת ניהול מלון &nbsp;|&nbsp; כל הזכויות שמורות</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
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

    const trimmed = options.body.trimStart();
    const isFullHtml = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html');
    const html = isFullHtml
      ? options.body
      : wrapEmailHtml(`<p style="color:#0F172A;font-size:15px;line-height:1.7;font-family:Arial,sans-serif">${options.body}</p>`);

    const payload: Record<string, unknown> = {
      from: 'onboarding@resend.dev',
      to: 'malka.develop3949@gmail.com',
      subject: options.subject,
      html,
    };

    if (options.text) payload['text'] = options.text;
    if (options.attachments?.length) payload['attachments'] = options.attachments;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Resend error ${res.status}: ${err}`);
    } else {
      this.logger.log(`Email sent via Resend, subject: ${options.subject}`);
    }
  }
}

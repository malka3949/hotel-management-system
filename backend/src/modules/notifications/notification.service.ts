import { Injectable, Logger } from '@nestjs/common';

export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
}

// Stub — real implementation added when email events are defined (Phase 5+)
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.logger.log(`[STUB] Email queued, subject: ${options.subject.slice(0, 30)}`);
  }
}

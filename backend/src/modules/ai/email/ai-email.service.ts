import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai.service';

interface ReservationContext {
  guestName: string;
  hotelName: string;
  roomType: string;
  roomNumber: string;
  checkInDate: Date;
  checkOutDate: Date;
  totalPrice: number;
}

@Injectable()
export class AiEmailService {
  private readonly logger = new Logger(AiEmailService.name);

  constructor(private ai: AiService) {}

  async draftWelcomeEmail(ctx: ReservationContext): Promise<string | null> {
    if (!this.ai.isAvailable()) return null;

    const nights = Math.ceil(
      (ctx.checkOutDate.getTime() - ctx.checkInDate.getTime()) / 86400000,
    );

    const prompt = `כתוב אימייל ברכה חם ומקצועי בעברית לאורח חדש של המלון.

פרטים:
- שם אורח: ${ctx.guestName}
- שם מלון: ${ctx.hotelName}
- סוג חדר: ${ctx.roomType}
- מספר חדר: ${ctx.roomNumber}
- צ'ק-אין: ${ctx.checkInDate.toLocaleDateString('he-IL')}
- צ'ק-אאוט: ${ctx.checkOutDate.toLocaleDateString('he-IL')}
- מספר לילות: ${nights}
- סה"כ: ₪${ctx.totalPrice.toLocaleString('he-IL')}

כתוב רק את גוף האימייל, ללא שורת נושא. סגנון חם, מקצועי, קצר (עד 150 מילה).`;

    try {
      const client = this.ai.getClient();
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock?.type === 'text' ? textBlock.text : null;
    } catch (err) {
      this.logger.warn('AI email draft failed', err);
      return null;
    }
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiService } from '../ai.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { GuestTokenPayload } from '../../guest-portal/interfaces/guest-token-payload.interface';

@Injectable()
export class ConciergeService {
  constructor(
    private ai: AiService,
    private prisma: PrismaService,
  ) {}

  async chat(payload: GuestTokenPayload, dto: ChatMessageDto): Promise<string> {
    if (!this.ai.isAvailable()) {
      throw new ServiceUnavailableException('AI_SERVICE_UNAVAILABLE');
    }

    const reservation = await this.prisma.reservation.findUnique({
      where: { id: payload.reservationId },
      select: {
        checkInDate: true,
        checkOutDate: true,
        branch: {
          select: { name: true, address: true },
        },
        room: {
          select: {
            number: true,
            roomType: { select: { name: true } },
          },
        },
      },
    });

    const hotelName = reservation?.branch?.name ?? 'המלון שלנו';
    const checkIn = reservation?.checkInDate?.toLocaleDateString('he-IL') ?? '';
    const checkOut = reservation?.checkOutDate?.toLocaleDateString('he-IL') ?? '';
    const roomType = reservation?.room?.roomType?.name ?? '';
    const roomNumber = reservation?.room?.number ?? '';

    const systemPrompt = `אתה עוזר קונסיירז' מנומס ומועיל של ${hotelName}, המופעל על-ידי בינה מלאכותית.
שירות זה אינו מייצג נציג אנושי.
אתה עונה בעברית בלבד, בסגנון חם ומקצועי.
פרטי האורח:
- חדר: ${roomNumber} (${roomType})
- צ'ק-אין: ${checkIn}
- צ'ק-אאוט: ${checkOut}

עזור לאורח בשאלות לגבי שירותי המלון, לוחות זמנים, המלצות מקומיות, ובקשות.
אל תתן מידע על מחירים ספציפיים שאינך בטוח בהם. אל תבטיח דברים שאינם בסמכותך.`;

    const history = (dto.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    return this.ai.chat(systemPrompt, history, dto.message);
  }
}

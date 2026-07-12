import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ConciergeService } from './concierge.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { GuestTokenGuard, GuestRequest } from '../../guest-portal/guards/guest-token.guard';

@Controller('v1/portal/concierge')
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class ConciergeController {
  constructor(private readonly conciergeService: ConciergeService) {}

  @Post(':token/chat')
  @UseGuards(GuestTokenGuard)
  async chat(@Req() req: GuestRequest, @Body() dto: ChatMessageDto) {
    const reply = await this.conciergeService.chat(req.guestToken, dto);
    return { success: true, data: { reply } };
  }
}

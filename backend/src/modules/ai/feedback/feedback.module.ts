import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AiModule } from '../ai.module';

@Module({
  imports: [PrismaModule, AiModule],
  providers: [FeedbackService],
  controllers: [FeedbackController],
})
export class FeedbackModule {}

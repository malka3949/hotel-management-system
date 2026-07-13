import { Global, Module } from '@nestjs/common';
import { CancellationResponseService } from './cancellation-response.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { NotificationModule } from '../../notifications/notification.module';
import { AiModule } from '../ai.module';

@Global()
@Module({
  imports: [PrismaModule, NotificationModule, AiModule],
  providers: [CancellationResponseService],
  exports: [CancellationResponseService],
})
export class CancellationResponseModule {}

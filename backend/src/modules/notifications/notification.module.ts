import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { N8nService } from './n8n.service';

@Global()
@Module({
  providers: [NotificationService, N8nService],
  exports: [NotificationService, N8nService],
})
export class NotificationModule {}

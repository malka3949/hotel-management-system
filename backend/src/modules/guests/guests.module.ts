import { Module } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { GuestsController } from './guests.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [GuestsService],
  controllers: [GuestsController],
  exports: [GuestsService],
})
export class GuestsModule {}

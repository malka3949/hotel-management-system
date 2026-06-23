import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';

@Module({
  imports: [CacheModule.register({ ttl: 30000 })],
  providers: [AvailabilityService],
  controllers: [AvailabilityController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BranchesModule } from './modules/branches/branches.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AvailabilityModule } from './modules/availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuditModule,
    NotificationModule,
    AuthModule,
    UsersModule,
    BranchesModule,
    RoomTypesModule,
    RoomsModule,
    GuestsModule,
    AvailabilityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

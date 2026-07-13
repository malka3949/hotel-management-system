import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { ResponseTimingMiddleware } from './middleware/response-timing.middleware';
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
import { ReservationsModule } from './modules/reservations/reservations.module';
import { CheckInModule } from './modules/check-in/check-in.module';
import { BillingModule } from './modules/billing/billing.module';
import { GuestPortalModule } from './modules/guest-portal/guest-portal.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiModule } from './modules/ai/ai.module';
import { DailyDigestModule } from './modules/ai/digest/daily-digest.module';
import { CancellationResponseModule } from './modules/ai/cancellation/cancellation-response.module';
import { StaffReminderModule } from './modules/ai/reminders/staff-reminder.module';
import { RoomUpgradeModule } from './modules/ai/upgrade/room-upgrade.module';

@Module({
  providers: [HealthService],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    ScheduleModule.forRoot(),
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
    ReservationsModule,
    CheckInModule,
    BillingModule,
    GuestPortalModule,
    HousekeepingModule,
    ReportsModule,
    AiModule,
    DailyDigestModule,
    CancellationResponseModule,
    StaffReminderModule,
    RoomUpgradeModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(RequestIdMiddleware, ResponseTimingMiddleware)
      .forRoutes('*');
  }
}

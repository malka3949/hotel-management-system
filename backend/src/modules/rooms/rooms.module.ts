import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomStatusGateway } from './room-status.gateway';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [RoomsService, RoomStatusGateway],
  controllers: [RoomsController],
  exports: [RoomsService, RoomStatusGateway],
})
export class RoomsModule {}

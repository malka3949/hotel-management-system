import { IsEnum } from 'class-validator';
import { RoomStatus, CleaningStatus } from '@prisma/client';

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus)
  status!: RoomStatus;
}

export class UpdateCleaningStatusDto {
  @IsEnum(CleaningStatus)
  cleaningStatus!: CleaningStatus;
}

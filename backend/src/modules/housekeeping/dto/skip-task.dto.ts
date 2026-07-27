import { IsString, MaxLength } from 'class-validator';

export class SkipHousekeepingTaskDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

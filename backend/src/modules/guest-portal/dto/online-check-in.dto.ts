import { IsString, IsOptional, IsEmail, Matches, MaxLength } from 'class-validator';

export class OnlineCheckInDto {
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @IsString()
  @MaxLength(50)
  passportId!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'estimatedArrivalTime must be HH:MM' })
  estimatedArrivalTime?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}

import {
  IsString,
  IsEmail,
  IsOptional,
  IsUUID,
  MinLength,
  MaxLength,
  IsISO8601,
  Matches,
} from 'class-validator';

export class CreateGuestDto {
  @IsUUID()
  @IsOptional()
  branchId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(30)
  phone!: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  passportId?: string;

  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z]{2}$/, { message: 'nationality must be ISO 3166-1 alpha-2 uppercase' })
  @IsOptional()
  nationality?: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  notes?: string;
}

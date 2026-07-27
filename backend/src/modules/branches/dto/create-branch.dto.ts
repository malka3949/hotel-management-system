import { IsString, IsEmail, IsOptional, IsUrl, IsArray, MinLength, MaxLength } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(5)
  address!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  coverPhoto?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsString()
  @MaxLength(5000)
  @IsOptional()
  cancellationPolicy?: string;
}

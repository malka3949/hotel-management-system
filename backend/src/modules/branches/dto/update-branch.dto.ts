import { IsString, IsEmail, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';

export class UpdateBranchDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  address?: string;

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
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @IsUrl()
  @IsOptional()
  coverPhoto?: string;
}

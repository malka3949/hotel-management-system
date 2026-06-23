import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

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

}

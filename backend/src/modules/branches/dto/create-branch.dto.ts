import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

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
}

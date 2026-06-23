import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

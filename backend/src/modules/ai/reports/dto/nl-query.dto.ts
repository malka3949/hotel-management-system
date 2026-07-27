import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class NlQueryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  query!: string;
}

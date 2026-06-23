import {
  IsEnum,
  IsString,
  IsOptional,
  IsISO8601,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { DocumentType } from '@prisma/client';

export class CreateGuestDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  documentNumber!: string;

  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Z]{2}$/, { message: 'issuingCountry must be ISO 3166-1 alpha-2 uppercase' })
  issuingCountry!: string;

  @IsISO8601({ strict: true })
  @IsOptional()
  expiryDate?: string;

  @IsISO8601()
  recordedAt!: string;
}

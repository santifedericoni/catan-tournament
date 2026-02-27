import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsEnum,
  IsDateString,
  IsUrl,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsArray,
} from 'class-validator';
import { TournamentFormat, TableGenerationMode } from '@catan/shared';

export class UpdateTournamentDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsInt()
  @Min(4)
  @Max(500)
  maxPlayers?: number;

  @IsOptional()
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiebreakerOrder?: string[];

  @IsOptional()
  @IsEnum(TableGenerationMode)
  tableGenerationMode?: TableGenerationMode;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sponsorName?: string;

  @IsOptional()
  @IsUrl()
  sponsorLogoUrl?: string;

  @IsOptional()
  @IsUrl()
  sponsorUrl?: string;
}

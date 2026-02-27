import { IsString, IsOptional, IsEnum, MaxLength, MinLength, IsArray } from 'class-validator';
import { TournamentFormat, TableGenerationMode } from '@catan/shared';

export class UpdateLeagueDto {
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
  @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tiebreakerOrder?: string[];

  @IsOptional()
  @IsEnum(TableGenerationMode)
  tableGenerationMode?: TableGenerationMode;
}

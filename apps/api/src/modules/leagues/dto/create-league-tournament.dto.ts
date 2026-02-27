import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateLeagueTournamentDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

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

  @IsDateString()
  startsAt: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsInt()
  @Min(4)
  @Max(500)
  maxPlayers: number;
}

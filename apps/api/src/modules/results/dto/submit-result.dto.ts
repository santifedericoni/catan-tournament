import {
  IsArray,
  IsInt,
  IsString,
  IsOptional,
  IsEnum,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PlayerResultDto {
  @IsString()
  participantId: string; // userId for regular players, 'guest:UUID' for guests

  @IsInt()
  @Min(1)
  @Max(4)
  position: number;

  @IsInt()
  @Min(0)
  catanPoints: number;
}

/** Used by organizers to submit the official result for a table */
export class SubmitResultDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PlayerResultDto)
  results: PlayerResultDto[];

  @IsOptional()
  @IsEnum(['NORMAL', 'TIME_LIMIT'])
  endedReason?: 'NORMAL' | 'TIME_LIMIT';
}

export class CorrectResultDto extends SubmitResultDto {
  @IsString()
  reason: string;
}

/** Payload entry for a player submission (no position — calculated server-side) */
export class PlayerScoreEntryDto {
  @IsString()
  participantId: string; // userId for regular players, 'guest:UUID' for guests

  @IsInt()
  @Min(0)
  catanPoints: number;
}

/** Used by seated players to submit their version of the scores */
export class PlayerSubmitDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PlayerScoreEntryDto)
  results: PlayerScoreEntryDto[];

  @IsOptional()
  @IsEnum(['NORMAL', 'TIME_LIMIT'])
  endedReason?: 'NORMAL' | 'TIME_LIMIT';
}

/** Used by organizers to finalize/override results for a table */
export class FinalizeResultDto {
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => PlayerScoreEntryDto)
  results: PlayerScoreEntryDto[];

  @IsOptional()
  @IsEnum(['NORMAL', 'TIME_LIMIT'])
  endedReason?: 'NORMAL' | 'TIME_LIMIT';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateDisputeDto {
  @IsString()
  reason: string;
}

export class ResolveDisputeDto {
  @IsString()
  resolution: 'ACCEPT' | 'REJECT';

  @IsString()
  resolutionNote: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlayerResultDto)
  correctedResults?: PlayerResultDto[];
}

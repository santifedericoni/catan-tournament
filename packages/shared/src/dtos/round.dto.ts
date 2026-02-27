import { TableGenerationMode } from '../enums/table-generation-mode.enum';

export interface CreateRoundDto {
  roundNumber?: number;
}

export interface GenerateTablesDto {
  mode: TableGenerationMode;
}

export interface ManualTableAssignmentDto {
  tables: Array<{
    tableNumber: number;
    playerIds: string[];
  }>;
}

export interface SubmitResultDto {
  results: Array<{
    userId: string;
    position: number;
    catanPoints: number;
  }>;
}

export interface CorrectResultDto extends SubmitResultDto {
  reason: string;
}

export interface CreateDisputeDto {
  reason: string;
}

export interface ResolveDisputeDto {
  resolution: 'ACCEPT' | 'REJECT';
  resolutionNote: string;
  correctedResults?: Array<{
    userId: string;
    position: number;
    catanPoints: number;
  }>;
}

import { RoundStatus } from '../enums/round-status.enum';
import { DisputeStatus } from '../enums/dispute-status.enum';
import { TableResultStatus } from '../enums/table-result-status.enum';
import { TableEndedReason } from '../enums/table-ended-reason.enum';

export interface PlayerSubmissionEntry {
  id: string;
  submittedBy: string;
  submittedByUser: { displayName: string };
  payload: Array<{ userId: string; catanPoints: number }>;
  endedReason: TableEndedReason;
  createdAt: string;
}

export interface TableDetail {
  id: string;
  tableNumber: number;
  resultStatus: TableResultStatus;
  endedReason: TableEndedReason | null;
  officializedBy: string | null;
  officializedAt: string | null;
  submissionCount: number;
  seats: SeatDetail[];
  results: ResultDetail[];
  hasOpenDispute: boolean;
}

export interface SeatDetail {
  id: string;
  userId: string;
  seatNumber: number;
  user: {
    id: string;
    displayName: string;
    alias: string | null;
  };
}

export interface ResultDetail {
  id: string;
  userId: string;
  position: number;
  catanPoints: number;
  victoryPoints: number;
  isConfirmed: boolean;
  disputeStatus: DisputeStatus | null;
}

export interface RoundDetail {
  id: string;
  stageId: string;
  roundNumber: number;
  status: RoundStatus;
  startedAt: string | null;
  completedAt: string | null;
  tables: TableDetail[];
}

export interface DisputeDetail {
  id: string;
  resultId: string;
  tableId: string;
  raisedBy: string;
  raisedByUser: { displayName: string };
  reason: string;
  status: DisputeStatus;
  resolvedBy: string | null;
  resolutionNote: string | null;
  createdAt: string;
}

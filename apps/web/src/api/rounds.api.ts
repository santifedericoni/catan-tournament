import { apiClient } from './client';
import type { TableGenerationMode } from '@catan/shared';

export const roundsApi = {
  createStage: (tournamentId: string, type: string, config?: Record<string, unknown>) =>
    apiClient.post(`/tournaments/${tournamentId}/stages`, { type, config }).then((r) => r.data),

  createRound: (tournamentId: string, stageId: string) =>
    apiClient.post(`/tournaments/${tournamentId}/stages/${stageId}/rounds`).then((r) => r.data),

  generateTables: (tournamentId: string, roundId: string, mode: TableGenerationMode, body?: unknown) =>
    apiClient
      .post(`/tournaments/${tournamentId}/rounds/${roundId}/generate-tables`, body, { params: { mode } })
      .then((r) => r.data),

  startRound: (tournamentId: string, roundId: string) =>
    apiClient.post(`/tournaments/${tournamentId}/rounds/${roundId}/start`).then((r) => r.data),

  closeRound: (tournamentId: string, roundId: string) =>
    apiClient.post(`/tournaments/${tournamentId}/rounds/${roundId}/close`).then((r) => r.data),

  getRound: (tournamentId: string, roundId: string) =>
    apiClient.get(`/tournaments/${tournamentId}/rounds/${roundId}`).then((r) => r.data),

  submitResults: (tournamentId: string, tableId: string, results: Array<{ participantId: string; position: number; catanPoints: number }>) =>
    apiClient
      .post(`/tournaments/${tournamentId}/tables/${tableId}/results`, { results })
      .then((r) => r.data),

  correctResults: (
    tournamentId: string,
    tableId: string,
    results: Array<{ participantId: string; position: number; catanPoints: number }>,
    reason: string,
  ) =>
    apiClient
      .patch(`/tournaments/${tournamentId}/tables/${tableId}/results`, { results, reason })
      .then((r) => r.data),

  deleteStage: (tournamentId: string, stageId: string) =>
    apiClient.delete(`/tournaments/${tournamentId}/stages/${stageId}`).then((r) => r.data),

  deleteRound: (tournamentId: string, roundId: string) =>
    apiClient.delete(`/tournaments/${tournamentId}/rounds/${roundId}`).then((r) => r.data),

  // Player score submission
  submitPlayerScores: (
    tournamentId: string,
    tableId: string,
    results: Array<{ participantId: string; catanPoints: number }>,
    endedReason?: 'NORMAL' | 'TIME_LIMIT',
  ) =>
    apiClient
      .post(`/tournaments/${tournamentId}/tables/${tableId}/player-submissions`, { results, endedReason })
      .then((r) => r.data),

  // Organizer: view submissions
  getSubmissions: (tournamentId: string, tableId: string) =>
    apiClient.get(`/tournaments/${tournamentId}/tables/${tableId}/submissions`).then((r) => r.data),

  // Organizer: finalize/override result
  finalizeResults: (
    tournamentId: string,
    tableId: string,
    results: Array<{ participantId: string; catanPoints: number }>,
    endedReason?: 'NORMAL' | 'TIME_LIMIT',
    reason?: string,
  ) =>
    apiClient
      .post(`/tournaments/${tournamentId}/tables/${tableId}/finalize`, { results, endedReason, reason })
      .then((r) => r.data),
};

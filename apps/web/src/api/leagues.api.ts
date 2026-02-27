import { apiClient } from './client';
import type { CreateLeagueDto, UpdateLeagueDto, CreateLeagueTournamentDto } from '@catan/shared';

export const leaguesApi = {
  list: (query: { page?: number; limit?: number; search?: string } = {}) =>
    apiClient.get('/leagues', { params: query }).then((r) => r.data),

  get: (id: string) => apiClient.get(`/leagues/${id}`).then((r) => r.data),

  create: (dto: CreateLeagueDto) => apiClient.post('/leagues', dto).then((r) => r.data),

  update: (id: string, dto: UpdateLeagueDto) =>
    apiClient.patch(`/leagues/${id}`, dto).then((r) => r.data),

  getTournaments: (id: string) =>
    apiClient.get(`/leagues/${id}/tournaments`).then((r) => r.data),

  createTournament: (id: string, dto: CreateLeagueTournamentDto) =>
    apiClient.post(`/leagues/${id}/tournaments`, dto).then((r) => r.data),

  getLeaderboard: (id: string) =>
    apiClient.get(`/leagues/${id}/leaderboard`).then((r) => r.data),

  addCoOrganizer: (id: string, email: string) =>
    apiClient.post(`/leagues/${id}/co-organizers`, { email }).then((r) => r.data),

  removeCoOrganizer: (id: string, userId: string) =>
    apiClient.delete(`/leagues/${id}/co-organizers/${userId}`).then((r) => r.data),
};

import { apiClient } from './client';
import type {
  TournamentDetail,
  TournamentSummary,
  PaginatedResponse,
  ListTournamentsQuery,
  CreateTournamentDto,
  UpdateTournamentDto,
} from '@catan/shared';

export const tournamentsApi = {
  list: (query: ListTournamentsQuery = {}): Promise<PaginatedResponse<TournamentSummary>> =>
    apiClient.get('/tournaments', { params: query }).then((r) => r.data),

  get: (id: string, userId?: string): Promise<TournamentDetail> =>
    apiClient.get(`/tournaments/${id}`, { params: userId ? { userId } : {} }).then((r) => r.data),

  create: (dto: CreateTournamentDto): Promise<TournamentDetail> =>
    apiClient.post('/tournaments', dto).then((r) => r.data),

  update: (id: string, dto: UpdateTournamentDto): Promise<TournamentDetail> =>
    apiClient.patch(`/tournaments/${id}`, dto).then((r) => r.data),

  publish: (id: string) => apiClient.post(`/tournaments/${id}/publish`).then((r) => r.data),
  startCheckin: (id: string) => apiClient.post(`/tournaments/${id}/start-checkin`).then((r) => r.data),
  start: (id: string) => apiClient.post(`/tournaments/${id}/start`).then((r) => r.data),
  finish: (id: string) => apiClient.post(`/tournaments/${id}/finish`).then((r) => r.data),
  cancel: (id: string) => apiClient.post(`/tournaments/${id}/cancel`).then((r) => r.data),

  getAuditLog: (id: string) => apiClient.get(`/tournaments/${id}/audit-log`).then((r) => r.data),

  getLeaderboard: (id: string) => apiClient.get(`/tournaments/${id}/leaderboard`).then((r) => r.data),
  getBracket: (id: string) => apiClient.get(`/tournaments/${id}/bracket`).then((r) => r.data),

  // Registrations
  register: (id: string) => apiClient.post(`/tournaments/${id}/register`).then((r) => r.data),
  getRegistrations: (id: string) => apiClient.get(`/tournaments/${id}/registrations`).then((r) => r.data),
  updateRegistration: (tournamentId: string, userId: string, status: string) =>
    apiClient.patch(`/tournaments/${tournamentId}/registrations/${userId}`, { status }).then((r) => r.data),
  checkIn: (id: string) => apiClient.post(`/tournaments/${id}/checkin`).then((r) => r.data),

  // Organizers
  listOrganizers: (id: string) => apiClient.get(`/tournaments/${id}/organizers`).then((r) => r.data),
  addCoOrganizer: (id: string, email: string) =>
    apiClient.post(`/tournaments/${id}/co-organizers`, { email }).then((r) => r.data),
  removeCoOrganizer: (id: string, userId: string) =>
    apiClient.delete(`/tournaments/${id}/co-organizers/${userId}`).then((r) => r.data),

  // Guest players
  addGuestPlayer: (id: string, name: string) =>
    apiClient.post(`/tournaments/${id}/guests`, { name }).then((r) => r.data),
  removeGuestPlayer: (id: string, guestPlayerId: string) =>
    apiClient.delete(`/tournaments/${id}/guests/${guestPlayerId}`).then((r) => r.data),
};

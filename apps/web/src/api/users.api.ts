import { apiClient } from './client';

export const usersApi = {
  getProfile: (id: string) => apiClient.get(`/users/${id}/profile`).then((r) => r.data),
  getStats: (id: string) => apiClient.get(`/users/${id}/stats`).then((r) => r.data),
  updateProfile: (dto: { displayName?: string; alias?: string; country?: string; city?: string }) =>
    apiClient.patch('/users/me/profile', dto).then((r) => r.data),
};

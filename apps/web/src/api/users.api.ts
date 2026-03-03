import { apiClient } from './client';

export const usersApi = {
  getProfile: (id: string) => apiClient.get(`/users/${id}/profile`).then((r) => r.data),
  getStats: (id: string) => apiClient.get(`/users/${id}/stats`).then((r) => r.data),
  updateProfile: (dto: {
    displayName?: string;
    alias?: string;
    country?: string;
    city?: string;
    bio?: string;
    favoriteColor?: string;
    favoriteExpansion?: string;
  }) => apiClient.patch('/users/me/profile', dto).then((r) => r.data),
  changePassword: (dto: { currentPassword: string; newPassword: string }) =>
    apiClient.patch('/users/me/password', dto),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return apiClient.post('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};

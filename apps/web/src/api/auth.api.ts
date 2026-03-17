import { apiClient } from './client';
import type { RegisterDto, LoginDto, AuthResponse, RefreshResponse, ForgotPasswordRequest, ResetPasswordRequest, MessageResponse } from '@catan/shared';

export const authApi = {
  register: (dto: RegisterDto): Promise<AuthResponse> =>
    apiClient.post('/auth/register', dto).then((r) => r.data),

  login: (dto: LoginDto): Promise<AuthResponse> =>
    apiClient.post('/auth/login', dto).then((r) => r.data),

  refresh: (refreshToken: string): Promise<RefreshResponse> =>
    apiClient.post('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: (refreshToken: string): Promise<void> =>
    apiClient.post('/auth/logout', { refreshToken }),

  me: (): Promise<AuthResponse['user']> =>
    apiClient.get('/auth/me').then((r) => r.data),

  forgotPassword: (dto: ForgotPasswordRequest): Promise<MessageResponse> =>
    apiClient.post('/auth/forgot-password', dto).then((r) => r.data),

  resetPassword: (dto: ResetPasswordRequest): Promise<MessageResponse> =>
    apiClient.post('/auth/reset-password', dto).then((r) => r.data),
};

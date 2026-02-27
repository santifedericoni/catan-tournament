import { useAuthStore } from '../store/auth.store';
import { authApi } from '../api/auth.api';
import type { RegisterDto, LoginDto } from '@catan/shared';

export function useAuth() {
  const { user, isAuthenticated, setAuth, logout: storeLogout, refreshToken } = useAuthStore();

  const login = async (dto: LoginDto) => {
    const res = await authApi.login(dto);
    setAuth(res.accessToken, res.refreshToken, res.user);
    return res;
  };

  const register = async (dto: RegisterDto) => {
    const res = await authApi.register(dto);
    setAuth(res.accessToken, res.refreshToken, res.user);
    return res;
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Silently fail - logout regardless
      }
    }
    storeLogout();
  };

  return { user, isAuthenticated, login, register, logout };
}

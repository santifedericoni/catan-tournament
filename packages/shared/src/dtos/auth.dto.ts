export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
  alias?: string;
  country?: string;
  city?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    alias: string | null;
  };
}

export interface RefreshResponse {
  accessToken: string;
}

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, CircularProgress } from '@mui/material';
import axios from 'axios';
import { Navbar } from './Navbar';
import { useAuthStore } from '../../store/auth.store';

const apiBase = (import.meta.env.VITE_API_URL ?? 'http://localhost:3001') + '/api';

/**
 * On mount, silently restore the access token using the persisted refresh token.
 * This ensures that authenticated API calls (like fetching myRole on a tournament)
 * work correctly even after a page refresh or navigation away from the app.
 */
export function AppLayout() {
  const { accessToken, refreshToken, setAccessToken, logout } = useAuthStore();
  const [ready, setReady] = useState(!!accessToken);

  useEffect(() => {
    if (accessToken) {
      setReady(true);
      return;
    }
    if (!refreshToken) {
      setReady(true);
      return;
    }
    // Silently refresh access token before rendering any page
    axios
      .post(`${apiBase}/auth/refresh`, { refreshToken })
      .then((res) => {
        setAccessToken(res.data.accessToken);
      })
      .catch(() => {
        // Refresh token is invalid/expired — log out cleanly
        logout();
      })
      .finally(() => {
        setReady(true);
      });
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Container
        maxWidth="xl"
        sx={{ flex: 1, py: 3, px: { xs: 2, sm: 3 } }}
      >
        <Outlet />
      </Container>
    </Box>
  );
}

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Link,
} from '@mui/material';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useTranslation } from '../hooks/useTranslation';

export function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>{t.resetPassword.invalidToken}</Alert>
            <Link component={RouterLink} to="/forgot-password" sx={{ display: 'block', textAlign: 'center' }}>
              {t.forgotPassword.linkText}
            </Link>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError(t.resetPassword.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.resetPassword.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword({ token, newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg?.toLowerCase().includes('invalid') || msg?.toLowerCase().includes('expired')) {
        setError(t.resetPassword.invalidToken);
      } else {
        setError(t.resetPassword.failed);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={700} mb={2} textAlign="center">
              {t.resetPassword.successTitle}
            </Typography>
            <Alert severity="success" sx={{ mb: 3 }}>
              {t.resetPassword.successMessage}
            </Alert>
            <Button variant="contained" fullWidth onClick={() => navigate('/login')}>
              {t.resetPassword.loginBtn}
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
            {t.resetPassword.pageTitle}
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t.resetPassword.newPasswordLabel}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              fullWidth
              autoFocus
              helperText={t.register.passwordHelper}
            />
            <TextField
              label={t.resetPassword.confirmPasswordLabel}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
            />
            <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
              {loading ? t.resetPassword.loadingBtn : t.resetPassword.submitBtn}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

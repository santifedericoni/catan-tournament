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
import { Link as RouterLink } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { useTranslation } from '../hooks/useTranslation';

export function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSubmitted(true);
    } catch {
      setError(t.forgotPassword.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ maxWidth: 400, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          {submitted ? (
            <>
              <Typography variant="h5" fontWeight={700} mb={2} textAlign="center">
                {t.forgotPassword.successTitle}
              </Typography>
              <Alert severity="success" sx={{ mb: 3 }}>
                {t.forgotPassword.successMessage}
              </Alert>
              <Link component={RouterLink} to="/login" sx={{ display: 'block', textAlign: 'center' }}>
                {t.forgotPassword.backToLogin}
              </Link>
            </>
          ) : (
            <>
              <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
                {t.forgotPassword.pageTitle}
              </Typography>
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label={t.forgotPassword.emailLabel}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  autoFocus
                />
                <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
                  {loading ? t.forgotPassword.loadingBtn : t.forgotPassword.submitBtn}
                </Button>
              </Box>
              <Typography variant="body2" textAlign="center" mt={2}>
                <Link component={RouterLink} to="/login">
                  {t.forgotPassword.backToLogin}
                </Link>
              </Typography>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

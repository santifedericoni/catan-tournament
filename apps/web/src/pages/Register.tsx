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
  Grid,
} from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from '../hooks/useTranslation';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    alias: '',
    country: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        ...form,
        alias: form.alias || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
      });
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t.register.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Card sx={{ maxWidth: 480, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
            {t.register.title}
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label={t.register.displayName} value={form.displayName} onChange={handleChange('displayName')} required fullWidth />
            <TextField label={t.register.email} type="email" value={form.email} onChange={handleChange('email')} required fullWidth />
            <TextField label={t.register.password} type="password" value={form.password} onChange={handleChange('password')} required fullWidth helperText={t.register.passwordHelper} />
            <TextField label={t.register.alias} value={form.alias} onChange={handleChange('alias')} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label={t.register.country} value={form.country} onChange={handleChange('country')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField label={t.register.city} value={form.city} onChange={handleChange('city')} fullWidth />
              </Grid>
            </Grid>

            <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
              {loading ? t.register.loading : t.register.submit}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={2}>
            {t.register.hasAccount}{' '}
            <Link component={RouterLink} to="/login">
              {t.register.login}
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

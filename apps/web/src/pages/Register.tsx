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

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
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
      setError(msg || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
      <Card sx={{ maxWidth: 480, width: '100%', mx: 2 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" fontWeight={700} mb={3} textAlign="center">
            🏰 Create Account
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Display Name" value={form.displayName} onChange={handleChange('displayName')} required fullWidth />
            <TextField label="Email" type="email" value={form.email} onChange={handleChange('email')} required fullWidth />
            <TextField label="Password" type="password" value={form.password} onChange={handleChange('password')} required fullWidth helperText="Minimum 8 characters" />
            <TextField label="Alias / Nickname (optional)" value={form.alias} onChange={handleChange('alias')} fullWidth />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField label="Country (optional)" value={form.country} onChange={handleChange('country')} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField label="City (optional)" value={form.city} onChange={handleChange('city')} fullWidth />
              </Grid>
            </Grid>

            <Button type="submit" variant="contained" fullWidth disabled={loading} size="large">
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={2}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Login
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}

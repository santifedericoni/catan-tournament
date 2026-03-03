import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { leaguesApi } from '../api/leagues.api';
import { TournamentFormat } from '@catan/shared';
import { useTranslation } from '../hooks/useTranslation';

export function LeagueCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    format: TournamentFormat.N_ROUNDS_TOP4_FINAL,
  });

  const FORMAT_LABELS: Record<string, string> = {
    [TournamentFormat.N_ROUNDS_TOP4_FINAL]: t.formats.N_ROUNDS_TOP4_FINAL,
    [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: t.formats.N_ROUNDS_TOP16_SEMIFINAL_FINAL,
    [TournamentFormat.SWISS]: t.formats.SWISS,
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const league = await leaguesApi.create({
        name: form.name,
        description: form.description || undefined,
        format: form.format,
        tiebreakerOrder: ['victory_points', 'wins', 'opponent_strength', 'avg_position'],
      });
      navigate(`/leagues/${league.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t.leagueCreate.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={3}>{t.leagueCreate.title}</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        {t.leagueCreate.subtitle}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.leagueCreate.basicInfo}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label={t.leagueCreate.name}
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label={t.leagueCreate.description}
                  value={form.description}
                  onChange={handleChange('description')}
                  fullWidth
                  multiline
                  rows={3}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.leagueCreate.sharedConfig}</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              {t.leagueCreate.sharedConfigDesc}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>{t.leagueCreate.format}</InputLabel>
                  <Select
                    value={form.format}
                    label={t.leagueCreate.format}
                    onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as TournamentFormat }))}
                  >
                    {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                      <MenuItem key={v} value={v}>{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
          {loading ? t.leagueCreate.loading : t.leagueCreate.submit}
        </Button>
      </Box>
    </Box>
  );
}

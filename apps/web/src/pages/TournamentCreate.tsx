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
  FormControlLabel,
  Switch,
  Alert,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { TournamentFormat, TableGenerationMode } from '@catan/shared';

const FORMAT_LABELS: Record<string, string> = {
  [TournamentFormat.N_ROUNDS_TOP4_FINAL]: 'N Rounds + Top 4 Final',
  [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: 'N Rounds + Top 16 Semi + Final',
  [TournamentFormat.SWISS]: 'Swiss',
};

export function TournamentCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    isOnline: false,
    startsAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    maxPlayers: 20,
    format: TournamentFormat.N_ROUNDS_TOP4_FINAL,
    tableGenerationMode: TableGenerationMode.RANDOM,
    scoring1: 10,
    scoring2: 7,
    scoring3: 5,
    scoring4: 3,
  });

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = (e.target as HTMLInputElement).type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const tournament = await tournamentsApi.create({
        name: form.name,
        description: form.description || undefined,
        location: form.location || undefined,
        isOnline: form.isOnline,
        startsAt: new Date(form.startsAt).toISOString(),
        timezone: form.timezone,
        maxPlayers: Number(form.maxPlayers),
        format: form.format,
        tableGenerationMode: form.tableGenerationMode,
        tiebreakerOrder: ['victory_points', 'wins', 'opponent_strength', 'avg_position'],
      });
      navigate(`/tournaments/${tournament.id}/manage`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={3}>Create Tournament</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Basic Info</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label="Tournament Name" value={form.name} onChange={handleChange('name')} required fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField label="Description" value={form.description} onChange={handleChange('description')} fullWidth multiline rows={3} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label="Location"
                  value={form.location}
                  onChange={handleChange('location')}
                  fullWidth
                  disabled={form.isOnline}
                  placeholder="City, Country"
                />
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Switch checked={form.isOnline} onChange={(e) => setForm((p) => ({ ...p, isOnline: e.target.checked }))} />}
                  label="Online"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Start Date & Time"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={handleChange('startsAt')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField label="Timezone" value={form.timezone} onChange={handleChange('timezone')} fullWidth />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Max Players"
                  type="number"
                  value={form.maxPlayers}
                  onChange={handleChange('maxPlayers')}
                  required
                  fullWidth
                  inputProps={{ min: 4, max: 500 }}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Format & Rules</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select value={form.format} label="Format" onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as TournamentFormat }))}>
                    {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                      <MenuItem key={v} value={v}>{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Table Generation</InputLabel>
                  <Select value={form.tableGenerationMode} label="Table Generation" onChange={(e) => setForm((p) => ({ ...p, tableGenerationMode: e.target.value as TableGenerationMode }))}>
                    <MenuItem value={TableGenerationMode.RANDOM}>Random (minimize repeats)</MenuItem>
                    <MenuItem value={TableGenerationMode.BALANCED}>Balanced (by performance)</MenuItem>
                    <MenuItem value={TableGenerationMode.MANUAL}>Manual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Scoring Rules (points per position)</Typography>
            <Grid container spacing={2}>
              {[1, 2, 3, 4].map((pos) => (
                <Grid item xs={6} sm={3} key={pos}>
                  <TextField
                    label={`${pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : '4th'} Place`}
                    type="number"
                    value={form[`scoring${pos}` as keyof typeof form]}
                    onChange={(e) => setForm((p) => ({ ...p, [`scoring${pos}`]: Number(e.target.value) }))}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
          {loading ? 'Creating...' : 'Create Tournament'}
        </Button>
      </Box>
    </Box>
  );
}

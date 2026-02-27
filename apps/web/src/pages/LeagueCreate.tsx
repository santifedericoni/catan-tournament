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
import { TournamentFormat, TableGenerationMode } from '@catan/shared';

const FORMAT_LABELS: Record<string, string> = {
  [TournamentFormat.N_ROUNDS_TOP4_FINAL]: 'N Rounds + Top 4 Final',
  [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: 'N Rounds + Top 16 Semi + Final',
  [TournamentFormat.SWISS]: 'Swiss',
};

export function LeagueCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    format: TournamentFormat.N_ROUNDS_TOP4_FINAL,
    tableGenerationMode: TableGenerationMode.RANDOM,
  });

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
        tableGenerationMode: form.tableGenerationMode,
        tiebreakerOrder: ['victory_points', 'wins', 'opponent_strength', 'avg_position'],
      });
      navigate(`/leagues/${league.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={3}>Create League</Typography>
      <Typography variant="body1" color="text.secondary" mb={3}>
        A league groups multiple tournaments with the same format and rules. Each tournament within
        the league can have different participants and player counts.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Basic Info</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="League Name"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Description"
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
            <Typography variant="h6" mb={2}>Shared Configuration</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              These settings will apply to all tournaments created within this league.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Format</InputLabel>
                  <Select
                    value={form.format}
                    label="Format"
                    onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as TournamentFormat }))}
                  >
                    {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                      <MenuItem key={v} value={v}>{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Table Generation</InputLabel>
                  <Select
                    value={form.tableGenerationMode}
                    label="Table Generation"
                    onChange={(e) => setForm((p) => ({ ...p, tableGenerationMode: e.target.value as TableGenerationMode }))}
                  >
                    <MenuItem value={TableGenerationMode.RANDOM}>Random (minimize repeats)</MenuItem>
                    <MenuItem value={TableGenerationMode.BALANCED}>Balanced (by performance)</MenuItem>
                    <MenuItem value={TableGenerationMode.MANUAL}>Manual</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
          {loading ? 'Creating...' : 'Create League'}
        </Button>
      </Box>
    </Box>
  );
}

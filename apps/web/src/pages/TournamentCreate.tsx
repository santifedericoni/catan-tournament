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
  Autocomplete,
} from '@mui/material';
import { rawTimeZones } from '@vvo/tzdb';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { TournamentFormat } from '@catan/shared';
import { useTranslation } from '../hooks/useTranslation';

interface TzOption {
  label: string;   // display: "(GMT+X) Name - City, City"
  value: string;   // IANA name e.g. "America/Argentina/Buenos_Aires"
}

function buildTzOptions(): TzOption[] {
  // Deduplicate by IANA name (rawTimeZones has entries grouped by alias)
  const seen = new Set<string>();
  return rawTimeZones
    .filter((tz) => {
      if (seen.has(tz.name)) return false;
      seen.add(tz.name);
      return true;
    })
    .map((tz) => {
      const sign = tz.rawOffsetInMinutes >= 0 ? '+' : '-';
      const abs = Math.abs(tz.rawOffsetInMinutes);
      const h = String(Math.floor(abs / 60)).padStart(2, '0');
      const m = String(abs % 60).padStart(2, '0');
      const cities = tz.mainCities.slice(0, 2).join(', ');
      return {
        label: `(GMT${sign}${h}:${m}) ${tz.alternativeName} — ${cities}`,
        value: tz.name,
      };
    })
    .sort((a, b) => {
      // Sort by raw offset first, then alphabetically
      const tzA = rawTimeZones.find((t) => t.name === a.value)!;
      const tzB = rawTimeZones.find((t) => t.name === b.value)!;
      return tzA.rawOffsetInMinutes - tzB.rawOffsetInMinutes || a.label.localeCompare(b.label);
    });
}

const TZ_OPTIONS = buildTzOptions();

const N_ROUNDS_FORMATS = [
  TournamentFormat.N_ROUNDS_TOP4_FINAL,
  TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL,
];

export function TournamentCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
    numberOfRounds: 3,
  });

  const FORMAT_LABELS: Record<string, string> = {
    [TournamentFormat.N_ROUNDS_TOP4_FINAL]: t.formats.N_ROUNDS_TOP4_FINAL,
    [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: t.formats.N_ROUNDS_TOP16_SEMIFINAL_FINAL,
    [TournamentFormat.SWISS]: t.formats.SWISS,
  };

  const isNRoundsFormat = N_ROUNDS_FORMATS.includes(form.format as TournamentFormat);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = (e.target as HTMLInputElement).type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNRoundsFormat && Number(form.numberOfRounds) <= 0) return;
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
        numberOfRounds: isNRoundsFormat ? Number(form.numberOfRounds) : undefined,
        tiebreakerOrder: ['victory_points', 'wins', 'opponent_strength', 'avg_position'],
      });
      navigate(`/tournaments/${tournament.id}/manage`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t.tournamentCreate.failed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxWidth="md" mx="auto">
      <Typography variant="h4" fontWeight={700} mb={3}>{t.tournamentCreate.title}</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.tournamentCreate.basicInfo}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField label={t.tournamentCreate.name} value={form.name} onChange={handleChange('name')} required fullWidth />
              </Grid>
              <Grid item xs={12}>
                <TextField label={t.tournamentCreate.description} value={form.description} onChange={handleChange('description')} fullWidth multiline rows={3} />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  label={t.tournamentCreate.location}
                  value={form.location}
                  onChange={handleChange('location')}
                  fullWidth
                  disabled={form.isOnline}
                  placeholder={t.tournamentCreate.locationPlaceholder}
                />
              </Grid>
              <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center' }}>
                <FormControlLabel
                  control={<Switch checked={form.isOnline} onChange={(e) => setForm((p) => ({ ...p, isOnline: e.target.checked }))} />}
                  label={t.tournamentCreate.online}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t.tournamentCreate.startDateTime}
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={handleChange('startsAt')}
                  required
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={TZ_OPTIONS}
                  value={TZ_OPTIONS.find((o) => o.value === form.timezone) ?? null}
                  onChange={(_, option) => {
                    if (option) setForm((p) => ({ ...p, timezone: option.value }));
                  }}
                  getOptionLabel={(o) => o.label}
                  isOptionEqualToValue={(a, b) => a.value === b.value}
                  renderInput={(params) => (
                    <TextField {...params} label={t.tournamentCreate.timezone} required />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t.tournamentCreate.maxPlayers}
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
            <Typography variant="h6" mb={2}>{t.tournamentCreate.formatRules}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={isNRoundsFormat ? 6 : 12}>
                <FormControl fullWidth>
                  <InputLabel>{t.tournamentCreate.format}</InputLabel>
                  <Select
                    value={form.format}
                    label={t.tournamentCreate.format}
                    onChange={(e) => setForm((p) => ({ ...p, format: e.target.value as TournamentFormat }))}
                  >
                    {Object.entries(FORMAT_LABELS).map(([v, l]) => (
                      <MenuItem key={v} value={v}>{l}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {isNRoundsFormat && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={t.tournamentCreate.numberOfRounds}
                    value={form.numberOfRounds}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        setForm((prev) => ({ ...prev, numberOfRounds: val as unknown as number }));
                      }
                    }}
                    required
                    fullWidth
                    error={Number(form.numberOfRounds) <= 0}
                    helperText={Number(form.numberOfRounds) <= 0 ? t.tournamentCreate.numberOfRoundsHelper : undefined}
                  />
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>

        <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
          {loading ? t.tournamentCreate.loading : t.tournamentCreate.submit}
        </Button>
      </Box>
    </Box>
  );
}

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  CircularProgress,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { leaguesApi } from '../api/leagues.api';
import { StatusChip } from '../components/common/StatusChip';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../hooks/useTranslation';
import type { TournamentSummary } from '@catan/shared';
import type { LeagueSummary } from '@catan/shared';
import { TournamentFormat, TournamentStatus } from '@catan/shared';

export function Home() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { t } = useTranslation();

  const FORMAT_LABELS: Record<string, string> = {
    [TournamentFormat.N_ROUNDS_TOP4_FINAL]: t.formats.N_ROUNDS_TOP4_FINAL,
    [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: t.formats.N_ROUNDS_TOP16_SEMIFINAL_FINAL,
    [TournamentFormat.SWISS]: t.formats.SWISS,
    [TournamentFormat.GROUPS]: t.formats.GROUPS,
    [TournamentFormat.SINGLE_ELIMINATION]: t.formats.SINGLE_ELIMINATION,
  };

  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [leagues, setLeagues] = useState<LeagueSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const LIMIT = 12;

  useEffect(() => {
    loadAll();
  }, [page, statusFilter]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tourRes, leagueRes] = await Promise.all([
        tournamentsApi.list({
          page,
          limit: LIMIT,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        leaguesApi.list({ limit: 6 }).catch(() => ({ data: [], total: 0 })),
      ]);
      setTournaments(tourRes.data);
      setTotal(tourRes.total);
      setLeagues(Array.isArray(leagueRes) ? leagueRes : leagueRes.data ?? []);
    } catch {
      setError(t.common.failedToLoad);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          {t.home.title}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t.home.subtitle}
        </Typography>
      </Box>

      {/* Leagues section */}
      {leagues.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight={700} mb={2}>{t.home.leagues}</Typography>
          <Grid container spacing={2}>
            {leagues.map((league) => (
              <Grid item xs={12} sm={6} md={4} key={league.id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/leagues/${league.id}`)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip label={t.home.league} size="small" color="secondary" />
                        <Chip label={FORMAT_LABELS[league.format] ?? league.format} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="h6" fontWeight={600} noWrap>{league.name}</Typography>
                      {league.description && (
                        <Typography variant="body2" color="text.secondary" noWrap mt={0.5}>
                          {league.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        {league.tournamentCount} {league.tournamentCount !== 1 ? t.home.tournaments_plural : t.home.tournament}
                        {league.creator && ` · ${t.home.by} ${league.creator.displayName}`}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Tournaments section */}
      <Typography variant="h5" fontWeight={700} mb={2}>{t.home.tournaments}</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label={t.home.search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadAll()}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>{t.home.status}</InputLabel>
          <Select value={statusFilter} label={t.home.status} onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">{t.home.all}</MenuItem>
            {Object.values(TournamentStatus).map((s) => (
              <MenuItem key={s} value={s}>{s.replace(/_/g, ' ')}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tournaments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">{t.home.noTournaments}</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {tournaments.map((tournament) => (
            <Grid item xs={12} sm={6} md={4} key={tournament.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea onClick={() => navigate(`/tournaments/${tournament.id}`)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <StatusChip status={tournament.status} />
                      <Chip label={tournament.isOnline ? t.home.online : t.home.inPerson} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="h6" fontWeight={600} mt={1} noWrap>
                      {tournament.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap mb={1}>
                      {tournament.location || 'Online'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {FORMAT_LABELS[tournament.format] || tournament.format}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(tournament.startsAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {tournament.registeredCount}/{tournament.maxPlayers} {t.home.players}
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {total > LIMIT && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={Math.ceil(total / LIMIT)}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
          />
        </Box>
      )}

      {isAuthenticated && (
        <Fab
          color="primary"
          aria-label="create"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          onClick={() => navigate('/create')}
        >
          <AddIcon />
        </Fab>
      )}
    </Box>
  );
}

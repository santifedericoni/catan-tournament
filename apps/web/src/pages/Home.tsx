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
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GroupsIcon from '@mui/icons-material/Groups';
import { useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { leaguesApi } from '../api/leagues.api';
import { StatusChip } from '../components/common/StatusChip';
import { useAuthStore } from '../store/auth.store';
import type { TournamentSummary } from '@catan/shared';
import type { LeagueSummary } from '@catan/shared';
import { TournamentFormat, TournamentStatus } from '@catan/shared';

const FORMAT_LABELS: Record<string, string> = {
  [TournamentFormat.N_ROUNDS_TOP4_FINAL]: 'N Rounds + Top 4 Final',
  [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: 'N Rounds + Semifinal + Final',
  [TournamentFormat.SWISS]: 'Swiss',
  [TournamentFormat.GROUPS]: 'Groups',
  [TournamentFormat.SINGLE_ELIMINATION]: 'Single Elimination',
};

export function Home() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

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
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} mb={1}>
          Catan Tournaments
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find and join tournaments, or create your own.
        </Typography>
      </Box>

      {/* Leagues section */}
      {leagues.length > 0 && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h5" fontWeight={700} mb={2}>Ligas</Typography>
          <Grid container spacing={2}>
            {leagues.map((league) => (
              <Grid item xs={12} sm={6} md={4} key={league.id}>
                <Card sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/leagues/${league.id}`)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                        <Chip label="Liga" size="small" color="secondary" />
                        <Chip label={FORMAT_LABELS[league.format] ?? league.format} size="small" variant="outlined" />
                      </Box>
                      <Typography variant="h6" fontWeight={600} noWrap>{league.name}</Typography>
                      {league.description && (
                        <Typography variant="body2" color="text.secondary" noWrap mt={0.5}>
                          {league.description}
                        </Typography>
                      )}
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        {league.tournamentCount} torneo{league.tournamentCount !== 1 ? 's' : ''}
                        {league.creator && ` · por ${league.creator.displayName}`}
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
      <Typography variant="h5" fontWeight={700} mb={2}>Torneos</Typography>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadAll()}
          size="small"
          sx={{ minWidth: 200 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
            <MenuItem value="">All</MenuItem>
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
          <Typography variant="h6" color="text.secondary">No tournaments found</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {tournaments.map((t) => (
            <Grid item xs={12} sm={6} md={4} key={t.id}>
              <Card sx={{ height: '100%' }}>
                <CardActionArea onClick={() => navigate(`/tournaments/${t.id}`)} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <StatusChip status={t.status} />
                      <Chip label={t.isOnline ? '🌐 Online' : '📍 In-Person'} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="h6" fontWeight={600} mt={1} noWrap>
                      {t.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap mb={1}>
                      {t.location || 'Online'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {FORMAT_LABELS[t.format] || t.format}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(t.startsAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        {t.registeredCount}/{t.maxPlayers} players
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
        <SpeedDial
          ariaLabel="Create"
          sx={{ position: 'fixed', bottom: 24, right: 24 }}
          icon={<SpeedDialIcon />}
        >
          <SpeedDialAction
            icon={<EmojiEventsIcon />}
            tooltipTitle="Nuevo Torneo"
            onClick={() => navigate('/tournaments/create')}
          />
          <SpeedDialAction
            icon={<GroupsIcon />}
            tooltipTitle="Nueva Liga"
            onClick={() => navigate('/leagues/create')}
          />
        </SpeedDial>
      )}
    </Box>
  );
}

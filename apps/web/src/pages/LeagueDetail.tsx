import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { leaguesApi } from '../api/leagues.api';
import { useAuthStore } from '../store/auth.store';
import { StatusChip } from '../components/common/StatusChip';
import type { LeagueDetail as ILeagueDetail } from '@catan/shared';
import type { LeagueLeaderboardEntry } from '@catan/shared';
import { TournamentFormat, TableGenerationMode } from '@catan/shared';
import { useTranslation } from '../hooks/useTranslation';

function CreateTournamentDialog({
  open,
  onClose,
  onCreated,
  leagueId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  leagueId: string;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    startsAt: '',
    maxPlayers: 16,
    location: '',
    isOnline: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.startsAt) return;
    setLoading(true);
    setError('');
    try {
      const tournament = await leaguesApi.createTournament(leagueId, {
        name: form.name.trim(),
        startsAt: new Date(form.startsAt).toISOString(),
        maxPlayers: form.maxPlayers,
        location: form.location || undefined,
        isOnline: form.isOnline,
      });
      onCreated();
      onClose();
      navigate(`/tournaments/${tournament.id}`);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.leagueDetail.createFailed);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t.leagueDetail.createDialogTitle}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Alert severity="info">
            {t.leagueDetail.createDialogDesc}
          </Alert>
          <TextField
            label={t.leagueDetail.fieldName}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            required
            fullWidth
            size="small"
          />
          <TextField
            label={t.leagueDetail.fieldStartDate}
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))}
            required
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label={t.leagueDetail.fieldMaxPlayers}
            type="number"
            value={form.maxPlayers}
            onChange={(e) => setForm((p) => ({ ...p, maxPlayers: parseInt(e.target.value) || 16 }))}
            required
            fullWidth
            size="small"
            inputProps={{ min: 4, max: 256 }}
          />
          <TextField
            label={t.leagueDetail.fieldLocation}
            value={form.location}
            onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            fullWidth
            size="small"
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{t.common.cancel}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !form.name.trim() || !form.startsAt}>
          {loading ? t.leagueDetail.createLoading : t.leagueDetail.createBtn}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function LeagueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const FORMAT_LABELS: Record<string, string> = {
    [TournamentFormat.N_ROUNDS_TOP4_FINAL]: t.formats.N_ROUNDS_TOP4_FINAL,
    [TournamentFormat.N_ROUNDS_TOP16_SEMIFINAL_FINAL]: t.formats.N_ROUNDS_TOP16_SEMIFINAL_FINAL,
    [TournamentFormat.SWISS]: t.formats.SWISS,
  };

  const TABLE_GEN_LABELS: Record<string, string> = {
    [TableGenerationMode.RANDOM]: t.tableGenModes.RANDOM,
    [TableGenerationMode.BALANCED]: t.tableGenModes.BALANCED,
    [TableGenerationMode.MANUAL]: t.tableGenModes.MANUAL,
  };

  const [league, setLeague] = useState<ILeagueDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeagueLeaderboardEntry[]>([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lbLoading, setLbLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await leaguesApi.get(id);
      setLeague(data);
    } catch {
      setError(t.leagueDetail.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 2 || !id) return;
    setLbLoading(true);
    leaguesApi.getLeaderboard(id)
      .then((data) => setLeaderboard(data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, [tab, id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!league) return null;

  const isOrganizerOrOwner = league.myRole === 'OWNER' || league.myRole === 'CO_ORGANIZER';
  const isOwner = league.myRole === 'OWNER';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip label={t.leagueDetail.league} size="small" color="secondary" />
            {league.myRole && (
              <Chip
                label={league.myRole.replace('_', ' ')}
                size="small"
                color={isOwner ? 'primary' : 'default'}
                variant="outlined"
              />
            )}
          </Box>
          <Typography variant="h4" fontWeight={700}>{league.name}</Typography>
          {league.description && (
            <Typography variant="body1" color="text.secondary" mt={0.5}>{league.description}</Typography>
          )}
        </Box>
        {isOwner && (
          <Button variant="outlined" onClick={() => navigate(`/leagues/${id}/edit`)}>
            {t.leagueDetail.editLeague}
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t.leagueDetail.tabOverview} />
        <Tab label={`${t.leagueDetail.tabTournaments} (${league.tournaments?.length ?? 0})`} />
        <Tab label={t.leagueDetail.tabLeaderboard} />
        {isOwner && <Tab label={t.leagueDetail.tabOrganizers} />}
      </Tabs>

      {/* Overview tab */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t.leagueDetail.detailFormat}</Typography>
                <Typography variant="h6">{FORMAT_LABELS[league.format] ?? league.format}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t.leagueDetail.detailTableGen}</Typography>
                <Typography variant="h6">{TABLE_GEN_LABELS[league.tableGenerationMode] ?? league.tableGenerationMode}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>{t.leagueDetail.detailTournaments}</Typography>
                <Typography variant="h6">{league.tournamentCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          {league.creator && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                {`${t.leagueDetail.detailCreatedBy} ${league.creator.displayName}`}
              </Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* Tournaments tab */}
      {tab === 1 && (
        <Box>
          {isOrganizerOrOwner && (
            <Box sx={{ mb: 3 }}>
              <Button variant="contained" onClick={() => setCreateDialogOpen(true)}>
                {t.leagueDetail.createTournament}
              </Button>
            </Box>
          )}
          {!league.tournaments || league.tournaments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">{t.leagueDetail.noTournaments}</Typography>
              {isOrganizerOrOwner && (
                <Typography variant="body2" color="text.secondary" mt={1}>
                  {t.leagueDetail.noTournamentsDesc}
                </Typography>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              {league.tournaments.map((tournament) => (
                <Grid item xs={12} sm={6} md={4} key={tournament.id}>
                  <Card sx={{ height: '100%' }}>
                    <CardActionArea onClick={() => navigate(`/tournaments/${tournament.id}`)} sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ mb: 1 }}>
                          <StatusChip status={tournament.status} />
                        </Box>
                        <Typography variant="h6" fontWeight={600} noWrap>{tournament.name}</Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                          {new Date(tournament.startsAt).toLocaleDateString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" mt={0.5}>
                          {t.leagueDetail.players
                            .replace('{registered}', String(tournament.registeredCount))
                            .replace('{max}', String(tournament.maxPlayers))}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <CreateTournamentDialog
            open={createDialogOpen}
            onClose={() => setCreateDialogOpen(false)}
            onCreated={load}
            leagueId={id!}
          />
        </Box>
      )}

      {/* Leaderboard tab */}
      {tab === 2 && (
        <Box>
          {lbLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
          ) : leaderboard.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary">{t.leagueDetail.noResults}</Typography>
              <Typography variant="body2" color="text.secondary" mt={1}>
                {t.leagueDetail.noResultsDesc}
              </Typography>
            </Box>
          ) : (
            <LeagueLeaderboardTable entries={leaderboard} highlightUserId={user?.id} />
          )}
        </Box>
      )}

      {/* Co-organizers tab (owner only) */}
      {tab === 3 && isOwner && id && (
        <CoOrganizersPanel leagueId={id} />
      )}
    </Box>
  );
}

function LeagueLeaderboardTable({
  entries,
  highlightUserId,
}: {
  entries: LeagueLeaderboardEntry[];
  highlightUserId?: string;
}) {
  const { t } = useTranslation();

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>{t.leaderboard.colRank}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>{t.leaderboard.colPlayer}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colVP}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colCatanPts}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colPointShare}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colSecondPlaces}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colThirdPlaces}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leagueDetail.colTournaments}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colGames}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colAvgPos}</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">{t.leaderboard.colElo}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => {
            const isHighlighted = entry.playerId === highlightUserId;
            return (
              <TableRow
                key={entry.playerId}
                sx={{
                  bgcolor: isHighlighted ? 'secondary.light' : entry.rank <= 4 ? 'rgba(139,69,19,0.06)' : 'inherit',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)' },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {entry.rank <= 3 ? (
                      <span>{['🥇', '🥈', '🥉'][entry.rank - 1]}</span>
                    ) : (
                      <Typography variant="body2" color="text.secondary">{entry.rank}</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight={isHighlighted ? 700 : 400}>
                        {entry.displayName}
                      </Typography>
                      {entry.isGuest && (
                        <Chip label={t.common.guest} size="small" variant="outlined" color="default" sx={{ fontSize: '0.65rem', height: 18 }} />
                      )}
                    </Box>
                    {entry.alias && (
                      <Typography variant="caption" color="text.secondary">
                        @{entry.alias}
                        {entry.country && ` · ${entry.country}`}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="primary.main">
                    {entry.totalVictoryPoints % 1 === 0
                      ? entry.totalVictoryPoints
                      : entry.totalVictoryPoints.toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{entry.totalCatanPoints}</TableCell>
                <TableCell align="right">{(entry.avgPointShare * 100).toFixed(1)}%</TableCell>
                <TableCell align="right">{entry.secondPlaces}</TableCell>
                <TableCell align="right">{entry.thirdPlaces}</TableCell>
                <TableCell align="right">{entry.tournamentsPlayed}</TableCell>
                <TableCell align="right">{entry.gamesPlayed}</TableCell>
                <TableCell align="right">
                  {entry.avgPosition !== null ? entry.avgPosition.toFixed(1) : '—'}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {entry.isGuest ? '—' : entry.eloRating != null ? Math.round(entry.eloRating) : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function CoOrganizersPanel({ leagueId }: { leagueId: string }) {
  const { t } = useTranslation();
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await leaguesApi.get(leagueId);
      // Co-organizers are part of league detail — we fetch the full detail to refresh
      // In a real implementation you'd have a dedicated endpoint; for now reuse league detail
      setOrganizers((data as any).roles ?? []);
    } catch { /* ignore */ }
  }, [leagueId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await leaguesApi.addCoOrganizer(leagueId, email.trim());
      setEmail('');
      setSuccess('Co-organizer added');
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      await leaguesApi.removeCoOrganizer(leagueId, userId);
      setSuccess('Co-organizer removed');
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const roleColor: Record<string, 'primary' | 'secondary' | 'default'> = {
    OWNER: 'primary',
    CO_ORGANIZER: 'secondary',
    STAFF: 'default',
  };

  return (
    <Box>
      <Typography variant="h6" mb={2}>{t.leagueDetail.tabOrganizers}</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t.leagueDetail.colName}</TableCell>
              <TableCell>{t.leagueDetail.colEmail}</TableCell>
              <TableCell>{t.leagueDetail.colRole}</TableCell>
              <TableCell align="right">{t.leagueDetail.colActions}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {organizers.map((org: any) => (
              <TableRow key={org.id}>
                <TableCell>{org.user?.displayName}</TableCell>
                <TableCell>{org.user?.email}</TableCell>
                <TableCell>
                  <Chip label={org.role.replace('_', ' ')} size="small" color={roleColor[org.role] ?? 'default'} />
                </TableCell>
                <TableCell align="right">
                  {org.role === 'CO_ORGANIZER' && (
                    <Button size="small" color="error" variant="outlined" onClick={() => handleRemove(org.userId)} disabled={loading}>
                      {t.leagueDetail.removeOrg}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" mb={1}>{t.leagueDetail.addCoOrg}</Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          label={t.leagueDetail.userEmail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ minWidth: 240 }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button variant="contained" onClick={handleAdd} disabled={loading || !email.trim()}>
          {t.common.add}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 1 }}>{success}</Alert>}
    </Box>
  );
}

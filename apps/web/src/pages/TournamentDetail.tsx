import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Divider,
  Snackbar,
  Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { roundsApi } from '../api/rounds.api';
import { StatusChip } from '../components/common/StatusChip';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { TableCard } from '../components/rounds/TableCard';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/auth.store';
import type { TournamentDetail as TDetail, LeaderboardEntry, RoundDetail } from '@catan/shared';
import { RegistrationStatus, TournamentRole, TournamentStatus } from '@catan/shared';

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerView = searchParams.get('view') === 'player';
  const { user, isAuthenticated } = useAuthStore();

  const [tournament, setTournament] = useState<TDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRoundDetail, setCurrentRoundDetail] = useState<RoundDetail | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const { on } = useSocket(id);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [t, lb] = await Promise.all([
        tournamentsApi.get(id, user?.id),
        tournamentsApi.getLeaderboard(id).catch(() => []),
      ]);
      setTournament(t);
      setLeaderboard(lb);
      // Load in-progress round detail for table display
      const allRounds = t.stages?.flatMap((s: any) => s.rounds) ?? [];
      const inProgress = allRounds.find((r: any) => r.status === 'IN_PROGRESS');
      if (inProgress) {
        const detail = await roundsApi.getRound(id, inProgress.id).catch(() => null);
        setCurrentRoundDetail(detail as RoundDetail | null);
      } else {
        setCurrentRoundDetail(null);
      }
    } catch {
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  // Organizers go straight to the management view (unless ?view=player)
  useEffect(() => {
    if (!tournament || playerView) return;
    const role = tournament.myRole as TournamentRole | undefined;
    if (role && [TournamentRole.OWNER, TournamentRole.CO_ORGANIZER, TournamentRole.STAFF].includes(role)) {
      navigate(`/tournaments/${id}/manage`, { replace: true });
    }
  }, [tournament, id, navigate, playerView]);

  // Realtime subscriptions
  useEffect(() => {
    const unsubLeaderboard = on('leaderboard_update', (data) => {
      setLeaderboard(data as LeaderboardEntry[]);
    });
    const unsubRound = on('round_started', () => { load(); });
    const unsubResult = on('result_submitted', () => { load(); });
    const unsubConfirmed = on('result_confirmed', () => { load(); });
    const unsubDisputed = on('result_disputed', () => { load(); });
    const unsubOfficial = on('result_official', () => { load(); });
    return () => {
      unsubLeaderboard();
      unsubRound();
      unsubResult();
      unsubConfirmed();
      unsubDisputed();
      unsubOfficial();
    };
  }, [on, load]);

  const handleRegister = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await tournamentsApi.register(id);
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await tournamentsApi.checkIn(id);
      await load();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Check-in failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/tournaments/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setSnackMessage('Link copied to clipboard');
    } catch {
      setSnackMessage('Could not copy link');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!tournament) return null;

  const isOrganizer = [TournamentRole.OWNER, TournamentRole.CO_ORGANIZER, TournamentRole.STAFF].includes(tournament.myRole as TournamentRole);
  const myReg = tournament.myRegistration;

  const canRegister = isAuthenticated && !myReg && tournament.status === TournamentStatus.PUBLISHED;
  const canCheckIn = myReg?.status === RegistrationStatus.APPROVED && tournament.status === TournamentStatus.CHECKIN;

  // Check if current user is seated in the current round (for submission prompt)
  const myTable = currentRoundDetail?.tables?.find((t) =>
    t.seats.some((s) => s.userId === user?.id),
  );
  const myTableNeedsSubmission = myTable && ['PENDING', 'DISPUTED'].includes(myTable.resultStatus as string);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={700}>{tournament.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <StatusChip status={tournament.status} />
              <Chip label={tournament.isOnline ? '🌐 Online' : `📍 ${tournament.location}`} size="small" variant="outlined" />
              <Chip label={`${tournament.registeredCount}/${tournament.maxPlayers} players`} size="small" variant="outlined" />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tooltip title="Copy tournament link">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ContentCopyIcon />}
                onClick={handleCopyLink}
              >
                Copy link
              </Button>
            </Tooltip>
            {isOrganizer && (
              <Button variant="outlined" color="primary" onClick={() => navigate(`/tournaments/${id}/manage`)}>
                Organizer Panel
              </Button>
            )}
            {canRegister && (
              <Button variant="contained" onClick={handleRegister} disabled={actionLoading}>
                Register
              </Button>
            )}
            {canCheckIn && (
              <Button variant="contained" color="success" onClick={handleCheckIn} disabled={actionLoading}>
                Check In
              </Button>
            )}
            {myReg && !canCheckIn && (
              <StatusChip status={myReg.status} type="registration" />
            )}
          </Box>
        </Box>

        {tournament.description && (
          <Typography variant="body2" color="text.secondary" mt={2}>
            {tournament.description}
          </Typography>
        )}
      </Box>


      {/* Persistent submission prompt for seated players */}
      {myTableNeedsSubmission && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          The game ended — <strong>submit your scores for your table (Table {myTable!.tableNumber})</strong> in the Rounds tab.
        </Alert>
      )}

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Overview" />
        <Tab label="Leaderboard" />
        <Tab label="Rounds" />
      </Tabs>

      {/* Overview tab */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" mb={1}>Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2"><b>Date:</b> {new Date(tournament.startsAt).toLocaleString()}</Typography>
              <Typography variant="body2"><b>Timezone:</b> {tournament.timezone}</Typography>
              <Typography variant="body2"><b>Format:</b> {tournament.format.replace(/_/g, ' ')}</Typography>
              <Typography variant="body2"><b>Table generation:</b> {tournament.tableGenerationMode}</Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Leaderboard tab */}
      {tab === 1 && (
        <LeaderboardTable entries={leaderboard} highlightUserId={user?.id} />
      )}

      {/* Rounds tab */}
      {tab === 2 && (
        <Box>
          {currentRoundDetail && (
            <Box mb={3}>
              <Typography variant="h6" mb={1}>
                Round {currentRoundDetail.roundNumber} — In progress
              </Typography>
              {myTableNeedsSubmission && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  You haven't submitted your table scores yet. Do it from your table card!
                </Alert>
              )}
              <Grid container spacing={2}>
                {currentRoundDetail.tables.map((table) => (
                  <Grid item xs={12} md={6} key={table.id}>
                    <TableCard
                      table={table}
                      tournamentId={id!}
                      currentUserId={user?.id}
                      onRefresh={load}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {tournament.stages?.map((stage: any) => (
            <Box key={stage.id} mb={3}>
              <Typography variant="h6" mb={2}>
                {stage.type} Stage
              </Typography>
              {stage.rounds.map((round: any) => (
                <Box key={round.id} mb={2}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    Round {round.roundNumber} — {round.status}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {round.tableCount} tables
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}

      <Snackbar
        open={!!snackMessage}
        autoHideDuration={3000}
        onClose={() => setSnackMessage('')}
        message={snackMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

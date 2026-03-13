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
import { TableGameTools } from '../components/rounds/TableGameTools';
import { useSocket } from '../hooks/useSocket';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../hooks/useTranslation';
import type { TournamentDetail as TDetail, LeaderboardEntry, RoundDetail } from '@catan/shared';
import { RegistrationStatus, TournamentRole, TournamentStatus } from '@catan/shared';

// Tab indices — "My Table" is tab 1 only when the player is seated
const TAB_OVERVIEW = 0;
const TAB_MY_TABLE = 1;
const TAB_LEADERBOARD = 2;
const TAB_ROUNDS = 3;

export function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const playerView = searchParams.get('view') === 'player';
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<TDetail | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentRoundDetail, setCurrentRoundDetail] = useState<RoundDetail | null>(null);
  const [tab, setTab] = useState(TAB_OVERVIEW);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [snackMessage, setSnackMessage] = useState('');

  const { on } = useSocket(id);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [tournamentData, lb] = await Promise.all([
        tournamentsApi.get(id, user?.id),
        tournamentsApi.getLeaderboard(id).catch(() => []),
      ]);
      setTournament(tournamentData);
      setLeaderboard(lb);
      const allRounds = tournamentData.stages?.flatMap((s: any) => s.rounds) ?? [];
      const inProgress = allRounds.find((r: any) => r.status === 'IN_PROGRESS');
      if (inProgress) {
        const detail = await roundsApi.getRound(id, inProgress.id).catch(() => null);
        setCurrentRoundDetail(detail as RoundDetail | null);
      } else {
        setCurrentRoundDetail(null);
      }
    } catch {
      setError(t.tournamentDetail.failedToLoad);
    } finally {
      setLoading(false);
    }
  }, [id, user?.id, t.tournamentDetail.failedToLoad]);

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
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.tournamentDetail.registrationFailed);
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
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.tournamentDetail.checkinFailed);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/tournaments/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setSnackMessage(t.tournamentDetail.linkCopied);
    } catch {
      setSnackMessage(t.tournamentDetail.linkCopyFailed);
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!tournament) return null;

  const isOrganizer = [TournamentRole.OWNER, TournamentRole.CO_ORGANIZER, TournamentRole.STAFF].includes(tournament.myRole as TournamentRole);
  const myReg = tournament.myRegistration;
  const canRegister = isAuthenticated && !myReg && tournament.status === TournamentStatus.PUBLISHED;
  const canCheckIn = myReg?.status === RegistrationStatus.APPROVED && tournament.status === TournamentStatus.CHECKIN;

  const myTable = currentRoundDetail?.tables?.find((tbl) =>
    tbl.seats.some((s) => s.userId === user?.id),
  );
  const myTableNeedsSubmission = myTable && ['PENDING', 'DISPUTED'].includes(myTable.resultStatus as string);
  const isSeated = !!myTable;

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
              <Chip
                label={t.tournamentDetail.players
                  .replace('{registered}', String(tournament.registeredCount))
                  .replace('{max}', String(tournament.maxPlayers))}
                size="small"
                variant="outlined"
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Tooltip title={t.tournamentDetail.copyLink}>
              <Button variant="outlined" size="small" startIcon={<ContentCopyIcon />} onClick={handleCopyLink}>
                {t.tournamentDetail.copyLinkBtn}
              </Button>
            </Tooltip>
            {isOrganizer && (
              <Button variant="outlined" color="primary" onClick={() => navigate(`/tournaments/${id}/manage`)}>
                {t.tournamentDetail.organizerPanel}
              </Button>
            )}
            {canRegister && (
              <Button variant="contained" onClick={handleRegister} disabled={actionLoading}>
                {t.tournamentDetail.register}
              </Button>
            )}
            {canCheckIn && (
              <Button variant="contained" color="success" onClick={handleCheckIn} disabled={actionLoading}>
                {t.tournamentDetail.checkin}
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

      <Divider sx={{ mb: 2 }} />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label={t.tournamentDetail.tabOverview} value={TAB_OVERVIEW} />
        {isSeated && (
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {t.tournamentDetail.tabMyTable}
                {myTableNeedsSubmission && (
                  <Box
                    sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: 'warning.main',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            }
            value={TAB_MY_TABLE}
          />
        )}
        <Tab label={t.tournamentDetail.tabLeaderboard} value={TAB_LEADERBOARD} />
        <Tab label={t.tournamentDetail.tabRounds} value={TAB_ROUNDS} />
      </Tabs>

      {/* Overview */}
      {tab === TAB_OVERVIEW && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" mb={1}>Details</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2"><b>{t.tournamentDetail.detailDate}</b> {new Date(tournament.startsAt).toLocaleString()}</Typography>
              <Typography variant="body2"><b>{t.tournamentDetail.detailTimezone}</b> {tournament.timezone}</Typography>
              <Typography variant="body2">
                <b>{t.tournamentDetail.detailFormat}</b>{' '}
                {(t.formats as Record<string, string>)[tournament.format] ?? tournament.format.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="body2">
                <b>{t.tournamentDetail.detailTableGen}</b>{' '}
                {(t.tableGenModes as Record<string, string>)[tournament.tableGenerationMode] ?? tournament.tableGenerationMode}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* My Table */}
      {tab === TAB_MY_TABLE && myTable && (
        <Box>
          <Typography variant="h6" mb={2}>
            {t.tournamentDetail.myTableTitle.replace('{n}', String(currentRoundDetail?.roundNumber))}
          </Typography>
          <TableCard
            table={myTable}
            tournamentId={id!}
            currentUserId={user?.id}
            onRefresh={load}
          />
          <TableGameTools
            tournamentId={id!}
            tableId={myTable.id}
            seats={myTable.seats.map((s) => ({
              seatNumber: s.seatNumber,
              userId: s.userId ?? undefined,
              guestPlayerId: s.guestPlayerId ?? undefined,
              displayName: s.user?.displayName ?? s.guestPlayer?.name ?? 'Jugador',
            }))}
            currentUserId={user?.id}
          />
        </Box>
      )}

      {/* Leaderboard */}
      {tab === TAB_LEADERBOARD && (
        <LeaderboardTable entries={leaderboard} highlightUserId={user?.id} />
      )}

      {/* Rounds */}
      {tab === TAB_ROUNDS && (
        <Box>
          {currentRoundDetail && (
            <Box mb={3}>
              <Typography variant="h6" mb={1}>
                {t.tournamentDetail.roundInProgress.replace('{n}', String(currentRoundDetail.roundNumber))}
              </Typography>
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
                {t.tournamentDetail.stageLabel.replace('{type}', stage.type)}
              </Typography>
              {stage.rounds.map((round: any) => (
                <Box key={round.id} mb={2}>
                  <Typography variant="subtitle1" fontWeight={600} mb={1}>
                    {t.tournamentDetail.roundLabel
                      .replace('{n}', String(round.roundNumber))
                      .replace('{status}', round.status)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t.tournamentDetail.tablesCount.replace('{n}', String(round.tableCount))}
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

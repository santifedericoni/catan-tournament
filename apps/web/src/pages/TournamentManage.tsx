import { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  TextField,
  Card,
  CardContent,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';
import { tournamentsApi } from '../api/tournaments.api';
import { roundsApi } from '../api/rounds.api';
import { useAuthStore } from '../store/auth.store';
import { StatusChip } from '../components/common/StatusChip';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { ManualTableAssignmentDialog } from '../components/rounds/ManualTableAssignmentDialog';
import { TableGenerationMode, TournamentStatus, TournamentRole } from '@catan/shared';
import type { TournamentDetail, RegistrationDetail, RoundDetail, TableDetail } from '@catan/shared';
import { useTranslation } from '../hooks/useTranslation';

interface PlayerEntry {
  // participantId: userId for real users, 'guest:UUID' for guests
  participantId: string;
  displayName: string;
  isGuest: boolean;
  position: number;
  catanPoints: number;
}

// Derive a stable participant ID from a seat, matching the backend's 'guest:UUID' convention
function getSeatParticipantId(seat: any): string {
  return seat.userId ?? `guest:${seat.guestPlayerId}`;
}

function getSeatDisplayName(seat: any, unknownLabel: string): string {
  if (seat.user?.displayName) return seat.user.displayName;
  if (seat.guestPlayer?.name) return `${seat.guestPlayer.name} (guest)`;
  return unknownLabel;
}

function ResultEntryForm({
  table,
  tournamentId,
  onSubmitted,
}: {
  table: TableDetail;
  tournamentId: string;
  onSubmitted: () => void;
}) {
  const { t } = useTranslation();
  const hasResults = table.results.length > 0;

  const [entries, setEntries] = useState<PlayerEntry[]>(() =>
    table.seats.map((seat: any) => {
      const participantId = getSeatParticipantId(seat);
      const isGuest = !seat.userId;
      const existing = table.results.find((r: any) =>
        isGuest
          ? r.guestPlayerId === seat.guestPlayerId
          : r.userId === seat.userId,
      );
      return {
        participantId,
        displayName: getSeatDisplayName(seat, t.tournamentManage.unknown),
        isGuest,
        position: existing?.position ?? 1,
        catanPoints: existing?.catanPoints ?? 0,
      };
    }),
  );
  const [endedReason, setEndedReason] = useState<'NORMAL' | 'TIME_LIMIT'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);

  const updateEntry = (participantId: string, field: 'catanPoints', value: number) => {
    setEntries((prev) => {
      const newEntries = prev.map((e) => (e.participantId === participantId ? { ...e, [field]: value } : e));
      const sorted = [...newEntries].sort((a, b) => {
        if (b.catanPoints !== a.catanPoints) return b.catanPoints - a.catanPoints;
        return a.participantId.localeCompare(b.participantId);
      });
      const maxPoints = sorted[0].catanPoints;
      const isSharedFirst =
        (endedReason === 'TIME_LIMIT' || maxPoints < 10) &&
        sorted.filter((p) => p.catanPoints === maxPoints).length > 1;
      return newEntries.map((e) => {
        const index = sorted.findIndex((s) => s.participantId === e.participantId);
        let pos = index + 1;
        if (isSharedFirst && e.catanPoints === maxPoints) pos = 1;
        return { ...e, position: pos };
      });
    });
  };

  const loadSubmissions = async () => {
    try {
      const data = await roundsApi.getSubmissions(tournamentId, table.id);
      setSubmissions(data);
      setShowSubmissions(true);
    } catch {
      setError(t.tournamentManage.failedLoadSubmissions);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = entries.map(e => ({
        participantId: e.participantId,
        position: e.position,
        catanPoints: e.catanPoints,
      }));
      if (hasResults) {
        await roundsApi.correctResults(tournamentId, table.id, payload, 'Manual correction');
      } else {
        await roundsApi.submitResults(tournamentId, table.id, payload);
      }
      onSubmitted();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.tournamentManage.failedSubmitResults);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalize = async () => {
    setError('');
    setSubmitting(true);
    try {
      await roundsApi.finalizeResults(
        tournamentId, table.id,
        entries.map(e => ({ participantId: e.participantId, catanPoints: e.catanPoints })),
        endedReason,
        'Organizer override',
      );
      onSubmitted();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || t.tournamentManage.failedFinalizeResults);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor: Record<string, 'default' | 'warning' | 'success' | 'error' | 'info'> = {
    PENDING: 'default',
    CONFIRMED: 'success',
    DISPUTED: 'error',
    OFFICIAL: 'info',
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>
            {t.tournamentManage.tableTitle.replace('{n}', String(table.tableNumber))}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              label={table.resultStatus ?? 'PENDING'}
              size="small"
              color={statusColor[table.resultStatus as string] ?? 'default'}
            />
            {(table.submissionCount ?? 0) > 0 && (
              <Chip
                label={`${table.submissionCount}/${table.seats.length} submitted`}
                size="small"
                variant="outlined"
                onClick={loadSubmissions}
                sx={{ cursor: 'pointer' }}
              />
            )}
            {hasResults && <Chip label={t.tournamentManage.resultsLoaded} size="small" color="success" />}
          </Box>
        </Box>

        {table.resultStatus === 'DISPUTED' && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {t.tournamentManage.discrepancyWarning}
          </Alert>
        )}

        <FormControl size="small" sx={{ mb: 1.5 }}>
          <InputLabel>{t.tournamentManage.gameEnd}</InputLabel>
          <Select
            value={endedReason}
            label={t.tournamentManage.gameEnd}
            onChange={(e) => setEndedReason(e.target.value as 'NORMAL' | 'TIME_LIMIT')}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="NORMAL">{t.tournamentManage.gameEndNormal}</MenuItem>
            <MenuItem value="TIME_LIMIT">{t.tournamentManage.gameEndTime}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {entries.map((entry) => (
            <Box key={entry.participantId} sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ minWidth: 120, flexShrink: 0 }}>
                {entry.displayName}
              </Typography>
              <Box sx={{
                width: 80, height: 40,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider',
              }}>
                <Typography variant="body2" fontWeight={700}>{entry.position}°</Typography>
              </Box>
              <TextField
                size="small"
                label={t.tournamentManage.catanPts}
                value={entry.catanPoints === 0 ? '' : entry.catanPoints}
                placeholder={t.tournamentManage.ptsRange}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  const val = raw === '' ? 0 : Math.min(10, parseInt(raw, 10));
                  updateEntry(entry.participantId, 'catanPoints', val);
                }}
                sx={{ width: 110 }}
                inputProps={{ inputMode: 'numeric' }}
              />
              {entry.catanPoints >= 10 && entry.position === 1 && (
                <Chip label="1 VP" size="small" color="primary" />
              )}
              {entry.catanPoints > 0 && entry.catanPoints < 10 && entry.position === 1 && (
                <Chip label="½ VP" size="small" color="warning" variant="outlined" />
              )}
            </Box>
          ))}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}

        <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
          <Button variant="contained" size="small" onClick={handleSubmit} disabled={submitting}>
            {hasResults ? t.tournamentManage.correct : t.tournamentManage.saveBtn}
          </Button>
          <Button variant="outlined" size="small" color="warning" onClick={handleFinalize} disabled={submitting}>
            {t.tournamentManage.finalizeBtn}
          </Button>
        </Box>

        {/* Submissions comparison dialog */}
        <Dialog open={showSubmissions} onClose={() => setShowSubmissions(false)} maxWidth="md" fullWidth>
          <DialogTitle>{t.tournamentManage.submissionsTitle.replace('{n}', String(table.tableNumber))}</DialogTitle>
          <DialogContent>
            {submissions.length === 0 ? (
              <Typography color="text.secondary">{t.tournamentManage.noSubmissions}</Typography>
            ) : (
              submissions.map((sub: any) => (
                <Box key={sub.id} mb={2} p={1.5} border={1} borderColor="divider" borderRadius={1}>
                  <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                    {sub.user?.displayName ?? sub.submittedBy} — {sub.endedReason} — {new Date(sub.createdAt).toLocaleString()}
                  </Typography>
                  {(sub.payload as Array<{ userId: string; catanPoints: number }>).map((entry) => {
                    const seat = table.seats.find((s) => s.userId === entry.userId);
                    return (
                      <Typography key={entry.userId} variant="body2">
                        {seat?.user.displayName ?? entry.userId}: {entry.catanPoints} pts
                      </Typography>
                    );
                  })}
                </Box>
              ))
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowSubmissions(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function OrganizersPanel({ tournamentId, myRole }: { tournamentId: string; myRole: string }) {
  const { t } = useTranslation();
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isOwner = myRole === TournamentRole.OWNER;

  const load = useCallback(async () => {
    try {
      const data = await tournamentsApi.listOrganizers(tournamentId);
      setOrganizers(data);
    } catch { /* ignore */ }
  }, [tournamentId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await tournamentsApi.addCoOrganizer(tournamentId, email.trim());
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
      await tournamentsApi.removeCoOrganizer(tournamentId, userId);
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
      <Typography variant="h6" mb={2}>{t.tournamentManage.organizersTitle}</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t.tournamentManage.colName}</TableCell>
              <TableCell>{t.tournamentManage.colEmail}</TableCell>
              <TableCell>{t.tournamentManage.colRole}</TableCell>
              {isOwner && <TableCell align="right">{t.tournamentManage.colActions}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {organizers.map((org) => (
              <TableRow key={org.id}>
                <TableCell>{org.user?.displayName}</TableCell>
                <TableCell>{org.user?.email}</TableCell>
                <TableCell>
                  <Chip label={org.role.replace('_', ' ')} size="small" color={roleColor[org.role] ?? 'default'} />
                </TableCell>
                {isOwner && (
                  <TableCell align="right">
                    {org.role === 'CO_ORGANIZER' && (
                      <Button size="small" color="error" variant="outlined" onClick={() => handleRemove(org.user.id)} disabled={loading}>
                        {t.tournamentManage.removePlayer}
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {isOwner && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" mb={1}>{t.tournamentManage.addCoOrg}</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              size="small"
              label={t.tournamentManage.userEmail}
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
      )}
    </Box>
  );
}


function GuestPlayersPanel({ tournamentId, onChanged }: { tournamentId: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const [guestName, setGuestName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAdd = async () => {
    if (!guestName.trim()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await tournamentsApi.addGuestPlayer(tournamentId, guestName.trim());
      setGuestName('');
      setSuccess(`"${guestName.trim()}" added as guest`);
      onChanged();
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error adding guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" mb={1}>{t.tournamentManage.addGuestPlayer}</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          label={t.tournamentManage.guestName}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          sx={{ minWidth: 220 }}
          disabled={loading}
        />
        <Button variant="contained" size="small" onClick={handleAdd} disabled={loading || !guestName.trim()}>
          {t.common.add}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 1 }}>{success}</Alert>}
    </Box>
  );
}


export function TournamentManage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [auditLog, setAuditLog] = useState<unknown[]>([]);
  const [currentRoundDetail, setCurrentRoundDetail] = useState<RoundDetail | null>(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [tableMode, setTableMode] = useState<TableGenerationMode>(TableGenerationMode.RANDOM);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualRoundId, setManualRoundId] = useState<string | null>(null);
  const [manualRoundNumber, setManualRoundNumber] = useState<number>(1);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [tournamentData, regs] = await Promise.all([
        tournamentsApi.get(id, user?.id),
        tournamentsApi.getRegistrations(id).catch(() => []),
      ]);
      setTournament(tournamentData);
      setRegistrations(regs);
    } catch {
      setError('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab !== 2 || !tournament || !id) return;
    const allRounds = tournament.stages?.flatMap((s) => s.rounds) ?? [];
    const inProgressRound = allRounds.find((r) => r.status === 'IN_PROGRESS');
    if (!inProgressRound) { setCurrentRoundDetail(null); return; }
    roundsApi.getRound(id, inProgressRound.id)
      .then((detail) => setCurrentRoundDetail(detail as RoundDetail))
      .catch(() => setCurrentRoundDetail(null));
  }, [tab, tournament, id]);

  const handleTransition = async (action: string) => {
    if (!id) return;
    setActionLoading(true);
    setSuccessMsg('');
    setActionError('');
    try {
      if (action === 'publish') await tournamentsApi.publish(id);
      else if (action === 'start-checkin') await tournamentsApi.startCheckin(id);
      else if (action === 'start') await tournamentsApi.start(id);
      else if (action === 'finish') await tournamentsApi.finish(id);
      else if (action === 'cancel') await tournamentsApi.cancel(id);
      await load();
      setSuccessMsg(`Tournament ${action}ed successfully`);
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegistrationAction = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'REMOVED') => {
    if (!id) return;
    setActionLoading(true);
    setSuccessMsg('');
    setActionError('');
    try {
      await tournamentsApi.updateRegistration(id, userId, status);
      await load();
      setSuccessMsg('Registration updated');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateStage = async (type: string) => {
    if (!id) return;
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.createStage(id, type);
      await load();
      setSuccessMsg('Stage created successfully');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create stage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRound = async (stageId: string) => {
    if (!id) return;
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.createRound(id, stageId);
      await load();
      setSuccessMsg('Round created successfully');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create round');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateTables = async (roundId: string, roundNumber: number) => {
    if (!id) return;
    if (tableMode === TableGenerationMode.MANUAL) {
      setManualRoundId(roundId);
      setManualRoundNumber(roundNumber);
      setManualDialogOpen(true);
      return;
    }
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.generateTables(id, roundId, tableMode, undefined);
      const detail = await roundsApi.getRound(id, roundId);
      setCurrentRoundDetail(detail as RoundDetail);
      setSuccessMsg('Tables generated successfully');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate tables');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualConfirm = async (tables: { tableNumber: number; playerIds: string[] }[]) => {
    if (!id || !manualRoundId) return;
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.generateTables(id, manualRoundId, TableGenerationMode.MANUAL, { tables });
      const detail = await roundsApi.getRound(id, manualRoundId);
      setCurrentRoundDetail(detail as RoundDetail);
      setSuccessMsg('Tables generated successfully');
      setManualDialogOpen(false);
      setManualRoundId(null);
      await load();
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to generate tables');
      throw e;
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartRound = async (roundId: string) => {
    if (!id) return;
    try {
      await roundsApi.startRound(id, roundId);
      await load();
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to start round');
    }
  };

  const handleCloseRound = async (roundId: string) => {
    if (!id) return;
    try {
      await roundsApi.closeRound(id, roundId);
      await load();
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to close round');
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!id || !window.confirm(t.tournamentManage.deleteStageConfirm)) return;
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.deleteStage(id, stageId);
      await load();
      setSuccessMsg('Stage deleted successfully');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete stage');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteRound = async (roundId: string) => {
    if (!id || !window.confirm(t.tournamentManage.deleteRoundConfirm)) return;
    setActionLoading(true);
    setSuccessMsg('');
    try {
      await roundsApi.deleteRound(id, roundId);
      await load();
      setSuccessMsg('Round deleted successfully');
    } catch (e: unknown) {
      setActionError((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to delete round');
    } finally {
      setActionLoading(false);
    }
  };

  const reloadCurrentRound = useCallback(async () => {
    if (!id || !currentRoundDetail) return;
    const detail = await roundsApi.getRound(id, currentRoundDetail.id);
    setCurrentRoundDetail(detail as RoundDetail);
  }, [id, currentRoundDetail]);

  const loadAuditLog = async () => {
    if (!id) return;
    const log = await tournamentsApi.getAuditLog(id);
    setAuditLog(log);
  };

  useEffect(() => {
    if (tab === 5) loadAuditLog();
    if (tab === 3 && id) {
      tournamentsApi.getLeaderboard(id).then(setLeaderboard).catch(() => setLeaderboard([]));
    }
  }, [tab, id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!tournament) return null;

  const tournamentData = tournament;
  const myRole = tournamentData.myRole ?? '';

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>{tournamentData.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <StatusChip status={tournamentData.status} />
            <Chip label="Organizer Panel" size="small" color="primary" />
            {myRole && <Chip label={myRole.replace('_', ' ')} size="small" color={myRole === 'OWNER' ? 'primary' : 'secondary'} variant="outlined" />}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {tournamentData.status === TournamentStatus.DRAFT && (
            <Button variant="contained" color="success" onClick={() => handleTransition('publish')}>{t.tournamentManage.btnPublish}</Button>
          )}
          {tournamentData.status === TournamentStatus.PUBLISHED && (
            <Button variant="contained" color="warning" onClick={() => handleTransition('start-checkin')}>{t.tournamentManage.btnCheckin}</Button>
          )}
          {tournamentData.status === TournamentStatus.CHECKIN && (
            <Button variant="contained" color="success" onClick={() => handleTransition('start')}>{t.tournamentManage.btnStart}</Button>
          )}
          {tournamentData.status === TournamentStatus.RUNNING && (
            <Button variant="contained" color="primary" onClick={() => handleTransition('finish')}>{t.tournamentManage.btnClose}</Button>
          )}
          {![TournamentStatus.FINISHED, TournamentStatus.CANCELLED].includes(tournamentData.status as TournamentStatus) && (
            <Button variant="outlined" color="error" onClick={() => handleTransition('cancel')}>{t.tournamentManage.btnCancel}</Button>
          )}
          <Button variant="outlined" onClick={() => navigate(`/tournaments/${id}?view=player`)}>{t.tournamentManage.btnPlayerView}</Button>
        </Box>
      </Box>

      {actionLoading && <Box sx={{ mb: 2 }}><CircularProgress size={24} sx={{ mr: 1 }} /> {t.tournamentManage.btnProcessing}</Box>}

      <Snackbar open={!!actionError} autoHideDuration={6000} onClose={() => setActionError('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" onClose={() => setActionError('')} sx={{ width: '100%' }}>{actionError}</Alert>
      </Snackbar>

      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ width: '100%' }}>{successMsg}</Alert>
      </Snackbar>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable">
        <Tab label={`${t.tournamentManage.tabRegistrations} (${registrations.length})`} />
        <Tab label={t.tournamentManage.tabStages} />
        <Tab label={t.tournamentManage.tabResults} />
        <Tab label={t.tournamentManage.tabLeaderboard} />
        <Tab label={t.tournamentManage.tabOrganizers} />
        <Tab label={t.tournamentManage.tabAuditLog} />
      </Tabs>

      {/* Registrations tab */}
      {tab === 0 && (
        <Box>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t.tournamentManage.colPlayer}</TableCell>
                  <TableCell>{t.tournamentManage.colAlias}</TableCell>
                  <TableCell>{t.tournamentManage.colElo}</TableCell>
                  <TableCell>{t.tournamentManage.colStatus}</TableCell>
                  <TableCell align="right">{t.tournamentManage.colActions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {registrations.map((reg) => {
                  const isGuest = (reg as any).playerType === 'guest';
                  const displayName = isGuest
                    ? (reg as any).guestPlayer?.name ?? 'Guest'
                    : reg.user?.displayName;
                  const guestPlayerId = (reg as any).guestPlayerId;
                  return (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {displayName}
                          {isGuest && <Chip label={t.common.guest} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 18 }} />}
                        </Box>
                      </TableCell>
                      <TableCell>{!isGuest && reg.user?.alias ? `@${reg.user.alias}` : '—'}</TableCell>
                      <TableCell>{!isGuest && reg.user?.stats?.eloRating ? Math.round(reg.user.stats.eloRating) : '—'}</TableCell>
                      <TableCell><StatusChip status={reg.status} type="registration" /></TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                          {!isGuest && reg.status === 'REQUESTED' && (
                            <>
                              <Button size="small" variant="contained" color="success" onClick={() => handleRegistrationAction(reg.userId!, 'APPROVED')}>{t.tournamentManage.approve}</Button>
                              <Button size="small" variant="outlined" color="error" onClick={() => handleRegistrationAction(reg.userId!, 'REJECTED')}>{t.tournamentManage.reject}</Button>
                            </>
                          )}
                          {!isGuest && ['APPROVED', 'CHECKED_IN', 'WAITLIST'].includes(reg.status) && (
                            <Button size="small" variant="outlined" color="error" onClick={() => handleRegistrationAction(reg.userId!, 'REMOVED')}>{t.tournamentManage.removePlayer}</Button>
                          )}
                          {isGuest && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={async () => {
                                if (!id || !guestPlayerId) return;
                                try {
                                  await tournamentsApi.removeGuestPlayer(id, guestPlayerId);
                                  await load();
                                } catch { /* ignore */ }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {id && (myRole === 'OWNER' || myRole === 'CO_ORGANIZER' || myRole === 'STAFF') && (
            <Box>
              <Divider sx={{ mb: 2 }} />
              <GuestPlayersPanel tournamentId={id} onChanged={load} />
            </Box>
          )}
        </Box>
      )}

      {/* Stages & Rounds tab */}
      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Button variant="outlined" onClick={() => handleCreateStage('QUALIFIER')}>{t.tournamentManage.addQualifier}</Button>
            <Button variant="outlined" onClick={() => handleCreateStage('SEMIFINAL')}>{t.tournamentManage.addSemifinal}</Button>
            <Button variant="outlined" onClick={() => handleCreateStage('FINAL')}>{t.tournamentManage.addFinal}</Button>
          </Box>

          <FormControl size="small" sx={{ mb: 2, minWidth: 200 }}>
            <InputLabel>{t.tournamentManage.tableGenerationMode}</InputLabel>
            <Select
              value={tableMode}
              label={t.tournamentManage.tableGenerationMode}
              onChange={(e) => {
                setTableMode(e.target.value as TableGenerationMode);
              }}
            >
              <MenuItem value={TableGenerationMode.RANDOM}>{t.tableGenModes.RANDOM}</MenuItem>
              <MenuItem value={TableGenerationMode.BALANCED}>{t.tableGenModes.BALANCED}</MenuItem>
              <MenuItem value={TableGenerationMode.MANUAL}>{t.tableGenModes.MANUAL}</MenuItem>
            </Select>
          </FormControl>

          {tournamentData.stages?.map((stage) => (
            <Box key={stage.id} mb={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t.tournamentManage.stageLabel.replace('{type}', stage.type)}</Typography>
                <Button size="small" variant="text" color="error" onClick={() => handleDeleteStage(stage.id)}>{t.tournamentManage.deleteStage}</Button>
              </Box>
              <Button size="small" variant="outlined" sx={{ mb: 2 }} onClick={() => handleCreateRound(stage.id)}>{t.tournamentManage.createRound}</Button>
              {stage.rounds.map((round) => (
                <Box key={round.id} mb={2} p={2} border={1} borderColor="divider" borderRadius={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {t.tournamentManage.roundLabel.replace('{n}', String(round.roundNumber))} <StatusChip status={round.status} />
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {round.status === 'PENDING' && (
                        <>
                          <Button size="small" variant="outlined" onClick={() => handleGenerateTables(round.id, round.roundNumber)}>
                            {t.tournamentManage.generateTables.replace('{mode}', tableMode)}
                          </Button>
                          <Button size="small" variant="contained" onClick={() => handleStartRound(round.id)}>{t.tournamentManage.startRound}</Button>
                          <Button size="small" variant="text" color="error" onClick={() => handleDeleteRound(round.id)}>{t.tournamentManage.deleteRound}</Button>
                        </>
                      )}
                      {round.status === 'IN_PROGRESS' && (
                        <Button size="small" variant="contained" color="warning" onClick={() => handleCloseRound(round.id)}>{t.tournamentManage.closeRound}</Button>
                      )}
                    </Box>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {t.tournamentManage.tablesCount.replace('{n}', String(round.tableCount))}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      )}

      {/* Results tab */}
      {tab === 2 && (
        <Box>
          {!currentRoundDetail ? (
            <Alert severity="info">{t.tournamentManage.noRoundInProgress}</Alert>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  {t.tournamentManage.roundResultsTitle.replace('{n}', String(currentRoundDetail.roundNumber))}
                </Typography>
                <Button size="small" variant="outlined" onClick={reloadCurrentRound}>{t.common.refresh}</Button>
              </Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                {t.tournamentManage.resultEntryHelp}
              </Alert>
              <Grid container spacing={2}>
                {currentRoundDetail.tables.map((table) => (
                  <Grid item xs={12} md={6} key={table.id}>
                    <ResultEntryForm table={table} tournamentId={id!} onSubmitted={reloadCurrentRound} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {/* Leaderboard tab */}
      {tab === 3 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">{t.tournamentManage.leaderboardTitle}</Typography>
            <Button size="small" variant="outlined" onClick={() => id && tournamentsApi.getLeaderboard(id).then(setLeaderboard).catch(() => {})}>
              {t.common.refresh}
            </Button>
          </Box>
          <LeaderboardTable entries={leaderboard} highlightUserId={user?.id} />
        </Box>
      )}

      {/* Organizers tab */}
      {tab === 4 && id && (
        <OrganizersPanel tournamentId={id} myRole={myRole} />
      )}

      {/* Audit Log tab */}
      {tab === 5 && (
        <Box>
          {auditLog.map((entry: unknown, i) => {
            const e = entry as { id?: string; action: string; actor?: { displayName: string }; createdAt: string };
            return (
              <Box key={e.id ?? i} sx={{ display: 'flex', gap: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 140 }}>{new Date(e.createdAt).toLocaleString()}</Typography>
                <Typography variant="caption" fontWeight={700}>{e.actor?.displayName ?? 'System'}</Typography>
                <Typography variant="caption">{e.action.replace(/_/g, ' ')}</Typography>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Manual table assignment dialog */}
      {(() => {
        const approvedRegs = registrations.filter((r) =>
          ['APPROVED', 'CHECKED_IN'].includes(r.status),
        );
        const playerOptions = approvedRegs.map((r: any) => ({
          id: r.userId ?? `guest:${r.guestPlayerId}`,
          name: r.userId ? (r.user?.displayName ?? r.userId) : (r.guestPlayer?.name ?? 'Guest'),
        }));
        return (
          <ManualTableAssignmentDialog
            open={manualDialogOpen}
            onClose={() => { setManualDialogOpen(false); setManualRoundId(null); }}
            onConfirm={handleManualConfirm}
            playerOptions={playerOptions}
            roundNumber={manualRoundNumber}
          />
        );
      })()}
    </Box>
  );
}

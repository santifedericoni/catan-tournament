import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
} from '@mui/material';
import { roundsApi } from '../../api/rounds.api';
import type { SeatDetail } from '@catan/shared';
import { useTranslation } from '../../hooks/useTranslation';

interface PlayerSubmitModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  tournamentId: string;
  tableId: string;
  tableNumber: number;
  seats: SeatDetail[];
}

// Stable participant ID: userId for real users, 'guest:guestPlayerId' for guests
function getParticipantId(seat: SeatDetail): string {
  return seat.userId ?? `guest:${(seat as any).guestPlayerId}`;
}

function getParticipantName(seat: SeatDetail): string {
  return seat.user?.displayName ?? (seat as any).guestPlayer?.name ?? 'Invitado';
}

export function PlayerSubmitModal({
  open,
  onClose,
  onSubmitted,
  tournamentId,
  tableId,
  tableNumber,
  seats,
}: PlayerSubmitModalProps) {
  const { t } = useTranslation();
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(seats.map((s) => [getParticipantId(s), 0])),
  );
  const [endedReason, setEndedReason] = useState<'NORMAL' | 'TIME_LIMIT'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate positions for display
  const sorted = [...seats].sort((a, b) => {
    const pid_a = getParticipantId(a);
    const pid_b = getParticipantId(b);
    const diff = (scores[pid_b] ?? 0) - (scores[pid_a] ?? 0);
    if (diff !== 0) return diff;
    return pid_a.localeCompare(pid_b);
  });
  const maxPts = scores[getParticipantId(sorted[0])] ?? 0;
  const isSharedFirst =
    (endedReason === 'TIME_LIMIT' || maxPts < 10) &&
    sorted.filter((s) => (scores[getParticipantId(s)] ?? 0) === maxPts).length > 1;

  const getPosition = (pid: string) => {
    const idx = sorted.findIndex((s) => getParticipantId(s) === pid);
    const pts = scores[pid] ?? 0;
    if (isSharedFirst && pts === maxPts) return 1;
    return idx + 1;
  };

  const getVP = (pid: string) => {
    const pos = getPosition(pid);
    if (pos !== 1) return null;
    const pts = scores[pid] ?? 0;
    const tiedAt9 = endedReason === 'TIME_LIMIT' && isSharedFirst && pts === 9;
    if (tiedAt9) return t.playerSubmit.halfVP;
    if (endedReason === 'NORMAL' && pts >= 10) return t.playerSubmit.oneVP;
    return t.playerSubmit.halfVP;
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const results = seats.map((s) => ({ userId: s.userId, catanPoints: scores[getParticipantId(s)] ?? 0 }));
      await roundsApi.submitPlayerScores(tournamentId, tableId, results, endedReason);
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t.playerSubmit.errorSubmit,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {t.playerSubmit.title.replace('{n}', String(tableNumber))}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          {t.playerSubmit.helpText}
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            {t.playerSubmit.gameEnd}
          </Typography>
          <ToggleButtonGroup
            value={endedReason}
            exclusive
            onChange={(_, v) => { if (v) setEndedReason(v); }}
            size="small"
          >
            <ToggleButton value="NORMAL">{t.playerSubmit.gameEndNormal}</ToggleButton>
            <ToggleButton value="TIME_LIMIT">{t.playerSubmit.gameEndTime}</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {seats.map((seat) => {
            const pid = getParticipantId(seat);
            const pos = getPosition(pid);
            const vp = getVP(pid);
            return (
              <Box key={pid} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: pos === 1 ? 'primary.main' : 'action.hover',
                    color: pos === 1 ? 'white' : 'text.primary',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {pos}°
                </Box>
                <Typography variant="body2" sx={{ minWidth: 120, flexShrink: 0 }}>
                  {getParticipantName(seat)}
                </Typography>
                <TextField
                  size="small"
                  label={t.playerSubmit.catanPts}
                  value={scores[pid] === 0 ? '' : scores[pid]}
                  placeholder={t.playerSubmit.ptsRange}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const val = raw === '' ? 0 : Math.min(10, parseInt(raw, 10));
                    setScores((prev) => ({ ...prev, [pid]: val }));
                  }}
                  sx={{ width: 100 }}
                  inputProps={{ inputMode: 'numeric' }}
                />
                {vp && (
                  <Chip
                    label={vp}
                    size="small"
                    color={vp === t.playerSubmit.oneVP ? 'primary' : 'warning'}
                    variant={vp === t.playerSubmit.oneVP ? 'filled' : 'outlined'}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>{t.playerSubmit.cancel}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? t.playerSubmit.submitting : t.playerSubmit.submit}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

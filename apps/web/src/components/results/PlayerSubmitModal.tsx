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

interface PlayerSubmitModalProps {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  tournamentId: string;
  tableId: string;
  tableNumber: number;
  seats: SeatDetail[];
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
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(seats.map((s) => [s.userId, 0])),
  );
  const [endedReason, setEndedReason] = useState<'NORMAL' | 'TIME_LIMIT'>('NORMAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-calculate positions for display
  const sorted = [...seats].sort((a, b) => {
    const diff = (scores[b.userId] ?? 0) - (scores[a.userId] ?? 0);
    if (diff !== 0) return diff;
    return a.userId.localeCompare(b.userId);
  });
  const maxPts = scores[sorted[0]?.userId] ?? 0;
  const isSharedFirst =
    (endedReason === 'TIME_LIMIT' || maxPts < 10) &&
    sorted.filter((s) => (scores[s.userId] ?? 0) === maxPts).length > 1;

  const getPosition = (userId: string) => {
    const idx = sorted.findIndex((s) => s.userId === userId);
    const pts = scores[userId] ?? 0;
    if (isSharedFirst && pts === maxPts) return 1;
    return idx + 1;
  };

  const getVP = (userId: string) => {
    const pos = getPosition(userId);
    if (pos !== 1) return null;
    const pts = scores[userId] ?? 0;
    const tiedAt9 = endedReason === 'TIME_LIMIT' && isSharedFirst && pts === 9;
    if (tiedAt9) return '½ VP';
    if (endedReason === 'NORMAL' && pts >= 10) return '1 VP';
    return '½ VP';
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const results = seats.map((s) => ({ userId: s.userId, catanPoints: scores[s.userId] ?? 0 }));
      await roundsApi.submitPlayerScores(tournamentId, tableId, results, endedReason);
      onSubmitted();
      onClose();
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Error submitting scores',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Submit scores — Table {tableNumber}
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          Enter the real Catan points for each player as the game ended.
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
            How did the game end?
          </Typography>
          <ToggleButtonGroup
            value={endedReason}
            exclusive
            onChange={(_, v) => { if (v) setEndedReason(v); }}
            size="small"
          >
            <ToggleButton value="NORMAL">Normal (someone reached 10+)</ToggleButton>
            <ToggleButton value="TIME_LIMIT">By time</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {seats.map((seat) => {
            const pos = getPosition(seat.userId);
            const vp = getVP(seat.userId);
            return (
              <Box key={seat.userId} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
                  {seat.user.displayName}
                </Typography>
                <TextField
                  size="small"
                  label="Catan Pts"
                  value={scores[seat.userId] === 0 ? '' : scores[seat.userId]}
                  placeholder="0–10"
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const val = raw === '' ? 0 : Math.min(10, parseInt(raw, 10));
                    setScores((prev) => ({ ...prev, [seat.userId]: val }));
                  }}
                  sx={{ width: 100 }}
                  inputProps={{ inputMode: 'numeric' }}
                />
                {vp && (
                  <Chip
                    label={vp}
                    size="small"
                    color={vp === '1 VP' ? 'primary' : 'warning'}
                    variant={vp === '1 VP' ? 'filled' : 'outlined'}
                  />
                )}
              </Box>
            );
          })}
        </Box>

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit scores'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Alert,
  CircularProgress,
  IconButton,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../../hooks/useTranslation';

interface PlayerOption {
  id: string;
  name: string;
}

interface ManualTableAssignmentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tables: { tableNumber: number; playerIds: string[] }[]) => Promise<void>;
  playerOptions: PlayerOption[];
  roundNumber: number;
}

export function ManualTableAssignmentDialog({
  open,
  onClose,
  onConfirm,
  playerOptions,
  roundNumber,
}: ManualTableAssignmentDialogProps) {
  const { t } = useTranslation();
  const initialTableCount = Math.max(1, Math.ceil(playerOptions.length / 4));

  const [tables, setTables] = useState<string[][]>(() =>
    Array.from({ length: initialTableCount }, () => []),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      const count = Math.max(1, Math.ceil(playerOptions.length / 4));
      setTables(Array.from({ length: count }, () => []));
      setError('');
    }
  }, [open, playerOptions.length]);

  const allAssigned = useMemo(() => tables.flat(), [tables]);
  const unassigned = playerOptions.length - allAssigned.length;
  const isValid = tables.every((t) => t.length >= 3);

  const availableOptions = useMemo(
    () => playerOptions.filter((p) => !allAssigned.includes(p.id)),
    [playerOptions, allAssigned],
  );

  const addPlayerToTable = (tableIdx: number, playerId: string) => {
    setTables((prev) =>
      prev.map((t, i) => {
        if (i !== tableIdx) return t;
        if (t.includes(playerId) || t.length >= 4) return t;
        return [...t, playerId];
      }),
    );
  };

  const removePlayerFromTable = (tableIdx: number, playerId: string) => {
    setTables((prev) =>
      prev.map((t, i) => (i === tableIdx ? t.filter((id) => id !== playerId) : t)),
    );
  };

  const addTable = () => setTables((prev) => [...prev, []]);

  const removeTable = (tableIdx: number) => {
    setTables((prev) => prev.filter((_, i) => i !== tableIdx));
  };

  const handleConfirm = async () => {
    if (!isValid) {
      setError(t.manualAssignment.validationMin);
      return;
    }
    setError('');
    setConfirming(true);
    try {
      await onConfirm(
        tables.map((playerIds, i) => ({ tableNumber: i + 1, playerIds })),
      );
    } catch (e: unknown) {
      setError(
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          t.manualAssignment.errorConfirm,
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={700}>
          {t.manualAssignment.title.replace('{n}', String(roundNumber))}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {unassigned > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {unassigned === 1
              ? t.manualAssignment.unassigned.replace('{n}', String(unassigned))
              : t.manualAssignment.unassigned_plural.replace('{n}', String(unassigned))}
          </Alert>
        )}

        <Grid container spacing={2}>
          {tables.map((table, tableIdx) => {
            const assignedPlayers = table.map(
              (id) => playerOptions.find((p) => p.id === id)!,
            ).filter(Boolean);
            const tableAvailable = availableOptions;
            const isFull = table.length >= 4;

            return (
              <Grid item xs={12} md={6} key={tableIdx}>
                <Card
                  variant="outlined"
                  sx={{
                    borderColor: table.length < 3 ? 'error.main' : 'divider',
                    borderWidth: table.length < 3 ? 2 : 1,
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1.5,
                      }}
                    >
                      <Typography variant="subtitle1" fontWeight={700}>
                        {t.manualAssignment.tableLabel.replace('{n}', String(tableIdx + 1))}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="caption"
                          color={table.length < 3 ? 'error' : 'text.secondary'}
                        >
                          {t.manualAssignment.tableSeats.replace('{n}', String(table.length))}{table.length < 3 && ` ${t.manualAssignment.tableMin}`}
                        </Typography>
                        {tables.length > 1 && (
                          <Button
                            size="small"
                            color="error"
                            variant="text"
                            sx={{ minWidth: 0, px: 0.5 }}
                            onClick={() => removeTable(tableIdx)}
                          >
                            {t.manualAssignment.removePlayer}
                          </Button>
                        )}
                      </Box>
                    </Box>

                    {/* Assigned players as chips */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5, minHeight: 32 }}>
                      {assignedPlayers.map((player) => (
                        <Chip
                          key={player.id}
                          label={player.name}
                          size="small"
                          onDelete={() => removePlayerFromTable(tableIdx, player.id)}
                        />
                      ))}
                      {assignedPlayers.length === 0 && (
                        <Typography variant="caption" color="text.disabled">
                          {t.manualAssignment.noPlayersAssigned}
                        </Typography>
                      )}
                    </Box>

                    {/* Search autocomplete */}
                    {!isFull && (
                      <Autocomplete
                        options={tableAvailable}
                        getOptionLabel={(o) => o.name}
                        onChange={(_, value) => {
                          if (value) addPlayerToTable(tableIdx, value.id);
                        }}
                        value={null}
                        blurOnSelect
                        clearOnBlur
                        size="small"
                        noOptionsText={t.manualAssignment.noPlayersAvailable}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label={t.manualAssignment.searchPlayer}
                            placeholder={t.manualAssignment.typeAName}
                            size="small"
                          />
                        )}
                      />
                    )}
                    {isFull && (
                      <Typography variant="caption" color="text.secondary">
                        {t.manualAssignment.tableFull}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}

          {/* Add table button */}
          <Grid item xs={12}>
            <Button
              variant="outlined"
              size="small"
              onClick={addTable}
              disabled={allAssigned.length >= playerOptions.length}
            >
              {t.manualAssignment.addTable}
            </Button>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={confirming}>
          {t.manualAssignment.cancel}
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!isValid || confirming}
          startIcon={confirming ? <CircularProgress size={16} /> : undefined}
        >
          {confirming ? t.manualAssignment.confirming : t.manualAssignment.confirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

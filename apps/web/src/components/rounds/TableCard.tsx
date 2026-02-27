import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  Typography,
  Chip,
  Box,
  Divider,
  Button,
} from '@mui/material';
import type { TableDetail } from '@catan/shared';
import { TableResultStatus } from '@catan/shared';
import { PlayerSubmitModal } from '../results/PlayerSubmitModal';

interface TableCardProps {
  table: TableDetail;
  tournamentId: string;
  currentUserId?: string;
  showResults?: boolean;
  onRefresh?: () => void;
}

const POSITION_LABELS: Record<number, string> = { 1: '🥇 1st', 2: '🥈 2nd', 3: '🥉 3rd', 4: '4th' };

const STATUS_CHIP: Record<TableResultStatus, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
  [TableResultStatus.PENDING]: { label: 'Pendiente', color: 'default' },
  [TableResultStatus.CONFIRMED]: { label: 'Confirmado', color: 'success' },
  [TableResultStatus.DISPUTED]: { label: 'Disputado', color: 'error' },
  [TableResultStatus.OFFICIAL]: { label: 'Oficial', color: 'info' },
};

export function TableCard({ table, tournamentId, currentUserId, showResults = true, onRefresh }: TableCardProps) {
  const isMyTable = table.seats.some((s) => s.userId === currentUserId);
  const hasResults = table.results.length > 0;
  const [submitOpen, setSubmitOpen] = React.useState(false);

  // Check if current user has already submitted (can't know without a separate call, use soft hint)
  const statusInfo = STATUS_CHIP[table.resultStatus as TableResultStatus] ?? { label: table.resultStatus, color: 'default' as const };
  const needsSubmission = isMyTable && ['PENDING', 'DISPUTED'].includes(table.resultStatus as string);

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          border: isMyTable ? '2px solid' : '1px solid',
          borderColor: isMyTable ? 'secondary.main' : 'divider',
          bgcolor: isMyTable ? 'rgba(212,160,23,0.05)' : 'background.paper',
        }}
      >
        <CardHeader
          title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="subtitle1" fontWeight={700}>
                Mesa {table.tableNumber}
              </Typography>
              {isMyTable && <Chip label="Tu mesa" size="small" color="secondary" />}
              <Chip label={statusInfo.label} size="small" color={statusInfo.color} />
              {table.hasOpenDispute && <Chip label="Disputa" size="small" color="error" />}
              {table.submissionCount > 0 && (
                <Chip
                  label={`${table.submissionCount}/${table.seats.length} enviaron`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          }
          sx={{ pb: 0 }}
        />
        <CardContent>
          <List dense disablePadding>
            {table.seats.map((seat, idx) => {
              const result = table.results.find((r) => r.userId === seat.userId);
              return (
                <React.Fragment key={seat.id}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{
                      bgcolor: seat.userId === currentUserId ? 'rgba(212,160,23,0.1)' : 'transparent',
                      borderRadius: 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={seat.userId === currentUserId ? 700 : 400}>
                            {seat.user.displayName}
                            {seat.user.alias && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                @{seat.user.alias}
                              </Typography>
                            )}
                          </Typography>
                          {showResults && result && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                {POSITION_LABELS[result.position]}
                              </Typography>
                              <Chip
                                label={`${result.catanPoints} pts`}
                                size="small"
                                color={result.position === 1 ? 'success' : 'default'}
                              />
                              {result.victoryPoints > 0 && (
                                <Chip
                                  label={`${result.victoryPoints === 1 ? '1' : result.victoryPoints === 0.5 ? '½' : result.victoryPoints} VP`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>

          {showResults && !hasResults && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Resultados pendientes...
            </Typography>
          )}

          {needsSubmission && (
            <Button
              variant="contained"
              color="warning"
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={() => setSubmitOpen(true)}
            >
              Cargar mis puntajes
            </Button>
          )}
        </CardContent>
      </Card>

      <PlayerSubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => { setSubmitOpen(false); onRefresh?.(); }}
        tournamentId={tournamentId}
        tableId={table.id}
        tableNumber={table.tableNumber}
        seats={table.seats}
      />
    </>
  );
}

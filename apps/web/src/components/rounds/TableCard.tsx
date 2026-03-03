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
import { useTranslation } from '../../hooks/useTranslation';

interface TableCardProps {
  table: TableDetail;
  tournamentId: string;
  currentUserId?: string;
  showResults?: boolean;
  onRefresh?: () => void;
}

export function TableCard({ table, tournamentId, currentUserId, showResults = true, onRefresh }: TableCardProps) {
  const { t } = useTranslation();
  const isMyTable = table.seats.some((s) => s.userId === currentUserId);
  const hasResults = table.results.length > 0;
  const [submitOpen, setSubmitOpen] = React.useState(false);

  const POSITION_LABELS: Record<number, string> = {
    1: t.tableCard.position1,
    2: t.tableCard.position2,
    3: t.tableCard.position3,
    4: t.tableCard.position4,
  };

  const STATUS_CHIP: Record<TableResultStatus, { label: string; color: 'default' | 'warning' | 'success' | 'error' | 'info' }> = {
    [TableResultStatus.PENDING]: { label: t.tableCard.statusPending, color: 'default' },
    [TableResultStatus.CONFIRMED]: { label: t.tableCard.statusConfirmed, color: 'success' },
    [TableResultStatus.DISPUTED]: { label: t.tableCard.statusDisputed, color: 'error' },
    [TableResultStatus.OFFICIAL]: { label: t.tableCard.statusOfficial, color: 'info' },
  };

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
                Table {table.tableNumber}
              </Typography>
              {isMyTable && <Chip label={t.tableCard.yourTable} size="small" color="secondary" />}
              <Chip label={statusInfo.label} size="small" color={statusInfo.color} />
              {table.hasOpenDispute && <Chip label={t.tableCard.dispute} size="small" color="error" />}
              {table.submissionCount > 0 && (
                <Chip
                  label={t.tableCard.submitted.replace('{n}', String(table.submissionCount)).replace('{total}', String(table.seats.length))}
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
              const isGuest = !seat.userId;
              const displayName = seat.user?.displayName ?? (seat as any).guestPlayer?.name ?? t.tableCard.guest;
              const alias = seat.user?.alias ?? null;
              const result = table.results.find((r) =>
                isGuest
                  ? (r as any).guestPlayerId === (seat as any).guestPlayerId
                  : r.userId === seat.userId,
              );
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
                            {displayName}
                            {isGuest && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                ({t.tableCard.guest})
                              </Typography>
                            )}
                            {alias && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                @{alias}
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
              {t.tableCard.pendingResults}
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
              {t.tableCard.submitScores}
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

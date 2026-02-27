import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import type { LeaderboardEntry } from '@catan/shared';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightUserId?: string;
}

export function LeaderboardTable({ entries, highlightUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
        No results yet. The leaderboard will appear after the first round.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>#</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Player</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">VP</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Pts Catan</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Games</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Avg Pos</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }} align="right">Elo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => {
            const isHighlighted = entry.userId === highlightUserId;
            return (
              <TableRow
                key={entry.userId}
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
                      <Typography variant="body2" color="text.secondary">
                        {entry.rank}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight={isHighlighted ? 700 : 400}>
                      {entry.displayName}
                    </Typography>
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
                    {entry.victoryPoints % 1 === 0 ? entry.victoryPoints : entry.victoryPoints.toFixed(1)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{entry.totalCatanPoints}</TableCell>
                <TableCell align="right">{entry.gamesPlayed}</TableCell>
                <TableCell align="right">
                  {entry.avgPosition !== null ? entry.avgPosition.toFixed(1) : '—'}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {entry.isGuest ? '—' : Math.round(entry.eloRating)}
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

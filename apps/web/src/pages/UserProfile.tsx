import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';

interface Stats {
  eloRating: number;
  tournamentsPlayed: number;
  totalWins: number;
  avgPosition: number | null;
}

interface RatingEntry {
  id: string;
  tournamentId: string;
  tournamentName: string;
  oldRating: number;
  newRating: number;
  delta: number;
  createdAt: string;
}

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);

  const [profile, setProfile] = useState<{ displayName: string; alias: string | null; country: string | null; stats: Stats | null } | null>(null);
  const [statsData, setStatsData] = useState<{ stats: Stats; ratingHistory: RatingEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [p, s] = await Promise.all([
          usersApi.getProfile(id),
          usersApi.getStats(id),
        ]);
        setProfile(p);
        setStatsData(s);
      } catch {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!profile) return null;

  const stats = statsData?.stats;
  const ratingHistory = (statsData?.ratingHistory ?? []).reverse();

  const chartData = ratingHistory.map((r) => ({
    name: r.tournamentName.substring(0, 15),
    rating: Math.round(r.newRating),
    delta: Math.round(r.delta),
  }));

  const isUnranked = !stats || stats.tournamentsPlayed === 0;

  return (
    <Box maxWidth="md" mx="auto">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {profile.displayName[0].toUpperCase()}
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={700}>{profile.displayName}</Typography>
            {profile.alias && (
              <Typography variant="body2" color="text.secondary">@{profile.alias}</Typography>
            )}
            {profile.country && (
              <Chip label={profile.country} size="small" sx={{ mt: 0.5 }} />
            )}
          </Box>
        </Box>
        {isOwnProfile && (
          <Chip label="Your Profile" size="small" color="primary" sx={{ mt: 1 }} />
        )}
      </Box>

      {/* Stats cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={isUnranked ? 'text.secondary' : 'primary.main'}>
                {isUnranked ? '—' : Math.round(stats!.eloRating)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Elo Rating</Typography>
              {isUnranked && <Typography variant="caption" display="block" color="text.secondary">Unranked</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{stats?.tournamentsPlayed ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">Tournaments</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{stats?.totalWins ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">1st Places</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>
                {stats?.avgPosition ? stats.avgPosition.toFixed(1) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Avg Position</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Elo history chart */}
      {chartData.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>Elo Rating History</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'rating' ? value : `${value > 0 ? '+' : ''}${value}`,
                    name === 'rating' ? 'Elo' : 'Delta',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#8B4513"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Rating history list */}
      {ratingHistory.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>Tournament History</Typography>
            {ratingHistory.map((entry) => (
              <Box
                key={entry.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box>
                  <Typography variant="body2" fontWeight={600}>{entry.tournamentName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">{Math.round(entry.newRating)} Elo</Typography>
                  <Typography
                    variant="caption"
                    color={entry.delta >= 0 ? 'success.main' : 'error.main'}
                    fontWeight={700}
                  >
                    {entry.delta >= 0 ? '+' : ''}{entry.delta.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {isUnranked && (
        <Alert severity="info" sx={{ mt: 2 }}>
          This player hasn&apos;t completed any tournaments yet. Play to get ranked!
        </Alert>
      )}
    </Box>
  );
}

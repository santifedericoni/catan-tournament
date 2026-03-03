import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Divider,
  InputAdornment,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useParams } from 'react-router-dom';
import { usersApi } from '../api/users.api';
import { useAuthStore } from '../store/auth.store';
import { useTranslation } from '../hooks/useTranslation';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATAN_COLORS: { value: string; label: string; hex: string }[] = [
  { value: 'Red', label: 'Red', hex: '#e53935' },
  { value: 'Blue', label: 'Blue', hex: '#1e88e5' },
  { value: 'White', label: 'White', hex: '#bdbdbd' },
  { value: 'Orange', label: 'Orange', hex: '#fb8c00' },
  { value: 'Green', label: 'Green', hex: '#43a047' },
  { value: 'Brown', label: 'Brown', hex: '#6d4c41' },
];

const CATAN_EXPANSIONS = ['Base', 'Seafarers', 'Cities & Knights', 'Traders & Barbarians'];

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface Profile {
  id: string;
  email: string;
  displayName: string;
  alias: string | null;
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
  bio: string | null;
  favoriteColor: string | null;
  favoriteExpansion: string | null;
  createdAt: string;
  stats: Stats | null;
}

// ─── ColorDot ────────────────────────────────────────────────────────────────

function ColorDot({ hex, size = 14 }: { hex: string; size?: number }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: hex,
        border: '1px solid',
        borderColor: 'divider',
        flexShrink: 0,
      }}
    />
  );
}

// ─── EditProfileDialog ────────────────────────────────────────────────────────

interface EditProfileDialogProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
}

function EditProfileDialog({ open, profile, onClose, onSaved }: EditProfileDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    displayName: profile.displayName,
    alias: profile.alias ?? '',
    country: profile.country ?? '',
    city: profile.city ?? '',
    bio: profile.bio ?? '',
    favoriteColor: profile.favoriteColor ?? '',
    favoriteExpansion: profile.favoriteExpansion ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const updated = await usersApi.updateProfile({
        displayName: form.displayName || undefined,
        alias: form.alias || undefined,
        country: form.country || undefined,
        city: form.city || undefined,
        bio: form.bio || undefined,
        favoriteColor: form.favoriteColor || undefined,
        favoriteExpansion: form.favoriteExpansion || undefined,
      });
      onSaved({ ...profile, ...updated });
      onClose();
    } catch {
      setError(t.profile.failedToSave);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t.profile.editYourProfile}</DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label={t.profile.displayName}
          value={form.displayName}
          onChange={handleChange('displayName')}
          required
          inputProps={{ maxLength: 50 }}
          fullWidth
        />

        <TextField
          label={t.profile.alias}
          value={form.alias}
          onChange={handleChange('alias')}
          inputProps={{ maxLength: 30 }}
          fullWidth
        />

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <TextField
              label={t.profile.country}
              value={form.country}
              onChange={handleChange('country')}
              inputProps={{ maxLength: 50 }}
              fullWidth
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label={t.profile.city}
              value={form.city}
              onChange={handleChange('city')}
              inputProps={{ maxLength: 100 }}
              fullWidth
            />
          </Grid>
        </Grid>

        <TextField
          label={t.profile.bio}
          value={form.bio}
          onChange={handleChange('bio')}
          multiline
          rows={3}
          inputProps={{ maxLength: 280 }}
          helperText={`${form.bio.length}/280`}
          fullWidth
        />

        <FormControl fullWidth>
          <InputLabel>{t.profile.favoriteColor}</InputLabel>
          <Select
            value={form.favoriteColor}
            label={t.profile.favoriteColor}
            onChange={(e) => setForm((prev) => ({ ...prev, favoriteColor: e.target.value }))}
          >
            <MenuItem value=""><em>{t.profile.noColor}</em></MenuItem>
            {CATAN_COLORS.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ColorDot hex={c.hex} />
                  {c.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth>
          <InputLabel>{t.profile.favoriteExpansion}</InputLabel>
          <Select
            value={form.favoriteExpansion}
            label={t.profile.favoriteExpansion}
            onChange={(e) => setForm((prev) => ({ ...prev, favoriteExpansion: e.target.value }))}
          >
            <MenuItem value=""><em>{t.profile.noExpansion}</em></MenuItem>
            {CATAN_EXPANSIONS.map((exp) => (
              <MenuItem key={exp} value={exp}>{exp}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>{t.common.cancel}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading || !form.displayName}>
          {loading ? t.profile.saving : t.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── ChangePasswordDialog ─────────────────────────────────────────────────────

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function ChangePasswordDialog({ open, onClose, onChanged }: ChangePasswordDialogProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const handleSubmit = async () => {
    if (form.newPassword !== form.confirmPassword) {
      setError(t.profile.passwordMismatch);
      return;
    }
    if (form.newPassword.length < 8) {
      setError(t.profile.passwordTooShort);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await usersApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onChanged();
      onClose();
    } catch {
      setError(t.profile.failedToChangePassword);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t.profile.changePasswordTitle}</DialogTitle>
      <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

        <TextField
          label={t.profile.currentPassword}
          type={showCurrent ? 'text' : 'password'}
          value={form.currentPassword}
          onChange={handleChange('currentPassword')}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowCurrent((v) => !v)} edge="end">
                  {showCurrent ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label={t.profile.newPassword}
          type={showNew ? 'text' : 'password'}
          value={form.newPassword}
          onChange={handleChange('newPassword')}
          helperText="Minimum 8 characters"
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowNew((v) => !v)} edge="end">
                  {showNew ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <TextField
          label={t.profile.confirmPassword}
          type="password"
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={!!form.confirmPassword && form.confirmPassword !== form.newPassword}
          helperText={form.confirmPassword && form.confirmPassword !== form.newPassword ? t.profile.passwordMismatch : ''}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>{t.common.cancel}</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
        >
          {loading ? t.profile.changing : t.profile.changePassword}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── UserProfile ──────────────────────────────────────────────────────────────

export function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const { t } = useTranslation();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [statsData, setStatsData] = useState<{ stats: Stats; ratingHistory: RatingEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

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
        setError(t.profile.failedToLoad);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const updated = await usersApi.uploadAvatar(file);
      setProfile((prev) => prev ? { ...prev, avatarUrl: updated.avatarUrl } : prev);
      setSnackMsg(t.profile.profileSaved);
    } catch {
      setSnackMsg(t.profile.failedToSave);
    } finally {
      setAvatarUploading(false);
      // Reset so same file can be picked again
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleProfileSaved = (updated: Profile) => {
    setProfile(updated);
    // Sync display name in auth store if it changed
    if (currentUser && accessToken && refreshToken) {
      setAuth(accessToken, refreshToken, {
        ...currentUser,
        displayName: updated.displayName,
        alias: updated.alias,
      });
    }
    setSnackMsg(t.profile.profileSaved);
  };

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
  const colorInfo = CATAN_COLORS.find((c) => c.value === profile.favoriteColor);

  return (
    <Box maxWidth="md" mx="auto">
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1 }}>
          {/* Avatar */}
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: colorInfo?.hex ?? 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: profile.favoriteColor === 'White' ? 'text.primary' : 'white',
                fontSize: 34,
                fontWeight: 700,
                border: '3px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}
            >
              {profile.avatarUrl ? (
                <Box
                  component="img"
                  src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}${profile.avatarUrl}`}
                  alt={profile.displayName}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                profile.displayName[0].toUpperCase()
              )}
            </Box>

            {/* Camera overlay — own profile only */}
            {isOwnProfile && (
              <Tooltip title={t.profile.changeAvatar}>
                <Box
                  onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    bgcolor: 'background.paper',
                    border: '2px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: avatarUploading ? 'wait' : 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  {avatarUploading ? (
                    <CircularProgress size={14} />
                  ) : (
                    <CameraAltIcon sx={{ fontSize: 14 }} />
                  )}
                </Box>
              </Tooltip>
            )}

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </Box>

          {/* Name + info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" fontWeight={700}>{profile.displayName}</Typography>
              {isOwnProfile && (
                <Tooltip title={t.profile.editProfile}>
                  <IconButton size="small" onClick={() => setEditOpen(true)} color="primary">
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {profile.alias && (
              <Typography variant="body2" color="text.secondary">@{profile.alias}</Typography>
            )}

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {profile.country && <Chip label={profile.country} size="small" />}
              {profile.city && <Chip label={profile.city} size="small" variant="outlined" />}
              {isOwnProfile && <Chip label={t.profile.yourProfile} size="small" color="primary" />}
            </Box>

            {profile.bio && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                "{profile.bio}"
              </Typography>
            )}

            {/* Catan flair */}
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              {profile.favoriteColor && colorInfo && (
                <Chip
                  size="small"
                  label={profile.favoriteColor}
                  icon={<ColorDot hex={colorInfo.hex} />}
                  variant="outlined"
                />
              )}
              {profile.favoriteExpansion && (
                <Chip size="small" label={profile.favoriteExpansion} variant="outlined" />
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {t.profile.joinedOn} {new Date(profile.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Stats cards */}
      <Grid container spacing={2} mb={4}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} color={isUnranked ? 'text.secondary' : 'primary.main'}>
                {isUnranked ? '—' : Math.round(stats!.eloRating)}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t.profile.eloRating}</Typography>
              {isUnranked && <Typography variant="caption" display="block" color="text.secondary">{t.profile.unranked}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{stats?.tournamentsPlayed ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">{t.profile.tournaments}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>{stats?.totalWins ?? 0}</Typography>
              <Typography variant="caption" color="text.secondary">{t.profile.firstPlaces}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700}>
                {stats?.avgPosition ? stats.avgPosition.toFixed(1) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">{t.profile.avgPosition}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Elo history chart */}
      {chartData.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.profile.eloHistory}</Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <ChartTooltip
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
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.profile.tournamentHistory}</Typography>
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
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          {t.profile.noRanking}
        </Alert>
      )}

      {/* Account section — own profile only */}
      {isOwnProfile && (
        <Card>
          <CardContent>
            <Typography variant="h6" mb={2}>{t.profile.accountSection}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">{t.profile.email}</Typography>
                <Typography variant="body2">{profile.email}</Typography>
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setPwOpen(true)}
              size="small"
            >
              {t.profile.changePassword}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {editOpen && (
        <EditProfileDialog
          open={editOpen}
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={handleProfileSaved}
        />
      )}

      <ChangePasswordDialog
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onChanged={() => setSnackMsg(t.profile.passwordChanged)}
      />

      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3500}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

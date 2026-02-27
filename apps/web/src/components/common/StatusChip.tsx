import { Chip } from '@mui/material';
import { TournamentStatus, RegistrationStatus } from '@catan/shared';

const TOURNAMENT_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  [TournamentStatus.DRAFT]: 'default',
  [TournamentStatus.PUBLISHED]: 'info',
  [TournamentStatus.CHECKIN]: 'warning',
  [TournamentStatus.RUNNING]: 'success',
  [TournamentStatus.FINISHED]: 'primary',
  [TournamentStatus.CANCELLED]: 'error',
};

const REGISTRATION_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
  [RegistrationStatus.REQUESTED]: 'default',
  [RegistrationStatus.APPROVED]: 'success',
  [RegistrationStatus.CHECKED_IN]: 'info',
  [RegistrationStatus.WAITLIST]: 'warning',
  [RegistrationStatus.REJECTED]: 'error',
  [RegistrationStatus.REMOVED]: 'error',
};

interface StatusChipProps {
  status: string;
  type?: 'tournament' | 'registration';
  size?: 'small' | 'medium';
}

export function StatusChip({ status, type = 'tournament', size = 'small' }: StatusChipProps) {
  const colorMap = type === 'tournament' ? TOURNAMENT_COLORS : REGISTRATION_COLORS;
  const color = colorMap[status] ?? 'default';

  return (
    <Chip
      label={status.replace(/_/g, ' ')}
      color={color}
      size={size}
      variant="filled"
    />
  );
}

import { RegistrationStatus } from '../enums/registration-status.enum';

export interface UpdateRegistrationDto {
  status: RegistrationStatus.APPROVED | RegistrationStatus.REJECTED | RegistrationStatus.REMOVED;
}

export interface InviteStaffDto {
  email: string;
}

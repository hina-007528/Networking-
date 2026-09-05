import type { ApplicationStatus, ServiceType } from '../enums';
import type { PriceQuoteDto } from './catalog';

export interface ApplicationDto {
  id: string;
  reference: string;
  status: ApplicationStatus;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  cnicLast4: string | null;
  cityId: string;
  cityName: string;
  areaId: string | null;
  areaName: string | null;
  subAreaId: string | null;
  subAreaName: string | null;
  addressLine: string;
  nearestLandmark: string | null;
  services: ServiceType[];
  planId: string | null;
  planName: string | null;
  addonIds: string[];
  quote: PriceQuoteDto | null;
  preferredInstallationDate: string | null;
  notes: string | null;
  termsAcceptedAt: string | null;
  mobileVerifiedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  rejectionReason: string | null;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
  statusHistory: ApplicationStatusHistoryDto[];
}

export interface ApplicationStatusHistoryDto {
  id: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  reason: string | null;
  changedById: string | null;
  changedByName: string | null;
  createdAt: string;
}

export interface CreateApplicationRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  /** Proof token issued by OTP verification; the server re-validates it. */
  verificationToken: string;
  cityId: string;
  areaId?: string;
  subAreaId?: string;
  addressLine: string;
  nearestLandmark?: string;
  services: ServiceType[];
  planId: string;
  addonIds?: string[];
  preferredInstallationDate?: string;
  notes?: string;
  acceptedTerms: boolean;
}

export interface CallbackRequestDto {
  id: string;
  reference: string;
  name: string;
  phone: string;
  email: string | null;
  cityId: string | null;
  cityName: string | null;
  areaId: string | null;
  preferredTime: string | null;
  subject: string;
  message: string | null;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCallbackRequest {
  name: string;
  phone: string;
  email?: string;
  cityId?: string;
  areaId?: string;
  preferredTime?: string;
  subject: string;
  message?: string;
}

import type { RoleName, UserStatus } from '../enums';

export interface AdminUserDto {
  id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: UserStatus;
  roles: RoleName[];
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: RoleName;
  label: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export interface PermissionDto {
  id: string;
  key: string;
  label: string;
  group: string;
}

export interface AuditLogDto {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface DashboardMetricsDto {
  totalCustomers: number;
  activeCustomers: number;
  newApplications: number;
  pendingApplications: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  paidInvoices: number;
  openTickets: number;
  resolvedTickets: number;
  newLeads: number;
  waitlistCount: number;
  currency: string;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface NamedCountPoint {
  label: string;
  value: number;
}

export interface DashboardChartsDto {
  revenue: TimeSeriesPoint[];
  customers: TimeSeriesPoint[];
  applications: TimeSeriesPoint[];
  payments: TimeSeriesPoint[];
  tickets: TimeSeriesPoint[];
  popularPlans: NamedCountPoint[];
  coverageOutcomes: NamedCountPoint[];
}

export interface AnalyticsEventPayload {
  name: string;
  path?: string;
  cityId?: string;
  planId?: string;
  properties?: Record<string, unknown>;
  sessionId?: string;
}

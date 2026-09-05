import {
  ApplicationStatus,
  CallbackStatus,
  CoverageStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  PlanKind,
  RoleName,
  ServiceType,
  SubscriptionStatus,
  TicketPriority,
  TicketStatus,
} from '../../types/src';

/** Visual tone used by badges and status pills. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'promo';

export interface StatusMeta {
  label: string;
  tone: Tone;
  description?: string;
}

export const serviceLabels: Record<ServiceType, string> = {
  [ServiceType.INTERNET]: 'Internet',
  [ServiceType.TV]: 'HD TV',
  [ServiceType.PHONE]: 'Voice',
};

export const planKindLabels: Record<PlanKind, string> = {
  [PlanKind.INTERNET]: 'Internet only',
  [PlanKind.TV]: 'TV only',
  [PlanKind.PHONE]: 'Voice only',
  [PlanKind.DOUBLE_PLAY]: 'Double Play',
  [PlanKind.TRIPLE_PLAY]: 'Triple Play',
};

export const coverageStatusMeta: Record<CoverageStatus, StatusMeta> = {
  [CoverageStatus.AVAILABLE]: {
    label: 'Available',
    tone: 'success',
    description: 'Our fibre network is live at this location.',
  },
  [CoverageStatus.COMING_SOON]: {
    label: 'Coming soon',
    tone: 'warning',
    description: 'We are building here. Leave your details and we will tell you the moment we go live.',
  },
  [CoverageStatus.NOT_AVAILABLE]: {
    label: 'Not available yet',
    tone: 'danger',
    description: 'We are not in this area yet, but your request helps us prioritise where we build next.',
  },
};

export const applicationStatusMeta: Record<ApplicationStatus, StatusMeta> = {
  [ApplicationStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [ApplicationStatus.SUBMITTED]: { label: 'Submitted', tone: 'info' },
  [ApplicationStatus.UNDER_REVIEW]: { label: 'Under review', tone: 'info' },
  [ApplicationStatus.PAYMENT_PENDING]: { label: 'Payment pending', tone: 'warning' },
  [ApplicationStatus.PAYMENT_RECEIVED]: { label: 'Payment received', tone: 'success' },
  [ApplicationStatus.APPROVED]: { label: 'Approved', tone: 'success' },
  [ApplicationStatus.INSTALLATION_SCHEDULED]: { label: 'Installation scheduled', tone: 'info' },
  [ApplicationStatus.INSTALLATION_IN_PROGRESS]: { label: 'Installation in progress', tone: 'info' },
  [ApplicationStatus.ACTIVE]: { label: 'Active', tone: 'success' },
  [ApplicationStatus.REJECTED]: { label: 'Rejected', tone: 'danger' },
  [ApplicationStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
};

export const subscriptionStatusMeta: Record<SubscriptionStatus, StatusMeta> = {
  [SubscriptionStatus.PENDING]: { label: 'Pending activation', tone: 'info' },
  [SubscriptionStatus.ACTIVE]: { label: 'Active', tone: 'success' },
  [SubscriptionStatus.SUSPENDED]: { label: 'Suspended', tone: 'warning' },
  [SubscriptionStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [SubscriptionStatus.EXPIRED]: { label: 'Expired', tone: 'neutral' },
};

export const invoiceStatusMeta: Record<InvoiceStatus, StatusMeta> = {
  [InvoiceStatus.DRAFT]: { label: 'Draft', tone: 'neutral' },
  [InvoiceStatus.GENERATED]: { label: 'Generated', tone: 'info' },
  [InvoiceStatus.PENDING]: { label: 'Payment due', tone: 'warning' },
  [InvoiceStatus.PARTIALLY_PAID]: { label: 'Partially paid', tone: 'warning' },
  [InvoiceStatus.PAID]: { label: 'Paid', tone: 'success' },
  [InvoiceStatus.OVERDUE]: { label: 'Overdue', tone: 'danger' },
  [InvoiceStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [InvoiceStatus.REFUNDED]: { label: 'Refunded', tone: 'info' },
};

export const paymentStatusMeta: Record<PaymentStatus, StatusMeta> = {
  [PaymentStatus.INITIATED]: { label: 'Initiated', tone: 'neutral' },
  [PaymentStatus.PENDING]: { label: 'Pending', tone: 'warning' },
  [PaymentStatus.SUCCEEDED]: { label: 'Successful', tone: 'success' },
  [PaymentStatus.FAILED]: { label: 'Failed', tone: 'danger' },
  [PaymentStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
  [PaymentStatus.REFUNDED]: { label: 'Refunded', tone: 'info' },
  [PaymentStatus.PARTIALLY_REFUNDED]: { label: 'Partially refunded', tone: 'info' },
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  [PaymentMethod.CARD]: 'Debit / credit card',
  [PaymentMethod.BANK_TRANSFER]: 'Bank transfer',
  [PaymentMethod.MOBILE_WALLET]: 'Mobile wallet',
  [PaymentMethod.CASH]: 'Cash at branch',
};

export const ticketStatusMeta: Record<TicketStatus, StatusMeta> = {
  [TicketStatus.OPEN]: { label: 'Open', tone: 'info' },
  [TicketStatus.IN_PROGRESS]: { label: 'In progress', tone: 'info' },
  [TicketStatus.WAITING_FOR_CUSTOMER]: { label: 'Waiting for you', tone: 'warning' },
  [TicketStatus.RESOLVED]: { label: 'Resolved', tone: 'success' },
  [TicketStatus.CLOSED]: { label: 'Closed', tone: 'neutral' },
};

export const ticketPriorityMeta: Record<TicketPriority, StatusMeta> = {
  [TicketPriority.LOW]: { label: 'Low', tone: 'neutral' },
  [TicketPriority.MEDIUM]: { label: 'Medium', tone: 'info' },
  [TicketPriority.HIGH]: { label: 'High', tone: 'warning' },
  [TicketPriority.URGENT]: { label: 'Urgent', tone: 'danger' },
};

export const callbackStatusMeta: Record<CallbackStatus, StatusMeta> = {
  [CallbackStatus.NEW]: { label: 'New', tone: 'info' },
  [CallbackStatus.CONTACTED]: { label: 'Contacted', tone: 'info' },
  [CallbackStatus.IN_PROGRESS]: { label: 'In progress', tone: 'warning' },
  [CallbackStatus.COMPLETED]: { label: 'Completed', tone: 'success' },
  [CallbackStatus.CANCELLED]: { label: 'Cancelled', tone: 'neutral' },
};

export const roleLabels: Record<RoleName, string> = {
  [RoleName.SUPER_ADMIN]: 'Super administrator',
  [RoleName.ADMIN]: 'Administrator',
  [RoleName.MANAGER]: 'Manager',
  [RoleName.SALES_AGENT]: 'Sales agent',
  [RoleName.SUPPORT_AGENT]: 'Support agent',
  [RoleName.FINANCE_AGENT]: 'Finance agent',
  [RoleName.CUSTOMER]: 'Customer',
};

/** Ordered lifecycle used by the admin application timeline. */
export const applicationLifecycle: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PAYMENT_PENDING,
  ApplicationStatus.PAYMENT_RECEIVED,
  ApplicationStatus.APPROVED,
  ApplicationStatus.INSTALLATION_SCHEDULED,
  ApplicationStatus.INSTALLATION_IN_PROGRESS,
  ApplicationStatus.ACTIVE,
];

/**
 * Legal state machine for application status changes. The API enforces this; the admin UI only
 * offers the transitions listed here.
 */
export const applicationTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.CANCELLED],
  [ApplicationStatus.SUBMITTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.PAYMENT_PENDING,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.PAYMENT_PENDING]: [
    ApplicationStatus.PAYMENT_RECEIVED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.PAYMENT_RECEIVED]: [ApplicationStatus.APPROVED, ApplicationStatus.CANCELLED],
  [ApplicationStatus.APPROVED]: [
    ApplicationStatus.INSTALLATION_SCHEDULED,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.INSTALLATION_SCHEDULED]: [
    ApplicationStatus.INSTALLATION_IN_PROGRESS,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.INSTALLATION_IN_PROGRESS]: [
    ApplicationStatus.ACTIVE,
    ApplicationStatus.CANCELLED,
  ],
  [ApplicationStatus.ACTIVE]: [],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.CANCELLED]: [],
};

export const ticketTransitions: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.OPEN]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.IN_PROGRESS]: [
    TicketStatus.WAITING_FOR_CUSTOMER,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.WAITING_FOR_CUSTOMER]: [
    TicketStatus.IN_PROGRESS,
    TicketStatus.RESOLVED,
    TicketStatus.CLOSED,
  ],
  [TicketStatus.RESOLVED]: [TicketStatus.CLOSED, TicketStatus.IN_PROGRESS],
  [TicketStatus.CLOSED]: [],
};

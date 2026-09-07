/**
 * Domain enumerations shared by the API, the public website and the admin console.
 *
 * These are declared as frozen const objects rather than TypeScript `enum`s so that they can be
 * imported by browser bundles without pulling in the Prisma client, while still producing exact
 * string-literal union types. The string values are identical to the Prisma enum values, so the
 * two representations are interchangeable across the wire.
 */

export const ServiceType = {
  INTERNET: 'INTERNET',
  TV: 'TV',
  PHONE: 'PHONE',
} as const;
export type ServiceType = (typeof ServiceType)[keyof typeof ServiceType];

export const PlanKind = {
  INTERNET: 'INTERNET',
  TV: 'TV',
  PHONE: 'PHONE',
  DOUBLE_PLAY: 'DOUBLE_PLAY',
  TRIPLE_PLAY: 'TRIPLE_PLAY',
} as const;
export type PlanKind = (typeof PlanKind)[keyof typeof PlanKind];

export const PublishStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  SCHEDULED: 'SCHEDULED',
  EXPIRED: 'EXPIRED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type PublishStatus = (typeof PublishStatus)[keyof typeof PublishStatus];

export const CoverageStatus = {
  AVAILABLE: 'AVAILABLE',
  NOT_AVAILABLE: 'NOT_AVAILABLE',
  COMING_SOON: 'COMING_SOON',
} as const;
export type CoverageStatus = (typeof CoverageStatus)[keyof typeof CoverageStatus];

export const ApplicationStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  APPROVED: 'APPROVED',
  INSTALLATION_SCHEDULED: 'INSTALLATION_SCHEDULED',
  INSTALLATION_IN_PROGRESS: 'INSTALLATION_IN_PROGRESS',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const SubscriptionStatus = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const SubscriptionChangeType = {
  UPGRADE: 'UPGRADE',
  DOWNGRADE: 'DOWNGRADE',
  ADDON_ADDED: 'ADDON_ADDED',
  ADDON_REMOVED: 'ADDON_REMOVED',
  SERVICE_ACTIVATED: 'SERVICE_ACTIVATED',
  SERVICE_SUSPENDED: 'SERVICE_SUSPENDED',
  REACTIVATED: 'REACTIVATED',
  CANCELLED: 'CANCELLED',
} as const;
export type SubscriptionChangeType =
  (typeof SubscriptionChangeType)[keyof typeof SubscriptionChangeType];

export const ChangeRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  APPLIED: 'APPLIED',
  CANCELLED: 'CANCELLED',
} as const;
export type ChangeRequestStatus = (typeof ChangeRequestStatus)[keyof typeof ChangeRequestStatus];

export const InvoiceStatus = {
  DRAFT: 'DRAFT',
  GENERATED: 'GENERATED',
  PENDING: 'PENDING',
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const InvoiceItemType = {
  SUBSCRIPTION: 'SUBSCRIPTION',
  ADDON: 'ADDON',
  INSTALLATION: 'INSTALLATION',
  EQUIPMENT: 'EQUIPMENT',
  DISCOUNT: 'DISCOUNT',
  ADJUSTMENT: 'ADJUSTMENT',
  LATE_FEE: 'LATE_FEE',
} as const;
export type InvoiceItemType = (typeof InvoiceItemType)[keyof typeof InvoiceItemType];

export const PaymentStatus = {
  INITIATED: 'INITIATED',
  PENDING: 'PENDING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  CARD: 'CARD',
  BANK_TRANSFER: 'BANK_TRANSFER',
  MOBILE_WALLET: 'MOBILE_WALLET',
  CASH: 'CASH',
} as const;

export const OrderStatus = {
  PENDING_OTP: 'PENDING_OTP',
  CONFIRMED: 'CONFIRMED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  SCHEDULED: 'SCHEDULED',
  INSTALLED: 'INSTALLED',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const NotifyStatus = {
  SENT: 'SENT',
  FAILED: 'FAILED',
} as const;
export type NotifyStatus = (typeof NotifyStatus)[keyof typeof NotifyStatus];

export const InvoicePaidMethod = {
  CASH: 'cash',
  BANK_TRANSFER: 'bank_transfer',
  OFFICE: 'office',
} as const;
export type InvoicePaidMethod = (typeof InvoicePaidMethod)[keyof typeof InvoicePaidMethod];
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const RefundStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  PROCESSED: 'PROCESSED',
  REJECTED: 'REJECTED',
  FAILED: 'FAILED',
} as const;
export type RefundStatus = (typeof RefundStatus)[keyof typeof RefundStatus];

export const TicketStatus = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const CallbackStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type CallbackStatus = (typeof CallbackStatus)[keyof typeof CallbackStatus];

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  CONVERTED: 'CONVERTED',
  LOST: 'LOST',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const CustomerStatus = {
  PROSPECT: 'PROSPECT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  CHURNED: 'CHURNED',
} as const;
export type CustomerStatus = (typeof CustomerStatus)[keyof typeof CustomerStatus];

export const UserStatus = {
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISABLED: 'DISABLED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const RoleName = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES_AGENT: 'SALES_AGENT',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  FINANCE_AGENT: 'FINANCE_AGENT',
  CUSTOMER: 'CUSTOMER',
} as const;
export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const OtpPurpose = {
  REGISTRATION: 'REGISTRATION',
  LOGIN: 'LOGIN',
  APPLICATION: 'APPLICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
  MOBILE_VERIFICATION: 'MOBILE_VERIFICATION',
} as const;
export type OtpPurpose = (typeof OtpPurpose)[keyof typeof OtpPurpose];

export const NotificationChannel = {
  EMAIL: 'EMAIL',
  SMS: 'SMS',
  IN_APP: 'IN_APP',
} as const;
export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NotificationEvent = {
  USER_REGISTERED: 'USER_REGISTERED',
  USER_REGISTERED_ADMIN: 'USER_REGISTERED_ADMIN',
  OTP_REQUESTED: 'OTP_REQUESTED',
  APPLICATION_SUBMITTED: 'APPLICATION_SUBMITTED',
  APPLICATION_APPROVED: 'APPLICATION_APPROVED',
  APPLICATION_REJECTED: 'APPLICATION_REJECTED',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVOICE_GENERATED: 'INVOICE_GENERATED',
  INVOICE_OVERDUE: 'INVOICE_OVERDUE',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_UPDATED: 'TICKET_UPDATED',
  TICKET_RESOLVED: 'TICKET_RESOLVED',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  /** Sent when an approved applicant has an account created for them. */
  ACCOUNT_INVITED: 'ACCOUNT_INVITED',
  SUBSCRIPTION_CHANGED: 'SUBSCRIPTION_CHANGED',
  ORDER_OTP: 'ORDER_OTP',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_CONFIRMED_ADMIN: 'ORDER_CONFIRMED_ADMIN',
} as const;
export type NotificationEvent = (typeof NotificationEvent)[keyof typeof NotificationEvent];

export const AnalyticsEventName = {
  PAGE_VIEW: 'page_view',
  PLAN_VIEW: 'plan_view',
  PLAN_COMPARE: 'plan_compare',
  COVERAGE_CHECK: 'coverage_check',
  COVERAGE_AVAILABLE: 'coverage_available',
  COVERAGE_UNAVAILABLE: 'coverage_unavailable',
  APPLICATION_STARTED: 'application_started',
  APPLICATION_SUBMITTED: 'application_submitted',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  TICKET_CREATED: 'ticket_created',
  CALLBACK_REQUESTED: 'callback_requested',
} as const;
export type AnalyticsEventName = (typeof AnalyticsEventName)[keyof typeof AnalyticsEventName];

export const CmsSectionKind = {
  HERO: 'HERO',
  PRODUCT_TRIO: 'PRODUCT_TRIO',
  BENEFITS: 'BENEFITS',
  FEATURED_PLANS: 'FEATURED_PLANS',
  PROMOTIONS: 'PROMOTIONS',
  COVERAGE: 'COVERAGE',
  FAQ: 'FAQ',
  CTA: 'CTA',
  RICH_TEXT: 'RICH_TEXT',
  FEATURE_GRID: 'FEATURE_GRID',
  PAYMENT_METHODS: 'PAYMENT_METHODS',
} as const;
export type CmsSectionKind = (typeof CmsSectionKind)[keyof typeof CmsSectionKind];

export const TaxKind = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;
export type TaxKind = (typeof TaxKind)[keyof typeof TaxKind];

export const DiscountKind = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;
export type DiscountKind = (typeof DiscountKind)[keyof typeof DiscountKind];

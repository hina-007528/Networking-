import type {
  ChangeRequestStatus,
  CustomerStatus,
  InvoiceItemType,
  InvoiceStatus,
  NotifyStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  RefundStatus,
  ServiceType,
  SubscriptionChangeType,
  SubscriptionStatus,
} from '../enums';

export interface CustomerDto {
  id: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  mobile: string;
  alternatePhone: string | null;
  status: CustomerStatus;
  cityId: string;
  cityName: string;
  areaId: string | null;
  areaName: string | null;
  subAreaId: string | null;
  addressLine: string;
  balance: number;
  currency: string;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionItemDto {
  id: string;
  serviceType: ServiceType;
  label: string;
  addonId: string | null;
  quantity: number;
  unitPrice: number;
  currency: string;
  isActive: boolean;
}

export interface SubscriptionDto {
  id: string;
  reference: string;
  customerId: string;
  customerName?: string;
  customerAccountNumber?: string;
  planId: string;
  planName: string;
  planSpeedMbps: number | null;
  status: SubscriptionStatus;
  services: ServiceType[];
  monthlyAmount: number;
  currency: string;
  cityId: string;
  cityName?: string;
  startedAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  suspendedAt: string | null;
  cancelledAt: string | null;
  items: SubscriptionItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionHistoryDto {
  id: string;
  changeType: SubscriptionChangeType;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  changedById: string | null;
  createdAt: string;
}

export interface SubscriptionChangeRequestDto {
  id: string;
  subscriptionId: string;
  changeType: SubscriptionChangeType;
  requestedPlanId: string | null;
  requestedPlanName: string | null;
  requestedAddonId: string | null;
  status: ChangeRequestStatus;
  customerNote: string | null;
  adminNote: string | null;
  effectiveFrom: string | null;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  subscriptionReference?: string;
}

export interface InvoiceItemDto {
  id: string;
  type: InvoiceItemType;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
}

export interface InvoiceDto {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  subscriptionId: string | null;
  status: InvoiceStatus;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  issuedAt: string | null;
  dueDate: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  items: InvoiceItemDto[];
  notes: string | null;
  pdfUrl: string | null;
  paidMethod: string | null;
  paidByAdminId: string | null;
  paidByAdminName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDto {
  id: string;
  reference: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  customerId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  provider: string;
  status: PaymentStatus;
  /** Never contains card numbers — only a provider token/masked tail. */
  instrumentLabel: string | null;
  providerReference: string | null;
  failureReason: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  invoiceId: string;
  method: PaymentMethod;
  /** Client-generated idempotency key; the server enforces single execution. */
  idempotencyKey: string;
  returnUrl?: string;
}

export interface CreatePaymentResult {
  payment: PaymentDto;
  /** Present when the provider requires a hosted checkout redirect. */
  redirectUrl: string | null;
  /** Present when the provider expects client-side confirmation. */
  clientSecret: string | null;
  expiresAt: string | null;
}

export interface RefundDto {
  id: string;
  paymentId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: string;
  requestedById: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface BillingSummaryDto {
  currentBalance: number;
  currency: string;
  nextInvoiceDate: string | null;
  latestInvoice: InvoiceDto | null;
  overdueInvoiceCount: number;
  overdueAmount: number;
  lastPayment: PaymentDto | null;
  autoPayEnabled: boolean;
}

export interface NotificationLogDto {
  id: string;
  recipient: string;
  subjectOrTag: string;
  body: string;
  relatedOrderId: string | null;
  status: NotifyStatus;
  error: string | null;
  createdAt: string;
}

export interface OrderDto {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerMobile: string;
  planId: string;
  planName: string;
  planMonthlyPrice: number;
  currency: string;
  installAddress: string;
  status: OrderStatus;
  otpPending: boolean;
  otpExpiresAt: string | null;
  otpAttempts: number;
  confirmedAt: string | null;
  subscriptionId: string | null;
  notifications: NotificationLogDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderResult {
  order: OrderDto;
  expiresAt: string;
  resendAvailableAt: string;
}

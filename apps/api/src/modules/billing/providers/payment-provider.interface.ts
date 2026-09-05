import type { PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';

export const PAYMENT_PROVIDERS = 'PAYMENT_PROVIDERS';

export interface PaymentIntentRequest {
  /** Our own payment reference. Providers echo it back on webhooks. */
  reference: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  customer: { name: string; email: string; mobile: string };
  returnUrl: string;
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  status: PaymentStatus;
  providerReference: string | null;
  /** Set when the customer must be sent to a hosted checkout page. */
  redirectUrl: string | null;
  /** Set when the provider expects confirmation from the client SDK instead. */
  clientSecret: string | null;
  expiresAt: Date | null;
  /** Human-readable instructions shown for offline methods. Never a credential. */
  instructions: string | null;
  instrumentLabel: string | null;
  /** Provider response with anything sensitive already removed. */
  summary: Record<string, unknown>;
}

export interface PaymentVerification {
  status: PaymentStatus;
  providerReference: string | null;
  /** The amount the provider says was settled, used to detect tampering. */
  amount: number | null;
  instrumentLabel: string | null;
  failureReason: string | null;
  summary: Record<string, unknown>;
}

export interface RefundRequest {
  providerReference: string | null;
  paymentReference: string;
  amount: number;
  currency: string;
  reason: string;
}

export interface RefundResult {
  status: RefundStatus;
  providerReference: string | null;
  summary: Record<string, unknown>;
}

/**
 * Contract every payment integration implements.
 *
 * Business logic depends only on this interface, so adding a gateway is a new adapter rather than a
 * change to the payment flow. Two rules bind every implementation:
 *
 *   * `verifyPayment` must ask the provider, never trust a value that arrived from the browser.
 *   * `verifySignature` must fail closed — an unsigned or badly signed webhook is not a payment.
 */
export interface PaymentProvider {
  /** Stored on the payment row so a historical payment can be traced to its integration. */
  readonly key: string;

  /** Methods this adapter is able to settle. */
  readonly methods: PaymentMethod[];

  createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResult>;

  /** Authoritative status check, performed server to server. */
  verifyPayment(reference: string, providerReference: string | null): Promise<PaymentVerification>;

  refundPayment(request: RefundRequest): Promise<RefundResult>;

  /**
   * Confirms a webhook really came from the provider. Adapters for offline methods, which receive
   * no callbacks, return false.
   */
  verifySignature(rawBody: string, signature: string | undefined): boolean;
}

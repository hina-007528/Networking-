import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';
import type {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentVerification,
  RefundRequest,
  RefundResult,
} from './payment-provider.interface';

/**
 * Local gateway stand-in for development and tests.
 *
 * It is a real implementation of the interface, not a pretence that a gateway is connected: it
 * hosts nothing, charges nothing, and leaves every payment PENDING until the sandbox callback
 * arrives. That keeps the production code path — create, redirect, webhook, verify — exercised
 * end to end without credentials, and makes it obvious in the logs that no money moved.
 *
 * Webhooks are signed with `PAYMENT_SECRET` using the same HMAC scheme a real provider would use,
 * so signature verification is genuinely tested rather than bypassed.
 */
@Injectable()
export class SandboxPaymentProvider implements PaymentProvider {
  readonly key = 'sandbox';
  readonly methods: PaymentMethod[] = [PaymentMethod.CARD, PaymentMethod.MOBILE_WALLET];

  private readonly logger = new Logger(SandboxPaymentProvider.name);

  /** Reference → last known outcome, populated by the sandbox callback. */
  private readonly settled = new Map<string, PaymentVerification>();

  constructor(
    private readonly secret: string,
    private readonly apiUrl: string,
  ) {}

  async createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const providerReference = `sbx_${request.reference.toLowerCase()}`;
    const checkout = new URL(`${this.apiUrl}/sandbox/checkout`);
    checkout.searchParams.set('reference', request.reference);
    checkout.searchParams.set('amount', request.amount.toFixed(2));
    checkout.searchParams.set('currency', request.currency);
    checkout.searchParams.set('return_url', request.returnUrl);

    this.logger.warn(
      `Sandbox payment ${request.reference} created for ${request.currency} ${request.amount.toFixed(2)} — no funds will move`,
    );

    return {
      status: PaymentStatus.PENDING,
      providerReference,
      redirectUrl: checkout.toString(),
      clientSecret: null,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      instructions:
        'This is a sandbox checkout. No card is charged and no funds are transferred.',
      instrumentLabel: null,
      summary: { provider: this.key, mode: 'sandbox', method: request.method },
    };
  }

  async verifyPayment(
    reference: string,
    providerReference: string | null,
  ): Promise<PaymentVerification> {
    const known = this.settled.get(reference);

    if (known) {
      return known;
    }

    return {
      status: PaymentStatus.PENDING,
      providerReference,
      amount: null,
      instrumentLabel: null,
      failureReason: null,
      summary: { provider: this.key, mode: 'sandbox', state: 'awaiting-callback' },
    };
  }

  /**
   * Records the outcome the sandbox callback reported, so a later `verifyPayment` agrees with the
   * webhook exactly as a real gateway would.
   */
  recordOutcome(reference: string, verification: PaymentVerification): void {
    this.settled.set(reference, verification);
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    this.logger.warn(
      `Sandbox refund of ${request.currency} ${request.amount.toFixed(2)} for ${request.paymentReference} — no funds will move`,
    );

    return {
      status: RefundStatus.PROCESSED,
      providerReference: `sbxr_${request.paymentReference.toLowerCase()}`,
      summary: { provider: this.key, mode: 'sandbox', reason: request.reason },
    };
  }

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;

    const expected = createHmac('sha256', this.secret).update(rawBody).digest('hex');
    const provided = Buffer.from(signature, 'utf8');
    const digest = Buffer.from(expected, 'utf8');

    // Length check first: `timingSafeEqual` throws on a mismatch.
    return provided.length === digest.length && timingSafeEqual(provided, digest);
  }

  /** Exposed so the sandbox callback endpoint can sign the payload it posts back to us. */
  sign(rawBody: string): string {
    return createHmac('sha256', this.secret).update(rawBody).digest('hex');
  }
}

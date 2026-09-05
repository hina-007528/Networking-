import { Injectable } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';
import { brand } from '@stormfiber/config';
import type {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentVerification,
  RefundRequest,
  RefundResult,
} from './payment-provider.interface';

/**
 * Bank transfers and cash at a branch.
 *
 * These are real payment rails with no gateway behind them: the customer moves the money out of
 * band and finance confirms receipt in the admin console, which is what settles the payment. The
 * adapter therefore never reports SUCCEEDED on its own — a payment here stays PENDING until a
 * human with `payments.write` records it against the bank statement.
 */
@Injectable()
export class OfflinePaymentProvider implements PaymentProvider {
  readonly key = 'offline';
  readonly methods: PaymentMethod[] = [PaymentMethod.BANK_TRANSFER, PaymentMethod.CASH];

  async createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    return {
      status: PaymentStatus.PENDING,
      providerReference: null,
      redirectUrl: null,
      clientSecret: null,
      // Bank transfers clear within a couple of working days; beyond that finance chases it.
      expiresAt: null,
      instructions:
        request.method === PaymentMethod.BANK_TRANSFER
          ? `Transfer ${request.currency} ${request.amount.toFixed(2)} to any of the accounts listed on our payment methods page and quote invoice ${request.invoiceNumber} as the reference. We confirm transfers on the next working day.`
          : `Pay ${request.currency} ${request.amount.toFixed(2)} in cash at any ${brand.name} customer centre and quote invoice ${request.invoiceNumber}. Your receipt is your proof of payment.`,
      instrumentLabel: null,
      summary: { provider: this.key, method: request.method, settlement: 'manual' },
    };
  }

  /**
   * There is nothing to ask: an offline payment is confirmed by finance, not by a provider. The
   * status stays PENDING so no code path can mistake an unconfirmed transfer for a settled one.
   */
  async verifyPayment(
    _reference: string,
    _providerReference: string | null,
  ): Promise<PaymentVerification> {
    return {
      status: PaymentStatus.PENDING,
      providerReference: null,
      amount: null,
      instrumentLabel: null,
      failureReason: null,
      summary: { provider: this.key, settlement: 'manual' },
    };
  }

  /** Refunds are paid back through the same channel, so they are approved here and paid by hand. */
  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    return {
      status: RefundStatus.APPROVED,
      providerReference: null,
      summary: { provider: this.key, settlement: 'manual', reason: request.reason },
    };
  }

  /** No gateway, therefore no callbacks: any webhook claiming to be one is rejected. */
  verifySignature(): boolean {
    return false;
  }
}

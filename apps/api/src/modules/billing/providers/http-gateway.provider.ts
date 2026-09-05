import { Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PaymentMethod, PaymentStatus, RefundStatus } from '@prisma/client';
import { AppException } from '../../../common/errors/app.exception';
import type {
  PaymentIntentRequest,
  PaymentIntentResult,
  PaymentProvider,
  PaymentVerification,
  RefundRequest,
  RefundResult,
} from './payment-provider.interface';

interface GatewayPaymentResponse {
  id?: string;
  status?: string;
  checkout_url?: string;
  client_secret?: string;
  expires_at?: string;
  instrument_label?: string;
  amount?: number | string;
  failure_reason?: string;
}

/**
 * Adapter for a hosted-checkout gateway that speaks the REST contract documented in
 * `docs/payments.md`.
 *
 * Pakistani gateways (and most international ones) expose the same three operations behind
 * different field names, so the mapping lives here and the rest of the platform stays gateway
 * agnostic. Card and wallet rails are the same integration for these providers; only the method
 * hint sent to the gateway differs.
 */
export class HttpGatewayPaymentProvider implements PaymentProvider {
  readonly methods: PaymentMethod[] = [PaymentMethod.CARD, PaymentMethod.MOBILE_WALLET];

  private readonly logger = new Logger(HttpGatewayPaymentProvider.name);

  constructor(
    readonly key: string,
    private readonly options: {
      apiUrl: string;
      apiKey: string;
      webhookSecret: string;
      timeoutMs?: number;
    },
  ) {}

  async createPayment(request: PaymentIntentRequest): Promise<PaymentIntentResult> {
    const response = await this.call<GatewayPaymentResponse>('POST', '/payments', {
      reference: request.reference,
      // Minor units, which is what every gateway on this contract expects.
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      method: request.method.toLowerCase(),
      description: `Invoice ${request.invoiceNumber}`,
      return_url: request.returnUrl,
      customer: {
        name: request.customer.name,
        email: request.customer.email,
        phone: request.customer.mobile,
      },
      idempotency_key: request.idempotencyKey,
    });

    return {
      status: this.toPaymentStatus(response.status) ?? PaymentStatus.PENDING,
      providerReference: response.id ?? null,
      redirectUrl: response.checkout_url ?? null,
      clientSecret: response.client_secret ?? null,
      expiresAt: response.expires_at ? new Date(response.expires_at) : null,
      instructions: null,
      instrumentLabel: response.instrument_label ?? null,
      summary: this.summarise(response),
    };
  }

  async verifyPayment(
    reference: string,
    providerReference: string | null,
  ): Promise<PaymentVerification> {
    const path = providerReference
      ? `/payments/${encodeURIComponent(providerReference)}`
      : `/payments/by-reference/${encodeURIComponent(reference)}`;

    const response = await this.call<GatewayPaymentResponse>('GET', path);

    return {
      status: this.toPaymentStatus(response.status) ?? PaymentStatus.PENDING,
      providerReference: response.id ?? providerReference,
      // Converted back from minor units so it can be compared with the invoice amount.
      amount: response.amount === undefined ? null : Number(response.amount) / 100,
      instrumentLabel: response.instrument_label ?? null,
      failureReason: response.failure_reason ?? null,
      summary: this.summarise(response),
    };
  }

  async refundPayment(request: RefundRequest): Promise<RefundResult> {
    const response = await this.call<GatewayPaymentResponse>('POST', '/refunds', {
      payment_id: request.providerReference,
      reference: request.paymentReference,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      reason: request.reason,
    });

    const status = (response.status ?? '').toUpperCase();

    return {
      status:
        status === 'SUCCEEDED' || status === 'PROCESSED'
          ? RefundStatus.PROCESSED
          : status === 'FAILED' || status === 'REJECTED'
            ? RefundStatus.FAILED
            : RefundStatus.APPROVED,
      providerReference: response.id ?? null,
      summary: this.summarise(response),
    };
  }

  verifySignature(rawBody: string, signature: string | undefined): boolean {
    if (!signature) return false;

    const expected = createHmac('sha256', this.options.webhookSecret).update(rawBody).digest('hex');
    // Some gateways prefix the scheme, e.g. `sha256=...`.
    const provided = Buffer.from(signature.replace(/^sha256=/i, '').trim(), 'utf8');
    const digest = Buffer.from(expected, 'utf8');

    return provided.length === digest.length && timingSafeEqual(provided, digest);
  }

  private async call<TResponse>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<TResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15_000);

    try {
      const response = await fetch(`${this.options.apiUrl}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = text ? (JSON.parse(text) as TResponse) : ({} as TResponse);

      if (!response.ok) {
        // The gateway's own message is logged but not returned: it can leak internal detail.
        this.logger.error(`Gateway ${method} ${path} failed with ${response.status}: ${text}`);
        throw AppException.of(
          'PAYMENT_VERIFICATION_FAILED',
          'The payment provider could not process this request. Please try again shortly.',
          502,
        );
      }

      return payload;
    } catch (error) {
      if (error instanceof AppException) throw error;

      this.logger.error(
        `Gateway ${method} ${path} error: ${error instanceof Error ? error.message : 'unknown'}`,
      );

      throw AppException.of(
        'PAYMENT_VERIFICATION_FAILED',
        'We could not reach the payment provider. Please try again shortly.',
        502,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private toPaymentStatus(status: string | undefined): PaymentStatus | null {
    switch ((status ?? '').toUpperCase()) {
      case 'SUCCEEDED':
      case 'PAID':
      case 'CAPTURED':
        return PaymentStatus.SUCCEEDED;
      case 'FAILED':
      case 'DECLINED':
        return PaymentStatus.FAILED;
      case 'CANCELLED':
      case 'CANCELED':
        return PaymentStatus.CANCELLED;
      case 'REFUNDED':
        return PaymentStatus.REFUNDED;
      case 'PENDING':
      case 'PROCESSING':
      case 'REQUIRES_ACTION':
        return PaymentStatus.PENDING;
      case 'CREATED':
      case 'INITIATED':
        return PaymentStatus.INITIATED;
      default:
        return null;
    }
  }

  /** Keeps a traceable record of the response without persisting anything sensitive. */
  private summarise(response: GatewayPaymentResponse): Record<string, unknown> {
    return {
      provider: this.key,
      id: response.id ?? null,
      status: response.status ?? null,
      instrumentLabel: response.instrument_label ?? null,
      failureReason: response.failure_reason ?? null,
    };
  }
}

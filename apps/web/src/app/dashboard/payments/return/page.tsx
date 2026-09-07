'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PaymentDto } from '@stormfiber/types';
import { SectionHeading } from '@stormfiber/ui';
import { FormError, FormSuccess } from '@/components/form-field';
import { apiSend } from '@/lib/api';

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-600">Checking payment…</p>}>
      <PaymentReturnBody />
    </Suspense>
  );
}

function PaymentReturnBody() {
  const search = useSearchParams();
  const reference = search.get('reference') ?? search.get('paymentReference') ?? '';
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError('Missing payment reference');
      return;
    }
    apiSend<PaymentDto>(`/customer/payments/${reference}/verify`, {})
      .then(setPayment)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not verify payment'));
  }, [reference]);

  return (
    <div>
      <SectionHeading
        heading="Payment result"
        subheading="The browser redirect is never trusted. Status is confirmed with the payment provider."
      />
      {payment ? <FormSuccess message={`${payment.reference} is ${payment.status}`} /> : null}
      <FormError message={error} />
    </div>
  );
}

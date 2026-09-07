'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatDateTime } from '@stormfiber/config';
import type { Paginated, PaymentDto } from '@stormfiber/types';
import { EmptyState, SectionHeading } from '@stormfiber/ui';
import { apiGet } from '@/lib/api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentDto[]>([]);

  useEffect(() => {
    apiGet<Paginated<PaymentDto>>('/customer/payments?pageSize=20')
      .then((result) => setPayments(result.items))
      .catch(() => setPayments([]));
  }, []);

  return (
    <div>
      <SectionHeading heading="Payments" subheading="Offline payments recorded by staff. There is no online checkout." />
      {payments.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No payments yet" />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
              <div>
                <p className="font-semibold">{payment.reference}</p>
                <p className="text-ink-600">
                  {payment.status} · {payment.method} · {formatDateTime(payment.createdAt)}
                </p>
              </div>
              <p className="font-semibold">{formatCurrency(payment.amount, { currency: payment.currency })}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

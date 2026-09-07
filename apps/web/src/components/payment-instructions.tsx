'use client';

import { useState } from 'react';
import { brand } from '@stormfiber/config';

export function PaymentInstructions({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(!compact);

  return (
    <div className="rounded-2xl border border-[#E6EEF6] bg-white p-5">
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0C2340] px-5 text-sm font-semibold text-white sm:w-auto"
        >
          {open ? 'Hide payment instructions' : 'View payment instructions'}
        </button>
      ) : (
        <h2 className="font-display text-lg font-bold text-[#0C2340]">Pay in person or by transfer</h2>
      )}
      {open ? (
        <div className={`space-y-3 text-sm text-[#4B5563] ${compact ? 'mt-4' : 'mt-3'}`}>
          <p>
            There is no online checkout. Pay by cash on delivery, bank transfer, or at either office.
            Staff mark the invoice paid after the payment is received.
          </p>
          <p>
            <strong className="text-[#0C2340]">{brand.offices.head.label}</strong>
            <br />
            {brand.offices.head.address}
          </p>
          <p>
            <strong className="text-[#0C2340]">{brand.offices.branch.label}</strong>
            <br />
            {brand.offices.branch.address}
          </p>
          <p>
            Phone{' '}
            <a className="font-semibold text-[#2E86DE]" href={`tel:${brand.supportPhoneE164}`}>
              {brand.supportPhoneDisplay}
            </a>
            {' · '}
            <a className="font-semibold text-[#2E86DE]" href={`tel:${brand.whatsappE164}`}>
              {brand.whatsappDisplay}
            </a>
          </p>
          <p>
            Email{' '}
            <a className="font-semibold text-[#2E86DE]" href={`mailto:${brand.officeEmail}`}>
              {brand.officeEmail}
            </a>
          </p>
          <p>
            <a className="font-semibold text-[#25D366]" href={brand.whatsappUrl} target="_blank" rel="noreferrer">
              WhatsApp {brand.whatsappDisplay}
            </a>
          </p>
        </div>
      ) : null}
    </div>
  );
}

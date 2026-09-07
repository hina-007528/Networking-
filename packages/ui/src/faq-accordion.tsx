'use client';

import { useState } from 'react';

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="divide-y divide-ink-200 rounded-2xl border border-ink-100 bg-white">
      {items.map((item) => {
        const open = openId === item.id;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-base font-semibold text-ink-950"
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : item.id)}
              >
                {item.question}
                <span aria-hidden className="text-ink-400">
                  {open ? '−' : '+'}
                </span>
              </button>
            </h3>
            {open ? (
              <div className="px-5 pb-5 text-sm leading-6 text-ink-600">{item.answer}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

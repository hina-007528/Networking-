import type { ReactNode } from 'react';

export interface CtaSectionProps {
  heading: string;
  body?: string;
  actions: ReactNode;
}

export function CtaSection({ heading, body, actions }: CtaSectionProps) {
  return (
    <section className="rounded-xl bg-[#102033] px-6 py-12 text-center sm:px-12">
      <h2 className="font-display text-3xl font-extrabold text-white">{heading}</h2>
      {body ? <p className="mx-auto mt-3 max-w-2xl text-slate-200">{body}</p> : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">{actions}</div>
    </section>
  );
}

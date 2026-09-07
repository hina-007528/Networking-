import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const controlClass =
  'w-full rounded-lg border border-white/10 bg-[#0f1c36] px-3 py-2 text-sm text-slate-100';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} min-h-28 ${props.className ?? ''}`} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-red-400">{message}</p>;
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-emerald-400">{message}</p>;
}

export const primaryBtn =
  'inline-flex h-10 items-center rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950 disabled:opacity-60';
export const ghostBtn =
  'inline-flex h-8 items-center rounded-lg border border-white/15 px-2.5 text-xs font-semibold text-slate-200 hover:bg-white/5';
export const dangerBtn =
  'inline-flex h-8 items-center rounded-lg border border-red-400/40 px-2.5 text-xs font-semibold text-red-300 hover:bg-red-500/10';

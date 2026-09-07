import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="sf-label">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const controlClass = 'sf-input';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClass} ${props.className ?? ''}`} />;
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm font-semibold text-red-600">{message}</p>;
}

export function FormSuccess({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-sm font-semibold text-emerald-700">{message}</p>;
}

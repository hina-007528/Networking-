'use client';

import { useId, useState, type InputHTMLAttributes } from 'react';

export function PasswordInput({
  className,
  id,
  disableAutofill = false,
  autoComplete,
  name,
  readOnly,
  onFocus,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { disableAutofill?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [locked, setLocked] = useState(disableAutofill);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        name={disableAutofill ? 'sf-secret' : name}
        type={visible ? 'text' : 'password'}
        autoComplete={disableAutofill ? 'new-password' : autoComplete}
        readOnly={disableAutofill ? locked : readOnly}
        data-1p-ignore={disableAutofill || undefined}
        data-lpignore={disableAutofill ? 'true' : undefined}
        onFocus={(event) => {
          if (disableAutofill) setLocked(false);
          onFocus?.(event);
        }}
        className={`sf-input pr-12 ${className ?? ''}`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-[#6B7280] hover:bg-[#F3F7FC] hover:text-[#0C2340]"
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        aria-controls={inputId}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12s-3.75 6.75-9.75 6.75S2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="2.75" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 5.2A10.4 10.4 0 0 1 12 4.9c6 0 9.75 7.1 9.75 7.1a16.8 16.8 0 0 1-3.2 4.15M6.1 6.4A16.6 16.6 0 0 0 2.25 12S6 18.75 12 18.75c1.4 0 2.7-.3 3.9-.82" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

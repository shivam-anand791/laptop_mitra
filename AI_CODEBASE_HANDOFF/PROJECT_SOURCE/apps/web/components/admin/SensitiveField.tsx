import React, { useState } from 'react';

export interface SensitiveFieldProps {
  label: string;
  value?: string | number | null;
  maskedValue?: string | null;
  onReveal?: () => Promise<void> | void;
  isLoading?: boolean;
  className?: string;
  copyable?: boolean;
}

export function SensitiveField({
  label,
  value,
  maskedValue,
  onReveal,
  isLoading = false,
  className = '',
  copyable = false,
}: SensitiveFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayMasked = maskedValue || '••••••••••••';
  const displayActual = value ? String(value) : displayMasked;

  const handleToggle = async () => {
    if (!revealed) {
      if (onReveal) {
        await onReveal();
      }
      setRevealed(true);
    } else {
      setRevealed(false);
    }
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {label}
        </label>
        <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Audited
        </span>
      </div>

      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
        <div className="flex-1 font-mono text-sm text-gray-900 select-all truncate">
          {revealed ? displayActual : displayMasked}
        </div>

        <button
          type="button"
          onClick={handleToggle}
          disabled={isLoading}
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-1 cursor-pointer"
          aria-label={revealed ? `Hide ${label}` : `Reveal ${label}`}
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : revealed ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
              <span>Hide</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              <span>Reveal</span>
            </>
          )}
        </button>

        {copyable && revealed && value && (
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-200 transition-colors cursor-pointer"
            title="Copy value"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      <p className="text-[11px] text-gray-500 italic">
        Sensitive financial data. Viewing access is audited and logged.
      </p>
    </div>
  );
}

export default SensitiveField;

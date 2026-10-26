'use client';

import React, { forwardRef, useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      leadingIcon,
      trailingIcon,
      disabled,
      required,
      id,
      className = '',
      containerClassName = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    const describedBy = [
      error ? errorId : null,
      helperText && !error ? helperId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className={['flex flex-col gap-1.5 w-full', containerClassName].join(' ')}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold text-[#111827] flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-[#DC2626] ml-1" aria-hidden="true">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          {leadingIcon && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#94A3B8]">
              {leadingIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={[
              'w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-lg bg-white',
              'text-[#111827] placeholder-[#94A3B8] transition-colors duration-150',
              'border',
              error
                ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20'
                : 'border-[#E2E8F0] hover:border-slate-300 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20',
              'focus:outline-none',
              'disabled:bg-[#F8FAFC] disabled:text-[#94A3B8] disabled:cursor-not-allowed',
              leadingIcon ? 'pl-10' : '',
              trailingIcon ? 'pr-10' : '',
              className,
            ].join(' ')}
            {...props}
          />

          {trailingIcon && (
            <div className="absolute right-3.5 flex items-center text-[#94A3B8]">
              {trailingIcon}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-[#DC2626] flex items-center gap-1" role="alert">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-xs text-[#475569]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;

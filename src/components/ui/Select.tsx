'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  error?: string | null;
  helperText?: string;
  options?: SelectOption[];
  selectSize?: 'sm' | 'md';
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      options,
      selectSize = 'sm',
      containerClassName,
      children,
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-[11px] font-semibold text-theme-muted mb-1 select-none"
          >
            {label}
          </label>
        )}

        <select
          id={selectId}
          ref={ref}
          className={cn(
            'w-full bg-theme-input border border-theme-input rounded-xl text-theme-title transition-colors focus:outline-none focus:border-emerald-500 cursor-pointer',
            selectSize === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs',
            error && 'border-rose-500/50 focus:border-rose-500',
            className
          )}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-theme-card text-theme-title"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>

        {error ? (
          <p className="text-[11px] font-medium text-rose-500 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-theme-muted mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';

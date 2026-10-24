'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string | null;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
  inputSize?: 'sm' | 'md';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      containerClassName,
      inputSize = 'sm',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-semibold text-theme-muted mb-1 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-2.5 flex items-center pointer-events-none text-theme-muted">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={cn(
              'w-full bg-theme-input border border-theme-input rounded-xl text-theme-title placeholder:text-theme-faint transition-colors focus:outline-none focus:border-emerald-500',
              inputSize === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs',
              leftIcon && 'pl-8',
              rightIcon && 'pr-8',
              error && 'border-rose-500/50 focus:border-rose-500 text-rose-500',
              className
            )}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-2.5 flex items-center text-theme-muted">
              {rightIcon}
            </div>
          )}
        </div>

        {error ? (
          <p className="text-[11px] font-medium text-rose-500 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-theme-muted mt-1">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

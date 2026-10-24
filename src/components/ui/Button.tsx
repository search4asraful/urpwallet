'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'ghost'
    | 'outline'
    | 'subtle'
    | 'emerald-subtle'
    | 'rose-subtle'
    | 'sky-subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold shadow-xs active:scale-[0.98]',
  secondary:
    'bg-theme-subtle hover:bg-theme-subtle-hover text-theme-title border border-theme active:scale-[0.98]',
  danger:
    'bg-rose-500 hover:bg-rose-400 text-white font-bold shadow-xs active:scale-[0.98]',
  ghost:
    'text-theme-muted hover:text-theme-title hover:bg-theme-subtle active:scale-[0.98]',
  outline:
    'border border-theme-strong text-theme-title hover:bg-theme-subtle active:scale-[0.98]',
  subtle:
    'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 active:scale-[0.98]',
  'emerald-subtle':
    'bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 border border-emerald-500/20 active:scale-[0.98]',
  'rose-subtle':
    'bg-rose-500/10 hover:bg-rose-500/15 text-rose-500 border border-rose-500/20 active:scale-[0.98]',
  'sky-subtle':
    'bg-sky-500/10 hover:bg-sky-500/15 text-sky-500 border border-sky-500/20 active:scale-[0.98]',
};

const SIZE_CLASSES: Record<NonNullable<ButtonProps['size']>, string> = {
  xs: 'h-7 px-2.5 text-[11px] font-semibold rounded-lg gap-1',
  sm: 'h-8 px-3 text-xs font-semibold rounded-xl gap-1.5',
  md: 'h-9 px-4 text-xs font-semibold rounded-xl gap-2',
  lg: 'h-10 px-5 text-sm font-bold rounded-xl gap-2',
  icon: 'w-8 h-8 p-0 rounded-lg justify-center',
  'icon-sm': 'w-7 h-7 p-0 rounded-lg justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'secondary',
      size = 'sm',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center transition-all select-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

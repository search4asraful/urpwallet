'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple' | 'emerald' | 'rose' | 'sky' | 'amber';
  size?: 'xs' | 'sm';
  dot?: boolean;
  icon?: React.ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<BadgeProps['variant']>, { badge: string; dot: string }> = {
  success: {
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  danger: {
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  warning: {
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  info: {
    badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    dot: 'bg-sky-500',
  },
  sky: {
    badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
    dot: 'bg-sky-500',
  },
  neutral: {
    badge: 'bg-theme-subtle text-theme-muted border-theme',
    dot: 'bg-theme-muted',
  },
  purple: {
    badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    dot: 'bg-purple-400',
  },
};

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5 rounded-md gap-1',
  sm: 'text-[11px] px-2 py-0.5 rounded-lg gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'neutral',
  size = 'xs',
  dot = false,
  icon,
  children,
  ...props
}) => {
  const styles = VARIANT_CLASSES[variant];

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold border select-none',
        styles.badge,
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

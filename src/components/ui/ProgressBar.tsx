'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'auto' | 'emerald' | 'amber' | 'rose' | 'sky';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  barClassName?: string;
}

const SIZE_CLASSES = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'auto',
  size = 'md',
  className,
  barClassName,
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  let colorClass = 'bg-emerald-500';
  if (variant === 'auto') {
    if (percentage >= 100) {
      colorClass = 'bg-rose-500';
    } else if (percentage >= 80) {
      colorClass = 'bg-amber-500';
    } else {
      colorClass = 'bg-emerald-500';
    }
  } else if (variant === 'rose') {
    colorClass = 'bg-rose-500';
  } else if (variant === 'amber') {
    colorClass = 'bg-amber-500';
  } else if (variant === 'sky') {
    colorClass = 'bg-sky-500';
  }

  return (
    <div
      className={cn(
        'w-full bg-theme-subtle border border-theme rounded-full overflow-hidden',
        SIZE_CLASSES[size],
        className
      )}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-300', colorClass, barClassName)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

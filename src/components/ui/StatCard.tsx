'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  iconColor?: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  action?: React.ReactNode;
  variant?: 'card' | 'subtle';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  iconColor,
  subtitle,
  trend,
  action,
  variant = 'card',
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl p-5 shadow-xs transition-colors',
        variant === 'card'
          ? 'bg-theme-card border border-theme'
          : 'bg-theme-subtle border border-theme',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span className={cn('shrink-0 text-theme-muted', iconColor)}>
              {icon}
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wider text-theme-muted">
            {label}
          </span>
        </div>
        {action}
      </div>

      <div className="text-2xl font-extrabold text-theme-title tabular-nums tracking-tight">
        {value}
      </div>

      {(subtitle || trend) && (
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span
              className={cn(
                'text-[11px] font-semibold',
                trend.isPositive ? 'text-emerald-500' : 'text-rose-500'
              )}
            >
              {trend.value}
            </span>
          )}
          {subtitle && (
            <span className="text-xs text-theme-muted">{subtitle}</span>
          )}
        </div>
      )}
    </div>
  );
};

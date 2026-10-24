'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-theme-card border border-theme rounded-2xl py-12 px-6 flex flex-col items-center justify-center text-center shadow-xs',
        className
      )}
    >
      {icon && <div className="text-theme-faint mb-3">{icon}</div>}
      <h3 className="text-sm font-semibold text-theme-title">{title}</h3>
      {description && (
        <p className="text-xs text-theme-muted mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

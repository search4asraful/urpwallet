'use client';

import { cn } from '@/lib/utils';
import React from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
  activeColor?: 'primary' | 'emerald' | 'rose' | 'sky';
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export const Tabs = <T extends string = string>({
  items,
  activeTab,
  onChange,
  className,
  size = 'sm',
}: TabsProps<T>) => {
  return (
    <div
      className={cn(
        'grid p-1 bg-theme-subtle rounded-xl border border-theme',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((tab) => {
        const isActive = activeTab === tab.id;
        let activeBg = 'bg-theme-card text-theme-title font-bold shadow-xs';

        if (tab.activeColor === 'rose') {
          activeBg = 'bg-rose-500 text-white font-bold shadow-xs';
        } else if (tab.activeColor === 'emerald') {
          activeBg = 'bg-emerald-500 text-zinc-950 font-bold shadow-xs';
        } else if (tab.activeColor === 'sky') {
          activeBg = 'bg-sky-500 text-white font-bold shadow-xs';
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all select-none px-2',
              size === 'sm' ? 'py-1.5' : 'py-2',
              isActive
                ? activeBg
                : 'text-theme-muted hover:text-theme-title'
            )}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5',
                  isActive
                    ? 'bg-black/20 text-current'
                    : 'bg-theme-subtle text-theme-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

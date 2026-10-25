'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const MAX_WIDTH_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  headerActions,
  maxWidth = 'sm',
  className,
  bodyClassName,
  children,
  showCloseButton = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-4 pb-20 sm:pb-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'bg-theme-card border border-theme rounded-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150',
          MAX_WIDTH_CLASSES[maxWidth],
          className
        )}
      >
        {(title || showCloseButton || headerActions) && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-theme shrink-0">
            <div>
              {typeof title === 'string' ? (
                <h2 className="text-sm font-bold text-theme-title">{title}</h2>
              ) : (
                title
              )}
              {subtitle && (
                <p className="text-[11px] text-theme-muted mt-0.5">{subtitle}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {headerActions}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close modal"
                  className="p-1 text-theme-muted hover:text-theme-title rounded-lg hover:bg-theme-subtle transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div className={cn('flex-1 overflow-y-auto', bodyClassName)}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

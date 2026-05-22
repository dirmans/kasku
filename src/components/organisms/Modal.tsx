import type React from 'react';
import { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Content */}
      <div
        className={`relative bg-surface rounded-2xl w-full ${sizeClasses[size]} shadow-[0_24px_64px_rgba(0,0,0,0.25)] border border-border animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="text-[16px] font-semibold text-textMain">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface2 text-text3 hover:text-textMain transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[calc(100vh-200px)] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="p-5 border-t border-border/50 flex justify-end gap-3 bg-surface2/30 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

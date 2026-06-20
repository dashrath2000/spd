import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md', className }: ModalProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Track how many modals are open to avoid restoring scroll prematurely
    const count = ((window as any).__modalCount || 0) + 1;
    (window as any).__modalCount = count;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEsc);

    return () => {
      window.removeEventListener('keydown', handleEsc);
      const remaining = Math.max(0, ((window as any).__modalCount || 1) - 1);
      (window as any).__modalCount = remaining;
      if (remaining === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-[96rem]',
    full: 'max-w-full m-4 h-[calc(100vh-2rem)]',
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-[var(--luxury-overlay)] animate-fade-in"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={cn(
        'relative w-full bg-[var(--luxury-modal-bg,var(--luxury-charcoal))] border border-luxury-border rounded-2xl shadow-2xl animate-scale-in flex flex-col',
        sizes[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-luxury-border-dim">
            <h2 className="text-2xl font-serif text-gold-400 font-bold">{title}</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-luxury-surface rounded-full transition-colors text-luxury-text-muted hover:text-luxury-text"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto max-h-[85vh] scrollbar-gold">
          {children}
        </div>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, onFocus, ...props }, ref) => {

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      // Auto-select content on focus for number inputs so typing replaces "0"
      if (props.type === 'number') {
        e.target.select();
      }
      onFocus?.(e);
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-luxury-text-muted">
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-luxury-text-muted group-focus-within:text-gold-400 transition-colors">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            onFocus={handleFocus}
            className={cn(
              'w-full border border-luxury-border-dim rounded-lg px-4 py-2.5 transition-all text-luxury-text',
              'bg-luxury-input placeholder:text-luxury-text-dim',
              'focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400/30',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-luxury-text-dim transition-colors">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-luxury-text-dim">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

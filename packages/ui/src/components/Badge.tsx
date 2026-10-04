import React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline';
}

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'destructive':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'outline':
        return 'border border-slate-700 text-slate-300';
      default:
        return 'bg-slate-800 text-slate-300 border border-transparent';
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium",
        getVariantStyles(),
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

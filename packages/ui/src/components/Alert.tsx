import React from 'react';
import { cn } from '../utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const variants = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-200',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
    warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200',
    error: 'bg-red-500/10 border-red-500/20 text-red-200'
  };

  const titleColors = {
    info: 'text-blue-400',
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    error: 'text-red-400'
  };

  return (
    <div 
      className={cn(
        "rounded-lg border p-4",
        variants[variant],
        className
      )}
      role="alert"
      {...props}
    >
      {title && (
        <h5 className={cn("mb-1 font-medium leading-none tracking-tight", titleColors[variant])}>
          {title}
        </h5>
      )}
      <div className="text-sm opacity-90">
        {children}
      </div>
    </div>
  );
}

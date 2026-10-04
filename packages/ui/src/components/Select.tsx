import React from 'react';
import { cn } from '../utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-700 bg-[#0f1117] px-3 py-2 text-sm text-slate-200",
          "focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "appearance-none",
          error && "border-red-500 focus:ring-red-500",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = "Select";

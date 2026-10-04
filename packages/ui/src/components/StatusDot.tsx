import React from 'react';
import { cn } from '../utils';

export interface StatusDotProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: 'online' | 'offline' | 'connecting' | 'degraded' | 'error' | 'enrolling' | 'updating';
  pulse?: boolean;
}

export function StatusDot({ status = 'offline', pulse = false, className, ...props }: StatusDotProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'offline': return 'bg-slate-500';
      case 'connecting': return 'bg-blue-500';
      case 'degraded': return 'bg-yellow-500';
      case 'enrolling': return 'bg-purple-500';
      case 'updating': return 'bg-cyan-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const isConnecting = status === 'connecting' || status === 'enrolling' || status === 'updating';
  const shouldPulse = pulse || isConnecting;

  return (
    <div className="relative flex h-2.5 w-2.5 items-center justify-center">
      {shouldPulse && (
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-75 animate-ping",
            getStatusColor()
          )}
        />
      )}
      <div
        className={cn(
          "relative h-2.5 w-2.5 rounded-full",
          getStatusColor(),
          className
        )}
        {...props}
      />
    </div>
  );
}

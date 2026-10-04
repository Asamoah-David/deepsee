import React from 'react';
import { cn } from '../utils';

export interface MetricBarProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: number; // 0-100
  showLabel?: boolean;
}

export function MetricBar({ label, value, showLabel = true, className, ...props }: MetricBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  
  let colorClass = 'bg-emerald-500';
  if (clampedValue >= 85) {
    colorClass = 'bg-red-500';
  } else if (clampedValue >= 70) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)} {...props}>
      {showLabel && (
        <div className="flex justify-between text-xs font-mono text-slate-300">
          <span>{label}</span>
          <span>{Math.round(clampedValue)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-slate-800 rounded-sm overflow-hidden">
        <div
          className={cn("h-full rounded-sm transition-all duration-500 ease-out", colorClass)}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}

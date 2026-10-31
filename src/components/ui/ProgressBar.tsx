import React from 'react';
import { InventoryStatus } from '../../types';

interface ProgressBarProps {
  value: number; // Current stock
  max?: number;  // Capacity / Target stock (default 50 or computed)
  status: InventoryStatus;
  heightClass?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 50,
  status,
  heightClass = 'h-2',
  showLabel = false
}) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / Math.max(1, max)) * 100)));

  // Color mapping based on status
  let barColor = 'bg-emerald-500';
  let glowColor = 'shadow-emerald-500/20';
  if (status === 'critical') {
    barColor = 'bg-rose-500';
    glowColor = 'shadow-rose-500/30';
  } else if (status === 'low') {
    barColor = 'bg-amber-500';
    glowColor = 'shadow-amber-500/25';
  }

  return (
    <div className="w-full space-y-1">
      {showLabel && (
        <div className="flex justify-between text-[11px] font-medium text-gray-400">
          <span>Level: {percentage}%</span>
          <span>{value} / {max}</span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-surface-subtle border border-surface-border/40 ${heightClass}`}>
        <div
          className={`${heightClass} rounded-full transition-all duration-500 ease-out ${barColor} shadow-sm ${glowColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;


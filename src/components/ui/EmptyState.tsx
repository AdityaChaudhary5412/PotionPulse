import React from 'react';
import { PackageOpen, Sparkles, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Reagents Found',
  description = 'Your potion shelves are bare or match no active search spells.',
  actionLabel = 'Reseed Pantry Ledger',
  onAction,
  icon
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-surface p-12 text-center shadow-sm max-w-lg mx-auto my-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-950/40 border border-purple-800/30 text-purple-400 mb-4 shadow-lg shadow-purple-950/50">
        {icon || <PackageOpen className="h-8 w-8 text-purple-400" />}
      </div>
      <h3 className="font-display text-lg font-bold text-white tracking-wide">
        {title}
      </h3>
      <p className="mt-2 text-xs text-gray-400 max-w-xs leading-relaxed">
        {description}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-6 flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
};

export default EmptyState;

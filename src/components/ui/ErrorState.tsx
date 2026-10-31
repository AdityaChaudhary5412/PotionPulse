import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'Dark Magic Disturbance'
}) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-900/40 bg-rose-950/20 p-8 text-center max-w-lg mx-auto my-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400 mb-3 shadow-lg shadow-rose-950/50">
        <AlertOctagon className="h-6 w-6 text-rose-400" />
      </div>
      <h3 className="font-display text-base font-bold text-rose-200">
        {title}
      </h3>
      <p className="mt-2 text-xs text-rose-300/80 max-w-sm font-mono break-words">
        {error || 'Unable to connect to PotionPulse backend. Please verify FastAPI is running.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 flex items-center gap-1.5 rounded-xl border border-rose-800/80 bg-rose-900/40 px-4 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-900/60 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;

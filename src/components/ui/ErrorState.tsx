import React from 'react';
import { AlertOctagon, RotateCcw, Terminal } from 'lucide-react';

interface ErrorStateProps {
  error?: string | null;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  title = 'System Alert'
}) => {
  return (
    <div className="emergent-glass-card border-red-500/30 p-8 text-center max-w-lg mx-auto my-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mb-3 mx-auto shadow-emergent-glow-green">
        <AlertOctagon className="h-6 w-6 text-red-400" />
      </div>
      <h3 className="font-sans text-base font-bold text-white tracking-tight">
        {title}
      </h3>
      <p className="mt-2 text-xs text-red-300/90 max-w-sm mx-auto font-mono break-words leading-relaxed">
        {error || 'Unable to connect to backend engine. Verify FastAPI is running on http://localhost:8000.'}
      </p>

      {/* Helpful command tip for local devs */}
      <div className="mt-4 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] text-gray-400 font-mono flex items-center justify-center gap-2">
        <Terminal className="w-3.5 h-3.5 text-emergent-cyan" />
        <span>uvicorn backend.main:app --port 8000</span>
      </div>

      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-emergent-cyan" />
          <span>Retry Connection</span>
        </button>
      )}
    </div>
  );
};

export default ErrorState;


import React from 'react';
import { Sparkles } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  cardCount?: number;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Consulting the grimoire & prophecy engine...',
  cardCount = 4
}) => {
  return (
    <div className="w-full py-8 space-y-6 animate-pulse">
      {/* Loading message */}
      <div className="flex items-center justify-center gap-2 text-sm text-purple-300 font-medium">
        <Sparkles className="w-4 h-4 animate-spin text-accent" />
        <span>{message}</span>
      </div>

      {/* Skeleton cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-surface-border bg-surface p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 bg-surface-subtle rounded-md" />
              <div className="h-5 w-16 bg-surface-subtle rounded-full" />
            </div>
            <div className="h-8 w-20 bg-surface-subtle rounded-md" />
            <div className="h-2 w-full bg-surface-subtle rounded-full" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-7 bg-surface-subtle rounded-xl" />
              <div className="h-7 bg-surface-subtle rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LoadingState;


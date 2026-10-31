import React from 'react';
import { PantrySummary } from '../../types';
import { AlertTriangle, AlertOctagon, Bell, Clock, Sparkles } from 'lucide-react';

interface StatCardsProps {
  summary: PantrySummary | null;
  loading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 mb-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-emergent border border-white/5 bg-surface p-4" />
        ))}
      </div>
    );
  }

  const lowStock = summary?.low_count ?? 0;
  const criticalItems = summary?.critical_count ?? 0;
  const alertsToday = summary?.alerts_today ?? 0;
  const nearestDays = summary?.nearest_stockout_days;

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 mb-8">
      {/* 1. Low-Stock Items */}
      <div className="emergent-glass-card p-4 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Low-Stock Items
          </span>
          <div className="p-1 rounded-lg bg-status-low-bg border border-status-low-border text-status-low">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {lowStock}
          </div>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-status-low-bg text-status-low border border-status-low-border">
            3-7 Days
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Reagents approaching threshold</p>
      </div>

      {/* 2. Critical Items */}
      <div className="emergent-glass-card p-4 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Critical Stock
          </span>
          <div className="p-1 rounded-lg bg-status-critical-bg border border-status-critical-border text-status-critical">
            <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {criticalItems}
          </div>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-status-critical-bg text-status-critical border border-status-critical-border">
            &le; 2 Days
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Imminent recipe interruption</p>
      </div>

      {/* 3. Alerts Today */}
      <div className="emergent-glass-card p-4 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Anomalies & Hazards
          </span>
          <div className="p-1 rounded-lg bg-emergent-cyan/10 border border-emergent-cyan/30 text-emergent-cyan">
            <Bell className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {alertsToday}
          </div>
          <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emergent-cyan/10 text-emergent-cyan border border-emergent-cyan/30">
            Audit Feed
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">Z-score spikes & missing stock</p>
      </div>

      {/* 4. Nearest Stockout in Days */}
      <div className="emergent-glass-card p-4 sm:p-5 relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
            Nearest Depletion
          </span>
          <div className="p-1 rounded-lg bg-emergent-green/10 border border-emergent-green/30 text-emergent-green">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {nearestDays !== undefined && nearestDays !== null ? (
              nearestDays <= 0 ? (
                <span className="text-status-critical">0.0</span>
              ) : (
                <span>{nearestDays.toFixed(1)}</span>
              )
            ) : (
              <span className="text-emergent-green">Safe</span>
            )}
          </div>
          {nearestDays !== undefined && nearestDays !== null && (
            <span className="text-xs text-gray-400 font-mono">days</span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400">First reagent supply countdown</p>
      </div>
    </div>
  );
};

export default StatCards;


import React from 'react';
import { PantrySummary } from '../../types';
import { AlertTriangle, AlertOctagon, Bell, Clock, Package } from 'lucide-react';

interface StatCardsProps {
  summary: PantrySummary | null;
  loading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-surface-border bg-surface p-4" />
        ))}
      </div>
    );
  }

  const lowStock = summary?.low_count ?? 0;
  const criticalItems = summary?.critical_count ?? 0;
  const alertsToday = summary?.alerts_today ?? 0;
  const nearestDays = summary?.nearest_stockout_days;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-8">
      {/* 1. Low-Stock Items */}
      <div className="rounded-2xl border border-amber-900/30 bg-amber-950/15 p-4 shadow-sm hover:border-amber-700/50 transition-all">
        <div className="flex items-center justify-between text-amber-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Low-Stock Items</span>
          <AlertTriangle className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 text-3xl font-extrabold text-amber-300">
          {lowStock}
        </div>
        <p className="mt-1 text-[11px] text-amber-400/80">3 to 7 Days Supply Left</p>
      </div>

      {/* 2. Critical Items */}
      <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 shadow-sm hover:border-rose-700/60 transition-all">
        <div className="flex items-center justify-between text-rose-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Critical Items</span>
          <AlertOctagon className="w-4 h-4 text-rose-400 animate-pulse" />
        </div>
        <div className="mt-2 text-3xl font-extrabold text-rose-300">
          {criticalItems}
        </div>
        <p className="mt-1 text-[11px] text-rose-400/80">Imminent Stockout (&lt; 2 Days)</p>
      </div>

      {/* 3. Alerts Today */}
      <div className="rounded-2xl border border-purple-900/40 bg-purple-950/20 p-4 shadow-sm hover:border-purple-700/50 transition-all">
        <div className="flex items-center justify-between text-purple-300">
          <span className="text-xs font-semibold uppercase tracking-wider">Alerts Today</span>
          <Bell className="w-4 h-4 text-purple-400" />
        </div>
        <div className="mt-2 text-3xl font-extrabold text-purple-200">
          {alertsToday}
        </div>
        <p className="mt-1 text-[11px] text-purple-300/80">Anomalies & Hazards</p>
      </div>

      {/* 4. Nearest Stockout in Days */}
      <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm hover:border-accent/40 transition-all">
        <div className="flex items-center justify-between text-gray-400">
          <span className="text-xs font-semibold uppercase tracking-wider">Nearest Stockout</span>
          <Clock className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2 text-3xl font-extrabold text-white">
          {nearestDays !== undefined && nearestDays !== null ? (
            nearestDays <= 0 ? (
              <span className="text-rose-400">Depleted</span>
            ) : (
              <span>{nearestDays.toFixed(1)} <span className="text-sm font-normal text-gray-400">days</span></span>
            )
          ) : (
            'Safe'
          )}
        </div>
        <p className="mt-1 text-[11px] text-gray-400">First Reagent to Deplete</p>
      </div>
    </div>
  );
};

export default StatCards;

import React from 'react';
import { PantrySummary } from '../../types';
import { AlertTriangle, AlertOctagon, Bell, Clock, ShieldCheck } from 'lucide-react';

interface StatCardsProps {
  summary: PantrySummary | null;
  loading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4 mb-8 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-white/5 bg-white/[0.02] p-4" />
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#161224]/80 via-[#120f1d]/80 to-[#181120]/80 border border-amber-500/20 p-5 shadow-lg backdrop-blur-xl hover:border-amber-400/40 transition-all group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-amber-200/70 uppercase">
            Low Stock
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {lowStock}
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            3-7 Days
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 font-medium">Reagents approaching threshold</p>
      </div>

      {/* 2. Critical Items */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1c101c]/80 via-[#150d18]/80 to-[#1b1016]/80 border border-red-500/25 p-5 shadow-lg backdrop-blur-xl hover:border-red-400/45 transition-all group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-red-500/15 blur-2xl pointer-events-none group-hover:bg-red-500/25 transition-all" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-red-300/80 uppercase">
            Critical Stock
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/20 border border-red-500/35 text-red-400">
            <AlertOctagon className="w-3.5 h-3.5 animate-pulse" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {criticalItems}
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-semibold">
            &le; 2 Days
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 font-medium">Imminent stockout interruption</p>
      </div>

      {/* 3. Alerts Today */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#12152a]/80 via-[#0f1222]/80 to-[#141226]/80 border border-purple-500/20 p-5 shadow-lg backdrop-blur-xl hover:border-purple-400/40 transition-all group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-500/15 blur-2xl pointer-events-none group-hover:bg-purple-500/25 transition-all" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-purple-200/70 uppercase">
            Anomalies
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
            <Bell className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {alertsToday}
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
            Audit Feed
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 font-medium">Z-score spikes & midnight leaks</p>
      </div>

      {/* 4. Nearest Depletion in Days */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0e1c1b]/80 via-[#0c1618]/80 to-[#101920]/80 border border-cyan-500/20 p-5 shadow-lg backdrop-blur-xl hover:border-cyan-400/40 transition-all group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-cyan-500/15 blur-2xl pointer-events-none group-hover:bg-cyan-500/25 transition-all" />

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-cyan-200/70 uppercase">
            Nearest Depletion
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="mt-3 flex items-baseline gap-1.5">
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {nearestDays !== undefined && nearestDays !== null ? (
              nearestDays <= 0 ? (
                <span className="text-red-400">0.0</span>
              ) : (
                <span>{nearestDays.toFixed(1)}</span>
              )
            ) : (
              <span className="text-emerald-400">Safe</span>
            )}
          </div>
          {nearestDays !== undefined && nearestDays !== null && (
            <span className="text-xs text-gray-400 font-mono">days</span>
          )}
        </div>
        <p className="mt-1.5 text-[11px] text-gray-400 font-medium">First reagent supply countdown</p>
      </div>
    </div>
  );
};

export default StatCards;


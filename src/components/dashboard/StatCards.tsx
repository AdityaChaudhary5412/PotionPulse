import React from 'react';
import { PantrySummary } from '../../types';
import { AlertTriangle, AlertOctagon, Bell, Clock } from 'lucide-react';

interface StatCardsProps {
  summary: PantrySummary | null;
  loading?: boolean;
}

export const StatCards: React.FC<StatCardsProps> = ({ summary, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6 animate-pulse">
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
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 mb-6">
      {/* 1. Critical Stock */}
      <div className="relative overflow-hidden rounded-2xl bg-[#110e1a]/70 border border-red-500/20 p-4 sm:p-5 backdrop-blur-xl hover:border-red-500/40 transition-all duration-300 group shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span>Critical Stock</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-500/25">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{criticalItems}</span>
          <span className="text-xs text-red-300/80 font-medium">&le; 2 days buffer</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 truncate">Immediate replenishment needed</p>
      </div>

      {/* 2. Low Stock Items */}
      <div className="relative overflow-hidden rounded-2xl bg-[#110e1a]/70 border border-amber-500/20 p-4 sm:p-5 backdrop-blur-xl hover:border-amber-500/40 transition-all duration-300 group shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span>Low Stock</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{lowStock}</span>
          <span className="text-xs text-amber-300/80 font-medium">3-7 days buffer</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 truncate">Approaching reorder threshold</p>
      </div>

      {/* 3. Anomalies & Threats */}
      <div className="relative overflow-hidden rounded-2xl bg-[#110e1a]/70 border border-purple-500/20 p-4 sm:p-5 backdrop-blur-xl hover:border-purple-500/40 transition-all duration-300 group shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span>Pantry Anomalies</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <Bell className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{alertsToday}</span>
          <span className="text-xs text-purple-300/80 font-medium">Flagged spikes</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 truncate">Consumption & leak forensics</p>
      </div>

      {/* 4. Nearest Depletion Countdown */}
      <div className="relative overflow-hidden rounded-2xl bg-[#110e1a]/70 border border-cyan-500/20 p-4 sm:p-5 backdrop-blur-xl hover:border-cyan-500/40 transition-all duration-300 group shadow-sm">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span>Nearest Depletion</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${nearestDays !== undefined && nearestDays <= 0 ? 'text-red-400' : 'text-white'}`}>
            {nearestDays !== undefined && nearestDays !== null ? (nearestDays <= 0 ? '0.0' : nearestDays.toFixed(1)) : 'Safe'}
          </span>
          <span className="text-xs text-gray-400 font-mono">days</span>
        </div>
        <p className="mt-1 text-[11px] text-gray-400 truncate">First stockout timer</p>
      </div>
    </div>
  );
};

export default StatCards;

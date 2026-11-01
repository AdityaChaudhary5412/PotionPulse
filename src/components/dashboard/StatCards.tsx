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

  // Human-readable countdown for nearest stockout
  const getStockoutStatus = () => {
    if (nearestDays === undefined || nearestDays === null) {
      return { value: 'Safe', unit: '', subtext: 'All shelves fully stocked' };
    }
    if (nearestDays <= 0) {
      return { value: 'Depleted', unit: '', subtext: 'Immediate restock required' };
    }
    if (nearestDays < 1) {
      const hours = Math.max(1, Math.round(nearestDays * 24));
      return { value: `${hours}h`, unit: 'left', subtext: 'Runs out today' };
    }
    return { value: nearestDays.toFixed(1), unit: 'days', subtext: 'First stockout countdown' };
  };

  const nearestStatus = getStockoutStatus();

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 mb-6">
      {/* 1. Critical Stock */}
      <div className="relative overflow-hidden rounded-2xl bg-[#140e1a]/85 border border-red-500/25 p-4 sm:p-5 backdrop-blur-xl hover:border-red-500/45 transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(239,68,68,0.1)]">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span className="text-gray-300 font-medium">Critical Stock</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-red-500/15 text-red-400 border border-red-500/25">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{criticalItems}</span>
          <span className="text-xs text-red-300 font-semibold">&le; 2 days buffer</span>
        </div>
        <p className="mt-1 text-xs text-gray-400 truncate">Immediate replenishment needed</p>
      </div>

      {/* 2. Low Stock Items */}
      <div className="relative overflow-hidden rounded-2xl bg-[#141018]/85 border border-amber-500/25 p-4 sm:p-5 backdrop-blur-xl hover:border-amber-500/45 transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)]">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span className="text-gray-300 font-medium">Low Stock</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/25">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{lowStock}</span>
          <span className="text-xs text-amber-300 font-semibold">3-7 days buffer</span>
        </div>
        <p className="mt-1 text-xs text-gray-400 truncate">Approaching reorder threshold</p>
      </div>

      {/* 3. Anomalies & Threats */}
      <div className="relative overflow-hidden rounded-2xl bg-[#130f1c]/85 border border-purple-500/25 p-4 sm:p-5 backdrop-blur-xl hover:border-purple-500/45 transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(168,85,247,0.1)]">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span className="text-gray-300 font-medium">Pantry Alerts</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25">
            <Bell className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{alertsToday}</span>
          <span className="text-xs text-purple-300 font-semibold">Flagged events</span>
        </div>
        <p className="mt-1 text-xs text-gray-400 truncate">Demand spikes & stock audits</p>
      </div>

      {/* 4. Nearest Depletion Countdown */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f131a]/85 border border-cyan-500/25 p-4 sm:p-5 backdrop-blur-xl hover:border-cyan-500/45 transition-all duration-300 group shadow-[0_4px_20px_-4px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between text-xs font-medium text-gray-400">
          <span className="text-gray-300 font-medium">First Depletion</span>
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${nearestDays !== undefined && nearestDays <= 0 ? 'text-red-400' : 'text-white'}`}>
            {nearestStatus.value}
          </span>
          {nearestStatus.unit && (
            <span className="text-xs text-gray-400 font-medium">{nearestStatus.unit}</span>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-400 truncate">{nearestStatus.subtext}</p>
      </div>
    </div>
  );
};

export default StatCards;

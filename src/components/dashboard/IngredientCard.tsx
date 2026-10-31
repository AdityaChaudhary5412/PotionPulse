import React from 'react';
import { RestockItem } from '../../types';
import { getStatusConfig } from '../../lib/constants';
import ProgressBar from '../ui/ProgressBar';
import { Clock, Plus, Minus, Flame, Sparkles } from 'lucide-react';

interface IngredientCardProps {
  item: RestockItem;
  onRestock: (item: RestockItem) => void;
  onSale: (item: RestockItem) => void;
  onSelect?: (item: RestockItem) => void;
}

const REAGENT_ICONS: Record<string, string> = {
  'bat wings': '🦇',
  'dragon scale': '🐉',
  'eye of newt': '👁️',
  'ghost pepper': '🌶️',
  'mandrake root': '🪴',
  'nightshade essence': '🧪',
  'phoenix feather': '🪶',
  'spider silk': '🕸️',
};

export const IngredientCard: React.FC<IngredientCardProps> = ({
  item,
  onRestock,
  onSale,
  onSelect
}) => {
  const cfg = getStatusConfig(item.status);
  const StatusIcon = cfg.icon;

  const reagentKey = (item.ingredient || '').toLowerCase();
  const iconEmoji = REAGENT_ICONS[reagentKey] || '🔮';

  // Capacity max for visual meter
  const capacityMax = Math.max(40, item.stock + (item.reorder_qty || 15));

  // Ambient aura styles based on status
  const auraGlow =
    item.status === 'critical'
      ? 'border-red-500/25 shadow-[0_4px_24px_-2px_rgba(239,68,68,0.15)] hover:border-red-400/50 hover:shadow-[0_8px_30px_rgba(239,68,68,0.25)]'
      : item.status === 'low'
      ? 'border-amber-500/20 shadow-[0_4px_24px_-2px_rgba(245,158,11,0.12)] hover:border-amber-400/40 hover:shadow-[0_8px_30px_rgba(245,158,11,0.2)]'
      : 'border-emerald-500/15 shadow-[0_4px_24px_-2px_rgba(16,185,129,0.08)] hover:border-emerald-400/35 hover:shadow-[0_8px_30px_rgba(16,185,129,0.18)]';

  return (
    <div
      className={`relative rounded-2xl bg-gradient-to-b from-[#161324]/85 to-[#0f0d19]/85 backdrop-blur-xl border p-5 flex flex-col justify-between group transition-all duration-300 ${auraGlow}`}
    >
      <div>
        {/* Top Header: Avatar on left, Status Badge on right */}
        <div className="flex items-center justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/15 via-[#1a162b] to-cyan-500/15 border border-white/10 text-2xl shadow-inner group-hover:scale-105 group-hover:border-purple-400/50 transition-all cursor-pointer"
            onClick={() => onSelect && onSelect(item)}
          >
            {iconEmoji}
          </div>

          {/* Refined Apothecary Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-sm ${cfg.badgeClass}`}
          >
            <StatusIcon className="w-3 h-3 flex-shrink-0" />
            <span>{cfg.badgeLabel}</span>
          </span>
        </div>

        {/* Reagent Name & Lead Time */}
        <div
          className="mt-3 cursor-pointer"
          onClick={() => onSelect && onSelect(item)}
        >
          <h3 className="font-sans font-bold text-white text-base tracking-tight group-hover:text-cyan-300 transition-colors leading-snug">
            {item.ingredient}
          </h3>
          <p className="text-[11px] font-mono text-gray-400 mt-0.5">
            {item.lead_time_days || 7}d lead time
          </p>
        </div>

        {/* Current Stock Display & Depletion Countdown */}
        <div className="mt-5 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-white tracking-tight">
              {item.stock}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              {item.unit}
            </span>
          </div>

          {/* Depletion Countdown */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-[10px] uppercase font-semibold text-gray-400">
              <Clock className="w-3 h-3 text-gray-400" />
              <span>Depletion</span>
            </div>
            <span
              className={`text-xs font-bold font-mono ${
                item.days_until_stockout <= 0
                  ? 'text-red-400 animate-pulse font-extrabold'
                  : item.days_until_stockout <= 2
                  ? 'text-red-300'
                  : item.days_until_stockout <= 7
                  ? 'text-amber-300'
                  : 'text-emerald-400'
              }`}
            >
              {item.days_until_stockout <= 0 ? 'Depleted' : `${item.days_until_stockout.toFixed(1)} Days`}
            </span>
          </div>
        </div>

        {/* Fluid Stock Progress Meter */}
        <div className="mt-3">
          <ProgressBar
            value={item.stock}
            max={capacityMax}
            status={item.status}
            heightClass="h-2"
          />
        </div>

        {/* Clean Telemetry Grid (Balanced 2-column) */}
        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 text-xs grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Daily Burn</span>
            </div>
            <div className="font-mono text-xs font-semibold text-gray-200 mt-0.5">
              {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'}/day
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400 uppercase font-semibold">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Restock Target</span>
            </div>
            <div className="font-mono text-xs font-bold text-cyan-300 mt-0.5">
              +{item.reorder_qty} {item.unit}
            </div>
          </div>
        </div>
      </div>

      {/* Modern Frosted Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.08]">
        <button
          onClick={() => onRestock(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-200 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Restock</span>
        </button>

        <button
          onClick={() => onSale(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-95 shadow-sm"
        >
          <Minus className="w-3.5 h-3.5 text-purple-400" />
          <span>Record Sale</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientCard;


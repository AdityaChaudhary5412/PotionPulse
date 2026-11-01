import React from 'react';
import { RestockItem } from '../../types';
import { getStatusConfig } from '../../lib/constants';
import ProgressBar from '../ui/ProgressBar';
import { Plus, Minus, Clock, Flame, Sparkles } from 'lucide-react';

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
  const reagentKey = (item.ingredient || '').toLowerCase();
  const iconEmoji = REAGENT_ICONS[reagentKey] || '🔮';

  const capacityMax = Math.max(40, item.stock + (item.reorder_qty || 15));
  const roundedTarget = Math.round(item.reorder_qty || 0);

  // Soft modern card styling
  const cardBorder =
    item.status === 'critical'
      ? 'border-red-500/25 hover:border-red-400/50 bg-[#120e18]/80'
      : item.status === 'low'
      ? 'border-amber-500/20 hover:border-amber-400/45 bg-[#121017]/80'
      : 'border-emerald-500/15 hover:border-emerald-400/35 bg-[#0e1215]/80';

  const depletionBadge =
    item.days_until_stockout <= 0 ? (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
        Depleted
      </span>
    ) : item.days_until_stockout <= 2 ? (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/15 text-red-300 border border-red-500/25">
        {item.days_until_stockout.toFixed(1)}d left
      </span>
    ) : item.days_until_stockout <= 7 ? (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">
        {item.days_until_stockout.toFixed(1)}d left
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
        Safe
      </span>
    );

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:shadow-xl group ${cardBorder}`}
    >
      <div>
        {/* Top Header: Icon & Name + Status Dot */}
        <div className="flex items-start justify-between gap-2.5">
          <div
            className="flex items-center gap-2.5 cursor-pointer flex-1"
            onClick={() => onSelect && onSelect(item)}
          >
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-xl group-hover:scale-105 transition-transform">
              {iconEmoji}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-snug group-hover:text-orange-300 transition-colors">
                {item.ingredient}
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {item.lead_time_days || 5}d lead time
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${cfg.badgeClass}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                item.status === 'critical'
                  ? 'bg-red-400 animate-pulse'
                  : item.status === 'low'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span>{item.status}</span>
          </span>
        </div>

        {/* Current Stock Display & Depletion */}
        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {item.stock}
            </span>
            <span className="text-xs text-gray-400 font-medium lowercase">
              {item.unit}
            </span>
          </div>
          <div>{depletionBadge}</div>
        </div>

        {/* Stock Meter */}
        <div className="mt-2.5">
          <ProgressBar
            value={item.stock}
            max={capacityMax}
            status={item.status}
            heightClass="h-1.5"
          />
        </div>

        {/* Clean Balanced Telemetry Summary */}
        <div className="mt-4 rounded-xl bg-white/[0.02] border border-white/[0.05] p-2.5 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Burn Rate</span>
            <span className="font-semibold text-gray-200 mt-0.5 block text-xs">
              {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'}/day
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block font-medium uppercase tracking-wider">Restock</span>
            <span className="font-semibold text-cyan-300 mt-0.5 block text-xs">
              +{roundedTarget} {item.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Clean Bottom Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.06]">
        <button
          onClick={() => onRestock(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Restock</span>
        </button>

        <button
          onClick={() => onSale(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-3 py-2 text-xs font-medium text-gray-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Record Sale</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientCard;

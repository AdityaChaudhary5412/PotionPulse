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
      ? 'border-red-500/30 hover:border-red-400/50 bg-[#140e1a]/85 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.12)]'
      : item.status === 'low'
      ? 'border-amber-500/25 hover:border-amber-400/45 bg-[#141018]/85 shadow-[0_4px_20px_-4px_rgba(245,158,11,0.1)]'
      : 'border-emerald-500/20 hover:border-emerald-400/40 bg-[#0e1317]/85 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.08)]';

  // Human-friendly depletion status
  const getDepletionInfo = () => {
    if (item.stock <= 0) {
      return {
        label: 'Out of Stock',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/35'
      };
    }
    const days = item.days_until_stockout;
    if (days <= 0.5) {
      return {
        label: 'Runs out today',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/35'
      };
    }
    if (days <= 1.2) {
      return {
        label: 'Runs out tomorrow',
        badgeClass: 'bg-red-500/15 text-red-300 border-red-500/30'
      };
    }
    if (days <= 3) {
      return {
        label: `${days.toFixed(1)} days left`,
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      };
    }
    if (days <= 7) {
      return {
        label: `${days.toFixed(1)} days buffer`,
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25'
      };
    }
    return {
      label: 'Well Stocked',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
    };
  };

  const depletion = getDepletionInfo();

  return (
    <div
      className={`relative rounded-2xl border p-5 flex flex-col justify-between backdrop-blur-xl transition-all duration-300 hover:shadow-xl group ${cardBorder}`}
    >
      <div>
        {/* Top Header: Avatar Icon & Status Badge */}
        <div className="flex items-center justify-between">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 text-2xl group-hover:scale-105 group-hover:border-purple-400/40 transition-all cursor-pointer shadow-sm"
            onClick={() => onSelect && onSelect(item)}
            title="View item intelligence"
          >
            {iconEmoji}
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize ${cfg.badgeClass}`}
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
            <span>{item.status === 'critical' ? 'Critical' : item.status === 'low' ? 'Low Stock' : 'Safe'}</span>
          </span>
        </div>

        {/* Full-width Reagent Title & Delivery Lead Time */}
        <div
          className="mt-3.5 cursor-pointer"
          onClick={() => onSelect && onSelect(item)}
        >
          <h3 className="font-bold text-white text-base leading-snug group-hover:text-purple-300 transition-colors">
            {item.ingredient}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {item.lead_time_days || 5}-day delivery lead time
          </p>
        </div>

        {/* Current Stock Display & Human Depletion Badge */}
        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {item.stock}
            </span>
            <span className="text-sm text-gray-400 font-medium">
              {item.unit}
            </span>
          </div>
          <div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${depletion.badgeClass}`}>
              {depletion.label}
            </span>
          </div>
        </div>

        {/* Stock Level Bar */}
        <div className="mt-3">
          <ProgressBar
            value={item.stock}
            max={capacityMax}
            status={item.status}
            heightClass="h-2"
          />
        </div>

        {/* Usage & Reorder Info (No cramping, clear labels) */}
        <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-[11px] text-gray-400 block font-medium">Daily Usage</span>
            <span className="font-semibold text-gray-200 mt-0.5 block text-xs">
              {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'} / day
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-gray-400 block font-medium">Suggested Order</span>
            <span className="font-semibold text-cyan-300 mt-0.5 block text-xs">
              +{roundedTarget} {item.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2.5 pt-3.5 border-t border-white/[0.06]">
        <button
          onClick={() => onRestock(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/35 px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Restock</span>
        </button>

        <button
          onClick={() => onSale(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 px-3 py-2 text-xs font-medium text-gray-200 hover:text-white transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>Record Sale</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientCard;

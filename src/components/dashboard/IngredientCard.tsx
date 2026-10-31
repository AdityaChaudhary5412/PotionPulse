import React from 'react';
import { RestockItem } from '../../types';
import { getStatusConfig } from '../../lib/constants';
import ProgressBar from '../ui/ProgressBar';
import { ArrowUpRight, ArrowDownRight, Clock, Zap } from 'lucide-react';

interface IngredientCardProps {
  item: RestockItem;
  onRestock: (item: RestockItem) => void;
  onSale: (item: RestockItem) => void;
  onSelect?: (item: RestockItem) => void;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
  item,
  onRestock,
  onSale,
  onSelect
}) => {
  const cfg = getStatusConfig(item.status);
  const StatusIcon = cfg.icon;

  // Compute a reasonable capacity max for visual progress bar (e.g. max of 50 or stock + reorder)
  const capacityMax = Math.max(40, item.stock + (item.reorder_qty || 15));

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-surface-border bg-surface p-5 shadow-sm hover:border-accent/50 hover:shadow-xl hover:shadow-purple-950/25 transition-all">
      <div>
        {/* Top Header: Name and Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="cursor-pointer" onClick={() => onSelect && onSelect(item)}>
            <h3 className="font-display font-bold text-white text-base tracking-wide group-hover:text-accent-light transition-colors">
              {item.ingredient}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Lead Time: {item.lead_time_days || 7} Days
            </p>
          </div>

          {/* Universal Status Badge: defined once in constants */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${cfg.badgeClass}`}
          >
            <StatusIcon className="w-3 h-3 flex-shrink-0" />
            <span>{cfg.badgeLabel}</span>
          </span>
        </div>

        {/* Current Stock Display */}
        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {item.stock}
            </span>
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
              {item.unit}
            </span>
          </div>

          {/* Supply Left Highlight */}
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-gray-500" />
              Stockout In
            </span>
            <span className={`text-sm font-bold ${cfg.textColor}`}>
              {item.days_until_stockout <= 0 ? 'Depleted' : `${item.days_until_stockout.toFixed(1)} Days`}
            </span>
          </div>
        </div>

        {/* Stock Level Progress Bar */}
        <div className="mt-3">
          <ProgressBar
            value={item.stock}
            max={capacityMax}
            status={item.status}
            heightClass="h-2"
          />
        </div>

        {/* Telemetry Row */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle p-2.5 text-xs border border-surface-border/40">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Daily Burn</span>
            <span className="font-semibold text-gray-200">
              {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'} / day
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Reorder Target</span>
            <span className="font-mono font-bold text-purple-300">
              +{item.reorder_qty} {item.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Restock and Brew/Sell */}
      <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-surface-border/60">
        <button
          onClick={() => onSale(item)}
          className="flex items-center justify-center gap-1 rounded-xl bg-purple-950/40 border border-purple-800/40 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 hover:text-white transition-all shadow-sm"
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />
          <span>Brew / Sell</span>
        </button>
        <button
          onClick={() => onRestock(item)}
          className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/40"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>Restock</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientCard;


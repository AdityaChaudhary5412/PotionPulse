import React from 'react';
import { RestockItem } from '../../types';
import { getStatusConfig } from '../../lib/constants';
import ProgressBar from '../ui/ProgressBar';
import { ArrowUpRight, ArrowDownRight, Clock, Zap, Plus, Minus } from 'lucide-react';

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

  // Capacity max for visual meter
  const capacityMax = Math.max(40, item.stock + (item.reorder_qty || 15));

  return (
    <div className="emergent-glass-card p-5 flex flex-col justify-between group hover:border-white/20 transition-all">
      <div>
        {/* Top Header: Name and Universal Status Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="cursor-pointer" onClick={() => onSelect && onSelect(item)}>
            <h3 className="font-sans font-bold text-white text-base tracking-tight group-hover:text-emergent-cyan transition-colors flex items-center gap-1.5">
              <span>{item.ingredient}</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Lead Time: <span className="text-gray-300 font-mono">{item.lead_time_days || 7}d</span>
            </p>
          </div>

          {/* Emergent Universal Status Badge */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${cfg.badgeClass}`}
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

          {/* Supply Left Countdown */}
          <div className="text-right">
            <span className="text-[10px] uppercase font-semibold text-gray-400 block flex items-center gap-1 justify-end">
              <Clock className="w-3 h-3 text-gray-500" />
              Depletion
            </span>
            <span className={`text-xs font-bold font-mono ${cfg.textColor}`}>
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

        {/* Emergent Telemetry Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-subtle p-2.5 text-xs border border-surface-border">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Daily Burn</span>
            <span className="font-semibold text-gray-200 font-mono text-xs">
              {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'}/day
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Restock Target</span>
            <span className="font-mono font-bold text-emergent-cyan text-xs">
              +{item.reorder_qty} {item.unit}
            </span>
          </div>
        </div>
      </div>

      {/* Emergent Dark Glass Action Buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2 pt-3 border-t border-surface-border">
        <button
          onClick={() => onRestock(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 text-xs font-semibold text-white transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 text-emergent-green" />
          <span>Restock</span>
        </button>

        <button
          onClick={() => onSale(item)}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-95"
        >
          <Minus className="w-3.5 h-3.5 text-emergent-cyan" />
          <span>Record Sale</span>
        </button>
      </div>
    </div>
  );
};

export default IngredientCard;


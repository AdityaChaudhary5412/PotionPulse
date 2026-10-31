import React, { useState, useMemo } from 'react';
import { RestockItem } from '../../types';
import { getStatusConfig } from '../../lib/constants';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown, ArrowUpRight, ArrowDownRight,
  Plus, SlidersHorizontal, Package, CheckCircle2, AlertTriangle, AlertOctagon
} from 'lucide-react';

interface InventoryViewProps {
  items: RestockItem[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRestock: (item: RestockItem) => void;
  onSale: (item: RestockItem) => void;
  onNewReagent: () => void;
  onSelectIngredient?: (item: RestockItem) => void;
}

type SortField = 'ingredient' | 'stock' | 'days_until_stockout' | 'status' | 'lead_time_days' | 'daily_demand' | 'reorder_qty';
type SortDirection = 'asc' | 'desc';

export const InventoryView: React.FC<InventoryViewProps> = ({
  items,
  loading,
  error,
  onRefresh,
  onRestock,
  onSale,
  onNewReagent,
  onSelectIngredient
}) => {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('days_until_stockout');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Handle column header clicks for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filter and sort items
  const processedItems = useMemo(() => {
    if (!items) return [];

    let filtered = items.filter((item) => {
      const matchSearch =
        item.ingredient.toLowerCase().includes(search.toLowerCase()) ||
        item.unit.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || item.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });

    return filtered.sort((a, b) => {
      let aVal = a[sortField] ?? 0;
      let bVal = b[sortField] ?? 0;

      if (typeof aVal === 'string') {
        return sortDir === 'asc'
          ? (aVal as string).localeCompare(bVal as string)
          : (bVal as string).localeCompare(aVal as string);
      }

      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [items, search, statusFilter, sortField, sortDir]);

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-accent" />
    ) : (
      <ArrowDown className="w-3 h-3 text-accent" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emergent-cyan" />
            <span>Pantry Inventory Ledger</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Search, sort, and inspect reagent stocks, depletion runaways, and safety stock targets.
          </p>
        </div>

        <button
          onClick={onNewReagent}
          className="flex items-center gap-1.5 rounded-xl bg-white text-black px-4 py-2 text-xs font-bold shadow-sm hover:bg-gray-100 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 text-black" />
          <span>Add Reagent</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-2.5 rounded-2xl border border-surface-border">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reagents or units..."
            className="w-full rounded-xl border border-surface-border bg-surface-subtle py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs no-scrollbar">
          {[
            { id: 'all', label: 'All Shelves' },
            { id: 'safe', label: 'Safe', color: 'text-status-safe' },
            { id: 'low', label: 'Low Stock', color: 'text-status-low' },
            { id: 'critical', label: 'Critical', color: 'text-status-critical' },
          ].map((pill) => {
            const isSelected = statusFilter === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-surface-elevated text-white border border-white/20 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-surface-subtle'
                }`}
              >
                <span className={pill.color}>{pill.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table: Loading, Error, Empty, or Table */}
      {loading && (!items || items.length === 0) ? (
        <LoadingState message="Summoning inventory ledger..." cardCount={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : processedItems.length === 0 ? (
        <EmptyState
          title={search ? 'No Matching Reagents' : 'Inventory Ledger Empty'}
          description={
            search
              ? `No ingredients matched '${search}'. Try clearing filters.`
              : 'The pantry shelves are currently empty. Reseed or add a new reagent.'
          }
          actionLabel={search ? 'Clear Search' : 'Reseed Demo'}
          onAction={search ? () => setSearch('') : onRefresh}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border emergent-glass-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border bg-surface-subtle/80 text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    onClick={() => handleSort('ingredient')}
                    className="group px-5 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Reagent Name</span>
                      {renderSortIcon('ingredient')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('stock')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>On-Hand Stock</span>
                      {renderSortIcon('stock')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('days_until_stockout')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Days Left</span>
                      {renderSortIcon('days_until_stockout')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('daily_demand')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors hidden md:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Daily Burn</span>
                      {renderSortIcon('daily_demand')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lead_time_days')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors hidden lg:table-cell"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Lead Time</span>
                      {renderSortIcon('lead_time_days')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('reorder_qty')}
                    className="group px-4 py-3.5 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Reorder Qty</span>
                      {renderSortIcon('reorder_qty')}
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {processedItems.map((item) => {
                  const cfg = getStatusConfig(item.status);
                  const Icon = cfg.icon;

                  return (
                    <tr
                      key={item.ingredient_id}
                      className="hover:bg-surface-subtle/50 transition-colors group"
                    >
                      {/* Name */}
                      <td
                        onClick={() => onSelectIngredient && onSelectIngredient(item)}
                        className={`px-5 py-4 font-bold text-white transition-colors ${
                          onSelectIngredient ? 'cursor-pointer hover:text-accent-light hover:underline' : ''
                        }`}
                      >
                        {item.ingredient}
                      </td>

                      {/* Status Badge Column */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.badgeClass}`}
                        >
                          <Icon className="w-3 h-3 flex-shrink-0" />
                          <span>{cfg.badgeLabel}</span>
                        </span>
                      </td>

                      {/* On-Hand Stock */}
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm font-semibold text-white">
                          {item.stock}
                        </span>{' '}
                        <span className="text-[11px] text-gray-400">{item.unit}</span>
                      </td>

                      {/* Days Left */}
                      <td className="px-4 py-4 font-semibold">
                        <span className={cfg.textColor}>
                          {item.days_until_stockout <= 0
                            ? 'Depleted'
                            : `${item.days_until_stockout.toFixed(1)} Days`}
                        </span>
                      </td>

                      {/* Daily Burn */}
                      <td className="px-4 py-4 text-gray-300 hidden md:table-cell">
                        {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'} / day
                      </td>

                      {/* Lead Time */}
                      <td className="px-4 py-4 text-gray-400 hidden lg:table-cell">
                        {item.lead_time_days || 7} Days
                      </td>

                      {/* Reorder Target */}
                      <td className="px-4 py-4 font-mono font-bold text-purple-300">
                        {item.reorder_qty > 0 ? `+${item.reorder_qty} ${item.unit}` : 'Optimal'}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSale(item)}
                            title="Dispense / Record Sale"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-purple-800/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/60 transition-colors text-[11px] font-semibold"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Brew</span>
                          </button>
                          <button
                            onClick={() => onRestock(item)}
                            title="Add Stock / Restock Batch"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-[11px] font-semibold shadow-sm"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Restock</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryView;


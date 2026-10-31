import React, { useMemo, useState } from 'react';
import { RestockItem, PantrySummary } from '../../types';
import StatCards from './StatCards';
import IngredientCard from './IngredientCard';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { Sparkles, ArrowUpDown, Filter, ShieldCheck, AlertCircle } from 'lucide-react';

interface DashboardViewProps {
  summary: PantrySummary | null;
  items: RestockItem[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onRestock: (item: RestockItem) => void;
  onSale: (item: RestockItem) => void;
  onSelectIngredient?: (item: RestockItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  items,
  loading,
  error,
  onRefresh,
  onRestock,
  onSale,
  onSelectIngredient
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'urgent' | 'alphabetical' | 'stock'>('urgent');

  // Filter and sort items
  const processedItems = useMemo(() => {
    if (!items) return [];
    let list = [...items];

    if (filterStatus !== 'all') {
      list = list.filter((it) => it.status === filterStatus);
    }

    if (sortBy === 'urgent') {
      list.sort((a, b) => a.days_until_stockout - b.days_until_stockout);
    } else if (sortBy === 'alphabetical') {
      list.sort((a, b) => a.ingredient.localeCompare(b.ingredient));
    } else if (sortBy === 'stock') {
      list.sort((a, b) => a.stock - b.stock);
    }

    return list;
  }, [items, filterStatus, sortBy]);

  return (
    <div className="space-y-6">
      {/* Top Four Stat Cards */}
      <StatCards summary={summary} loading={loading && !summary} />

      {/* Emergent Shelves Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emergent-cyan" />
            <span>Pantry Shelves</span>
            <span className="text-xs font-mono text-gray-400 font-normal">
              ({processedItems.length} {processedItems.length === 1 ? 'reagent' : 'reagents'})
            </span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real-time depletion telemetry prioritized by stockout threat.
          </p>
        </div>

        {/* Emergent Segmented Filter Control */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-surface-border text-xs">
            {['all', 'critical', 'low', 'safe'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all font-medium ${
                  filterStatus === st
                    ? 'bg-surface text-white border border-white/10 shadow-sm'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {st === 'all' ? 'All Shelves' : st}
              </button>
            ))}
          </div>

          {/* Sort Switcher */}
          <button
            onClick={() => setSortBy((prev) => (prev === 'urgent' ? 'alphabetical' : prev === 'alphabetical' ? 'stock' : 'urgent'))}
            className="flex items-center gap-1.5 text-xs text-gray-300 bg-surface-subtle hover:bg-surface px-3 py-1.5 rounded-xl border border-surface-border hover:border-white/20 transition-all"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-emergent-cyan" />
            <span className="capitalize">{sortBy} First</span>
          </button>
        </div>
      </div>

      {/* Main Content: Loading, Error, Empty, or Cards Grid */}
      {loading && (!items || items.length === 0) ? (
        <LoadingState message="Forecasting supply depletion and summoning stock meters..." cardCount={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : processedItems.length === 0 ? (
        <EmptyState onAction={onRefresh} actionLabel="Reseed Demo Ledger" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processedItems.map((item) => (
            <IngredientCard
              key={item.ingredient_id}
              item={item}
              onRestock={onRestock}
              onSale={onSale}
              onSelect={onSelectIngredient}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardView;


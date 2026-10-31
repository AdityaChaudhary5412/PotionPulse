import React, { useMemo } from 'react';
import { RestockItem, PantrySummary } from '../../types';
import StatCards from './StatCards';
import IngredientCard from './IngredientCard';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import { Sparkles, ArrowUpDown, Filter } from 'lucide-react';

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
  // Sort ingredients by fewest days until stockout first!
  const sortedItems = useMemo(() => {
    if (!items) return [];
    return [...items].sort((a, b) => a.days_until_stockout - b.days_until_stockout);
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Top Four Stat Cards */}
      <StatCards summary={summary} loading={loading && !summary} />

      {/* Grid Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-border/60 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            <span>Pantry Shelves (Sorted by Stockout Threat)</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Prioritized by fewest supply days left to safeguard brewing recipes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 bg-surface px-3 py-1.5 rounded-xl border border-surface-border">
          <ArrowUpDown className="w-3.5 h-3.5 text-accent" />
          <span>Urgent First</span>
        </div>
      </div>

      {/* Main Content: Loading, Error, Empty, or Cards Grid */}
      {loading && (!items || items.length === 0) ? (
        <LoadingState message="Forecasting supply depletion and summoning stock meters..." cardCount={8} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : sortedItems.length === 0 ? (
        <EmptyState onAction={onRefresh} actionLabel="Reseed Demo Ledger" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedItems.map((item) => (
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

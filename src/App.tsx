import React, { useState } from 'react';
import BaseLayout from './components/layout/BaseLayout';
import { useCurse } from './context/CurseContext';
import { useApi } from './hooks/useApi';
import api from './services/api';
import { RestockItem, PantrySummary, AlertItem, DemandDetail } from './types';
import DashboardView from './components/dashboard/DashboardView';
import InventoryView from './components/inventory/InventoryView';
import AddStockDialog from './components/modals/AddStockDialog';
import RecordSaleDialog from './components/modals/RecordSaleDialog';
import LoadingState from './components/ui/LoadingState';
import EmptyState from './components/ui/EmptyState';
import ErrorState from './components/ui/ErrorState';
import {
  Sparkles, TrendingUp, ShieldAlert, Flame, AlertTriangle,
  Plus, CheckCircle2, AlertOctagon, X
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

export default function App() {
  const { isCurseMode } = useCurse();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedIngredientId, setSelectedIngredientId] = useState<number>(1);
  const [toast, setToast] = useState<{ msg: string; isErr?: boolean } | null>(null);

  // Dialog State
  const [stockItem, setStockItem] = useState<RestockItem | null>(null);
  const [saleItem, setSaleItem] = useState<RestockItem | null>(null);
  const [newReagentOpen, setNewReagentOpen] = useState<boolean>(false);

  // New reagent form state
  const [newReagent, setNewReagent] = useState({
    name: '',
    unit: 'units',
    current_stock: 25,
    lead_time_days: 5
  });

  const showToast = (msg: string, isErr: boolean = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 4000);
  };

  // Restock items query (reacts to curse mode)
  const {
    data: restockItems,
    loading: loadingRestock,
    error: restockError,
    refetch: refetchRestock
  } = useApi<RestockItem[]>(
    () => api.restock.list(isCurseMode),
    { onError: (err) => showToast(err, true) },
    [isCurseMode]
  );

  // Summary statistics query (4 stat cards: low, critical, alerts, nearest stockout)
  const {
    data: summary,
    loading: loadingSummary,
    error: summaryError,
    refetch: refetchSummary
  } = useApi<PantrySummary>(
    () => api.summary.get(isCurseMode),
    {},
    [isCurseMode]
  );

  // Alerts query
  const {
    data: alerts,
    loading: loadingAlerts,
    error: alertsError,
    refetch: refetchAlerts
  } = useApi<AlertItem[]>(
    () => api.alerts.list(undefined, 30),
    {},
    []
  );

  // Demand query for charts
  const {
    data: demandDetail,
    loading: loadingDemand,
    error: demandError,
    refetch: refetchDemand
  } = useApi<DemandDetail>(
    () => api.demand.get(selectedIngredientId, isCurseMode, 7),
    {},
    [selectedIngredientId, isCurseMode]
  );

  const refreshAll = () => {
    refetchRestock();
    refetchSummary();
    refetchAlerts();
    refetchDemand();
    showToast("Pantry inventory & prophecy metrics updated.");
  };

  const handleCreateReagent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReagent.name.trim()) return;
    try {
      await api.ingredients.create({
        name: newReagent.name.trim(),
        unit: newReagent.unit.trim(),
        current_stock: Number(newReagent.current_stock),
        lead_time_days: Number(newReagent.lead_time_days)
      });
      showToast(`Added new reagent '${newReagent.name}' to pantry.`);
      setNewReagentOpen(false);
      setNewReagent({ name: '', unit: 'units', current_stock: 25, lead_time_days: 5 });
      refreshAll();
    } catch {
      showToast("Could not create ingredient", true);
    }
  };

  return (
    <BaseLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={refreshAll}>
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium shadow-2xl border backdrop-blur-md transition-all ${
            toast.isErr
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : 'bg-surface/95 text-purple-200 border-purple-500/40 shadow-purple-950/60'
          }`}
        >
          {toast.isErr ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
          )}
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: DASHBOARD (STAT CARDS + FEWEST DAYS UNTIL STOCKOUT GRID) */}
      {activeTab === 'dashboard' && (
        <DashboardView
          summary={summary}
          items={restockItems}
          loading={loadingRestock || loadingSummary}
          error={restockError || summaryError}
          onRefresh={refreshAll}
          onRestock={(item) => setStockItem(item)}
          onSale={(item) => setSaleItem(item)}
          onSelectIngredient={(item) => {
            setSelectedIngredientId(item.ingredient_id);
            setActiveTab('demand');
          }}
        />
      )}

      {/* TAB 2: INVENTORY SCREEN (DATA TABLE WITH SEARCH, SORTING, STATUS BADGES) */}
      {activeTab === 'inventory' && (
        <InventoryView
          items={restockItems}
          loading={loadingRestock}
          error={restockError}
          onRefresh={refreshAll}
          onRestock={(item) => setStockItem(item)}
          onSale={(item) => setSaleItem(item)}
          onNewReagent={() => setNewReagentOpen(true)}
        />
      )}

      {/* TAB 3: DEMAND PROPHECY (RECHARTS WITH CONFIDENCE BANDS) */}
      {activeTab === 'demand' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span>Demand Prophecy & Confidence Bands</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Timeline sales history, 7-day predicted demand, and 95% confidence intervals.
              </p>
            </div>

            {/* Reagent Selector */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400">Reagent:</label>
              <select
                value={selectedIngredientId}
                onChange={(e) => setSelectedIngredientId(Number(e.target.value))}
                className="rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs font-medium text-white focus:border-accent focus:outline-none"
              >
                {restockItems?.map((it) => (
                  <option key={it.ingredient_id} value={it.ingredient_id}>
                    {it.ingredient}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loadingDemand && !demandDetail ? (
            <LoadingState message="Summoning demand forecast curves..." cardCount={1} />
          ) : demandError ? (
            <ErrorState error={demandError} onRetry={refetchDemand} />
          ) : !demandDetail ? (
            <EmptyState title="No Demand Curve Found" description="No demand curves recorded yet." onAction={refreshAll} />
          ) : (
            <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm">
              <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-white">
                    {demandDetail.ingredient} Consumption Curve
                  </span>
                  <span className="ml-2 text-xs text-gray-400">
                    Current Stock: {demandDetail.current_stock} {demandDetail.unit}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-purple-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
                    Actual Sales
                  </span>
                  <span className="flex items-center gap-1.5 text-accent-light">
                    <span className="inline-block h-2 w-2 rounded-full bg-accent" />
                    Prophecy
                  </span>
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <span className="inline-block h-2 w-2 rounded-full bg-gray-500" />
                    95% Range (Lo/Hi)
                  </span>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={demandDetail.chart_data || []}>
                    <defs>
                      <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262d3d" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={11} />
                    <YAxis stroke="#6b7280" fontSize={11} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141721',
                        borderColor: '#262d3d',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="hi"
                      stroke="transparent"
                      fill="url(#bandGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="lo"
                      stroke="transparent"
                      fill="#0c0e14"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#a78bfa"
                      strokeWidth={2.5}
                      dot={{ fill: '#a78bfa', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#8b5cf6"
                      strokeDasharray="5 5"
                      strokeWidth={2.5}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: STRANGE HAPPENINGS (ANOMALIES AUDIT) */}
      {activeTab === 'anomalies' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Strange Happenings & Risk Audit</span>
            </h2>
          </div>

          {loadingAlerts && !alerts ? (
            <LoadingState message="Auditing ledger for phantom discrepancies and sudden spikes..." cardCount={4} />
          ) : alertsError ? (
            <ErrorState error={alertsError} onRetry={refetchAlerts} />
          ) : !alerts || alerts.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center text-gray-400 text-xs">
              No strange anomalies detected today. The coven is calm.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((al) => (
                <div
                  key={al.id}
                  className="flex items-start gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-sm"
                >
                  <div className={`rounded-xl p-2.5 ${
                    al.severity === 'high' || al.severity === 'critical'
                      ? 'bg-rose-950/60 text-rose-400'
                      : 'bg-amber-950/60 text-amber-400'
                  }`}>
                    {al.type === 'SPIKE' ? <Flame className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white text-sm">
                        {al.type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                        {new Date(al.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-300">
                      {al.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* DIALOG 1: ADD STOCK (RESTOCK) */}
      <AddStockDialog
        isOpen={!!stockItem}
        item={stockItem}
        onClose={() => setStockItem(null)}
        onSuccess={(msg) => {
          showToast(msg);
          refreshAll();
        }}
        onError={(err) => showToast(err, true)}
      />

      {/* DIALOG 2: RECORD SALE */}
      <RecordSaleDialog
        isOpen={!!saleItem}
        item={saleItem}
        onClose={() => setSaleItem(null)}
        onSuccess={(msg) => {
          showToast(msg);
          refreshAll();
        }}
        onError={(err) => showToast(err, true)}
      />

      {/* DIALOG 3: NEW REAGENT MODAL */}
      {newReagentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Add New Potion Reagent</h3>

            <form onSubmit={handleCreateReagent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300">Reagent Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basilisk Fang"
                  value={newReagent.name}
                  onChange={(e) => setNewReagent({ ...newReagent, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-300">Unit:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. vials, pairs"
                    value={newReagent.unit}
                    onChange={(e) => setNewReagent({ ...newReagent, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300">Initial Stock:</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newReagent.current_stock}
                    onChange={(e) => setNewReagent({ ...newReagent, current_stock: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300">Lead Time (Days):</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newReagent.lead_time_days}
                  onChange={(e) => setNewReagent({ ...newReagent, lead_time_days: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewReagentOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 text-xs font-medium text-gray-300 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-accent-hover"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BaseLayout>
  );
}

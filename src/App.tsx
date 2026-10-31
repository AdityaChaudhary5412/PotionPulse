import React, { useState } from 'react';
import BaseLayout from './components/layout/BaseLayout';
import { useCurse } from './context/CurseContext';
import { useApi } from './hooks/useApi';
import api from './services/api';
import { RestockItem, PantrySummary, AlertItem } from './types';
import DashboardView from './components/dashboard/DashboardView';
import InventoryView from './components/inventory/InventoryView';
import IngredientDetailView from './components/detail/IngredientDetailView';
import AlertsView from './components/alerts/AlertsView';
import AddStockDialog from './components/modals/AddStockDialog';
import RecordSaleDialog from './components/modals/RecordSaleDialog';
import CurseConfigDialog from './components/modals/CurseConfigDialog';
import { Sparkles, AlertOctagon, X } from 'lucide-react';

export default function App() {
  const { isCurseMode, isCurseModalOpen, setCurseModalOpen } = useCurse();
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
    () => api.alerts.list(undefined, 50),
    {},
    []
  );

  const refreshAll = () => {
    refetchRestock();
    refetchSummary();
    refetchAlerts();
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

  const alertCount = summary?.alerts_today ?? alerts?.length ?? 0;

  return (
    <BaseLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={refreshAll}
      alertCount={alertCount}
      onNavigateAlerts={() => setActiveTab('anomalies')}
      onOpenCurseModal={() => setCurseModalOpen(true)}
    >
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
          onSelectIngredient={(item) => {
            setSelectedIngredientId(item.ingredient_id);
            setActiveTab('demand');
          }}
        />
      )}

      {/* TAB 3: INGREDIENT DETAIL PAGE (RECHARTS, BEFORE/AFTER OVERLAY, CONFIDENCE BANDS, RESTOCK SIDEBAR) */}
      {activeTab === 'demand' && (
        <IngredientDetailView
          ingredientId={selectedIngredientId}
          availableIngredients={restockItems || []}
          onSelectIngredient={(id) => setSelectedIngredientId(id)}
          onBackToDashboard={() => setActiveTab('dashboard')}
          onRestock={(item) => setStockItem(item)}
          onSale={(item) => setSaleItem(item)}
        />
      )}

      {/* TAB 4: ALERTS SCREEN (TABLE WITH SEVERITY BADGES, PLAIN-LANGUAGE REASONS, NEWEST FIRST) */}
      {activeTab === 'anomalies' && (
        <AlertsView
          alerts={alerts}
          loading={loadingAlerts}
          error={alertsError}
          onRefresh={refetchAlerts}
          onInspectIngredient={(id) => {
            setSelectedIngredientId(id);
            setActiveTab('demand');
          }}
        />
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

      {/* DIALOG 3: CURSE MODE CONFIGURATION FLOW DIALOG */}
      <CurseConfigDialog
        isOpen={isCurseModalOpen}
        onClose={() => setCurseModalOpen(false)}
        availableIngredients={restockItems || []}
        onCurseActivated={() => {
          showToast("Midnight Demand Curse summoned! All pantry prophecies amplified.");
          refreshAll();
        }}
      />

      {/* DIALOG 4: NEW REAGENT MODAL */}
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

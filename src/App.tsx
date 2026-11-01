import React, { useState, useEffect } from 'react';
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
import EmergentAgentBar from './components/agent/EmergentAgentBar';
import FrontPage from './components/landing/FrontPage';
import { AuthComponent } from './components/ui/sign-up';
import PotionPulseLogo from './components/ui/PotionPulseLogo';
import { Sparkles, AlertOctagon, X, Plus } from 'lucide-react';

export default function App() {
  const { isCurseMode, isCurseModalOpen, setCurseModalOpen } = useCurse();
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (['landing', 'dashboard', 'inventory', 'demand', 'anomalies', 'auth'].includes(hash)) {
        return hash;
      }
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['landing', 'dashboard', 'inventory', 'demand', 'anomalies', 'auth'].includes(tabParam)) {
        return tabParam;
      }
    }
    return 'landing';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = tab === 'landing' ? '' : tab;
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['landing', 'dashboard', 'inventory', 'demand', 'anomalies', 'auth'].includes(hash)) {
        setActiveTabState(hash);
      } else if (!hash) {
        setActiveTabState('landing');
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
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

  // 21ST.DEV ANIMATED SHADER HERO FRONT PAGE
  if (activeTab === 'landing') {
    return (
      <FrontPage
        onEnterApp={() => setActiveTab('dashboard')}
        onExploreFeatures={() => setActiveTab('demand')}
        onNavigateAuth={() => setActiveTab('auth')}
        onQuickSearch={() => {
          setActiveTab('inventory');
        }}
      />
    );
  }

  // IMMERSIVE LOG IN & SIGN UP PAGE
  if (activeTab === 'auth') {
    return (
      <AuthComponent
        logo={<PotionPulseLogo size="sm" />}
        brandName="PotionPulse"
        onSuccess={() => {
          showToast('Welcome to PotionPulse! Account authenticated.');
          setActiveTab('dashboard');
        }}
        onClose={() => setActiveTab('landing')}
      />
    );
  }

  return (
    <BaseLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onRefresh={refreshAll}
      alertCount={alertCount}
      onNavigateAlerts={() => setActiveTab('anomalies')}
      onOpenCurseModal={() => setCurseModalOpen(true)}
    >
      {/* Emergent Toast Notification */}
      {toast && (
        <div
          role="alert"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3 text-xs font-medium shadow-2xl border backdrop-blur-xl transition-all ${
            toast.isErr
              ? 'bg-red-950/90 text-red-200 border-red-500/40 shadow-red-950/60'
              : 'bg-surface/95 text-white border-white/20 shadow-emergent-glow-cyan'
          }`}
        >
          {toast.isErr ? (
            <AlertOctagon className="w-4 h-4 text-red-400 flex-shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emergent-cyan flex-shrink-0" />
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

      {/* EMERGENT CONVERSATIONAL VIBE AGENT BAR */}
      <EmergentAgentBar
        onNavigateTab={setActiveTab}
        onRefreshAll={refreshAll}
        showToast={showToast}
      />

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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm emergent-glass-card bg-surface/95 backdrop-blur-2xl p-6 shadow-2xl rounded-emergent-lg border border-white/10">
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Plus className="w-4 h-4 text-emergent-cyan" />
              <span>Add New Potion Reagent</span>
            </h3>

            <form onSubmit={handleCreateReagent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Reagent Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basilisk Fang"
                  value={newReagent.name}
                  onChange={(e) => setNewReagent({ ...newReagent, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. vials, pairs"
                    value={newReagent.unit}
                    onChange={(e) => setNewReagent({ ...newReagent, unit: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newReagent.current_stock}
                    onChange={(e) => setNewReagent({ ...newReagent, current_stock: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white font-mono focus:border-white/30 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">Lead Time (Days)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newReagent.lead_time_days}
                  onChange={(e) => setNewReagent({ ...newReagent, lead_time_days: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white font-mono focus:border-white/30 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-border">
                <button
                  type="button"
                  onClick={() => setNewReagentOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-surface-subtle transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-white text-black px-4 py-2 text-xs font-bold shadow-sm hover:bg-gray-100 transition-all active:scale-95"
                >
                  Create Reagent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </BaseLayout>
  );
}

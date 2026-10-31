import React, { useState, useMemo } from 'react';
import BaseLayout from './components/layout/BaseLayout';
import { useCurse } from './context/CurseContext';
import { useApi } from './hooks/useApi';
import api from './services/api';
import { getStatusConfig } from './lib/constants';
import { RestockItem, PantrySummary, AlertItem, DemandDetail } from './types';
import {
  Sparkles, Plus, RefreshCw, Search, ArrowDownRight, ArrowUpRight,
  ShieldCheck, AlertTriangle, AlertOctagon, Flame, Package, TrendingUp,
  BarChart3, Zap, Clock, ShieldAlert, Check
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

export default function App() {
  const { isCurseMode, curseMultiplier, toggleCurseMode } = useCurse();
  const [activeTab, setActiveTab] = useState<string>('shelves');
  const [search, setSearch] = useState<string>('');
  const [selectedIngredientId, setSelectedIngredientId] = useState<number>(1);
  const [toast, setToast] = useState<{ msg: string; isErr?: boolean } | null>(null);

  // Modal states
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [newReagentOpen, setNewReagentOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<RestockItem | null>(null);
  const [actionQty, setActionQty] = useState<number>(1);
  const [actionNote, setActionNote] = useState<string>('');

  const [newReagent, setNewReagent] = useState({
    name: '',
    unit: 'units',
    current_stock: 25,
    lead_time_days: 5
  });

  const showToast = (msg: string, isErr: boolean = false) => {
    setToast({ msg, isErr });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch Restock & Summary using useApi with dependency on isCurseMode
  const {
    data: restockItems,
    loading: loadingRestock,
    refetch: refetchRestock
  } = useApi<RestockItem[]>(
    () => api.restock.list(isCurseMode),
    { onError: (err) => showToast(err, true) },
    [isCurseMode]
  );

  const {
    data: summary,
    loading: loadingSummary,
    refetch: refetchSummary
  } = useApi<PantrySummary>(
    () => api.summary.get(isCurseMode),
    {},
    [isCurseMode]
  );

  const {
    data: alerts,
    loading: loadingAlerts,
    refetch: refetchAlerts
  } = useApi<AlertItem[]>(
    () => api.alerts.list(undefined, 30),
    {},
    []
  );

  // Fetch Demand Details for chart
  const {
    data: demandDetail,
    loading: loadingDemand,
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

  // Filtered ingredients
  const filteredItems = useMemo(() => {
    if (!restockItems) return [];
    return restockItems.filter((item) =>
      item.ingredient.toLowerCase().includes(search.toLowerCase())
    );
  }, [restockItems, search]);

  // Action Handlers
  const handleRecordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || actionQty <= 0) return;
    try {
      await api.sales.record({
        ingredient_id: activeItem.ingredient_id,
        qty: actionQty,
        note: actionNote || 'Customer potion brew dispense'
      });
      showToast(`Dispensed ${actionQty} ${activeItem.unit} of ${activeItem.ingredient}.`);
      setSaleModalOpen(false);
      setActionQty(1);
      setActionNote('');
      refreshAll();
    } catch (err) {
      showToast(api ? String(err) : "Sale failed", true);
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItem || actionQty <= 0) return;
    try {
      await api.stock.adjust(activeItem.ingredient_id, {
        qty: actionQty,
        type: 'restock',
        note: actionNote || 'Supplier batch shipment'
      });
      showToast(`Added ${actionQty} ${activeItem.unit} to ${activeItem.ingredient}.`);
      setRestockModalOpen(false);
      setActionQty(1);
      setActionNote('');
      refreshAll();
    } catch (err) {
      showToast(api ? String(err) : "Restock failed", true);
    }
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
    } catch (err) {
      showToast("Could not create ingredient", true);
    }
  };

  return (
    <BaseLayout activeTab={activeTab} onTabChange={setActiveTab} onRefresh={refreshAll}>
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl border backdrop-blur-md transition-all ${
          toast.isErr
            ? 'bg-rose-950/90 text-rose-200 border-rose-800'
            : 'bg-surface/90 text-purple-200 border-purple-500/40 shadow-purple-950/50'
        }`}>
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>{toast.msg}</span>
        </div>
      )}

      {/* SUMMARY STATS BAR */}
      <section className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Total Stock Items */}
        <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Reagent Catalog</span>
            <Package className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {summary?.total_ingredients ?? restockItems?.length ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Tracked in Pantry</p>
        </div>

        {/* Low Stock Items */}
        <div className="rounded-2xl border border-amber-900/30 bg-amber-950/10 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-medium">Low Stock Warning</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-300">
            {summary?.low_count ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-amber-400/80">Reorder Required</p>
        </div>

        {/* Critical Stockout Threat */}
        <div className="rounded-2xl border border-rose-900/40 bg-rose-950/15 p-4 shadow-sm">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-xs font-medium">Critical Threat</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-300">
            {summary?.critical_count ?? 0}
          </div>
          <p className="mt-1 text-[11px] text-rose-400/80">Stockout &lt; 2 Days</p>
        </div>

        {/* Nearest Stockout */}
        <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Nearest Stockout</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {summary?.nearest_stockout_days ? `${summary.nearest_stockout_days.toFixed(1)}d` : 'Safe'}
          </div>
          <p className="mt-1 text-[11px] text-gray-400">Urgent Depletion Horizon</p>
        </div>
      </section>

      {/* TAB 1: PANTRY SHELVES (MAIN INVENTORY CARDS) */}
      {activeTab === 'shelves' && (
        <section>
          {/* Search & Action Filter Bar */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search potions, herbs, wings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewReagentOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-accent/25 hover:bg-accent-hover transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Reagent</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => {
              const cfg = getStatusConfig(item.status);
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={item.ingredient_id}
                  className="group relative flex flex-col justify-between rounded-2xl border border-surface-border bg-surface p-5 shadow-sm hover:border-accent/50 hover:shadow-lg hover:shadow-purple-950/20 transition-all"
                >
                  {/* Top: Name & Universal Status Badge */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-white text-base tracking-wide group-hover:text-accent-light transition-colors">
                          {item.ingredient}
                        </h3>
                        <p className="text-xs text-gray-400">
                          Lead Time: {item.lead_time_days || 7} Days
                        </p>
                      </div>

                      {/* Universal Status Badge with Defined Color, Text Label and Icon */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${cfg.badgeClass}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        <span>{cfg.badgeLabel}</span>
                      </span>
                    </div>

                    {/* Stock Quantity Display */}
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-white">
                        {item.stock}
                      </span>
                      <span className="text-xs text-gray-400 uppercase tracking-wider">
                        {item.unit}
                      </span>
                    </div>

                    {/* Stockout Telemetry Grid */}
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-surface-border/60 pt-3 text-xs">
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                          Supply Left
                        </span>
                        <span className={`font-semibold ${cfg.textColor}`}>
                          {item.days_until_stockout.toFixed(1)} Days
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px] uppercase font-semibold">
                          Daily Burn
                        </span>
                        <span className="font-semibold text-gray-300">
                          {item.daily_demand ? item.daily_demand.toFixed(1) : '3.0'} / day
                        </span>
                      </div>
                    </div>

                    {/* Reorder Recommendation */}
                    <div className="mt-2 rounded-lg bg-surface-subtle p-2 text-xs flex justify-between items-center text-gray-300">
                      <span className="text-gray-400">Reorder Target:</span>
                      <span className="font-mono font-bold text-purple-300">
                        +{item.reorder_qty} {item.unit}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Brew/Sell & Restock */}
                  <div className="mt-5 grid grid-cols-2 gap-2 pt-2 border-t border-surface-border/60">
                    <button
                      onClick={() => {
                        setActiveItem(item);
                        setSaleModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl bg-purple-950/40 border border-purple-800/40 px-3 py-2 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 transition-all"
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />
                      <span>Brew / Sell</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveItem(item);
                        setRestockModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-1 rounded-xl bg-surface-subtle border border-surface-border px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-surface-border transition-all"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Restock</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: DEMAND PROPHECY (RECHARTS WITH CONFIDENCE BANDS) */}
      {activeTab === 'demand' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                <span>Demand Prophecy & Confidence Bands</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Visualizing timeline sales history, 7-day predicted demand, and 95% confidence intervals.
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

          {/* Chart Container */}
          <div className="rounded-2xl border border-surface-border bg-surface p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-white">
                  {demandDetail?.ingredient} Consumption Curve
                </span>
                <span className="ml-2 text-xs text-gray-400">
                  Current Stock: {demandDetail?.current_stock} {demandDetail?.unit}
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
                <AreaChart data={demandDetail?.chart_data || []}>
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
                  {/* Hi / Lo Range Area */}
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
                  {/* Actual History */}
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                    dot={{ fill: '#a78bfa', r: 4 }}
                  />
                  {/* Predicted Forecast */}
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
        </section>
      )}

      {/* TAB 3: RESTOCK SPELLS (TABLE RECOMMENDATIONS) */}
      {activeTab === 'restock' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" />
              <span>Pantry Restock Grimoire</span>
            </h2>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-surface-border bg-surface-subtle text-gray-400 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Reagent</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Days Left</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Safety Buffer</th>
                  <th className="px-4 py-3">Reorder Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border/60">
                {restockItems?.map((item) => {
                  const cfg = getStatusConfig(item.status);
                  const Icon = cfg.icon;
                  return (
                    <tr key={item.ingredient_id} className="hover:bg-surface-subtle/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        {item.ingredient}
                      </td>
                      <td className="px-4 py-3">
                        {item.stock} {item.unit}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${cfg.textColor}`}>
                        {item.days_until_stockout.toFixed(1)} Days
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.badgeClass}`}>
                          <Icon className="w-3 h-3" />
                          <span>{cfg.badgeLabel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        +{item.safety_stock || 0} {item.unit}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-purple-300">
                        {item.reorder_qty > 0 ? `+${item.reorder_qty} ${item.unit}` : 'None Needed'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: STRANGE HAPPENINGS (ANOMALIES & ALERTS FEED) */}
      {activeTab === 'anomalies' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Strange Happenings & Risk Audit</span>
            </h2>
          </div>

          <div className="space-y-3">
            {alerts && alerts.length > 0 ? (
              alerts.map((al) => (
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
              ))
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface p-8 text-center text-gray-400 text-xs">
                No strange anomalies detected today. The coven is calm.
              </div>
            )}
          </div>
        </section>
      )}

      {/* MODAL: BREW / SALE */}
      {saleModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Record Potion Brew / Sale</h3>
            <p className="text-xs text-gray-400 mt-1">
              Dispensing reagent: <strong className="text-purple-300">{activeItem.ingredient}</strong>
            </p>

            <form onSubmit={handleRecordSale} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300">
                  Quantity ({activeItem.unit}):
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={actionQty}
                  onChange={(e) => setActionQty(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300">Spell / Brew Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Invisibility Elixir #4"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSaleModalOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 text-xs font-medium text-gray-300 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-purple-700"
                >
                  Record Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESTOCK */}
      {restockModalOpen && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Restock Reagent</h3>
            <p className="text-xs text-gray-400 mt-1">
              Adding stock to: <strong className="text-emerald-400">{activeItem.ingredient}</strong>
            </p>

            <form onSubmit={handleRestock} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-300">
                  Quantity ({activeItem.unit}):
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={actionQty}
                  onChange={(e) => setActionQty(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300">Supplier Note:</label>
                <input
                  type="text"
                  placeholder="e.g. Goblin Caravan Delivery"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalOpen(false)}
                  className="rounded-xl border border-surface-border px-4 py-2 text-xs font-medium text-gray-300 hover:bg-surface-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-700"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW REAGENT */}
      {newReagentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
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

import React, { useState, useMemo, useEffect } from 'react';
import {
  RestockItem,
  DemandDetail,
  DemandChartPoint
} from '../../types';
import { getStatusConfig } from '../../lib/constants';
import ProgressBar from '../ui/ProgressBar';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import api from '../../services/api';
import {
  TrendingUp, Clock, Package, ShieldAlert, ArrowUpRight,
  ArrowDownRight, Sparkles, Layers, Sliders, ChevronLeft,
  Calendar, Flame, Zap, CheckCircle2, AlertTriangle, AlertOctagon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';

interface IngredientDetailViewProps {
  ingredientId: number;
  availableIngredients: RestockItem[];
  onSelectIngredient: (id: number) => void;
  onBackToDashboard: () => void;
  onRestock: (item: RestockItem) => void;
  onSale: (item: RestockItem) => void;
}

type OverlayMode = 'with_event' | 'without_event' | 'both';

export const IngredientDetailView: React.FC<IngredientDetailViewProps> = ({
  ingredientId,
  availableIngredients,
  onSelectIngredient,
  onBackToDashboard,
  onRestock,
  onSale
}) => {
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('both');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Data states: with event and baseline without event
  const [demandWithEvent, setDemandWithEvent] = useState<DemandDetail | null>(null);
  const [demandBaseline, setDemandBaseline] = useState<DemandDetail | null>(null);
  const [restockWithEvent, setRestockWithEvent] = useState<RestockItem | null>(null);
  const [restockBaseline, setRestockBaseline] = useState<RestockItem | null>(null);

  // Fetch both with_event and baseline details whenever ingredientId changes
  const fetchDemandData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cursedDemand, baseDemand, cursedRestockList, baseRestockList] = await Promise.all([
        api.demand.get(ingredientId, true, 7),
        api.demand.get(ingredientId, false, 7),
        api.restock.list(true),
        api.restock.list(false)
      ]);

      setDemandWithEvent(cursedDemand);
      setDemandBaseline(baseDemand);

      const cursedItem = cursedRestockList.find((it) => it.ingredient_id === ingredientId) || null;
      const baseItem = baseRestockList.find((it) => it.ingredient_id === ingredientId) || null;

      setRestockWithEvent(cursedItem);
      setRestockBaseline(baseItem);
    } catch (err: any) {
      console.error('Failed to load ingredient demand details:', err);
      setError(err?.response?.data?.detail || 'Unable to summon demand history and prophecy for this ingredient.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandData();
  }, [ingredientId]);

  // Current selected active item info based on toggle
  const currentDemand = overlayMode === 'without_event' ? demandBaseline : demandWithEvent;
  const currentRestock = overlayMode === 'without_event' ? restockBaseline : restockWithEvent;
  const unit = currentDemand?.unit || currentRestock?.unit || 'units';
  const ingredientName = currentDemand?.ingredient || currentRestock?.ingredient || 'Reagent';

  // Check if an active surge multiplier is in effect for this ingredient
  const hasActiveEvent = (demandWithEvent?.active_multiplier ?? 1.0) > 1.0;
  const activeMultiplier = demandWithEvent?.active_multiplier ?? 1.0;

  // Build merged chart data for Recharts
  const { chartData, splitDate } = useMemo(() => {
    if (!demandWithEvent || !demandBaseline) {
      return { chartData: [], splitDate: '' };
    }

    const baselineForecastMap = new Map<string, { predicted_qty: number; lo: number; hi: number }>();
    demandBaseline.forecast.forEach((f) => {
      baselineForecastMap.set(f.date, f);
    });

    let detectedSplitDate = '';
    if (demandWithEvent.forecast && demandWithEvent.forecast.length > 0) {
      detectedSplitDate = demandWithEvent.forecast[0].date;
    }

    const merged = demandWithEvent.chart_data.map((pt) => {
      const baseF = baselineForecastMap.get(pt.date);

      return {
        date: pt.date,
        // History actual sales
        actual: pt.actual !== undefined ? pt.actual : null,
        // Active event forecast & bands
        forecast: pt.forecast !== undefined ? pt.forecast : null,
        lo: pt.lo !== undefined ? pt.lo : null,
        hi: pt.hi !== undefined ? pt.hi : null,
        // Baseline (no event) forecast & bands
        forecast_baseline: baseF ? baseF.predicted_qty : null,
        lo_baseline: baseF ? baseF.lo : null,
        hi_baseline: baseF ? baseF.hi : null
      };
    });

    return { chartData: merged, splitDate: detectedSplitDate };
  }, [demandWithEvent, demandBaseline]);

  // Status configuration for active restock metrics
  const activeStatus = currentRestock?.status || 'safe';
  const statusCfg = getStatusConfig(activeStatus);
  const StatusIcon = statusCfg.icon;

  if (loading && !demandWithEvent) {
    return <LoadingState message={`Divining prophecies for ${ingredientName}...`} cardCount={4} />;
  }

  if (error && !demandWithEvent) {
    return <ErrorState error={error} onRetry={fetchDemandData} />;
  }

  if (!demandWithEvent) {
    return (
      <EmptyState
        title="Reagent Missing"
        description="The requested potion ingredient is not in the pantry ledger."
        actionLabel="Back to Dashboard"
        onAction={onBackToDashboard}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-surface-border/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center justify-center p-2 rounded-xl border border-surface-border bg-surface text-gray-300 hover:text-white hover:bg-surface-subtle transition-all"
            title="Return to Dashboard"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-wide">
                {ingredientName}
              </h1>
              {/* Universal Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border ${statusCfg.badgeClass}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                <span>{statusCfg.badgeLabel}</span>
              </span>

              {hasActiveEvent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-950/70 border border-rose-800/80 text-rose-300 animate-pulse">
                  <Flame className="w-3 h-3 text-rose-400" />
                  <span>{activeMultiplier}x Event Surge</span>
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Historical Consumption · LightGBM Prophecy · Confidence Bands · Stockout Horizon
            </p>
          </div>
        </div>

        {/* Quick Reagent Switcher Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs text-gray-400 whitespace-nowrap">Switch Reagent:</label>
          <select
            value={ingredientId}
            onChange={(e) => onSelectIngredient(Number(e.target.value))}
            className="w-full sm:w-auto rounded-xl border border-surface-border bg-surface px-3 py-2 text-xs font-semibold text-white focus:border-accent focus:outline-none shadow-sm"
          >
            {availableIngredients.map((it) => (
              <option key={it.ingredient_id} value={it.ingredient_id}>
                {it.ingredient} ({it.stock} {it.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. BEFORE / AFTER EVENT TOGGLE CONTROL BAR */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-3 sm:p-4 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <span className="text-xs font-semibold text-white">Forecast Prophecy Horizon:</span>
          <span className="text-xs text-gray-400 hidden xs:inline">Next 7 Days Ahead</span>
        </div>

        {/* Before / After Toggle Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-subtle border border-surface-border/80 w-full sm:w-auto">
          <button
            onClick={() => setOverlayMode('without_event')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              overlayMode === 'without_event'
                ? 'bg-accent/20 text-accent-light border border-accent/40 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Baseline (No Event)
          </button>
          <button
            onClick={() => setOverlayMode('with_event')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              overlayMode === 'with_event'
                ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active Event {hasActiveEvent ? `(${activeMultiplier}x)` : ''}
          </button>
          <button
            onClick={() => setOverlayMode('both')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              overlayMode === 'both'
                ? 'bg-purple-900/50 text-purple-200 border border-purple-500/50 shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Overlay Both</span>
          </button>
        </div>
      </div>

      {/* 3. MAIN SECTION: RESPONSIVE GRID (CHART + SIDEBAR TELEMETRY) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT / TOP: RECHARTS CANVAS (8 COLS ON LG) */}
        <div className="lg:col-span-8 rounded-2xl border border-surface-border bg-surface p-4 sm:p-6 shadow-sm space-y-4">
          {/* Chart Header & Legend Information */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-border/60 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span>Demand Consumption & Prophecy Curve</span>
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Solid line depicts sales history; dashed curves represent forecasted demand with 95% confidence bands.
              </p>
            </div>

            {/* Event Surge Tag */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 font-mono text-[11px]">
                Unit: <strong className="text-white uppercase">{unit}</strong>
              </span>
            </div>
          </div>

          {/* Recharts Container */}
          <div className="h-72 sm:h-84 md:h-96 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: 12, left: 0, bottom: 20 }}
              >
                <defs>
                  {/* Emergent Neon Green Gradient for Active Forecast Band */}
                  <linearGradient id="activeBandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#81FF89" stopOpacity={0.30} />
                    <stop offset="95%" stopColor="#81FF89" stopOpacity={0.02} />
                  </linearGradient>

                  {/* Emergent Cobalt Blue Gradient for Baseline Forecast Band */}
                  <linearGradient id="baselineBandGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1759FF" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#1759FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#27272e" vertical={false} />

                {/* X-AXIS WITH LABEL */}
                <XAxis
                  dataKey="date"
                  stroke="#71717a"
                  fontSize={10}
                  tickMargin={8}
                  tickFormatter={(val: string) => {
                    const parts = val.split('-');
                    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
                  }}
                  label={{
                    value: 'Timeline Date',
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#a1a1aa',
                    fontSize: 10
                  }}
                />

                {/* Y-AXIS WITH EXPLICIT UNITS */}
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  tickMargin={4}
                  label={{
                    value: `Demand (${unit})`,
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fill: '#a1a1aa',
                    fontSize: 10
                  }}
                />

                {/* CUSTOM EMERGENT DARK GLASS TOOLTIP */}
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141417',
                    borderColor: '#27272e',
                    borderRadius: '20px',
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)'
                  }}
                  formatter={(value: any, name: string) => {
                    if (value === null || value === undefined) return ['--', name];
                    const num = Number(value).toFixed(1);
                    if (name === 'actual') return [`${num} ${unit}`, 'Historical Sales'];
                    if (name === 'forecast') return [`${num} ${unit}`, 'Surge Forecast'];
                    if (name === 'forecast_baseline') return [`${num} ${unit}`, 'Baseline Forecast'];
                    if (name === 'hi') return [`${num} ${unit}`, 'Upper 95% Band'];
                    if (name === 'lo') return [`${num} ${unit}`, 'Lower 95% Band'];
                    return [`${num} ${unit}`, name];
                  }}
                  labelFormatter={(lbl) => `Date: ${lbl}`}
                />

                {/* VERTICAL "FORECAST STARTS HERE" REFERENCE LINE */}
                {splitDate && (
                  <ReferenceLine
                    x={splitDate}
                    stroke="#FFB340"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    label={{
                      value: 'Forecast Starts Here',
                      position: 'top',
                      fill: '#FFB340',
                      fontSize: 10,
                      fontWeight: 600
                    }}
                  />
                )}

                {/* SHADED CONFIDENCE BANDS */}
                {(overlayMode === 'with_event' || overlayMode === 'both') && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="hi"
                      stroke="transparent"
                      fill="url(#activeBandGradient)"
                      name="hi"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="lo"
                      stroke="transparent"
                      fill="#141417"
                      name="lo"
                      isAnimationActive={false}
                    />
                  </>
                )}

                {overlayMode === 'without_event' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="hi_baseline"
                      stroke="transparent"
                      fill="url(#baselineBandGradient)"
                      name="hi_baseline"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="lo_baseline"
                      stroke="transparent"
                      fill="#141417"
                      name="lo_baseline"
                      isAnimationActive={false}
                    />
                  </>
                )}

                {/* 1. ACTUAL SALES HISTORY LINE (EMERGENT CYAN) */}
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#80FFF9"
                  strokeWidth={2.5}
                  dot={{ fill: '#80FFF9', r: 3 }}
                  activeDot={{ r: 5, fill: '#ffffff' }}
                  name="actual"
                  connectNulls={false}
                />

                {/* 2. FORECAST WITH EVENT (EMERGENT NEON GREEN) */}
                {(overlayMode === 'with_event' || overlayMode === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#81FF89"
                    strokeDasharray="5 5"
                    strokeWidth={2.5}
                    dot={{ fill: '#81FF89', r: 3.5 }}
                    name="forecast"
                    connectNulls={false}
                  />
                )}

                {/* 3. BASELINE FORECAST WITHOUT EVENT (EMERGENT BLUE) */}
                {(overlayMode === 'without_event' || overlayMode === 'both') && (
                  <Line
                    type="monotone"
                    dataKey="forecast_baseline"
                    stroke="#1759FF"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    dot={{ fill: '#1759FF', r: 3 }}
                    name="forecast_baseline"
                    connectNulls={false}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive Chart Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 border-t border-surface-border/60 text-xs">
            <div className="flex items-center gap-1.5 text-purple-300">
              <span className="inline-block h-2 w-3 rounded bg-purple-400" />
              <span>Actual History</span>
            </div>
            {(overlayMode === 'with_event' || overlayMode === 'both') && (
              <div className="flex items-center gap-1.5 text-purple-400">
                <span className="inline-block h-2 w-3 rounded bg-purple-500" />
                <span>Active Forecast {hasActiveEvent ? `(${activeMultiplier}x Surge)` : ''}</span>
              </div>
            )}
            {(overlayMode === 'without_event' || overlayMode === 'both') && (
              <div className="flex items-center gap-1.5 text-cyan-400">
                <span className="inline-block h-2 w-3 rounded bg-cyan-500" />
                <span>Baseline Forecast (1.0x)</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="inline-block h-2 w-3 border-b-2 border-dashed border-amber-400" />
              <span>Forecast Split Marker</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400">
              <span className="inline-block h-2 w-3 rounded bg-purple-900/40 border border-purple-500/30" />
              <span>95% Confidence Band</span>
            </div>
          </div>
        </div>

        {/* RIGHT / BESIDE: RESTOCK RECOMMENDATION & TELEMETRY SIDEBAR (4 COLS ON LG) */}
        <div className="lg:col-span-4 space-y-4">
          {/* PRIMARY STAT 1: DAYS UNTIL STOCKOUT */}
          <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-gray-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Days Until Stockout</span>
              <Clock className="w-4 h-4 text-accent" />
            </div>

            <div className="flex items-baseline justify-between">
              <span className={`text-3xl sm:text-4xl font-extrabold ${statusCfg.textColor}`}>
                {currentRestock?.days_until_stockout !== undefined ? (
                  currentRestock.days_until_stockout <= 0 ? (
                    'Depleted'
                  ) : (
                    `${currentRestock.days_until_stockout.toFixed(1)}d`
                  )
                ) : (
                  '--'
                )}
              </span>

              {/* Status Badge */}
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusCfg.badgeClass}`}>
                <StatusIcon className="w-3 h-3" />
                <span>{statusCfg.badgeLabel}</span>
              </span>
            </div>

            <p className="text-xs text-gray-400">
              {currentRestock?.days_until_stockout !== undefined && currentRestock.days_until_stockout <= 2
                ? 'Imminent stockout warning! Potion brewing recipes endangered.'
                : currentRestock?.days_until_stockout !== undefined && currentRestock.days_until_stockout <= 7
                ? 'Stock is running low. Prepare supplier reorder.'
                : 'Stock levels are sufficient to satisfy forward demand.'}
            </p>

            {/* Stock Level Progress */}
            {currentRestock && (
              <div className="pt-2">
                <ProgressBar
                  value={currentRestock.stock}
                  max={Math.max(40, currentRestock.stock + (currentRestock.reorder_qty || 20))}
                  status={currentRestock.status}
                  heightClass="h-2"
                />
              </div>
            )}
          </div>

          {/* PRIMARY STAT 2: RESTOCK RECOMMENDATION */}
          <div className="rounded-2xl border border-purple-900/40 bg-purple-950/20 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-purple-300">
              <span className="text-xs font-semibold uppercase tracking-wider">Restock Recommendation</span>
              <Package className="w-4 h-4 text-purple-400" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono text-purple-200">
                +{currentRestock?.reorder_qty ?? 0}
              </span>
              <span className="text-sm font-semibold uppercase tracking-wider text-purple-400">
                {unit}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-purple-900/20 p-2.5 text-[11px] border border-purple-800/30">
              <div>
                <span className="text-purple-400 block font-semibold">Safety Buffer:</span>
                <span className="text-white font-mono font-bold">
                  +{currentRestock?.safety_stock ?? 0} {unit}
                </span>
              </div>
              <div>
                <span className="text-purple-400 block font-semibold">Lead Time:</span>
                <span className="text-white font-bold">
                  {currentRestock?.lead_time_days || 7} Days
                </span>
              </div>
            </div>

            <p className="text-[11px] text-purple-300/80 leading-relaxed">
              Calculated via lead time demand, safety variance (z=1.65), and current on-hand stock.
            </p>
          </div>

          {/* TELEMETRY BREAKDOWN & ON-HAND STOCK */}
          <div className="rounded-2xl border border-surface-border bg-surface p-4 text-xs space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
              <span className="text-gray-400">Current Stock On-Hand:</span>
              <span className="font-mono font-bold text-white">
                {currentDemand?.current_stock} {unit}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-surface-border/60">
              <span className="text-gray-400">Active Demand Rate:</span>
              <span className="font-semibold text-gray-200">
                {currentRestock?.daily_demand ? currentRestock.daily_demand.toFixed(1) : '3.0'} {unit} / day
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-400">Active Multiplier:</span>
              <span className={`font-mono font-bold ${hasActiveEvent ? 'text-rose-400' : 'text-gray-300'}`}>
                {activeMultiplier}x {hasActiveEvent ? '(Surge Event)' : '(Standard)'}
              </span>
            </div>
          </div>

          {/* BEFORE VS AFTER EVENT IMPACT AUDIT TABLE */}
          {hasActiveEvent && restockBaseline && restockWithEvent && (
            <div className="rounded-2xl border border-rose-900/40 bg-rose-950/20 p-4 text-xs space-y-3">
              <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                <Flame className="w-4 h-4 text-rose-400" />
                <span>Event Impact: Before vs After</span>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between items-center py-1 border-b border-rose-900/40">
                  <span className="text-gray-400">Stockout Days:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-gray-400">{restockBaseline.days_until_stockout.toFixed(1)}d</span>
                    <span className="text-rose-400 font-bold">&rarr;</span>
                    <span className="text-rose-300 font-bold">{restockWithEvent.days_until_stockout.toFixed(1)}d</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-rose-900/40">
                  <span className="text-gray-400">Reorder Target:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-gray-400">+{restockBaseline.reorder_qty}</span>
                    <span className="text-rose-400 font-bold">&rarr;</span>
                    <span className="text-rose-300 font-bold">+{restockWithEvent.reorder_qty} {unit}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-gray-400">Status Impact:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-400 font-semibold uppercase">{restockBaseline.status}</span>
                    <span className="text-rose-400 font-bold">&rarr;</span>
                    <span className="text-rose-300 font-bold uppercase">{restockWithEvent.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACTION BUTTONS (RESTOCK & RECORD SALE) */}
          {currentRestock && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => onSale(currentRestock)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-purple-800/60 bg-purple-950/40 px-3 py-2.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 transition-all shadow-sm"
              >
                <ArrowDownRight className="w-3.5 h-3.5 text-purple-400" />
                <span>Brew / Sell</span>
              </button>

              <button
                onClick={() => onRestock(currentRestock)}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-800/60 bg-emerald-950/30 px-3 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/50 transition-all shadow-sm"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restock Now</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngredientDetailView;


import React from 'react';
import { useCurse } from '../../context/CurseContext';
import {
  Sparkles, Flame, Database, RefreshCw, Zap, Bell, Sliders, XCircle
} from 'lucide-react';
import api from '../../services/api';

interface NavbarProps {
  onRefresh?: () => void;
  alertCount?: number;
  onNavigateAlerts?: () => void;
  onOpenCurseModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal
}) => {
  const {
    isCurseMode,
    curseEvent,
    curseMultiplier,
    toggleCurseMode,
    deactivateCurse,
    setCurseModalOpen
  } = useCurse();

  const [seeding, setSeeding] = React.useState(false);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await api.system.seed();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Seeding failed:', err);
    } finally {
      setSeeding(false);
    }
  };

  const handleCurseConfigure = () => {
    if (onOpenCurseModal) {
      onOpenCurseModal();
    } else {
      setCurseModalOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-surface/95 backdrop-blur-md">
      {/* GLOBAL MIDNIGHT CURSE BANNER (SHOWN ON EVERY SCREEN WHEN ACTIVE) */}
      {isCurseMode && (
        <div className="bg-gradient-to-r from-purple-950 via-rose-950 to-purple-950 px-4 py-2 text-center text-xs font-medium text-purple-200 border-b border-rose-800/60 shadow-lg shadow-purple-950/50 flex flex-wrap items-center justify-center gap-2 sm:gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-400 animate-pulse flex-shrink-0" />
            <span>
              <strong className="text-rose-300 uppercase tracking-wide">
                {curseEvent?.name || 'MIDNIGHT CURSE'} ACTIVE:
              </strong>{' '}
              Demand amplified by{' '}
              <strong className="text-rose-200 font-mono text-sm underline">
                {curseMultiplier.toFixed(1)}x
              </strong>{' '}
              on {curseEvent?.ingredient_ids?.length || 3} targeted reagents!
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick configure button */}
            <button
              onClick={handleCurseConfigure}
              className="text-[11px] underline text-purple-300 hover:text-white transition-colors"
            >
              Configure
            </button>

            {/* ONE-CLICK TURN OFF / DISPEL CURSE BUTTON */}
            <button
              onClick={deactivateCurse}
              className="flex items-center gap-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 px-3 py-1 text-[11px] font-bold border border-rose-600/60 shadow-sm transition-all hover:scale-105 active:scale-95"
              title="Dispel active demand curse immediately and reset numbers to baseline"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Turn Off Curse</span>
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Logo & App Name */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-800 p-2 shadow-lg shadow-purple-900/40 ring-1 ring-purple-400/30 flex-shrink-0">
              <Sparkles className="h-5 w-5 text-purple-100" />
              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-white">
                  PotionPulse
                </span>
                <span className="hidden rounded-md bg-purple-900/60 px-2 py-0.5 text-[10px] font-semibold text-purple-300 ring-1 ring-purple-500/30 sm:inline-block">
                  v2.0
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden xs:block">
                The Witch's Potion Pantry · Smart Inventory & Prophecy
              </p>
            </div>
          </div>

          {/* Controls: Alerts Badge, Seed, Refresh, Curse Switch */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1. RECENT ALERT COUNT BUTTON IN NAVBAR */}
            <button
              onClick={onNavigateAlerts}
              title={alertCount > 0 ? `${alertCount} recent anomalies detected` : 'No active alerts'}
              className="relative flex items-center justify-center p-2 rounded-xl border border-surface-border bg-surface-subtle text-gray-300 hover:text-white hover:bg-surface-border transition-all"
            >
              <Bell className="w-4 h-4 text-purple-300" />
              {alertCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-lg shadow-rose-900/80 ring-2 ring-surface animate-bounce">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* Seed Demo Button */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              title="Reseed Pantry Ledger with sample data"
              className="hidden md:flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-surface-border hover:text-white transition-all disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-purple-400" />
              <span>{seeding ? 'Seeding...' : 'Reseed Demo'}</span>
            </button>

            {/* Quick Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh pantry metrics"
                className="flex items-center justify-center p-2 rounded-lg border border-surface-border bg-surface-subtle text-gray-300 hover:text-white hover:bg-surface-border transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 2. CURSE MODE FLOW SWITCH & BUTTON */}
            <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-purple-500/30 bg-purple-950/25 p-1 sm:p-1.5 ring-1 ring-purple-500/20 shadow-sm">
              <div className="flex flex-col text-right pl-2 hidden sm:block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1 justify-end">
                  <Zap className="w-3 h-3 text-purple-400" />
                  Curse Mode
                </span>
                <span className="text-[9px] text-gray-400">
                  {isCurseMode ? `${curseMultiplier.toFixed(1)}x Demand Surge` : 'Standard Baseline'}
                </span>
              </div>

              {/* Configure button if off or on */}
              <button
                type="button"
                onClick={handleCurseConfigure}
                title="Configure targeted ingredients & multiplier for Curse Mode"
                className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-purple-900/50 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* Interactive Toggle Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={isCurseMode}
                onClick={toggleCurseMode}
                title={isCurseMode ? 'Click to deactivate Curse Mode immediately' : 'Click to summon Curse Mode'}
                className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-surface ${
                  isCurseMode ? 'bg-gradient-to-r from-purple-600 to-rose-600 shadow-md shadow-rose-950/50' : 'bg-gray-700'
                }`}
              >
                <span className="sr-only">Toggle Curse Mode</span>
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    isCurseMode ? 'translate-x-5 text-rose-600' : 'translate-x-0 text-gray-500'
                  }`}
                >
                  <Flame className={`w-3.5 h-3.5 ${isCurseMode ? 'fill-current' : 'opacity-40'}`} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

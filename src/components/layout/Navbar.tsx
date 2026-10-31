import React from 'react';
import { useCurse } from '../../context/CurseContext';
import {
  Sparkles, Flame, Database, RefreshCw, Zap, Bell, Sliders, XCircle, Search, Terminal
} from 'lucide-react';
import api from '../../services/api';
import BorderBeamSearch from '../ui/border-beam-search';

interface NavbarProps {
  onRefresh?: () => void;
  alertCount?: number;
  onNavigateAlerts?: () => void;
  onOpenCurseModal?: () => void;
  onQuickSearchClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal,
  onQuickSearchClick
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
    <header className="sticky top-0 z-50 w-full border-b border-surface-border bg-background/90 backdrop-blur-xl">
      {/* GLOBAL MIDNIGHT CURSE BANNER (EMERGENT NEON SURGE STYLE) */}
      {isCurseMode && (
        <div className="bg-gradient-to-r from-red-950/90 via-surface to-red-950/90 px-4 py-2 text-center text-xs font-medium text-white border-b border-red-500/30 shadow-lg shadow-red-950/50 flex flex-wrap items-center justify-center gap-2 sm:gap-4 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span>
              <strong className="text-red-400 font-bold uppercase tracking-wider">
                {curseEvent?.name || 'MIDNIGHT SURGE'} ACTIVE:
              </strong>{' '}
              Demand shockwave amplified{' '}
              <strong className="text-emergent-green font-mono text-xs px-1.5 py-0.5 rounded bg-black/40 border border-emergent-green/30">
                {curseMultiplier.toFixed(1)}x
              </strong>{' '}
              across pantry shelves!
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCurseConfigure}
              className="text-[11px] font-medium text-gray-300 hover:text-white px-2 py-0.5 rounded border border-white/10 hover:border-white/20 transition-all"
            >
              Tune Multiplier
            </button>

            <button
              onClick={deactivateCurse}
              className="flex items-center gap-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-0.5 text-[11px] font-bold border border-red-500/40 transition-all hover:scale-105 active:scale-95"
              title="Dispel active demand curse immediately and reset numbers to baseline"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Dispel Curse</span>
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Emergent Minimalist Logo & Workspace Breadcrumbs */}
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-surface-subtle to-surface border border-white/15 p-2 shadow-sm flex-shrink-0">
              <Sparkles className="h-4 w-4 text-emergent-cyan" />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emergent-green ring-2 ring-background animate-pulse" />
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-base font-bold tracking-tight text-white">
                  PotionPulse
                </span>
                <span className="text-gray-500 font-mono text-xs hidden sm:inline">/</span>
                <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                  Hexley Pantry
                </span>
              </div>
              <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-mono font-medium text-gray-300 border border-white/10">
                v2.0
              </span>
            </div>
          </div>

          {/* 21st.dev Border Beam Search Bar (Desktop) */}
          <div className="hidden md:block w-72 lg:w-80">
            <BorderBeamSearch
              placeholder="Search reagents, stock..."
              onSubmit={(q) => {
                if (onQuickSearchClick) onQuickSearchClick();
              }}
              colorVariant="colorful"
              duration={3.1}
              height={38}
              borderRadius={64}
              width="100%"
            />
          </div>

          {/* Right Action Controls: Alerts, Seed, Refresh, Curse Switch */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* 1. Alerts Feed Button */}
            <button
              onClick={onNavigateAlerts}
              title={alertCount > 0 ? `${alertCount} recent anomalies detected` : 'No active alerts'}
              className="relative flex items-center justify-center p-2 rounded-xl border border-surface-border bg-surface-subtle text-gray-300 hover:text-white hover:border-white/20 transition-all"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-background">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* 2. Seed Demo Button */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              title="Reseed Pantry Ledger with sample data"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-subtle px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-surface hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-emergent-cyan" />
              <span>{seeding ? 'Seeding...' : 'Reseed Demo'}</span>
            </button>

            {/* 3. Quick Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh pantry metrics"
                className="flex items-center justify-center p-2 rounded-xl border border-surface-border bg-surface-subtle text-gray-300 hover:text-white hover:border-white/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 4. EMERGENT CURSE / VIBE MODE TOGGLE */}
            <div className={`flex items-center gap-1.5 sm:gap-2 rounded-xl border p-1 sm:p-1.5 transition-all ${
              isCurseMode 
                ? 'border-red-500/50 bg-red-950/20 shadow-emergent-glow-green' 
                : 'border-surface-border bg-surface-subtle'
            }`}>
              <div className="flex flex-col text-right pl-2 hidden sm:block">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 justify-end ${
                  isCurseMode ? 'text-red-400' : 'text-gray-400'
                }`}>
                  <Zap className={`w-3 h-3 ${isCurseMode ? 'text-red-400' : 'text-gray-500'}`} />
                  Curse Mode
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {isCurseMode ? `${curseMultiplier.toFixed(1)}x Surge` : 'Baseline'}
                </span>
              </div>

              {/* Configure button */}
              <button
                onClick={handleCurseConfigure}
                title="Configure curse parameters"
                className="flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-all"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>

              {/* The Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={isCurseMode}
                onClick={toggleCurseMode}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCurseMode ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-surface-border'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isCurseMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

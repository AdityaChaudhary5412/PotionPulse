import React from 'react';
import { useCurse } from '../../context/CurseContext';
import {
  Sparkles, Flame, Database, RefreshCw, Zap, Bell, Sliders, XCircle, Search, Terminal
} from 'lucide-react';
import api from '../../services/api';
import BorderBeamSearch from '../ui/border-beam-search';
import PotionPulseLogo from '../ui/PotionPulseLogo';

interface NavbarProps {
  onRefresh?: () => void;
  alertCount?: number;
  onNavigateAlerts?: () => void;
  onOpenCurseModal?: () => void;
  onQuickSearchClick?: () => void;
  onNavigateLanding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal,
  onQuickSearchClick,
  onNavigateLanding
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
    <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#0c0a14]/90 backdrop-blur-2xl">
      {/* Sleek Mystical Midnight Surge Alert Bar */}
      {isCurseMode && (
        <div className="bg-gradient-to-r from-red-950/60 via-purple-950/50 to-red-950/60 px-4 py-2 text-center text-xs font-medium text-white border-b border-red-500/25 flex flex-wrap items-center justify-center gap-2 sm:gap-4 animate-in slide-in-from-top duration-300 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
            </span>
            <span className="text-gray-200">
              <strong className="text-red-400 font-bold uppercase tracking-wider">
                {curseEvent?.name || 'MIDNIGHT SURGE'} ACTIVE:
              </strong>{' '}
              Demand shockwave amplified{' '}
              <strong className="text-amber-300 font-mono text-xs px-2 py-0.5 rounded-full bg-black/50 border border-amber-400/30">
                {curseMultiplier.toFixed(1)}x
              </strong>{' '}
              across pantry shelves
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCurseConfigure}
              className="text-[11px] font-medium text-purple-300 hover:text-white px-2.5 py-0.5 rounded-full border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all"
            >
              Tune Surge
            </button>

            <button
              onClick={deactivateCurse}
              className="flex items-center gap-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-0.5 text-[11px] font-semibold border border-red-500/30 transition-all active:scale-95"
              title="Dispel active demand curse immediately"
            >
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span>Dispel</span>
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Logo directly relating to Potion & Pulse */}
          <div 
            onClick={onNavigateLanding}
            className="cursor-pointer group flex items-center"
            title="View PotionPulse Animated Shader Front Page"
          >
            <PotionPulseLogo size="md" subtitle="Hexley Pantry Engine" />
          </div>

          {/* Clean Obsidian Search Bar (Desktop) */}
          <div className="hidden md:block w-72 lg:w-80">
            <BorderBeamSearch
              placeholder="Search reagents, spells..."
              onSubmit={(q) => {
                if (onQuickSearchClick) onQuickSearchClick();
              }}
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
              className="relative flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0c0a14]">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* 2. Seed Demo Button */}
            <button
              onClick={handleSeed}
              disabled={seeding}
              title="Reseed Pantry Ledger with sample data"
              className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>{seeding ? 'Seeding...' : 'Reseed Demo'}</span>
            </button>

            {/* 3. Quick Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh pantry metrics"
                className="flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 4. Streamlined Curse / Surge Mode Toggle */}
            <div className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl border px-2.5 py-1 transition-all ${
              isCurseMode 
                ? 'border-red-500/40 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
                : 'border-white/10 bg-white/[0.04]'
            }`}>
              <div className="flex items-center gap-1.5">
                <Zap className={`w-3.5 h-3.5 ${isCurseMode ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                <span className="text-xs font-semibold text-white hidden sm:inline">
                  {isCurseMode ? `${curseMultiplier.toFixed(1)}x Curse` : 'Curse Mode'}
                </span>
              </div>

              {/* Configure button */}
              <button
                onClick={handleCurseConfigure}
                title="Configure curse parameters"
                className="flex items-center justify-center p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <Sliders className="w-3 h-3" />
              </button>

              {/* The Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={isCurseMode}
                onClick={toggleCurseMode}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCurseMode ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isCurseMode ? 'translate-x-4' : 'translate-x-0'
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

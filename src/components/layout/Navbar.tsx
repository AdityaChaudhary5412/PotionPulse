import React from 'react';
import { useCurse } from '../../context/CurseContext';
import {
  Sparkles, Flame, Database, RefreshCw, Zap, Bell, Sliders, XCircle, Search, Terminal, User, LogOut
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
  onNavigateAuth?: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefresh,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal,
  onQuickSearchClick,
  onNavigateLanding,
  onNavigateAuth,
  currentUser,
  onSignOut
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
        <div className="bg-[#18090f]/90 border-b border-red-500/20 px-4 py-2 text-center text-xs text-white flex flex-wrap items-center justify-center gap-2 sm:gap-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-gray-300">
              <strong className="text-red-400 font-semibold tracking-wide uppercase">
                {curseEvent?.name || 'Midnight Surge'}:
              </strong>{' '}
              Demand amplified{' '}
              <span className="text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 border border-amber-400/25">
                {curseMultiplier.toFixed(1)}x
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCurseConfigure}
              className="text-[11px] font-medium text-purple-300 hover:text-white px-2.5 py-0.5 rounded-full border border-purple-400/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              Tune Multiplier
            </button>
            <button
              onClick={deactivateCurse}
              className="flex items-center gap-1 rounded-full bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-white px-2.5 py-0.5 text-[11px] font-medium border border-red-500/30 transition-all cursor-pointer"
              title="Dispel active demand curse immediately"
            >
              <XCircle className="w-3 h-3 text-red-400" />
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

          {/* Right Action Controls: Alerts, Curse Toggle, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* 1. Alerts Feed Button */}
            <button
              onClick={onNavigateAlerts}
              title={alertCount > 0 ? `${alertCount} recent anomalies detected` : 'No active alerts'}
              className="relative flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4 text-gray-300" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-[#0c0a14]">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </button>

            {/* 2. Quick Refresh */}
            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh pantry metrics"
                className="flex items-center justify-center p-2 rounded-xl border border-white/10 bg-white/[0.04] text-gray-300 hover:text-white hover:border-white/20 hover:bg-white/[0.08] transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            {/* 3. Streamlined Curse / Surge Mode Toggle */}
            <div className={`flex items-center gap-1.5 sm:gap-2 rounded-2xl border px-2.5 py-1 transition-all ${
              isCurseMode 
                ? 'border-red-500/40 bg-red-950/25 shadow-sm' 
                : 'border-white/10 bg-white/[0.03]'
            }`}>
              <div className="flex items-center gap-1.5 cursor-pointer" onClick={handleCurseConfigure} title="Click to tune curse multiplier">
                <Zap className={`w-3.5 h-3.5 ${isCurseMode ? 'text-red-400 animate-pulse' : 'text-gray-400'}`} />
                <span className="text-xs font-semibold text-white hidden sm:inline">
                  {isCurseMode ? `${curseMultiplier.toFixed(1)}x Surge` : 'Curse Mode'}
                </span>
              </div>

              {/* The Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={isCurseMode}
                onClick={toggleCurseMode}
                className={`relative inline-flex h-4.5 w-8 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCurseMode ? 'bg-red-500 shadow-sm shadow-red-500/50' : 'bg-white/20'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    isCurseMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 4. User Profile or Log In / Sign Up */}
            {currentUser ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs">
                {currentUser.avatar ? (
                  <img src={currentUser.avatar} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-300 font-bold flex items-center justify-center text-[10px]">
                    {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                  </div>
                )}
                <span className="text-gray-200 font-medium max-w-[140px] truncate hidden md:inline">
                  {currentUser.name || currentUser.email}
                </span>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors ml-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : onNavigateAuth ? (
              <button
                onClick={onNavigateAuth}
                title="Account / Sign In"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-medium text-gray-200 hover:bg-white/[0.08] hover:border-white/20 hover:text-white transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden md:inline">Sign In</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

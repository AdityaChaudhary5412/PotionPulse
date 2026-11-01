import React, { useState } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useCurse } from '../../context/CurseContext';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Command,
  Zap,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Bot
} from 'lucide-react';

interface BaseLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  alertCount?: number;
  onNavigateAlerts?: () => void;
  onOpenCurseModal?: () => void;
  currentUser?: any;
  onSignOut?: () => void;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  onRefresh,
  activeTab = 'dashboard',
  onTabChange,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal,
  currentUser,
  onSignOut
}) => {
  const { isCurseMode, curseMultiplier, toggleCurseMode, setCurseModalOpen } = useCurse();

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Overview & Shelves',
      shortLabel: 'Dashboard',
      icon: LayoutDashboard,
      desc: 'Pantry stock & depletion'
    },
    {
      id: 'inventory',
      label: 'Inventory Ledger',
      shortLabel: 'Ledger',
      icon: Boxes,
      desc: 'Reagents & transactions'
    },
    {
      id: 'demand',
      label: 'Demand Prophecy',
      shortLabel: 'Prophecy',
      icon: TrendingUp,
      desc: 'LightGBM forecast & bands'
    },
    {
      id: 'anomalies',
      label: 'Threat & Anomaly Feed',
      shortLabel: 'Threats',
      icon: AlertTriangle,
      desc: 'Spikes, leaks & drop-to-zero',
      badge: alertCount > 0 ? alertCount : undefined
    },
  ];

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onRefresh={onRefresh}
        alertCount={alertCount}
        onNavigateAlerts={onNavigateAlerts}
        onOpenCurseModal={onOpenCurseModal}
        onNavigateLanding={() => onTabChange?.('landing')}
        onNavigateAuth={() => onTabChange?.('auth')}
        currentUser={currentUser}
        onSignOut={onSignOut}
      />

      <div className="flex-1 flex w-full mx-auto max-w-7xl">
        {/* ============================================================== */}
        {/* REFINED APOTHECARY SIDEBAR (Visible on md: and larger screens)   */}
        {/* ============================================================== */}
        {onTabChange && (
          <aside className="hidden md:flex flex-col w-64 border-r border-white/[0.06] bg-[#0c0a14]/60 p-4 shrink-0 space-y-6 sticky top-16 h-[calc(100vh-4rem)] backdrop-blur-xl">
            {/* Workspace & Mode Pill */}
            <div className="px-3 py-2 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                <span className="font-semibold text-gray-200">Active Pantry</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                LightGBM v2
              </span>
            </div>

            {/* Navigation Group */}
            <div className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
                Pantry Intelligence
              </p>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/15 via-white/[0.08] to-transparent text-white border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] font-semibold'
                        : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-xl transition-colors ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
                          : 'text-gray-400 group-hover:text-gray-200'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className={`leading-tight ${isActive ? 'font-semibold text-white' : ''}`}>
                          {item.label}
                        </div>
                      </div>
                    </div>

                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clean Telemetry Status Indicator (Non-cluttered) */}
            <div className="mt-auto pt-4 border-t border-white/[0.08]">
              <div className={`p-3 rounded-2xl border transition-all ${
                isCurseMode
                  ? 'border-red-500/30 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.15)]'
                  : 'border-white/[0.06] bg-white/[0.02]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${isCurseMode ? 'bg-red-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span className="text-xs font-semibold text-white">
                    {isCurseMode ? 'Surge Mode Active' : 'Pantry State'}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  {isCurseMode
                    ? `Demand shockwave at ${curseMultiplier.toFixed(1)}x. Recalculating days-to-stockout.`
                    : 'Real-time telemetry tracking consumption & stockouts.'}
                </p>
              </div>

              {/* System Footer Badge */}
              <div className="mt-4 px-2 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
                  Engine Online
                </span>
                <span className="font-mono text-[10px]">v2.0</span>
              </div>
            </div>
          </aside>
        )}

        {/* ============================================================== */}
        {/* MAIN CANVAS CONTENT AREA                                       */}
        {/* ============================================================== */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 pb-28 md:pb-8 max-w-full overflow-hidden">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (exclusively on small screens) */}
      {onTabChange && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          alertCount={alertCount}
        />
      )}
    </div>
  );
};

export default BaseLayout;

import React, { useState } from 'react';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { useCurse } from '../../context/CurseContext';
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  AlertTriangle,
  Sparkles,
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
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  onRefresh,
  activeTab = 'dashboard',
  onTabChange,
  alertCount = 0,
  onNavigateAlerts,
  onOpenCurseModal
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
      />

      <div className="flex-1 flex w-full mx-auto max-w-7xl">
        {/* ============================================================== */}
        {/* EMERGENT DESKTOP SIDEBAR (Visible on md: and larger screens)     */}
        {/* ============================================================== */}
        {onTabChange && (
          <aside className="hidden md:flex flex-col w-64 border-r border-surface-border bg-background/50 p-4 shrink-0 space-y-6 sticky top-16 h-[calc(100vh-4rem)]">
            {/* Workspace & Mode Pill */}
            <div className="px-2 py-1.5 rounded-xl bg-surface-subtle/80 border border-surface-border flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emergent-green animate-pulse" />
                <span className="font-semibold text-gray-200">Active Pantry</span>
              </div>
              <span className="font-mono text-[10px] text-emergent-cyan bg-emergent-cyan/10 px-1.5 py-0.5 rounded border border-emergent-cyan/20">
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-surface-elevated text-white border border-white/15 shadow-sm shadow-black/40'
                        : 'text-gray-400 hover:text-white hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-emergent-cyan/15 text-emergent-cyan'
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
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Emergent Curse / Surge Controller Card in Sidebar */}
            <div className="mt-auto pt-4 border-t border-surface-border">
              <div className={`p-3 rounded-2xl border transition-all ${
                isCurseMode
                  ? 'border-red-500/40 bg-red-950/20'
                  : 'border-surface-border bg-surface/60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Zap className={`w-3.5 h-3.5 ${isCurseMode ? 'text-red-400' : 'text-emergent-cyan'}`} />
                    <span className="text-xs font-semibold text-white">Curse Stress Test</span>
                  </div>
                  <button
                    type="button"
                    onClick={toggleCurseMode}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${
                      isCurseMode ? 'bg-red-500' : 'bg-surface-border'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ${
                        isCurseMode ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-snug">
                  {isCurseMode
                    ? `Surge active: +${curseMultiplier.toFixed(1)}x demand multiplier across recipes.`
                    : 'Simulate high-impact surges & Halloween rush.'}
                </p>
              </div>

              {/* System Footer Badge */}
              <div className="mt-4 px-2 flex items-center justify-between text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emergent-green" />
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

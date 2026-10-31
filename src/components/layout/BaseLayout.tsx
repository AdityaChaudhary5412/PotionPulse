import React from 'react';
import Navbar from './Navbar';
import { useCurse } from '../../context/CurseContext';
import { ShieldCheck, Activity, Terminal } from 'lucide-react';

interface BaseLayoutProps {
  children: React.ReactNode;
  onRefresh?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const BaseLayout: React.FC<BaseLayoutProps> = ({
  children,
  onRefresh,
  activeTab = 'shelves',
  onTabChange
}) => {
  const { isCurseMode } = useCurse();

  const tabs = [
    { id: 'shelves', label: 'Pantry Shelves', icon: '🧪' },
    { id: 'demand', label: 'Demand Prophecy', icon: '🔮' },
    { id: 'restock', label: 'Restock Spells', icon: '📜' },
    { id: 'anomalies', label: 'Strange Happenings', icon: '💀' },
    { id: 'movements', label: 'Transaction Grimoire', icon: '📖' },
  ];

  return (
    <div className="min-h-screen bg-background text-gray-100 flex flex-col font-sans">
      {/* Top Navbar with Logo & Curse Mode Switch */}
      <Navbar onRefresh={onRefresh} />

      {/* Navigation Sub-bar */}
      {onTabChange && (
        <nav className="border-b border-surface-border bg-surface/60 backdrop-blur sticky top-16 z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 no-scrollbar">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-accent/20 text-accent-light border border-accent/40 shadow-sm shadow-accent/20'
                        : 'text-gray-400 hover:text-white hover:bg-surface-subtle'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Main Content Area - Mobile-First Responsive */}
      <main className="flex-1 w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Subtle Dark Footer */}
      <footer className="border-t border-surface-border bg-surface/40 py-4 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>FastAPI SQLite Engine Active</span>
            <span className="text-gray-600">|</span>
            <span>LightGBM & Baseline Prophecy</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">Track 1: The Witch's Potion Pantry</span>
            <span className="text-purple-400 font-mono">PotionPulse 2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BaseLayout;

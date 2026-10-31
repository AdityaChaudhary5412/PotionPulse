import React from 'react';
import { Sparkles, Package, TrendingUp, ShieldAlert } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  alertCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  alertCount = 0
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Sparkles },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'demand', label: 'Prophecy', icon: TrendingUp },
    { id: 'anomalies', label: 'Alerts', icon: ShieldAlert, badge: alertCount },
  ];

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-surface/95 backdrop-blur-md border-t border-surface-border shadow-2xl safe-area-pb"
    >
      <div className="grid grid-cols-4 h-16 max-w-md mx-auto px-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                isActive ? 'text-accent-light' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-accent stroke-[2.2]' : ''
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white shadow-md shadow-rose-950 ring-1 ring-surface">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight font-medium ${
                  isActive ? 'font-bold text-white' : ''
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-accent shadow-sm shadow-accent" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;


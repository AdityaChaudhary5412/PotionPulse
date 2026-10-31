import React, { useState, useMemo } from 'react';
import { AlertItem } from '../../types';
import LoadingState from '../ui/LoadingState';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import BorderBeamSearch from '../ui/border-beam-search';
import {
  ShieldAlert, Flame, AlertTriangle, AlertOctagon, Info,
  Search, RefreshCw, Clock, ArrowUpDown, Filter, ChevronRight,
  TrendingUp, CheckCircle2
} from 'lucide-react';

interface AlertsViewProps {
  alerts: AlertItem[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onInspectIngredient?: (ingredientId: number) => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  loading,
  error,
  onRefresh,
  onInspectIngredient
}) => {
  const [search, setSearch] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filter and sort alerts NEWEST FIRST (timestamp descending)
  const processedAlerts = useMemo(() => {
    if (!alerts) return [];

    let filtered = alerts.filter((al) => {
      const matchSearch =
        al.description.toLowerCase().includes(search.toLowerCase()) ||
        al.type.toLowerCase().includes(search.toLowerCase());

      const matchSeverity =
        severityFilter === 'all' ||
        al.severity.toLowerCase() === severityFilter.toLowerCase() ||
        (severityFilter === 'urgent' && (al.severity === 'high' || al.severity === 'critical'));

      const matchType =
        typeFilter === 'all' ||
        al.type.toLowerCase() === typeFilter.toLowerCase();

      return matchSearch && matchSeverity && matchType;
    });

    // Ensure newest first
    return filtered.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
  }, [alerts, search, severityFilter, typeFilter]);

  // Alert summary counts
  const counts = useMemo(() => {
    if (!alerts) return { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      high: alerts.filter((a) => a.severity === 'high').length,
      medium: alerts.filter((a) => a.severity === 'medium').length,
      low: alerts.filter((a) => a.severity === 'low').length
    };
  }, [alerts]);

  // Helper to render severity badge
  const renderSeverityBadge = (severity: string) => {
    const s = severity.toLowerCase();
    if (s === 'critical' || s === 'high') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-status-critical-bg text-status-critical border border-status-critical-border shadow-sm">
          <AlertOctagon className="w-3 h-3 text-status-critical animate-pulse flex-shrink-0" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === 'medium') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-status-low-bg text-status-low border border-status-low-border">
          <AlertTriangle className="w-3 h-3 text-status-low flex-shrink-0" />
          <span>Medium</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emergent-cyan/10 text-emergent-cyan border border-emergent-cyan/30">
        <Info className="w-3 h-3 text-emergent-cyan flex-shrink-0" />
        <span>Low</span>
      </span>
    );
  };

  // Helper to render anomaly type icon and label
  const renderTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes('SPIKE')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-400">
          <Flame className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
          <span>Demand Spike</span>
        </span>
      );
    }
    if (t.includes('MISSING')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span>Missing Stock</span>
        </span>
      );
    }
    if (t.includes('ZERO') || t.includes('DROP')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400">
          <AlertOctagon className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
          <span>Drop to Zero</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-300">
        <ShieldAlert className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span>{type.replace('_', ' ')}</span>
      </span>
    );
  };

  // Format relative timestamp
  const formatTime = (tsStr: string) => {
    try {
      const dt = new Date(tsStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - dt.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return dt.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return tsStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header & Summary Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            <span>Strange Happenings & Anomaly Audit</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Statistical demand spikes (MAD $z \ge 3.5$), phantom missing stock discrepancies, and sudden drop-to-zero hazards.
          </p>
        </div>

        {/* Scan Now Refresh Button */}
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface px-4 py-2 text-xs font-semibold text-gray-200 hover:text-white hover:bg-surface-subtle transition-all shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-accent" />
          <span>Scan Anomaly Ledger</span>
        </button>
      </div>

      {/* Summary Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="emergent-glass-card p-3.5 flex items-center justify-between">
          <span className="text-xs text-gray-400">Total Alerts</span>
          <span className="text-base font-bold font-mono text-white">{counts.total}</span>
        </div>
        <div className="emergent-glass-card p-3.5 flex items-center justify-between border-red-500/30">
          <span className="text-xs text-status-critical flex items-center gap-1.5 font-medium">
            <AlertOctagon className="w-3.5 h-3.5" /> Urgent Threats
          </span>
          <span className="text-base font-bold font-mono text-status-critical">
            {counts.critical + counts.high}
          </span>
        </div>
        <div className="emergent-glass-card p-3.5 flex items-center justify-between border-amber-500/30">
          <span className="text-xs text-status-low flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" /> Medium Risks
          </span>
          <span className="text-base font-bold font-mono text-status-low">{counts.medium}</span>
        </div>
        <div className="emergent-glass-card p-3.5 flex items-center justify-between border-emergent-cyan/30">
          <span className="text-xs text-emergent-cyan flex items-center gap-1.5 font-medium">
            <Info className="w-3.5 h-3.5" /> Advisory
          </span>
          <span className="text-base font-bold font-mono text-emergent-cyan">{counts.low}</span>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-2.5 rounded-2xl border border-surface-border">
        {/* Border Beam Search Bar (21st.dev @larsen66) */}
        <div className="flex-1 max-w-md">
          <BorderBeamSearch
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anomalies (e.g. bat wings, 3x, drop)..."
            colorVariant="colorful"
            duration={3.1}
            width="100%"
            height={40}
            borderRadius={20}
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'All Severities' },
            { id: 'urgent', label: 'High / Critical' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSeverityFilter(pill.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                severityFilter === pill.id
                  ? 'bg-surface-elevated text-white border border-white/20 shadow-sm'
                  : 'bg-surface-subtle text-gray-400 hover:text-white border border-surface-border'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Alerts Table (Newest First) */}
      {loading && (!alerts || alerts.length === 0) ? (
        <LoadingState message="Auditing ledger for phantom anomalies and demand spikes..." cardCount={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={onRefresh} />
      ) : processedAlerts.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface p-12 text-center shadow-sm max-w-md mx-auto">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-display text-base font-bold text-white">No Strange Anomalies</h3>
          <p className="mt-1 text-xs text-gray-400">
            {search || severityFilter !== 'all'
              ? 'No anomalies match your current search filters.'
              : 'All sales and stock adjustments conform to safe boundaries. The coven is calm.'}
          </p>
          {(search || severityFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setSeverityFilter('all');
              }}
              className="mt-4 px-3 py-1.5 text-xs text-purple-400 hover:text-purple-300 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-surface-border bg-surface-subtle text-gray-400 uppercase tracking-wider text-[10px] font-semibold">
              <tr>
                <th className="px-5 py-3.5">Time</th>
                <th className="px-4 py-3.5">Severity</th>
                <th className="px-4 py-3.5">Anomaly Type</th>
                <th className="px-5 py-3.5">Plain-Language Reason</th>
                <th className="px-4 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border/60">
              {processedAlerts.map((al) => (
                <tr
                  key={al.id}
                  className="hover:bg-surface-subtle/40 transition-colors group"
                >
                  {/* Timestamp */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span className="font-mono text-xs">{formatTime(al.ts)}</span>
                    </div>
                    <span className="text-[10px] text-gray-500 block mt-0.5 font-mono">
                      {new Date(al.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </td>

                  {/* Severity Badge */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {renderSeverityBadge(al.severity)}
                  </td>

                  {/* Anomaly Type */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {renderTypeBadge(al.type)}
                  </td>

                  {/* Plain-Language Reason */}
                  <td className="px-5 py-4 text-gray-200 font-medium">
                    <p className="leading-relaxed">
                      {al.description}
                    </p>
                  </td>

                  {/* Action: Inspect Reagent */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {al.ingredient_id && onInspectIngredient ? (
                      <button
                        onClick={() => onInspectIngredient(al.ingredient_id!)}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-800/40 bg-purple-950/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-900/50 hover:text-white transition-all shadow-sm"
                      >
                        <TrendingUp className="w-3 h-3 text-purple-400" />
                        <span>Inspect</span>
                      </button>
                    ) : (
                      <span className="text-gray-600 text-[11px]">&mdash;</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AlertsView;


import React, { useState } from 'react';
import { RestockItem } from '../../types';
import { useCurse } from '../../context/CurseContext';
import {
  Flame, X, Sparkles, Zap, Calendar, CheckSquare, Square,
  Clock, ShieldAlert, Check
} from 'lucide-react';

interface CurseConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableIngredients: RestockItem[];
  onCurseActivated: () => void;
}

export const CurseConfigDialog: React.FC<CurseConfigDialogProps> = ({
  isOpen,
  onClose,
  availableIngredients,
  onCurseActivated
}) => {
  const { activateCurse } = useCurse();

  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [name, setName] = useState<string>('Midnight Curse');
  const [multiplier, setMultiplier] = useState<number>(3.0);
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(nextWeekStr);
  // Default targeted ingredients: Bat Wings (1), Ghost Pepper (4), Mandrake Root (5) or first 3 items
  const [selectedIds, setSelectedIds] = useState<number[]>([1, 4, 5]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleIngredient = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectCursedTrio = () => {
    const trioNames = ['bat wings', 'ghost pepper', 'mandrake root'];
    const trioIds = availableIngredients
      .filter((it) => trioNames.some((t) => it.ingredient.toLowerCase().includes(t)))
      .map((it) => it.ingredient_id);
    setSelectedIds(trioIds.length > 0 ? trioIds : [1, 4, 5]);
  };

  const selectAll = () => {
    setSelectedIds(availableIngredients.map((it) => it.ingredient_id));
  };

  const clearAll = () => {
    setSelectedIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setErrorMsg('Please select at least one ingredient to target with the curse.');
      return;
    }
    if (multiplier <= 1.0) {
      setErrorMsg('Multiplier must be greater than 1.0x to trigger a demand surge.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);
    try {
      await activateCurse({
        name: name.trim() || 'Midnight Curse',
        multiplier: Number(multiplier),
        ingredient_ids: selectedIds,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined
      });
      onCurseActivated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to summon curse. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-purple-800/60 bg-surface p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-950/80 border border-rose-800/80 text-rose-400 shadow-lg shadow-rose-950/50">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Summon Demand Curse</span>
                <span className="rounded-md bg-purple-900/60 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-700/40">
                  Event Surge
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Simulate catastrophic spikes in potion demand, deplete stockpiles, and test resilience.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-surface-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-rose-900/60 bg-rose-950/30 p-3 text-xs text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Curse Name */}
          <div>
            <label className="block font-semibold text-gray-300 mb-1">
              Curse / Event Title:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Midnight Curse, Blood Moon Conjunction"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          {/* Demand Surge Multiplier */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-gray-300">
                Demand Surge Multiplier:
              </label>
              <span className="font-mono font-bold text-purple-300 text-sm">
                {multiplier.toFixed(1)}x Demand
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[
                { label: '2.0x (Minor Haunt)', val: 2.0 },
                { label: '3.0x (Midnight Curse)', val: 3.0 },
                { label: '5.0x (Cataclysm)', val: 5.0 }
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setMultiplier(p.val)}
                  className={`px-2.5 py-1.5 rounded-lg text-center font-medium transition-all ${
                    multiplier === p.val
                      ? 'bg-purple-900/60 text-purple-200 border border-purple-500/60 shadow-sm'
                      : 'bg-surface-subtle text-gray-400 border border-surface-border hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <input
              type="range"
              min="1.5"
              max="6.0"
              step="0.5"
              value={multiplier}
              onChange={(e) => setMultiplier(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          {/* Date Window */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Start Date:</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>End Date:</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-surface-border bg-surface-subtle p-2.5 text-xs text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Pick Ingredients */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <label className="font-semibold text-gray-300">
                Targeted Reagents ({selectedIds.length} selected):
              </label>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={selectCursedTrio}
                  className="px-2 py-0.5 rounded-md bg-purple-950/60 text-purple-300 border border-purple-800/40 hover:bg-purple-900/60 transition-colors"
                >
                  Cursed Trio
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2 py-0.5 rounded-md bg-surface-subtle text-gray-300 border border-surface-border hover:text-white transition-colors"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-2 py-0.5 rounded-md bg-surface-subtle text-gray-400 border border-surface-border hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Reagents Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl border border-surface-border bg-surface-subtle p-2.5">
              {availableIngredients.map((item) => {
                const isSelected = selectedIds.includes(item.ingredient_id);
                return (
                  <div
                    key={item.ingredient_id}
                    onClick={() => toggleIngredient(item.ingredient_id)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/50 text-white shadow-sm'
                        : 'bg-surface/50 border-surface-border/60 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-xs tracking-tight">
                        {item.ingredient}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500">
                      {item.stock} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-surface-border/60">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-surface-border px-4 py-2.5 text-xs font-medium text-gray-300 hover:bg-surface-subtle transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-rose-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/60 hover:from-purple-500 hover:to-rose-500 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{submitting ? 'Summoning...' : `Summon ${multiplier}x Curse`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CurseConfigDialog;


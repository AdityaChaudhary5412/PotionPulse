import React, { useState } from 'react';
import { Sparkles, CornerDownLeft, Zap, Package, TrendingUp, AlertTriangle, Wand2, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useCurse } from '../../context/CurseContext';

interface EmergentAgentBarProps {
  onNavigateTab: (tab: string) => void;
  onRefreshAll: () => void;
  showToast: (msg: string, isErr?: boolean) => void;
}

export const EmergentAgentBar: React.FC<EmergentAgentBarProps> = ({
  onNavigateTab,
  onRefreshAll,
  showToast,
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { activateCurse, deactivateCurse, isCurseMode } = useCurse();

  const suggestions = [
    { label: 'Simulate 3x Surge', cmd: 'curse 3' },
    { label: 'Check Depletion Threats', cmd: 'critical' },
    { label: 'View ML Prophecy', cmd: 'prophecy' },
    { label: 'Reseed Pantry Ledger', cmd: 'reseed' }
  ];

  const handleCommand = async (inputStr: string) => {
    const raw = inputStr.trim().toLowerCase();
    if (!raw) return;

    setIsProcessing(true);
    setPrompt('');

    try {
      if (raw.includes('reseed') || raw.includes('seed')) {
        await api.system.seed();
        onRefreshAll();
        showToast('Hexley AI reseeded the pantry ledger with verified samples.');
      } else if (raw.includes('curse') || raw.includes('surge') || raw.includes('spike')) {
        if (raw.includes('off') || raw.includes('stop') || raw.includes('dispel')) {
          await deactivateCurse();
          showToast('Hexley AI dispelled active curse. Returned to standard baseline.');
        } else {
          // Extract multiplier if any
          const match = raw.match(/(\d+(\.\d+)?)/);
          const mult = match ? parseFloat(match[1]) : 3.0;
          await activateCurse({
            name: 'Agentic Surge',
            multiplier: mult,
            ingredient_ids: [1, 4, 5],
          });
          showToast(`Hexley AI activated ${mult.toFixed(1)}x demand surge!`);
        }
        onRefreshAll();
      } else if (raw.includes('restock') || raw.includes('add stock')) {
        // Find if user specified an ingredient
        const ingredients = await api.ingredients.list();
        const found = ingredients.find((ing) => raw.includes(ing.name.toLowerCase()));
        if (found) {
          const qtyMatch = raw.match(/(\d+(\.\d+)?)/);
          const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 15;
          await api.stock.adjust(found.id, {
            qty,
            type: 'restock',
            note: 'Hexley AI agent auto-replenishment'
          });
          onRefreshAll();
          showToast(`Agent restocked +${qty} ${found.unit} to ${found.name}.`);
        } else {
          onNavigateTab('inventory');
          showToast('Select an ingredient in the ledger to restock.');
        }
      } else if (raw.includes('sale') || raw.includes('dispense') || raw.includes('brew')) {
        const ingredients = await api.ingredients.list();
        const found = ingredients.find((ing) => raw.includes(ing.name.toLowerCase()));
        if (found) {
          const qtyMatch = raw.match(/(\d+(\.\d+)?)/);
          const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 2;
          await api.sales.record({
            ingredient_id: found.id,
            qty,
            note: 'Hexley AI agent brew order'
          });
          onRefreshAll();
          showToast(`Agent recorded sale of ${qty} ${found.unit} of ${found.name}.`);
        } else {
          onNavigateTab('inventory');
          showToast('Select an ingredient in the ledger to dispense.');
        }
      } else if (raw.includes('threat') || raw.includes('alert') || raw.includes('anomal')) {
        onNavigateTab('anomalies');
        showToast('Switched to Threat & Anomaly Feed.');
      } else if (raw.includes('prophecy') || raw.includes('demand') || raw.includes('forecast') || raw.includes('chart')) {
        onNavigateTab('demand');
        showToast('Switched to LightGBM Demand Prophecy.');
      } else if (raw.includes('ledger') || raw.includes('inventory') || raw.includes('table')) {
        onNavigateTab('inventory');
        showToast('Switched to Pantry Inventory Ledger.');
      } else {
        // Default to overview
        onNavigateTab('dashboard');
        showToast(`Hexley AI parsed instruction: "${inputStr}"`);
      }
    } catch (err: any) {
      showToast(err?.message || 'AI agent could not complete instruction.', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(prompt);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 mb-4">
      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-2 px-1">
        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
          <Wand2 className="w-3 h-3 text-emergent-cyan" />
          Vibe Prompts:
        </span>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleCommand(s.cmd)}
            className="text-[11px] font-medium text-gray-300 hover:text-white bg-surface-subtle hover:bg-surface border border-surface-border px-2.5 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 shrink-0 active:scale-95"
          >
            <span>{s.label}</span>
          </button>
        ))}
      </div>

      {/* Floating Emergent Agent Input Box */}
      <form onSubmit={onSubmit} className="relative flex items-center">
        <div className="relative flex items-center w-full rounded-2xl bg-surface border border-white/10 shadow-2xl p-1.5 focus-within:border-white/30 transition-all">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-emergent-cyan shrink-0 ml-1">
            <Sparkles className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </div>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isProcessing}
            placeholder="Describe an action to Hexley AI (e.g., 'Restock 30 Bat Wings', 'Simulate 3x surge', 'Show anomalies')..."
            className="w-full bg-transparent px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!prompt.trim() || isProcessing}
            className="flex h-8 px-3 items-center justify-center rounded-xl bg-white text-black text-xs font-bold shadow-sm hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-white transition-all shrink-0 mr-1"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmergentAgentBar;

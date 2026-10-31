import React, { useState } from 'react';
import {
  Sparkles, CornerDownLeft, Zap, Package, TrendingUp, AlertTriangle,
  Wand2, CheckCircle2, Bot, ChevronDown, ChevronUp, ArrowRight
} from 'lucide-react';
import api from '../../services/api';
import { AgentCommandResponse } from '../../types';

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
  const [agentTrace, setAgentTrace] = useState<AgentCommandResponse | null>(null);
  const [traceExpanded, setTraceExpanded] = useState<boolean>(true);

  const suggestions = [
    { label: 'Simulate 3x Surge', cmd: 'Simulate 3x surge on Bat Wings and Ghost Pepper' },
    { label: 'Auto-Restock Critical', cmd: 'Restock all critical items' },
    { label: 'Forecast Bat Wings', cmd: 'Forecast demand for Bat Wings' },
    { label: 'Forensic Theft Audit', cmd: 'Scan pantry for anomalies and theft' },
    { label: 'Reseed Demo Ledger', cmd: 'Reseed pantry ledger' }
  ];

  const handleCommand = async (inputStr: string) => {
    const raw = inputStr.trim();
    if (!raw) return;

    setIsProcessing(true);
    setPrompt('');

    try {
      const response = await api.agent.command(raw);
      setAgentTrace(response);
      setTraceExpanded(true);

      if (response.success) {
        showToast(response.result);
        onRefreshAll();

        // Contextual navigation
        if (response.intent === 'audit') {
          onNavigateTab('anomalies');
        } else if (response.intent === 'forecast') {
          onNavigateTab('demand');
        } else if (response.intent === 'restock' || response.intent === 'sale') {
          onNavigateTab('inventory');
        }
      } else {
        showToast(response.result, true);
      }
    } catch (err: any) {
      showToast(err?.message || 'Emergent agent backend communication error.', true);
    } finally {
      setIsProcessing(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCommand(prompt);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 mb-4 space-y-3">
      {/* Emergent Live Agent Trace Drawer */}
      {agentTrace && (
        <div className="emergent-glass-card p-4 text-xs space-y-3 border border-emergent-cyan/30 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emergent-cyan/15 text-emergent-cyan border border-emergent-cyan/30">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  Emergent Agentic Reasoning
                </span>
                <span className="ml-2 font-mono text-[10px] text-emergent-cyan bg-emergent-cyan/10 px-2 py-0.5 rounded-full border border-emergent-cyan/20">
                  {agentTrace.intent.toUpperCase()}
                </span>
              </div>
            </div>

            <button
              onClick={() => setTraceExpanded(!traceExpanded)}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-surface-subtle transition-all"
            >
              {traceExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {traceExpanded && (
            <div className="space-y-2.5 pt-2 border-t border-surface-border">
              {/* Agent Thought */}
              <div className="rounded-xl bg-black/40 p-2.5 border border-white/5 font-mono text-[11px] text-gray-300">
                <span className="text-emergent-cyan font-semibold block mb-0.5">Thought:</span>
                {agentTrace.thought}
              </div>

              {/* Plan & Execution Steps */}
              {agentTrace.plan.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Plan Executed:
                  </span>
                  <ul className="space-y-1">
                    {agentTrace.plan.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-gray-300 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emergent-green shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Real DB Actions Taken */}
              {agentTrace.actions_taken.length > 0 && (
                <div className="rounded-xl bg-surface-subtle p-2.5 border border-surface-border text-[11px]">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">
                    Database Commit:
                  </span>
                  {agentTrace.actions_taken.map((act, idx) => (
                    <div key={idx} className="text-emergent-green font-mono text-[11px]">
                      &gt; {act}
                    </div>
                  ))}
                </div>
              )}

              {/* Result Summary */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-medium text-xs">
                {agentTrace.result}
              </div>

              {/* Follow-up Suggestion Pills */}
              {agentTrace.suggestions.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                  <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider shrink-0">
                    Next:
                  </span>
                  {agentTrace.suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCommand(sug)}
                      className="px-2.5 py-1 rounded-full bg-surface-subtle hover:bg-surface border border-surface-border text-[10px] text-gray-300 hover:text-white transition-all whitespace-nowrap active:scale-95 flex items-center gap-1"
                    >
                      <span>{sug}</span>
                      <ArrowRight className="w-2.5 h-2.5 text-emergent-cyan" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick Suggestion Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1">
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
            placeholder="Describe an action to Hexley AI (e.g., 'Restock 30 Bat Wings', 'Simulate 3x surge', 'Audit for theft')..."
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

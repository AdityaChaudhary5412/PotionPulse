import React, { useState } from 'react';
import { AnimatedShaderHero } from '../ui/animated-shader-hero';
import { ShaderAnimation, DemoOne } from '../ui/shader-animation';
import { ShaderAnimationDemo } from '../ui/shader-animation-demo';
import BorderBeamSearch from '../ui/border-beam-search';
import {
  Sparkles,
  Zap,
  ShieldCheck,
  Flame,
  ArrowRight,
  TrendingUp,
  Cpu,
  Boxes,
  Activity,
  Layers,
  ChevronRight,
  Terminal,
  Waves,
  Eye
} from 'lucide-react';

interface FrontPageProps {
  onEnterApp: () => void;
  onExploreFeatures?: () => void;
  onQuickSearch?: (query: string) => void;
}

export const FrontPage: React.FC<FrontPageProps> = ({
  onEnterApp,
  onExploreFeatures,
  onQuickSearch,
}) => {
  const [shaderMode, setShaderMode] = useState<'caustic' | 'cosmic'>('caustic');

  return (
    <div className="w-full bg-[#07050a] text-white selection:bg-orange-500/30 selection:text-white">
      {/* 1. Sleek Glass Top Navigation */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-10 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-orange-500/20 border border-white/20 shadow-lg">
            <Sparkles className="h-5 w-5 text-emergent-cyan" />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-sans text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              PotionPulse
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-white/10 border border-white/20 text-gray-200">
                2.0
              </span>
            </span>
            <span className="text-[11px] text-gray-400 hidden sm:inline font-mono">
              Autonomous Reagent Engine
            </span>
          </div>
        </div>

        {/* Shader Switcher Pill in Top Bar */}
        <div className="flex items-center gap-1.5 p-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-xl text-xs">
          <button
            type="button"
            onClick={() => setShaderMode('caustic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
              shaderMode === 'caustic'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Caustic Wave Shader</span>
            <span className="sm:hidden">Caustic</span>
          </button>

          <button
            type="button"
            onClick={() => setShaderMode('cosmic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-medium transition-all ${
              shaderMode === 'cosmic'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-bold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
            <span className="hidden sm:inline">Cosmic Filament Hero</span>
            <span className="sm:hidden">Cosmic</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onEnterApp}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-black font-bold text-xs sm:text-sm rounded-full transition-all duration-300 hover:scale-105 active:scale-95 shadow-md shadow-orange-500/20"
          >
            <span>Open Pantry</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* 2. Main Hero Section (Switches dynamically between both templates) */}
      {shaderMode === 'caustic' ? (
        /* @designali-in / shader-animation Fullscreen Hero */
        <div className="relative w-full min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black text-center pt-24 pb-16 px-4">
          <div className="absolute inset-0 z-0">
            <ShaderAnimation speed={1} />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center">
            {/* Trust Badge */}
            <div className="mb-6 inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 backdrop-blur-xl text-xs sm:text-sm text-cyan-200">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>@designali-in / shader-animation template</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)] max-w-4xl leading-tight">
              Shader Animation
            </h1>

            <p className="mt-4 text-base sm:text-xl md:text-2xl text-cyan-100/90 font-light max-w-2xl leading-relaxed drop-shadow-md">
              Concentric caustic ripple caustics & diagonal slatted Venetian blind reflections rendered in real-time WebGL.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 w-full max-w-md">
              <button
                type="button"
                onClick={onEnterApp}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black rounded-full font-bold text-base transition-all duration-300 hover:scale-105 shadow-xl shadow-cyan-500/25"
              >
                Launch Live Pantry
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('demo-one')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-semibold text-base transition-all duration-300 hover:scale-105 backdrop-blur-md"
              >
                View 21st.dev Card
              </button>
            </div>

            {/* Border Beam Search */}
            <div className="w-full max-w-md mx-auto mt-8">
              <BorderBeamSearch
                placeholder="Search reagents, spells, stockout threat..."
                onSubmit={(val) => {
                  if (onQuickSearch) onQuickSearch(val);
                  onEnterApp();
                }}
                colorVariant="colorful"
                duration={3.1}
                width="100%"
                height={44}
                borderRadius={64}
              />
            </div>
          </div>
        </div>
      ) : (
        /* @ravikatiyar162 / animated-shader-hero Cosmic Hero */
        <AnimatedShaderHero
          trustBadge={{
            text: 'Autonomous Witchcraft & Reagent Telemetry',
            icons: ['✨', '🔮', '⚡'],
          }}
          headline={{
            line1: 'Brew Your',
            line2: 'Pantry Into Orbit',
          }}
          subtitle="Supercharge potion resilience with AI-powered depletion prophecy, real-time theft forensics, and instant demand surge simulation — fast, deterministic, and limitless."
          buttons={{
            primary: {
              text: 'Launch Live Pantry',
              onClick: onEnterApp,
            },
            secondary: {
              text: 'Explore Engine Architecture',
              onClick: () => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
              },
            },
          }}
        >
          <div className="w-full max-w-md mx-auto mt-2">
            <BorderBeamSearch
              placeholder="Search spells, bat wings, stockout prophecies..."
              onSubmit={(val) => {
                if (onQuickSearch) onQuickSearch(val);
                onEnterApp();
              }}
              colorVariant="colorful"
              duration={3.1}
              width="100%"
              height={44}
              borderRadius={64}
            />
          </div>
        </AnimatedShaderHero>
      )}

      {/* 3. Exact 21st.dev DemoOne Component Card */}
      <section id="demo-one" className="relative z-20 py-20 px-4 sm:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-mono uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-400/20 px-3 py-1 rounded-full">
            Exact Component Specification
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white mt-3 mb-2 tracking-tight">
            21st.dev / DemoOne Template
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Direct reproduction of the official 21st.dev component card with interactive speed and pause controls.
          </p>
        </div>

        {/* Interactive Showcase Card */}
        <ShaderAnimationDemo
          title="Shader Animation"
          subtitle="WebGL Caustic Slats Effect by Ali Imam"
          className="border-white/20"
        />
      </section>

      {/* 4. Capabilities Grid */}
      <section id="features" className="relative z-20 py-16 px-4 sm:px-12 max-w-7xl mx-auto border-t border-white/10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-400/20 text-orange-300 text-xs font-mono uppercase tracking-widest mb-4">
            <Cpu className="w-3.5 h-3.5" />
            <span>Under The Hood</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            Next-Gen Reagent Intelligence
          </h2>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Engineered with LightGBM predictive models, modified z-score theft forensics, and
            unified full-stack serving from FastAPI to Capacitor mobile APKs.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-cyan-400/40 transition-all duration-300 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 mb-6">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Demand Prophecy</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Multi-model benchmark comparing Seasonal Naive, Moving Average, Exponential Smoothing,
              and LightGBM with 80% and 95% shaded confidence bands.
            </p>
            <div className="text-xs font-mono text-cyan-300/80 flex items-center gap-1.5">
              <span>90-Day Training + 14-Day Horizon</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-yellow-400/40 transition-all duration-300 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 mb-6">
              <Flame className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Strange Happenings</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Real-time anomaly telemetry tracking sudden volume spikes, unexplained negative drops,
              and midnight theft using outlier-resistant Modified Z-Scores.
            </p>
            <div className="text-xs font-mono text-yellow-300/80 flex items-center gap-1.5">
              <span>Median Absolute Deviation (MAD)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/10 hover:border-red-400/40 transition-all duration-300 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-400/30 mb-6">
              <Zap className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Curse Simulation</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              Instantly toggle a 3x demand multiplier across all reagents to simulate dark magic
              hazards, recalculate stockouts in real time, and verify safety stocks.
            </p>
            <div className="text-xs font-mono text-red-400/80 flex items-center gap-1.5">
              <span>Single-Click Global Dispel</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Code Snippet Box */}
        <div id="docs" className="mt-16 p-8 rounded-3xl bg-black/60 border border-white/10 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 border border-orange-400/30">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Full-Stack Unified Execution</h4>
                <p className="text-xs text-gray-400">FastAPI SQLite & Postgres Backend + React SPA + Capacitor</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onEnterApp}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-mono font-semibold transition-all"
            >
              Enter Dashboard →
            </button>
          </div>

          <pre className="font-mono text-xs text-cyan-200/90 overflow-x-auto leading-relaxed p-4 bg-black/40 rounded-2xl border border-white/5">
{`# 1. Start FastAPI Backend & Unified React SPA
uvicorn backend.main:app --port 8000

# 2. Or Run Vite Dev Server with Dynamic API Proxy
npm run dev -- --port 3000

# 3. Hexley Agent Reasoning Pipeline
POST /agent/command {"prompt": "Simulate 3x surge on Bat Wings and audit for theft"}`}
          </pre>
        </div>
      </section>

      {/* 5. Footer */}
      <footer className="border-t border-white/10 py-12 px-6 sm:px-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 PotionPulse. Powered by 21st.dev Shader Animation & Emergent Systems.</p>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-gray-300">Docs</a>
            <a href="https://github.com/AdityaChaudhary5412/PotionPulse" target="_blank" rel="noreferrer" className="hover:text-gray-300">GitHub</a>
            <button type="button" onClick={onEnterApp} className="text-orange-400 hover:text-orange-300 font-semibold">
              Launch App
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default FrontPage;

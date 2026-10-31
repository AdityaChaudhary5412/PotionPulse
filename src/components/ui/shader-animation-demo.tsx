import React, { useState } from 'react';
import { ShaderAnimation } from './shader-animation';
import { Sparkles, Sliders, Play, Pause, RefreshCw } from 'lucide-react';

/**
 * Exact replica of DemoOne from https://21st.dev/@designali-in/components/shader-animation
 * Renders an animated concentric caustic wave effect with large centered typography.
 */
export const ShaderAnimationDemo: React.FC<{
  title?: string;
  subtitle?: string;
  className?: string;
  showControls?: boolean;
}> = ({
  title = 'Shader Animation',
  subtitle,
  className = '',
  showControls = true,
}) => {
  const [speed, setSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  return (
    <div className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl group ${className}`}>
      {/* 21st.dev Shader Animation WebGL Canvas */}
      <div className="relative w-full h-[400px] sm:h-[550px] lg:h-[650px] overflow-hidden">
        <ShaderAnimation speed={isPaused ? 0 : speed} />

        {/* Centered Specular Typography matching 21st.dev @designali-in */}
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-center p-6 text-center">
          <span className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl leading-none font-black tracking-tighter whitespace-pre-wrap text-white drop-shadow-[0_10px_35px_rgba(0,0,0,0.8)] select-none">
            {title}
          </span>
          {subtitle && (
            <p className="mt-4 text-xs sm:text-sm md:text-base font-mono uppercase tracking-widest text-white/80 max-w-lg drop-shadow-md">
              {subtitle}
            </p>
          )}
        </div>

        {/* Interactive Controls Overlay */}
        {showControls && (
          <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between p-3 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-xs text-white">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold"
                title={isPaused ? 'Resume animation' : 'Pause animation'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <div className="hidden sm:flex items-center gap-2">
                <span className="text-gray-400">Speed:</span>
                {[0.5, 1, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSpeed(s);
                      setIsPaused(false);
                    }}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] transition-all ${
                      speed === s && !isPaused
                        ? 'bg-white text-black font-bold'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-400 font-mono">
              <span className="hidden md:inline">@designali-in / 21st.dev</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300">
                WebGL 60FPS
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShaderAnimationDemo;

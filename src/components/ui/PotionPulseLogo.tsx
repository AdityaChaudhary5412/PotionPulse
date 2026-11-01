import React from 'react';

interface PotionPulseLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subtitle?: string;
}

/**
 * PotionPulse Iconic Logo:
 * Features an apothecary potion flask with bubbling magical elixir
 * and a glowing EKG heartline pulse running through its core.
 */
export const PotionPulseLogo: React.FC<PotionPulseLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle = 'Autonomous Pantry'
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', icon: 24, font: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'w-9 h-9', icon: 30, font: 'text-base', sub: 'text-[10px]' },
    lg: { box: 'w-11 h-11', icon: 38, font: 'text-xl', sub: 'text-xs' },
    xl: { box: 'w-14 h-14', icon: 48, font: 'text-2xl', sub: 'text-sm' },
  };

  const current = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Mystical Flask + Pulse Wave Badge */}
      <div className={`relative ${current.box} rounded-2xl bg-gradient-to-br from-purple-900/40 via-[#181424] to-cyan-950/40 border border-purple-500/30 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.25)] group-hover:border-purple-400/60 transition-all flex-shrink-0`}>
        {/* Ambient bioluminescent glow */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-500/20 via-cyan-500/20 to-emerald-500/20 blur-sm pointer-events-none" />

        <svg
          width={current.icon}
          height={current.icon}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10"
        >
          <defs>
            <linearGradient id="potionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C084FC" />
              <stop offset="50%" stopColor="#818CF8" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>
            <linearGradient id="pulseGlow" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#F472B6" />
            </linearGradient>
          </defs>

          {/* Flask Rim / Cork */}
          <rect x="13" y="3" width="6" height="2.5" rx="1" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="0.8" />
          {/* Flask Neck */}
          <path d="M14 5.5V11L11 15C9.5 17 8 20 8 23.5C8 26.5 10.5 29 16 29C21.5 29 24 26.5 24 23.5C24 20 22.5 17 21 11V5.5" stroke="#DDD6FE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Bubbling Potion Liquid Fill */}
          <path d="M10 21C11.5 20.2 13 21.5 16 20.8C19 20.1 20.5 21.2 22 21C23 22 23 23.5 23 24C22.5 26.5 20.5 28 16 28C11.5 28 9.5 26.5 9 24C9 23 9.3 21.8 10 21Z" fill="url(#potionGrad)" fillOpacity="0.45" />

          {/* Bubbles */}
          <circle cx="13" cy="23.5" r="1" fill="#38BDF8" fillOpacity="0.9" />
          <circle cx="18" cy="22" r="1.3" fill="#A78BFA" fillOpacity="0.8" />
          <circle cx="15.5" cy="18" r="0.8" fill="#F472B6" fillOpacity="0.9" />

          {/* The "PULSE" Heartbeat Wave crossing through the flask */}
          <path
            d="M5 20.5H10.5L12 17L14.5 24L17 18L18.5 21.5L20 20.5H27"
            stroke="url(#pulseGlow)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Live status dot */}
        <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0c0a14] animate-pulse shadow-[0_0_8px_#34d399]" />
      </div>

      {/* Brand Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-sans font-extrabold tracking-tight text-white ${current.font} bg-gradient-to-r from-white via-purple-100 to-cyan-200 bg-clip-text text-transparent`}>
              Potion<span className="text-cyan-300">Pulse</span>
            </span>
            <span className="rounded-full bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-purple-300 border border-purple-500/20">
              v2.0
            </span>
          </div>
          {subtitle && (
            <span className={`font-mono text-gray-400 font-normal leading-none ${current.sub}`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PotionPulseLogo;


import React, { useState } from 'react';

export type BorderBeamSize = 'sm' | 'md' | 'line';
export type BorderBeamColorVariant = 'colorful' | 'mono' | 'ocean' | 'sunset';

export interface BorderBeamProps {
  children: React.ReactNode;
  size?: BorderBeamSize;
  colorVariant?: BorderBeamColorVariant;
  duration?: number;
  borderRadius?: number | string;
  strength?: number;
  active?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const COLOR_VARIANTS: Record<BorderBeamColorVariant, string> = {
  colorful:
    'linear-gradient(90deg, transparent 0%, #00F0FF 20%, #A855F7 45%, #EC4899 65%, #EAB308 85%, #10B981 95%, transparent 100%)',
  mono:
    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 25%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0.15) 75%, transparent 100%)',
  ocean:
    'linear-gradient(90deg, transparent 0%, #00d2ff 25%, #3a7bd5 50%, #00f2fe 75%, transparent 100%)',
  sunset:
    'linear-gradient(90deg, transparent 0%, #ff512f 25%, #dd2476 50%, #f09819 75%, transparent 100%)',
};

/**
 * Animated border beam effect component matching 21st.dev @larsen66/components/border-beam-search.
 * Supports the 'line' preset (a bottom-only traveling glow) as well as full border glows.
 */
export const BorderBeam: React.FC<BorderBeamProps> = ({
  children,
  size = 'line',
  colorVariant = 'colorful',
  duration = 3.1,
  borderRadius = 64,
  strength = 1,
  active = true,
  className = '',
  style = {},
}) => {
  const gradient = COLOR_VARIANTS[colorVariant] || COLOR_VARIANTS.colorful;

  return (
    <div
      className={`relative inline-block w-full max-w-full ${className}`}
      style={{
        borderRadius,
        ...style,
      }}
      data-beam="true"
      data-size={size}
      data-active={active}
    >
      {/* Wrapped Content (e.g. SearchBar) */}
      {children}

      {/* Active Line Preset: Bottom-Only Traveling Edge Glow */}
      {active && size === 'line' && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius }}
          aria-hidden="true"
        >
          {/* Ambient Bloom / Diffuse Glow Layer */}
          <div
            data-beam-bloom=""
            className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none"
            style={{ opacity: 0.85 * strength }}
          >
            <div
              className="absolute -bottom-1 h-6 w-36 sm:w-44 rounded-full"
              style={{
                background: gradient,
                filter: 'blur(10px)',
                animation: `border-beam-line ${duration}s infinite linear`,
              }}
            />
          </div>

          {/* Crisp, Sharp Border Trace Line */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[1.5px] overflow-hidden pointer-events-none"
            style={{ opacity: 0.95 * strength }}
          >
            <div
              className="absolute bottom-0 h-full w-32 sm:w-40"
              style={{
                background: gradient,
                filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.7))',
                animation: `border-beam-line ${duration}s infinite linear`,
              }}
            />
          </div>
        </div>
      )}

      {/* Full Border Trace for size="md" or size="sm" */}
      {active && (size === 'md' || size === 'sm') && (
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-[-100%] m-auto aspect-square"
            style={{
              background: `conic-gradient(from 0deg, transparent 0deg, transparent 270deg, #00F0FF 320deg, #EC4899 350deg, transparent 360deg)`,
              animation: `border-beam-rotate ${duration}s infinite linear`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export function SearchIcon({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ opacity: 0.4, flexShrink: 0, ...style }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export interface BorderBeamSearchProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  colorVariant?: BorderBeamColorVariant;
  duration?: number;
  width?: number | string;
  height?: number;
  borderRadius?: number;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Exact replica of the search bar from https://21st.dev/@larsen66/components/border-beam-search
 * Built with rounded obsidian card, inner shadow bevel, 20px SVG search icon,
 * and the animated bottom-edge border beam.
 */
export const BorderBeamSearch: React.FC<BorderBeamSearchProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search',
  colorVariant = 'colorful',
  duration = 3.1,
  width = 366,
  height = 42,
  borderRadius = 64,
  autoFocus = false,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState('');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.(currentValue);
    }
  };

  return (
    <BorderBeam
      size="line"
      colorVariant={colorVariant}
      duration={duration}
      borderRadius={borderRadius}
      className={className}
      style={{ width: typeof width === 'number' ? `${width}px` : width, maxWidth: '100%' }}
    >
      <div
        style={{
          width: '100%',
          height,
          borderRadius,
          overflow: 'hidden',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius,
            background: '#1d1d1d',
            boxShadow:
              'inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 13px',
            gap: 10,
            color: '#565656',
          }}
        >
          <SearchIcon />
          <input
            type="text"
            value={currentValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            style={{
              fontSize: 15,
              lineHeight: '18px',
              color: '#d4d4d8',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              width: '100%',
              fontFamily: 'inherit',
            }}
            className="placeholder-[#565656] focus:placeholder-gray-500"
          />
        </div>
      </div>
    </BorderBeam>
  );
};

export default BorderBeamSearch;


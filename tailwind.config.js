/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Emergent Dark Canvas System
        background: '#0d0d0f', // deep obsidian canvas (#111111 / #0d0d0f)
        surface: {
          DEFAULT: '#141417',   // card base
          subtle: '#1a1a1f',    // hover / active controls
          border: '#27272e',    // subtle glass border
          borderLight: '#3a3a45',
          elevated: '#1f1f26'
        },
        // Emergent Signature Neon Accents
        emergent: {
          cyan: '#80FFF9',      // #80FFF9 electric cyan
          green: '#81FF89',     // #81FF89 neon lime green
          greenVibrant: '#00FF37',
          blue: '#1759FF',      // #1759FF cobalt blue
          purple: '#9B51E0'
        },
        accent: {
          DEFAULT: '#80FFF9',   // Emergent Electric Cyan
          hover: '#66e6df',
          light: '#b3fffc',
          glow: 'rgba(128, 255, 249, 0.25)'
        },
        // Universal Status Colors aligned to Emergent contrast standards
        status: {
          safe: {
            DEFAULT: '#81FF89', // Emergent Neon Green
            bg: 'rgba(129, 255, 137, 0.12)',
            border: 'rgba(129, 255, 137, 0.35)',
            text: '#81FF89'
          },
          low: {
            DEFAULT: '#FFB340', // Emergent Neon Amber
            bg: 'rgba(255, 179, 64, 0.12)',
            border: 'rgba(255, 179, 64, 0.35)',
            text: '#FFB340'
          },
          critical: {
            DEFAULT: '#FF453A', // Emergent Neon Red
            bg: 'rgba(255, 69, 58, 0.15)',
            border: 'rgba(255, 69, 58, 0.4)',
            text: '#FF5E54'
          }
        }
      },
      borderRadius: {
        'emergent': '20px',
        'emergent-lg': '24px',
        'emergent-sm': '14px',
      },
      boxShadow: {
        'emergent-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.06)',
        'emergent-glow-green': '0 0 25px -4px rgba(129, 255, 137, 0.35)',
        'emergent-glow-cyan': '0 0 25px -4px rgba(128, 255, 249, 0.35)',
        'emergent-glow-blue': '0 0 25px -4px rgba(23, 89, 255, 0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      }
    },
  },
  plugins: [],
}

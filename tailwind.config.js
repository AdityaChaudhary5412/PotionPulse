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
        background: '#0c0e14',
        surface: {
          DEFAULT: '#141721',
          subtle: '#1a1f2c',
          border: '#262d3d'
        },
        accent: {
          DEFAULT: '#8b5cf6', // Mystical Violet / Hexley Amethyst
          hover: '#7c3aed',
          light: '#a78bfa',
          glow: 'rgba(139, 92, 246, 0.25)'
        },
        // Universal Status Colors defined once
        status: {
          safe: {
            DEFAULT: '#10b981', // Green
            bg: 'rgba(16, 185, 129, 0.12)',
            border: '#059669',
            text: '#34d399'
          },
          low: {
            DEFAULT: '#f59e0b', // Orange / Amber
            bg: 'rgba(245, 158, 11, 0.12)',
            border: '#d97706',
            text: '#fbbf24'
          },
          critical: {
            DEFAULT: '#ef4444', // Red
            bg: 'rgba(239, 68, 68, 0.15)',
            border: '#dc2626',
            text: '#f87171'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Cinzel Decorative', 'serif']
      }
    },
  },
  plugins: [],
}

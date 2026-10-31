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
        obsidian: "#0B0F19",
        neonPurple: "#9333EA",
        emeraldGreen: "#10B981",
        amberWarning: "#F59E0B",
        bloodCrimson: "#EF4444"
      }
    },
  },
  plugins: [],
}


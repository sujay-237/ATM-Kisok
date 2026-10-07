/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        atm: {
          bg: "#0B0F19",
          surface: "#111827",
          card: "#1F2937",
          border: "#374151",
          primary: "#10B981", // Emerald cybersecurity primary
          primaryGlow: "#059669",
          secondary: "#3B82F6",
          accent: "#8B5CF6",
          warning: "#F59E0B",
          danger: "#EF4444",
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scanLine 2.5s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.6))' },
          '50%': { opacity: '.6', filter: 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.2))' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '50%': { top: '95%' },
          '100%': { top: '0%' },
        }
      }
    },
  },
  plugins: [],
}

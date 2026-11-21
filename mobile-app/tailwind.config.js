/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F2EB',
        ivory: '#FCFBF8',
        hairline: '#E6E0D4',
        forest: {
          DEFAULT: '#102A22',
          900: '#0C201A',
          800: '#102A22',
          700: '#193D32',
          600: '#235243',
        },
        gold: {
          DEFAULT: '#B5935A',
          light: '#C8A870',
          dark: '#96763E',
          tint: '#F4EFE4',
          border: '#E2D4BC',
        },
        ink: {
          DEFAULT: '#171715',
          espresso: '#171715',
          taupe: '#666156',
          stone: '#9A9386',
          muted: '#B8B2A6',
        },
        bank: {
          emerald: '#155E43',
          emeraldTint: '#EBF5F0',
          emeraldBorder: '#C2E2D3',
          ochre: '#9A6700',
          ochreTint: '#FDF6E7',
          ochreBorder: '#F5DEB3',
          bordeaux: '#9F1239',
          bordeauxTint: '#FDF2F4',
          bordeauxBorder: '#F8CBD4',
        },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        'micro': '0.14em',
        'loose-editorial': '0.08em',
      },
      boxShadow: {
        'luxury': '0 12px 32px -12px rgba(24, 34, 28, 0.08)',
        'luxury-hover': '0 18px 40px -12px rgba(24, 34, 28, 0.12)',
        'forest-sheen': '0 16px 36px -12px rgba(16, 42, 34, 0.28)',
      },
    },
  },
  plugins: [],
}

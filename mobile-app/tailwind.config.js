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
        mobile: {
          bg: "#0B0F19",
          card: "#131B2E",
          surface: "#1A243D",
          primary: "#10B981",
          secondary: "#3B82F6",
        }
      }
    },
  },
  plugins: [],
}

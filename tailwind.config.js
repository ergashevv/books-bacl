/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8f5e9',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#34A853', // Figma Primary Green
          600: '#2e7d32',
          700: '#1b5e20',
          DEFAULT: "#34A853",
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        background: {
          light: "#F5F5F5", // Figma Background
          dark: "#121212",
        },
        surface: {
          light: "#FFFFFF",
          dark: "#1E1E1E",
        }
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px', // Standard radius from Figma
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      fontFamily: {
        sans: ["System", "sans-serif"],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(0, 0, 0, 0.05)',
        'medium': '0 4px 20px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}



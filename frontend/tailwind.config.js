/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#0f3460',
          600: '#0d2b4d',
          700: '#0a233a',
          800: '#081b28',
          900: '#051315',
        },
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#ffc107',
          600: '#f59e0b',
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
        accent: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        train: {
          blue: '#0f3460',
          gold: '#ffc107',
          green: '#10b981',
          red: '#ef4444',
        }
      },
      animation: {
        'train-move': 'train-move 2s ease-in-out',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        'train-move': {
          '0%': { transform: 'translateX(0) scale(1)' },
          '50%': { transform: 'translateX(10px) scale(1.1)' },
          '100%': { transform: 'translateX(0) scale(1)' },
        }
      }
    },
  },
  plugins: [],
}

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
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        train: {
          blue: '#1e40af',
          red: '#dc2626',
          green: '#059669',
          yellow: '#d97706',
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

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your primary brand colors - used across all themes
        primary: {
          50: '#f0f4ff',
          100: '#e6ecff',
          200: '#c7d4ff',
          300: '#a8bcff',
          400: '#6a8cff',
          500: '#0f3460',  // Your main brand color
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
          500: '#ffc107',  // Your main secondary color
          600: '#f59e0b',
          700: '#d97706',
          800: '#b45309',
          900: '#92400e',
        },
        accent: {
          50: '#fcfcfc',
          100: '#f8f8f8',  // Your main accent color
          200: '#f0f0f0',
          300: '#e8e8e8',
          400: '#d0d0d0',
          500: '#a8a8a8',
          600: '#808080',
          700: '#585858',
          800: '#303030',
          900: '#181818',
        },
        // Brand gradient combinations for enhanced theming
        brand: {
          'primary-to-secondary': 'linear-gradient(135deg, #0f3460 0%, #ffc107 100%)',
          'secondary-to-accent': 'linear-gradient(135deg, #ffc107 0%, #f8f8f8 100%)',
          'primary-to-accent': 'linear-gradient(135deg, #0f3460 0%, #f8f8f8 100%)',
        },
        // Theme-specific color variations based on your base colors
        trains: {
          primary: '#0f3460',    // Your base dark blue - Railway steel
          secondary: '#ffc107',  // Your base golden - Train lights
          accent: '#f8f8f8',     // Your base light gray - Steam/smoke
        },
        planes: {
          primary: '#1e40af',    // Sky blue variation of your dark blue
          secondary: '#f59e0b',  // Sunset amber variation of your golden
          accent: '#e2e8f0',     // Cloud variation of your light gray
        },
        sailboat: {
          primary: '#0891b2',    // Ocean cyan variation of your dark blue
          secondary: '#ea580c',  // Sunset orange variation of your golden
          accent: '#dbeafe',     // Foam/sail variation of your light gray
        },
        cars: {
          primary: '#374151',    // Asphalt gray variation of your dark blue
          secondary: '#eab308',  // Traffic light variation of your golden
          accent: '#f3f4f6',     // Concrete variation of your light gray
        },
        f1: {
          primary: '#dc2626',    // Racing red variation of your dark blue
          secondary: '#fbbf24',  // Racing flag variation of your golden
          accent: '#f4f4f5',     // Track variation of your light gray
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

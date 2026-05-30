/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Emergency Colors
        'emergency-red': {
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#f83b3b',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        'emergency-orange': {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
        'safe-green': {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        'medical-blue': {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // Dark backgrounds
        'dark': {
          900: '#0a0a0f',
          800: '#0f0f1a',
          700: '#141428',
          600: '#1a1a35',
          500: '#1e1e40',
        },
        // Glass
        'glass': {
          white: 'rgba(255, 255, 255, 0.05)',
          red: 'rgba(220, 38, 38, 0.1)',
          blue: 'rgba(59, 130, 246, 0.1)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        emergency: ['Rajdhani', 'Impact', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'pulse-ring-slow': 'pulse-ring 3s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
        'sos-glow': 'sos-glow 1.5s ease-in-out infinite alternate',
        'ambulance-move': 'ambulance-move 2s linear infinite',
        'emergency-shimmer': 'emergency-shimmer 2s linear infinite',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        'sos-glow': {
          '0%': { boxShadow: '0 0 20px rgba(220, 38, 38, 0.5), 0 0 40px rgba(220, 38, 38, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(220, 38, 38, 0.9), 0 0 80px rgba(220, 38, 38, 0.6), 0 0 120px rgba(220, 38, 38, 0.3)' },
        },
        'ambulance-move': {
          '0%, 100%': { transform: 'translateX(-4px)' },
          '50%': { transform: 'translateX(4px)' },
        },
        'emergency-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'emergency': '0 0 30px rgba(220, 38, 38, 0.4)',
        'emergency-lg': '0 0 60px rgba(220, 38, 38, 0.6)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'glass-lg': '0 16px 48px rgba(0, 0, 0, 0.6)',
        'medical': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
      backgroundImage: {
        'emergency-gradient': 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a35 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'medical-gradient': 'linear-gradient(135deg, #1d4ed8 0%, #0f172a 100%)',
        'safe-gradient': 'linear-gradient(135deg, #16a34a 0%, #052e16 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        'tokyo-bg': '#1a1b26',
        'tokyo-storm': '#1f2335',
        'tokyo-accent': '#7dcfff',
        'tokyo-accent-2': '#bb9af7',
        'tokyo-dark': '#16161e',
        'tokyo-light': '#c0caf5',
        'tokyo-green': '#9ece6a',
        'tokyo-yellow': '#e0af68',
        'tokyo-red': '#f7768e',
        'tokyo-cyan': '#7dcfff',
        'cyber-bg': '#1a1b26',
        'cyber-accent': '#7dcfff',
        'cyber-accent-2': '#bb9af7',
        'cyber-dark': '#16161e',
        'cyber-light': '#c0caf5',
        'cyber-muted': '#565f89',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'scale-in': 'scale-in 0.35s ease-out forwards',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2.5s ease-in-out infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%, 100%': { backgroundPosition: '200% 0' },
          '50%': { backgroundPosition: '-200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px -4px rgba(125, 207, 255, 0.3), 0 0 40px -8px rgba(187, 154, 247, 0.2)' },
          '50%': { opacity: '0.95', boxShadow: '0 0 28px -2px rgba(125, 207, 255, 0.45), 0 0 56px -4px rgba(187, 154, 247, 0.3)' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(125, 207, 255, 0.35)', boxShadow: '0 0 12px -2px rgba(125, 207, 255, 0.2)' },
          '50%': { borderColor: 'rgba(187, 154, 247, 0.5)', boxShadow: '0 0 16px -2px rgba(187, 154, 247, 0.35)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(125, 207, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(187, 154, 247, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(125, 207, 255, 0.05) 0px, transparent 50%)',
        'mesh-gradient-strong': 'radial-gradient(at 30% 10%, rgba(125, 207, 255, 0.12) 0px, transparent 45%), radial-gradient(at 85% 5%, rgba(187, 154, 247, 0.1) 0px, transparent 45%), radial-gradient(at 10% 60%, rgba(125, 207, 255, 0.06) 0px, transparent 50%)',
      },
      boxShadow: {
        'glow': '0 0 24px -4px rgba(125, 207, 255, 0.25), 0 0 48px -12px rgba(187, 154, 247, 0.15)',
        'glow-lg': '0 0 40px -8px rgba(125, 207, 255, 0.3), 0 0 80px -16px rgba(187, 154, 247, 0.2)',
        'inner-glow': 'inset 0 0 24px -8px rgba(125, 207, 255, 0.15)',
        'neon-cyan': '0 0 5px rgba(125, 207, 255, 0.8), 0 0 20px rgba(125, 207, 255, 0.4)',
        'neon-purple': '0 0 5px rgba(187, 154, 247, 0.8), 0 0 20px rgba(187, 154, 247, 0.4)',
        'neon-green': '0 0 5px rgba(158, 206, 106, 0.8), 0 0 20px rgba(158, 206, 106, 0.4)',
      },
      dropShadow: {
        'neon-cyan': '0 0 8px rgba(125, 207, 255, 0.5)',
        'neon-purple': '0 0 8px rgba(187, 154, 247, 0.5)',
      },
    },
  },
  plugins: [],
}

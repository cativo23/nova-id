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
        'tokyo-accent': '#7dcfff',
        'tokyo-accent-2': '#bb9af7',
        'tokyo-dark': '#16161e',
        'tokyo-light': '#c0caf5',
        'cyber-bg': '#1a1b26',
        'cyber-accent': '#7dcfff',
        'cyber-dark': '#16161e',
        'cyber-light': '#c0caf5',
        surface: {
          DEFAULT: '#1a1b26',
          raised: '#21222e',
          overlay: '#252633',
          sunken: '#16161e',
        },
      },
      borderRadius: {
        'card': '12px',
        'panel': '10px',
        'input': '8px',
        'badge': '6px',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
        'glow': '0 0 24px -4px rgba(125, 207, 255, 0.25), 0 0 48px -12px rgba(187, 154, 247, 0.15)',
      },
      backgroundImage: {
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(125, 207, 255, 0.08) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(187, 154, 247, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(125, 207, 255, 0.05) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in-up': { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      spacing: {
        'header': '56px',
      },
    },
  },
  plugins: [],
}

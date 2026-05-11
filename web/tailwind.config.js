/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      keyframes: {
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-halo': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.55)' },
          '50%': { boxShadow: '0 0 0 14px rgba(245, 158, 11, 0)' },
        },
        'caret-blink': {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
        'bar-1': { '0%, 100%': { height: '18%' }, '50%': { height: '42%' } },
        'bar-2': { '0%, 100%': { height: '28%' }, '50%': { height: '14%' } },
        'bar-3': { '0%, 100%': { height: '22%' }, '50%': { height: '52%' } },
        'bar-4': { '0%, 100%': { height: '36%' }, '50%': { height: '18%' } },
        'bar-5': { '0%, 100%': { height: '14%' }, '50%': { height: '34%' } },
        'bar-6': { '0%, 100%': { height: '46%' }, '50%': { height: '24%' } },
        'halo-soft': {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.55' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      animation: {
        'spin-slow': 'spin-slow 8s linear infinite',
        'pulse-halo': 'pulse-halo 2.4s ease-out infinite',
        'caret-blink': 'caret-blink 1s steps(1) infinite',
        'bar-1': 'bar-1 1.2s ease-in-out infinite',
        'bar-2': 'bar-2 1.6s ease-in-out infinite',
        'bar-3': 'bar-3 1.4s ease-in-out infinite',
        'bar-4': 'bar-4 1.8s ease-in-out infinite',
        'bar-5': 'bar-5 1.3s ease-in-out infinite',
        'bar-6': 'bar-6 1.7s ease-in-out infinite',
        'halo-soft': 'halo-soft 3s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
      },
    },
  },
  plugins: [],
};

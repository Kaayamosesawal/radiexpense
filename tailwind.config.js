/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand tokens — mapped to real hex so Tailwind classes always work ──
        'app-bg':       '#FDF8F5',
        'app-accent':   '#FF9800',   // radi-orange
        'app-dark':     '#111111',   // radi-dark
        'app-card-dark':'#111111',   // alias
        'app-text':     '#111111',   // alias
        'radi-orange':  '#FF9800',
        'radi-dark':    '#111111',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // ── Compact, professional type scale ──
        // Replaces the oversized fluid clamp values
        'xxs':  ['0.65rem',  { lineHeight: '1rem' }],
        'xs':   ['0.75rem',  { lineHeight: '1.125rem' }],
        'sm':   ['0.8125rem',{ lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.5rem' }],
        'md':   ['0.9375rem',{ lineHeight: '1.5rem' }],
        'lg':   ['1rem',     { lineHeight: '1.5rem' }],
        'xl':   ['1.0625rem',{ lineHeight: '1.5rem' }],
        '2xl':  ['1.125rem', { lineHeight: '1.5rem' }],
        '3xl':  ['1.25rem',  { lineHeight: '1.375rem' }],
        '4xl':  ['1.5rem',   { lineHeight: '1.25rem' }],
        '5xl':  ['1.75rem',  { lineHeight: '1.2rem' }],
        '6xl':  ['2rem',     { lineHeight: '1.15rem' }],
        '7xl':  ['2.25rem',  { lineHeight: '1.1rem' }],
      },
      boxShadow: {
        'soft':    '0 20px 50px rgba(0, 0, 0, 0.05)',
        'premium': '0 10px 40px -10px rgba(0, 0, 0, 0.08)',
        'orange':  '0 8px 20px rgba(255, 152, 0, 0.25)',
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '3rem',
      },
      animation: {
        'in': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}
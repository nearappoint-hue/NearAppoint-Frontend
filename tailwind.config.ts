import type { Config } from 'tailwindcss';

/**
 * NearAppoint design tokens.
 *
 * These are the ONLY colours in the product. If a hex code appears in a
 * component, that is a bug — it means a screen has drifted from the system and
 * screen #30 will not match screen #1.
 */
export default {
  darkMode: ['class'],   // tokens support it. We do not ship it. (Decision: cut.)
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1140px' } },
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F97316',
          hover:   '#EA680C',
          light:   '#FB923C',
          tint:    '#FFF0E6',
          tint2:   '#FFF7F1',
        },
        navy: {
          DEFAULT: '#0F2140',
          soft:    '#16294B',
          line:    '#1E355C',
        },

        /**
         * BUSINESS OS SHELL — taken from the design, sampled from the pixels.
         *
         * The sidebar is a slate-navy (#394763), NOT the marketing navy
         * (#0F2140). Two different surfaces for two different jobs: the
         * marketing site is a brochure, the dashboard is a tool she stares at
         * for eight hours. The slate is softer and doesn't fight the content.
         */
        shell: {
          DEFAULT: '#2E3132',   // sidebar — charcoal, sampled from the design
          hover:   '#3A3E3F',
          active:  '#3A3E3F',
          border:  '#454949',
          muted:   '#B4B7B8',   // sidebar text, inactive
        },
        ink:   '#16243E',
        muted: '#64748B',
        faint: '#94A3B8',
        warm:  '#FFF9F4',
        soft:  '#F8F9FB',
        line:  '#ECEFF3',
        line2: '#E2E6EC',
        // functional — used ONLY for state, never decoration
        ok:    '#0EA47A',
        warn:  '#F59E0B',
        bad:   '#DC2626',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans:    ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { sm: '10px', DEFAULT: '14px', lg: '20px', xl: '26px' },
      boxShadow: {
        sm: '0 1px 2px rgba(15,33,64,.05), 0 2px 6px rgba(15,33,64,.04)',
        DEFAULT: '0 4px 12px rgba(15,33,64,.06), 0 12px 32px rgba(15,33,64,.06)',
        lg: '0 12px 28px rgba(15,33,64,.10), 0 32px 72px rgba(15,33,64,.12)',
        brand: '0 6px 18px rgba(249,115,22,.28)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        bob:              { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-7px)' } },
        shake:            { '0%,100%': { transform: 'translateX(0)' }, '20%,60%': { transform: 'translateX(-6px)' }, '40%,80%': { transform: 'translateX(6px)' } },
      },
      animation: {
        'accordion-down': 'accordion-down .25s ease-out',
        'accordion-up':   'accordion-up .25s ease-out',
        bob:              'bob 4.5s ease-in-out infinite',
        shake:            'shake .38s ease',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

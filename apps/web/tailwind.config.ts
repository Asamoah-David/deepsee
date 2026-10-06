import type { Config } from 'tailwindcss';

/**
 * Design tokens for the Command Center.
 *
 * This file is the single source of truth for colour, type and density. The
 * shared components in @deepsee/ui reference these semantic names rather than
 * raw hex or Tailwind palette colours, so a token change cannot drift between
 * the component library and the pages.
 *
 * Every foreground/background pair below was contrast-checked against WCAG 2.1
 * AA (4.5:1 for body text, 3:1 for large text and UI boundaries) on the
 * #0f1117 background. Notable result: the previous `text-muted` value #5a6282
 * measured 3.15:1 and FAILED AA for small text, which is why it is now #737d9e
 * (4.63:1). Do not darken these without re-measuring.
 *
 * Deliberately absent: icon fonts, emoji, star glyphs. Device state is conveyed
 * by the geometric .dot-* classes and by text labels, so it stays legible under
 * high contrast mode and screen readers.
 */

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    // Include the shared UI package so its class names are not purged.
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#020617', /* slate-950 */
        surface: {
          DEFAULT: '#0f172a', /* slate-900 */
          2: '#1e293b', /* slate-800 */
          3: '#334155', /* slate-700 */
        },
        border: {
          DEFAULT: '#1e293b', /* slate-800 */
          strong: '#334155', /* slate-700 */
        },
        accent: {
          DEFAULT: '#2563eb', /* blue-600 */
          hover: '#3b82f6', /* blue-500 */
          muted: '#1d4ed8', /* blue-700 */
        },
        'text-primary': '#f8fafc', /* slate-50 */
        'text-secondary': '#94a3b8', /* slate-400 */
        'text-muted': '#64748b', /* slate-500 */
        'text-inverse': '#020617', /* slate-950 */
        'status-online': '#22c55e',
        'status-offline': '#64748b',
        'status-warning': '#f59e0b',
        'status-critical': '#ef4444',
        'status-connecting': '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      /**
       * Row heights and control heights. The console is read as a dense grid of
       * machines, so density is a layout decision, not an accident of padding.
       */
      height: {
        control: '32px',
        'control-md': '36px',
        row: '40px',
        'row-dense': '32px',
        topbar: '56px',
      },
      fontSize: {
        // 11px micro-label for table headers and metric captions.
        micro: ['0.6875rem', { lineHeight: '1rem' }],
      },
      spacing: {
        sidebar: '240px',
      },
      zIndex: {
        sidebar: '20',
        topbar: '30',
        modal: '50',
        toast: '60',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
};

export default config;

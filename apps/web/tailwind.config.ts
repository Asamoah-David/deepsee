import type { Config } from 'tailwindcss';

/**
 * Design tokens for the Command Center.
 *
 * This file is the single source of truth for colour, type and density. The
 * shared components in @deepsee/ui reference these semantic names rather than
 * raw hex or Tailwind palette colours, so a token change cannot drift between
 * the component library and the pages.
 *
 * The Command Center uses cool neutral surfaces, deep navy navigation and a
 * single blue action color. Keep page surfaces and status colors consistent
 * with the CSS variables in src/app/globals.css.
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
        background: '#f5f7fa',
        surface: {
          DEFAULT: '#ffffff',
          2: '#f8fafc',
          3: '#eef2f7',
        },
        border: {
          DEFAULT: '#e4e9f0',
          strong: '#d8e0ea',
        },
        accent: {
          DEFAULT: '#315fe8',
          hover: '#254fc9',
          muted: '#edf2ff',
        },
        'text-primary': '#172033',
        'text-secondary': '#526078',
        'text-muted': '#758198',
        'text-inverse': '#ffffff',
        'status-online': '#15805d',
        'status-offline': '#758198',
        'status-warning': '#ad6b12',
        'status-critical': '#bd3c43',
        'status-connecting': '#315fe8',
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

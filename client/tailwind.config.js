/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Deep indigo — primary institutional colour, echoes the ledger-blue
        // used on registry stamps and gazette covers.
        register: {
          50: '#eef2f7',
          100: '#d3dde9',
          200: '#a7bbd3',
          300: '#7a98bd',
          400: '#4d76a7',
          500: '#2c5583',
          600: '#1c3d63',
          700: '#152f4d',
          800: '#0f2238',
          900: '#0a1826',
        },
        // Saffron — used sparingly, for the single primary action per screen.
        saffron: {
          50: '#fdf3e7',
          100: '#faE1c1',
          300: '#eeab5c',
          500: '#d9822f',
          600: '#b96a22',
          700: '#93531b',
        },
        // Functional greens/ambers/reds for status & confidence — kept
        // distinct from the saffron accent so status never competes with CTAs.
        field: {
          green: '#1f7a4d',
          greenBg: '#e6f3ec',
          amber: '#a86a10',
          amberBg: '#fbf0dd',
          red: '#b3261e',
          redBg: '#fbe9e8',
        },
        paper: {
          DEFAULT: '#f4f6f8',
          raised: '#ffffff',
          line: '#dbe2e8',
        },
        ink: {
          DEFAULT: '#161a1f',
          soft: '#4b5563',
          faint: '#7c8794',
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', '"IBM Plex Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '4px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10, 24, 38, 0.06), 0 1px 0 rgba(10, 24, 38, 0.04)',
      },
    },
  },
  plugins: [],
};

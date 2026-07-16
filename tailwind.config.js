/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0F1611',
          900: '#151F18',
          800: '#1D2B22',
          700: '#28392E',
          600: '#3A4E40',
        },
        parchment: {
          50: '#FBF9F4',
          100: '#F5F1E6',
          200: '#EAE3D0',
        },
        yolk: {
          400: '#F2B84B',
          500: '#E6A22E',
          600: '#C4841D',
          700: '#96631A',
        },
        clay: {
          500: '#B5562F',
          600: '#96432A',
        },
        moss: {
          400: '#6E9469',
          500: '#4F7A4A',
          600: '#3C5F39',
        },
        signal: {
          red: '#C1442C',
          amber: '#D99A2B',
          green: '#4F7A4A',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 2px rgba(15, 22, 17, 0.06), 0 8px 24px -8px rgba(15, 22, 17, 0.12)',
      },
      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
}

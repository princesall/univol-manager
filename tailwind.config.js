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
          /** Variante assombrie, pour l'état survolé du bouton danger. */
          redDark: '#A6371F',
          amber: '#D99A2B',
          green: '#4F7A4A',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },

      /**
       * Échelle typographique.
       *
       * `2xs` (11 px) remplace les valeurs arbitraires `text-[10px]` et
       * `text-[11px]` qui coexistaient dans les pages. Rien ne descend
       * désormais sous 11 px : à 10 px, le texte devient illisible sur un
       * écran de bureau ordinaire, et c'était le cas.
       *
       * La hauteur de ligne est fixée ici plutôt que devinée dans chaque
       * composant : c'est ce qui donne un rythme vertical régulier d'une page
       * à l'autre.
       */
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1.05rem' }],
      },

      /**
       * Trois niveaux de profondeur au lieu d'un seul.
       *   xs      → éléments posés (boutons, badges)
       *   panel   → cartes et panneaux
       *   overlay → fenêtres modales, qui doivent dominer le reste
       */
      boxShadow: {
        xs: '0 1px 2px rgba(15, 22, 17, 0.05)',
        panel: '0 1px 2px rgba(15, 22, 17, 0.06), 0 8px 24px -8px rgba(15, 22, 17, 0.12)',
        overlay: '0 2px 8px rgba(15, 22, 17, 0.08), 0 24px 48px -12px rgba(15, 22, 17, 0.28)',
      },

      /** Courbe d'apaisement unique, pour des transitions homogènes. */
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },

      borderRadius: {
        xl2: '1.1rem',
      },
    },
  },
  plugins: [],
}

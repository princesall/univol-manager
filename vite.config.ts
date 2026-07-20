import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'
import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

export default defineConfig({
  base: './',
  define: {
    // Version affichée sur l'écran de connexion (preuve visuelle d'update).
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'UniVol Manager',
        short_name: 'UniVol',
        description: 'Gestion de couvoir et de poulailler — UniVol Mali',
        theme_color: '#151F18',
        background_color: '#FBF9F4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache l'app shell pour un fonctionnement hors ligne — cohérent
        // avec l'architecture offline-first (IndexedDB) déjà en place.
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
        // Le module d'export Word (docx) est volumineux et rarement
        // utilisé : on ne le précharge pas à l'installation, il sera
        // simplement téléchargé (et mis en cache HTTP normal) au moment
        // où l'utilisateur clique réellement sur "Exporter en Word".
        globIgnores: ['**/wordReport-*.js'],
        // Applique une nouvelle version dès qu'elle est disponible, sans
        // attendre que TOUS les onglets soient fermés — sinon une page
        // nouvellement ajoutée peut sembler "vide" le temps que l'ancien
        // service worker soit remplacé.
        skipWaiting: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

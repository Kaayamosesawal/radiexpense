import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'RadiExpense Uganda',
        short_name: 'RadiExpense',
        description: 'Premium Expense Tracker for UGX',
        theme_color: '#1A1A1A',
        background_color: '#F8F9FA',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'logo2.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo1.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo1.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Ensures the app works even if the user starts offline
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
    // host: true is great for testing the PWA on your actual phone 
    // by visiting your computer's IP address on your local Wi-Fi.
    host: true,
    headers: {
    'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
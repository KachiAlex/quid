import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const shouldApplyPWA = process.env.ENABLE_PWA === 'true'

export default defineConfig({
  plugins: [
    react(),
    ...(shouldApplyPWA
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            manifest: {
              name: 'Quid',
              short_name: 'Quid',
              description: 'AI-powered financial optimisation and switching',
              theme_color: '#0f172a',
              background_color: '#ffffff',
              display: 'standalone',
              start_url: '/',
              icons: [
                {
                  src: '/icon-192x192.svg',
                  sizes: '192x192',
                  type: 'image/svg+xml'
                },
                {
                  src: '/icon-512x512.svg',
                  sizes: '512x512',
                  type: 'image/svg+xml'
                }
              ]
            }
          }),
        ]
      : [])
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})

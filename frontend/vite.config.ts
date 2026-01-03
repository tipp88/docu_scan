import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Document Scanner',
        short_name: 'DocuScan',
        description: 'Privacy-first mobile document scanning app',
        theme_color: '#ffffff',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        globIgnores: ['**/opencv/**'],
        maximumFileSizeToCacheInBytes: 3000000,
      }
    })
  ],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, '../localhost-key.pem')),
      cert: fs.readFileSync(path.resolve(__dirname, '../localhost-cert.pem')),
    },
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:8888',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

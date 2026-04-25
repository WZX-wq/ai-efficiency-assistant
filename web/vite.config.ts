import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/ai-efficiency-assistant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'AI效率助手',
        short_name: 'AI助手',
        description: '企业级 AI 内容创作平台',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/ai-efficiency-assistant/',
        start_url: '/ai-efficiency-assistant/',
        icons: [
          {
            src: '/ai-efficiency-assistant/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: '/ai-efficiency-assistant/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/ai-efficiency-assistant/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/ai-efficiency-assistant/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['productivity', 'utilities'],
        lang: 'zh-CN',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-syntax-core': ['react-syntax-highlighter/dist/esm/prism-light'],
          'vendor-tiptap': [
            '@tiptap/react', '@tiptap/starter-kit',
            '@tiptap/extension-highlight', '@tiptap/extension-underline',
            '@tiptap/extension-text-align', '@tiptap/extension-link',
            '@tiptap/extension-image', '@tiptap/extension-table',
            '@tiptap/extension-table-row', '@tiptap/extension-table-cell',
            '@tiptap/extension-table-header', '@tiptap/extension-task-list',
            '@tiptap/extension-task-item', '@tiptap/extension-text-style',
            '@tiptap/extension-color', '@tiptap/extension-placeholder',
          ],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-motion': ['framer-motion'],
          'vendor-zustand': ['zustand'],
        },
      },
    },
  },
})

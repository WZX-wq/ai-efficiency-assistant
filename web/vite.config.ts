import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/ai-efficiency-assistant/',
  plugins: [react()],
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
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-tiptap': ['@tiptap/react', '@tiptap/starter-kit'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-motion': ['framer-motion', 'zustand'],
          'vendor-syntax': ['react-syntax-highlighter'],
        },
      },
    },
  },
})

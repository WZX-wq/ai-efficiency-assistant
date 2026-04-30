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
            // API 调用：网络优先策略
            urlPattern: /^https:\/\/api\./i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 300 },
              networkTimeoutSeconds: 5,
            },
          },
          {
            // 静态资源 CDN：缓存优先策略
            urlPattern: /^https:\/\/cdn\./i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdn-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 * 30 },
            },
          },
          {
            // Google Fonts：缓存优先策略
            urlPattern: /^https:\/\/fonts\.googleapis\.com/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 * 365 },
            },
          },
          {
            // 字体文件：缓存优先策略
            urlPattern: /^https:\/\/fonts\.gstatic\.com/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 * 365 },
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
    // 生产环境不生成 sourcemap，减小包体积
    sourcemap: false,
    // 使用 terser 压缩以获得更小的 bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,    // 移除 console.log
        drop_debugger: true,   // 移除 debugger
        pure_funcs: ['console.info', 'console.debug', 'console.warn'],
      },
      format: {
        comments: false,       // 移除所有注释
      },
    },
    // CSS 代码分割
    cssCodeSplit: true,
    // 跳过压缩大小报告，加快构建速度
    reportCompressedSize: false,
    // chunk 大小警告阈值
    chunkSizeWarningLimit: 300,
    rollupOptions: {
      output: {
        // 文件名 hash 策略
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        // Vendor chunk 分割策略
        manualChunks(id) {
          // i18n 翻译资源
          if (id.includes('/i18n/locales/')) {
            return 'vendor-i18n';
          }
          // React 核心
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor';
          }
          // 路由
          if (id.includes('node_modules/react-router-dom')) {
            return 'router';
          }
          // 富文本编辑器
          if (id.includes('node_modules/@tiptap') || id.includes('node_modules/prosemirror')) {
            return 'vendor-tiptap';
          }
          // Markdown 渲染
          if (
            id.includes('node_modules/react-markdown') ||
            id.includes('node_modules/remark-gfm') ||
            id.includes('node_modules/react-syntax-highlighter')
          ) {
            return 'vendor-markdown';
          }
          // 动画
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // 状态管理
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
        },
      },
    },
  },
})

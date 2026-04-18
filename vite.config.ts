import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Aspire Budget',
        short_name: 'Aspire',
        description: 'Zero-based envelope budgeting, offline-first.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'en',
        categories: ['finance', 'productivity'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'New transaction',
            short_name: 'New',
            description: 'Log a new transaction',
            url: '/transactions/new',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Move money',
            short_name: 'Move',
            description: 'Move money between categories',
            url: '/budget',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Transactions',
            short_name: 'Txns',
            description: 'View all transactions',
            url: '/transactions',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        mode: 'development',
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/recharts/') || id.includes('/victory-')) return 'recharts';
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion';
          if (id.includes('/react-router/')) return 'router';
          if (id.includes('/dexie')) return 'dexie';
          if (id.includes('/@radix-ui/')) return 'radix';
          if (id.includes('/react-hook-form/') || id.includes('/@hookform/') || id.includes('/zod/')) return 'forms';
          if (id.includes('/cmdk/')) return 'cmdk';
          if (id.includes('/sonner/')) return 'sonner';
          if (id.includes('/@use-gesture/')) return 'gesture';
          if (id.includes('/date-fns/')) return 'date-fns';
        },
      },
    },
  },
});

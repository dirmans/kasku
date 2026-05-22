import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'KasKu - Catatan Keuangan',
        short_name: 'KasKu',
        description: 'Catatan keuangan pribadi',
        theme_color: '#1a1916',
        background_color: '#f5f4ef',
        display: 'standalone',
        icons: [
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
});

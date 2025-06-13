import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://finetune_engine.deepcite.in',
        changeOrigin: true,
        secure: true,
        // Keep the /api prefix - don't rewrite it
      },
    },
  },
});

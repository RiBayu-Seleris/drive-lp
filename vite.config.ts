import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5920,
  },
  preview: {
    host: true,
    port: 5921,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/')) return 'three';
          if (id.includes('/gsap/') || id.includes('/lenis/')) return 'motion-engine';
          if (id.includes('framer-motion')) return 'framer';
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});

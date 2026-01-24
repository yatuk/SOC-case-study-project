import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SOC-case-study-project/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          tremor: ['@tremor/react'],
          charts: ['recharts'],
          ui: ['framer-motion', 'sonner'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})

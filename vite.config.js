import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false,
      allow: ['..'],
    },
  },
  optimizeDeps: {
    entries: [path.resolve(__dirname, 'index.html')],
    include: ['xlsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    commonjsOptions: {
      include: [/xlsx/, /node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      external: (id) => {
        // Externaliser xlsx et tous ses sous-modules
        return id === 'xlsx' || id.startsWith('xlsx/');
      },
      output: {
        manualChunks: undefined,
        globals: {
          xlsx: 'XLSX',
        },
      },
    },
  },
})

import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      // '@' -> ./src  (previously provided by the Base44 vite plugin)
      '@': path.resolve(__dirname, './src'),
    },
  },
});

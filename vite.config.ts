import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  server: {
    proxy: {
      // E2E usa puerto dedicado vía env; dev normal sigue en :3001
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3001',
    },
  },
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
})

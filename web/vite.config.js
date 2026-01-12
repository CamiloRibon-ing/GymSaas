import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      caseSensitive: false
    },
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'https://122192d6f2a6.ngrok-free.app'
    ]
  },
  resolve: {
    preserveSymlinks: true
  }
})

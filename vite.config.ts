import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/health': 'http://127.0.0.1:8000',
      '/ingredients': 'http://127.0.0.1:8000',
      '/sales': 'http://127.0.0.1:8000',
      '/movements': 'http://127.0.0.1:8000',
      '/upload': 'http://127.0.0.1:8000',
      '/predict': 'http://127.0.0.1:8000',
      '/restock': 'http://127.0.0.1:8000',
      '/summary': 'http://127.0.0.1:8000',
      '/demand': 'http://127.0.0.1:8000',
      '/events': 'http://127.0.0.1:8000',
      '/alerts': 'http://127.0.0.1:8000',
      '/seed': 'http://127.0.0.1:8000',
      '/agent': 'http://127.0.0.1:8000',
    },
  },
})


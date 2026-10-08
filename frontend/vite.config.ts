import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/auth': 'http://localhost:8080', '/users': 'http://localhost:8080' } },
  preview: { proxy: { '/auth': 'http://localhost:8080', '/users': 'http://localhost:8080' } },
})


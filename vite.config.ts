import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const DSH_BACKEND = process.env.DSH_BACKEND_URL ?? 'http://127.0.0.1:3080'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    host: '127.0.0.1',
    port: 5200,
    strictPort: true,
    proxy: {
      '/api': {
        target: DSH_BACKEND,
        changeOrigin: true,
        ws: true,
        rewriteWsOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', request => request.removeHeader('origin'))
          proxy.on('proxyReqWs', request => request.removeHeader('origin'))
        },
      },
      '/dsh-auth': {
        target: DSH_BACKEND,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/dsh-auth/u, '/'),
        configure(proxy) {
          proxy.on('proxyReq', request => request.removeHeader('origin'))
        },
      },
    },
  },
  build: { outDir: 'dist', sourcemap: true },
})

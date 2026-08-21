import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: {
      plugins: [],
    },
  },
  // 独立域名 admin.luckygo.kwikcc.com → 站点根目录部署，资源路径 /assets/...
  // 若改为主站子路径 /admin/，构建时设 VITE_BASE=/admin/
  base: process.env.VITE_BASE || '/',
  server: {
    port: 2089,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // For test mode, use test backend on port 7001
  // For development mode, use dev backend on port 7000
  const apiTarget = mode === 'test' ? 'http://localhost:7001' : 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    base: process.env.VITE_BASE_PATH || '/',
    define: {
      // Override API base URL for test mode to use relative paths through proxy
      ...(mode === 'test' && {
        'import.meta.env.VITE_API_BASE_URL': '""'
      })
    },
    esbuild: {
      // Remove console.log in production
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
})

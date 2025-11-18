import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/portal-chamados/',
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'es2015',

  },
})

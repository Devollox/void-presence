import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    browserField: false,
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      external: ['bufferutil', 'utf-8-validate'],
    },
  },
})

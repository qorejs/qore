import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        hook: resolve(__dirname, 'src/hook.ts'),
      },
      name: 'QoreDevtools',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@qorejs/qore'],
      output: {
        globals: {
          '@qorejs/qore': 'Qore',
        },
      },
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

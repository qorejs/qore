import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'QoreLibrary',
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

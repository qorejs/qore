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
      external: ['@qore/core'],
      output: {
        globals: {
          '@qore/core': 'Qore',
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

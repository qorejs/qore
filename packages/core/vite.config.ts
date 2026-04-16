import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'Qore',
      fileName: 'index',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    emptyDir: false,
  },
  test: {
    environment: 'jsdom',
  },
});

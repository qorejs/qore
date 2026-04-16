import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/stream.ts',
      name: 'QoreStream',
      fileName: 'stream',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/ssr.ts',
      name: 'QoreSSR',
      fileName: 'ssr',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    emptyDir: false,
  },
});

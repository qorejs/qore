import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/virtual-list.ts',
      name: 'QoreVirtualList',
      fileName: 'virtual-list',
      formats: ['es'],
    },
    outDir: 'dist',
    sourcemap: true,
    minify: false,
    emptyDir: false,
  },
});

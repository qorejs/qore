import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.tsx'),
        button: resolve(__dirname, 'src/Button/index.tsx'),
        input: resolve(__dirname, 'src/Input/index.tsx'),
        textarea: resolve(__dirname, 'src/Textarea/index.tsx'),
        select: resolve(__dirname, 'src/Select/index.tsx'),
        checkbox: resolve(__dirname, 'src/Checkbox/index.tsx'),
        radio: resolve(__dirname, 'src/Radio/index.tsx'),
        switch: resolve(__dirname, 'src/Switch/index.tsx'),
        dialog: resolve(__dirname, 'src/Dialog/index.tsx'),
        toast: resolve(__dirname, 'src/Toast/index.tsx'),
        tooltip: resolve(__dirname, 'src/Tooltip/index.tsx'),
        tabs: resolve(__dirname, 'src/Tabs/index.tsx'),
      },
      name: 'QorePrimitives',
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
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})

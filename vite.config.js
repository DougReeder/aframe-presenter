// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'node-graph-presenter/build',

    lib: {
      entry: 'node-graph-presenter/forceGraphWorker.js',
      formats: ['es'],
      fileName: () => 'graphWorker.js'
    },

    rollupOptions: {
      treeshake: true,
      output: {
        codeSplitting: false,
        manualChunks: undefined,
        entryFileNames: 'graphWorker.js'
      }
    },

    // target: 'es2020',
    minify: false
  }
});

// vite.config.js
import { defineConfig } from 'vite';
import {playwright} from "@vitest/browser-playwright";

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
  },
  test: {
    globals: true,
    // environment: 'jsdom',
    include: ['tests-vitest/**/*.test.js'],
    browser: {
      enabled: true,
      provider: playwright(),
      // https://vitest.dev/config/browser/playwright
      instances: [{ browser: 'chromium' }],
      // headless: true,
    },
  },

});

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: ['src/__tests__/**'],
      outDir: 'dist',
      // One .d.ts per entry (index.d.ts, testing.d.ts, ...) matching the lib
      // entries below, instead of dts's default single rolled-up bundle —
      // each entry's exports map block points at its own file.
      rollupTypes: false,
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        'vue-feature-toggles': resolve(__dirname, 'src/index.ts'),
        'testing':   resolve(__dirname, 'src/testing.ts'),
        'storybook': resolve(__dirname, 'src/storybook.ts'),
        'adapters':  resolve(__dirname, 'src/adapters.ts'),
        'vite':      resolve(__dirname, 'src/vite.ts'),
      },
      name: 'VueFeatureToggles',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue', 'vite'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
})

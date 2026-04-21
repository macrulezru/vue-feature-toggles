import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        'vue-feature-toggles': resolve(__dirname, 'src/index.ts'),
        'testing':   resolve(__dirname, 'src/testing.ts'),
        'storybook': resolve(__dirname, 'src/storybook.ts'),
      },
      name: 'VueFeatureToggles',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
})

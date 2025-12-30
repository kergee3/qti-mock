import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // qti- で始まるタグをカスタム要素として扱う
          isCustomElement: (tag) => tag.startsWith('qti-')
        }
      }
    })
  ],
  resolve: {
    alias: {
      // ランタイムコンパイラを含むVueビルドを使用
      vue: 'vue/dist/vue.esm-bundler.js'
    }
  }
})

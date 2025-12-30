// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

// QTI3 Player コンポーネント
import Qti3Player from 'qti3-item-player-vue3'

// QTI3 Player の CSS
import 'qti3-item-player-vue3/dist/qti3Player.css'

// Vercel Web Analytics
import { injectAnalytics } from '@vercel/analytics'

const app = createApp(App)
app.use(Qti3Player)
app.mount('#app')

// Vercel Analytics を有効化
injectAnalytics()
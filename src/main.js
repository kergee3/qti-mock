// import { createApp } from 'vue'
// import './style.css'
// import App from './App.vue'

// createApp(App).mount('#app')

// src/main.js
import { createApp } from 'vue'
import App from './App.vue'

// QTI3 Player コンポーネント
import Qti3Player from 'qti3-item-player-vue3'

// QTI3 Player の CSS
import 'qti3-item-player-vue3/dist/qti3Player.css'

const app = createApp(App)
app.use(Qti3Player)
app.mount('#app')
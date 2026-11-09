import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initStorage } from './storage'
import 'element-plus/dist/index.css'
import './styles.css'

initStorage()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

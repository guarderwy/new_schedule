import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'element-plus/dist/index.css'
import './styles.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from '@/App.vue'
import { router } from '@/router'
import { useScenariosStore } from '@/stores/scenarios'
import { useSettingsStore } from '@/stores/settings'
import { useTagsStore } from '@/stores/tags'
import '@/app.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

const settings = useSettingsStore()
const tags = useTagsStore()
const scenarios = useScenariosStore()

await Promise.all([
  settings.enablePersistence(),
  tags.enablePersistence(),
  scenarios.enablePersistence(),
])

app.mount('#app')

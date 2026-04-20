import { createApp } from 'vue'
import { FeatureToggles } from '../../src/index'
import App from './App.vue'

const app = createApp(App)

app.use(FeatureToggles, {
  flags: {
    newDashboard: true,
    betaSearch: false,
    darkMode: true,
    maintenanceMode: false,
  },

  loader: async () => {
    await new Promise((r) => setTimeout(r, 1200))
    return { loaderFlag: true, slowFeature: false }
  },

  urlOverrides: true,
  urlPrefix: 'feature',
  defaultValue: false,
})

app.mount('#app')

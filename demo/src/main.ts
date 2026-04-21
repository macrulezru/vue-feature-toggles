import { createApp } from 'vue'
import { FeatureToggles } from '../../src/index'
import App from './App.vue'

const app = createApp(App)

app.use(FeatureToggles, {
  flags: {
    newDashboard:    true,
    betaSearch:      false,
    darkMode:        true,
    maintenanceMode: false,
    checkoutFlow:    'v1',   // multivariate — 'v1' | 'v2' | 'control'
    aiSuggestions:   true,   // depends on betaSearch
    christmasBanner: true,   // expired
  },

  variables: {
    newDashboard: {
      accentColor:  '#4f46e5',
      maxWidgets:   6,
      welcomeText:  'Welcome to the new dashboard!',
    },
  },

  groups: {
    beta:   ['betaSearch', 'aiSuggestions'],
    layout: ['newDashboard', 'darkMode'],
  },

  dependencies: {
    aiSuggestions: ['betaSearch'],
  },

  rules: {
    // darkMode follows the OS preference — can be overridden via DevTools or URL
    darkMode: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  },

  meta: {
    newDashboard:    { description: 'Redesigned dashboard UI', owner: 'frontend', addedAt: '2025-01-15', ticket: 'PROJ-42' },
    betaSearch:      { description: 'New search bar with autocomplete', owner: 'search-team', addedAt: '2025-06-01', ticket: 'PROJ-88' },
    checkoutFlow:    { description: 'A/B test for checkout UX (v1 / v2)', owner: 'checkout', addedAt: '2025-09-01' },
    aiSuggestions:   { description: 'AI-powered search suggestions', owner: 'ai-team', addedAt: '2025-10-01', ticket: 'PROJ-99' },
    christmasBanner: { description: 'Seasonal Christmas promotional banner', owner: 'marketing', addedAt: '2024-11-01', ticket: 'MKTG-12' },
  },

  expiry: {
    christmasBanner: '2025-01-10',
  },

  loader: async () => {
    await new Promise(r => setTimeout(r, 1200))
    return { loaderFlag: true, slowFeature: false }
  },

  urlOverrides: true,
  urlPrefix: 'feature',
  defaultValue: false,
})

app.mount('#app')

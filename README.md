# vue-feature-toggles

**Lightweight, backend-agnostic feature flags plugin for Vue 3.**

---

## Installation

```sh
npm install vue-feature-toggles
```

---

## Initialization

```ts
// main.ts
import { createApp } from 'vue'
import { FeatureToggles } from 'vue-feature-toggles'
import App from './App.vue'

const app = createApp(App)

app.use(FeatureToggles, {
  // Static flags — simplest setup
  flags: {
    newDashboard: true,
    betaSearch:   false,
    darkMode:     true,
  },

  // Optional: load flags from a backend
  loader: async () => {
    const res = await fetch('/api/feature-flags')
    return res.json() // must return Record<string, boolean>
  },

  // Optional: URL overrides (default: true in dev, false in prod)
  urlOverrides: true,

  // Optional: prefix for URL query params (default: 'feature')
  urlPrefix: 'feature',

  // Optional: fallback when a flag is not found (default: false)
  defaultValue: false,
})

app.mount('#app')
```

---

## Features & API

### Interface 1 — `<Feature>` component

#### Basic usage

```vue
<Feature name="newDashboard">
  <NewDashboard />
</Feature>
```

If `newDashboard === false`, nothing is rendered.

#### Fallback via slot

```vue
<Feature name="betaSearch">
  <template #default>
    <BetaSearchBar />
  </template>
  <template #fallback>
    <LegacySearchBar />
  </template>
</Feature>
```

#### Fallback via prop

```vue
<Feature name="betaSearch" fallback="Feature is under development">
  <BetaSearchBar />
</Feature>
```

#### Inverted — show when flag is off

```vue
<Feature name="maintenanceMode" :inverted="true">
  <MainContent />
</Feature>
```

#### Wrap content in an HTML tag

```vue
<Feature name="newDashboard" tag="section">
  <NewDashboard />
</Feature>
```

#### Loading state while loader is running

```vue
<Feature name="loaderFlag">
  <template #loading><Spinner /></template>
  <template #default><NewFeature /></template>
  <template #fallback><OldFeature /></template>
</Feature>
```

---

#### `<Feature>` props

| Prop       | Type                    | Default | Description                                          |
| ---------- | ----------------------- | ------- | ---------------------------------------------------- |
| `name`     | `string`                | —       | Flag name. Required                                  |
| `fallback` | `string \| Component`   | `null`  | What to render when the flag is off                  |
| `inverted` | `boolean`               | `false` | Render when the flag is `false`                      |
| `tag`      | `string`                | —       | Wrap content in an HTML element (no wrapper by default) |

#### `<Feature>` slots

| Slot       | Description                                  |
| ---------- | -------------------------------------------- |
| `default`  | Content when the flag is on                  |
| `fallback` | Content when the flag is off                 |
| `loading`  | Content while flags are loading via `loader` |

---

### Interface 2 — `v-feature` directive

```vue
<!-- Show when flag is on -->
<div v-feature="'newDashboard'">...</div>

<!-- Show when flag is off (inverted) -->
<div v-feature:not="'betaSearch'">...</div>

<!-- Show when ALL flags are on -->
<div v-feature="['newDashboard', 'betaSearch']">...</div>
```

The directive works like `v-show` (via `display: none`), not `v-if`. This is intentional: the DOM is not created or removed, which is faster for frequent toggling. Use the `<Feature>` component for `v-if`-like behavior.

---

### Interface 3 — `useFeature` composable

```ts
import { useFeature } from 'vue-feature-toggles'

// Single flag — returns Ref<boolean>
const isNewDashboard = useFeature('newDashboard')

// Multiple flags — returns Record<string, Ref<boolean>>
const { newDashboard, betaSearch } = useFeature(['newDashboard', 'betaSearch'])

// AND check across multiple flags — returns Ref<boolean>
const allEnabled = useFeature('newDashboard', 'betaSearch')
```

---

### Low-level access — `useFeatureProvider`

```ts
import { useFeatureProvider } from 'vue-feature-toggles'

const {
  flags,      // Ref<Record<string, boolean>> — all flags, reactive
  isLoading,  // Ref<boolean> — true while loader is running
  isReady,    // Ref<boolean> — true after first load

  isEnabled,  // (name: string) => boolean
  setFlag,    // (name: string, value: boolean) => void — runtime override
  resetFlag,  // (name: string) => void — remove runtime override
  resetAll,   // () => void — remove all runtime overrides
  reload,     // () => Promise<void> — re-run loader
} = useFeatureProvider()
```

#### Emergency kill-switch

```ts
const { setFlag } = useFeatureProvider()
setFlag('newPaymentFlow', false) // instantly hides the feature without a page reload
```

#### Route guard

```ts
// router/guards.ts
import { useFeatureProvider } from 'vue-feature-toggles'

router.beforeEach((to) => {
  const { isEnabled } = useFeatureProvider()
  if (to.meta.feature && !isEnabled(to.meta.feature as string)) {
    return { name: 'NotFound' }
  }
})
```

```ts
// routes
{ path: '/new-dashboard', component: NewDashboard, meta: { feature: 'newDashboard' } }
```

---

### URL overrides

When `urlOverrides: true`, query params of the form `?feature:flagName=true` override the flag value. Overrides are read reactively — no page reload required.

```
https://app.example.com/dashboard?feature:newDashboard=true&feature:betaSearch=false
```

Overrides are kept in memory only — they are not stored in `localStorage` and do not affect other users.

The prefix can be changed via the `urlPrefix` option:

```
# urlPrefix: 'ft'
?ft:newDashboard=true
```

#### Priority order (highest to lowest)

```
URL override → runtime setFlag() → loader result → static flags → defaultValue
```

---

### Loader providers

The plugin does not dictate the data source. Pass any async function as `loader`:

```ts
// REST API
loader: async () => {
  const res = await fetch('/api/flags')
  return res.json()
}

// LaunchDarkly raw client
loader: async () => {
  const client = LDClient.initialize(envKey, user)
  await client.waitUntilReady()
  return client.allFlags()
}

// localStorage
loader: async () => {
  return JSON.parse(localStorage.getItem('feature-flags') ?? '{}')
}

// Role-based flags
loader: async () => {
  const user = await getUser()
  return {
    adminPanel:   user.role === 'admin',
    betaFeature:  user.plan === 'pro',
    newDashboard: true,
  }
}
```

#### Periodic reload

```ts
app.use(FeatureToggles, {
  loader,
  reloadInterval: 60_000, // reload flags every minute
})
```

---

### Manual component and directive registration

```ts
import { Feature, vFeature } from 'vue-feature-toggles'

// Component
app.component('Feature', Feature)

// Directive
app.directive('feature', vFeature)
```

---

### `<FeatureDevTools>` panel

A floating overlay for inspecting and controlling flags at runtime. Shows each flag's current value, its source (`url`, `runtime`, `loader`, `static`, `default`), and individual toggle/reset controls.

```vue
<script setup>
import { FeatureDevTools } from 'vue-feature-toggles'
</script>

<template>
  <RouterView />

  <!-- Render only in dev builds -->
  <FeatureDevTools v-if="isDev" />
</template>
```

```ts
const isDev = import.meta.env.DEV
```

The panel renders as a fixed overlay (bottom-right corner) and does not affect the rest of the layout. It can be collapsed with the toggle button.

`getFlagSource` is also available directly on the provider:

```ts
const { getFlagSource } = useFeatureProvider()

getFlagSource('newDashboard') // → 'url' | 'runtime' | 'loader' | 'static' | 'default'
```

---

### Nuxt module

Add `vue-feature-toggles/nuxt` to your Nuxt modules list. It registers the plugin automatically — no need to call `app.use()` manually.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-feature-toggles/nuxt'],

  featureToggles: {
    flags: {
      newDashboard: true,
      betaSearch:   false,
    },
    urlOverrides:   true,   // default: true in dev, false in prod
    urlPrefix:      'feature',
    defaultValue:   false,
    reloadInterval: 0,
  },
})
```

The `<Feature>` component and `v-feature` directive are registered globally. `useFeature` and `useFeatureProvider` work as usual inside components.

#### Accessing the provider outside component setup

```ts
// plugins/my-plugin.ts
export default defineNuxtPlugin((nuxtApp) => {
  const { $featureToggles } = nuxtApp
  console.log($featureToggles.flags.value)
})
```

#### Using a loader with Nuxt

The `loader` option is a function and cannot be passed through `nuxt.config`. For a custom loader, skip the module and register the plugin directly:

```ts
// plugins/feature-toggles.ts
import { FeatureToggles } from 'vue-feature-toggles'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(FeatureToggles, {
    loader: async () => {
      const flags = await $fetch('/api/flags')
      return flags
    },
    urlOverrides: true,
  })
})
```

> **Note:** `@nuxt/kit` must be installed in your Nuxt project. It is included automatically with any Nuxt 3 installation.

---

## Types

```ts
interface FeatureTogglesOptions {
  flags?:          Record<string, boolean>
  loader?:         () => Promise<Record<string, boolean>>
  reloadInterval?: number   // ms, default: 0 (no auto-reload)
  urlOverrides?:   boolean  // default: true in dev, false in prod
  urlPrefix?:      string   // default: 'feature'
  defaultValue?:   boolean  // default: false
}

type FlagSource = 'url' | 'runtime' | 'loader' | 'static' | 'default'

interface FeatureProvider {
  flags:         Ref<Record<string, boolean>>
  isLoading:     Ref<boolean>
  isReady:       Ref<boolean>
  isEnabled:     (name: string) => boolean
  getFlagSource: (name: string) => FlagSource
  setFlag:       (name: string, value: boolean) => void
  resetFlag:     (name: string) => void
  resetAll:      () => void
  reload:        () => Promise<void>
}
```

---

## Exports

```ts
import {
  FeatureToggles,       // plugin for app.use()
  Feature,              // <Feature> component
  FeatureDevTools,      // DevTools overlay component
  vFeature,             // v-feature directive
  useFeature,           // composable
  useFeatureProvider,   // low-level composable
} from 'vue-feature-toggles'

import type { FeatureTogglesOptions, FeatureProvider, FlagSource } from 'vue-feature-toggles'
```

---

## Demo

```sh
git clone https://github.com/macrulezru/vue-feature-toggles.git
cd vue-feature-toggles
npm install
npm run dev
```

Opens at `http://localhost:5174`. The demo covers all three interfaces — component, directive, and composable — with runtime flag controls and URL override examples.

---

## Requirements

- Vue 3.0+
- Node.js 18+
- Modern browser with ES2020+ support

---

## License

MIT

---

## Author

Danil Lisin Vladimirovich aka Macrulez

GitHub: [macrulezru](https://github.com/macrulezru) · Website: [macrulez.ru](https://macrulez.ru/)

Questions and bugs — [issues](https://github.com/macrulezru/vue-feature-toggles/issues)

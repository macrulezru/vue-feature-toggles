# vue-feature-toggles

**Lightweight, backend-agnostic feature flags plugin for Vue 3.**

---

## Installation

```sh
npm install vue-feature-toggles
```

---

## Quick start

```ts
// main.ts
import { createApp } from 'vue'
import { FeatureToggles } from 'vue-feature-toggles'
import App from './App.vue'

const app = createApp(App)

app.use(FeatureToggles, {
  flags: {
    newDashboard: true,
    betaSearch:   false,
    darkMode:     true,
  },
})

app.mount('#app')
```

```vue
<Feature name="newDashboard">
  <NewDashboard />
</Feature>
```

---

## Initialization options

```ts
app.use(FeatureToggles, {
  // Static flag values (boolean or variant string)
  flags: { newDashboard: true, checkoutFlow: 'v2' },

  // Async loader — fetches flags from a backend
  loader: async () => {
    const res = await fetch('/api/feature-flags')
    return res.json()
  },

  // Poll interval for the loader in ms (default: 0 = disabled)
  reloadInterval: 60_000,

  // Allow ?feature:flagName=true in the URL (default: true in dev, false in prod)
  urlOverrides: true,

  // URL param prefix (default: 'feature')
  urlPrefix: 'feature',

  // Value returned for unknown flags (default: false)
  defaultValue: false,

  // Variables scoped to a flag
  variables: {
    newCheckout: { maxItems: 5, theme: 'dark' },
  },

  // Named flag groups
  groups: {
    beta:        ['betaSearch', 'newDashboard'],
    maintenance: ['maintenanceMode', 'readOnlyBanner'],
  },

  // Dependency enforcement: if a required flag is off, the dependent is forced off too
  dependencies: {
    aiSuggestions: ['newSearch'],
  },

  // Contextual rules — evaluated reactively, priority below setFlag/URL
  rules: {
    darkMode: () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  },

  // Flag metadata for DevTools and CLI
  meta: {
    newDashboard: { description: 'New UI', owner: 'alice', addedAt: '2025-03-01', ticket: 'PROJ-42' },
  },

  // Automatic expiry dates — after this date the flag is treated as expired
  expiry: {
    christmasBanner: '2025-01-10',
  },

  // Live updates from the server (SSE or WebSocket)
  liveUpdates: {
    type: 'sse',
    url:  '/api/flags/stream',
  },

  // Server-side flag snapshot to prevent hydration mismatch
  ssrState: window.__FEATURE_FLAGS__,
})
```

---

## Interfaces

### `<Feature>` component

```vue
<!-- Basic -->
<Feature name="newDashboard">
  <NewDashboard />
</Feature>

<!-- Fallback slot -->
<Feature name="betaSearch">
  <template #default><BetaSearchBar /></template>
  <template #fallback><LegacySearchBar /></template>
</Feature>

<!-- Fallback prop -->
<Feature name="betaSearch" fallback="Feature is under development">
  <BetaSearchBar />
</Feature>

<!-- Inverted — show when flag is off -->
<Feature name="maintenanceMode" :inverted="true">
  <MainContent />
</Feature>

<!-- Wrap in an HTML element -->
<Feature name="newDashboard" tag="section">
  <NewDashboard />
</Feature>

<!-- Loading state while loader runs -->
<Feature name="loaderFlag">
  <template #loading><Spinner /></template>
  <template #default><NewFeature /></template>
  <template #fallback><OldFeature /></template>
</Feature>

<!-- Group — show when ALL flags in the group are enabled -->
<Feature group="beta">
  <BetaLabel />
</Feature>
```

#### Props

| Prop       | Type                  | Default | Description                                             |
| ---------- | --------------------- | ------- | ------------------------------------------------------- |
| `name`     | `string`              | —       | Flag name                                               |
| `group`    | `string`              | —       | Group name (alternative to `name`)                      |
| `fallback` | `string \| Component` | `null`  | What to render when the flag is off                     |
| `inverted` | `boolean`             | `false` | Render when the flag is `false`                         |
| `tag`      | `string`              | —       | Wrap content in an HTML element (no wrapper by default) |

#### Slots

| Slot      | Description                                  |
| --------- | -------------------------------------------- |
| `default` | Content when the flag is on                  |
| `fallback`| Content when the flag is off                 |
| `loading` | Content while flags are loading via `loader` |

---

### `v-feature` directive

```vue
<!-- Show when flag is on -->
<div v-feature="'newDashboard'">...</div>

<!-- Show when flag is off (inverted) -->
<div v-feature:not="'betaSearch'">...</div>

<!-- Show when ALL flags are on -->
<div v-feature="['newDashboard', 'betaSearch']">...</div>
```

Works like `v-show` (toggles `display: none`) — the DOM node is always present. For `v-if`-like behavior use `<Feature>`.

---

### `useFeature` composable

```ts
import { useFeature } from 'vue-feature-toggles'

// Single flag → Ref<boolean>
const isNewDashboard = useFeature('newDashboard')

// Multiple flags → Record<string, Ref<boolean>>
const { newDashboard, betaSearch } = useFeature(['newDashboard', 'betaSearch'])

// AND check across multiple flags → Ref<boolean>
const allEnabled = useFeature('newDashboard', 'betaSearch')
```

---

### Multivariate flags & `<FeatureVariant>`

Flags can hold a string variant instead of a boolean — useful for A/B tests and multi-step rollouts.

```ts
app.use(FeatureToggles, {
  flags: { checkoutFlow: 'v2' },
})
```

```ts
import { useFeatureVariant } from 'vue-feature-toggles'

const variant = useFeatureVariant('checkoutFlow') // Ref<string>
```

```vue
<FeatureVariant name="checkoutFlow">
  <template #v1><CheckoutV1 /></template>
  <template #v2><CheckoutV2 /></template>
  <template #fallback><CheckoutLegacy /></template>
</FeatureVariant>
```

URL overrides work identically: `?feature:checkoutFlow=v2`.

---

### `useFeatureProvider` — full provider access

```ts
import { useFeatureProvider } from 'vue-feature-toggles'

const {
  // State
  flags,      // Ref<Record<string, FlagValue>> — all current flag values
  isLoading,  // Ref<boolean> — true while loader is running
  isReady,    // Ref<boolean> — true after first load

  // Boolean flags
  isEnabled,  // (name) => boolean
  setFlag,    // (name, value, options?) => void
  resetFlag,  // (name) => void
  resetAll,   // () => void
  reload,     // () => Promise<void>
  getFlagSource, // (name) => FlagSource

  // Variant flags
  getVariant,    // (name) => string
  setVariant,    // (name, variant) => void

  // Variables
  getVariable,   // <T>(flagName, varName) => Ref<T>
  setVariable,   // (flagName, varName, value) => void

  // Groups
  setGroup,         // (groupName, value) => void
  resetGroup,       // (groupName) => void
  isGroupEnabled,   // (groupName) => boolean

  // Dependencies
  getDependencyViolations, // () => Record<string, string[]>

  // Profiles
  saveProfile,  // (name, flags) => void
  loadProfile,  // (name) => void  ('default' → resetAll)
  listProfiles, // () => string[]

  // Persistence
  isPersisted,        // (name) => boolean
  clearPersistedFlags, // () => void

  // Metadata & expiry
  getFlagMeta, // (name) => FlagMeta | undefined
  isExpired,   // (name) => boolean

  // SSR
  serialize,   // () => Record<string, FlagValue>

  // Subscriptions
  watchFlag,   // (name, callback) => WatchStopHandle
} = useFeatureProvider()
```

#### Common patterns

```ts
// Emergency kill-switch
setFlag('newPaymentFlow', false)

// Route guard
router.beforeEach((to) => {
  const { isEnabled } = useFeatureProvider()
  if (to.meta.feature && !isEnabled(to.meta.feature as string)) {
    return { name: 'NotFound' }
  }
})

// React to a specific flag change
const stop = watchFlag('darkMode', (value, oldValue) => {
  applyTheme(value ? 'dark' : 'light')
})
// later: stop()
```

---

## Feature variables

Variables are scoped to a flag and share its priority chain. They can be overridden via URL or `setVariable`.

```ts
app.use(FeatureToggles, {
  flags: { newCheckout: true },
  variables: {
    newCheckout: {
      maxItems:    5,
      theme:       'dark',
      buttonLabel: 'Place order',
    },
  },
})
```

```ts
const { getVariable, setVariable } = useFeatureProvider()

const maxItems = getVariable<number>('newCheckout', 'maxItems') // Ref<number>
const theme    = getVariable<string>('newCheckout', 'theme')    // Ref<string>

setVariable('newCheckout', 'maxItems', 10)
```

URL override: `?feature-var:newCheckout:maxItems=10`

---

## Flag groups

```ts
app.use(FeatureToggles, {
  groups: {
    beta:        ['betaSearch', 'newDashboard', 'aiSuggestions'],
    maintenance: ['maintenanceMode', 'readOnlyBanner'],
  },
})
```

```ts
const { setGroup, resetGroup, isGroupEnabled } = useFeatureProvider()

setGroup('beta', false)      // disable all beta flags
setGroup('maintenance', true)
isGroupEnabled('beta')       // true only when ALL flags in the group are enabled
```

```vue
<Feature group="beta"><BetaLabel /></Feature>
```

---

## Flag dependencies

If a required flag is disabled, the dependent flag is forced off automatically.

```ts
app.use(FeatureToggles, {
  flags:        { aiSuggestions: true, newSearch: false },
  dependencies: { aiSuggestions: ['newSearch'] },
})
// aiSuggestions is forced false because newSearch is false
```

```ts
const { getDependencyViolations } = useFeatureProvider()
// → { aiSuggestions: ['newSearch'] }
```

A warning is printed in the dev console when a violation occurs.

---

## Contextual rules

Rules are functions evaluated reactively. Priority: below URL overrides and `setFlag`, above `loader`/static.

```ts
app.use(FeatureToggles, {
  rules: {
    darkMode:       () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    liveChatWidget: () => { const h = new Date().getHours(); return h >= 9 && h < 18 },
    devFeatures:    () => document.cookie.includes('internal=1'),
  },
})
```

Rules can be overridden by `setFlag()` or a URL param.

---

## URL overrides

When `urlOverrides: true`, query params override flag values without a page reload.

```
https://app.example.com/?feature:newDashboard=true&feature:checkoutFlow=v2
```

Variable overrides:
```
?feature-var:newCheckout:maxItems=10
```

Custom prefix (`urlPrefix: 'ft'`):
```
?ft:newDashboard=true
```

#### Priority order (highest → lowest)

```
URL override → runtime setFlag() → rules → loader → static flags → defaultValue
```

---

## Persistent overrides

By default `setFlag` lives in memory only. Pass `{ persist: true }` to save to `localStorage`:

```ts
const { setFlag, clearPersistedFlags, isPersisted } = useFeatureProvider()

setFlag('darkMode', true, { persist: true })
// Value survives page reloads

isPersisted('darkMode') // → true

clearPersistedFlags() // remove all persisted overrides
```

---

## Override profiles

Named sets of overrides stored in `localStorage` — useful for QA, demos, and design reviews.

```ts
const { saveProfile, loadProfile, listProfiles } = useFeatureProvider()

saveProfile('demo-mode', {
  newDashboard:    true,
  betaSearch:      true,
  maintenanceMode: false,
})

loadProfile('demo-mode') // applies all flags from the profile as runtime overrides
loadProfile('default')   // resets to original values (calls resetAll)

listProfiles() // → ['demo-mode']
```

The `<FeatureDevTools>` panel shows a profile dropdown when profiles exist.

---

## SSR / Hydration

Serialize flags on the server and pass them to the client to prevent hydration mismatches.

```ts
// server.ts
import { serializeFlags } from 'vue-feature-toggles/ssr'

const provider = createFeatureProvider({ loader: fetchFlags })
await provider.reload()
const ssrState = serializeFlags(provider) // → Record<string, FlagValue>
// embed in HTML: window.__FEATURE_FLAGS__ = ${JSON.stringify(ssrState)}
```

```ts
// client main.ts
app.use(FeatureToggles, {
  ssrState: window.__FEATURE_FLAGS__, // pre-populates flags synchronously
  loader: async () => fetchFlags(),   // refreshes in background
})
```

With the Nuxt module, SSR hydration is handled automatically via `nuxtApp.payload`.

---

## Live updates (SSE / WebSocket)

Flags update in real time when the server pushes changes — no polling required.

```ts
// SSE
app.use(FeatureToggles, {
  loader: async () => fetch('/api/flags').then(r => r.json()),
  liveUpdates: { type: 'sse', url: '/api/flags/stream' },
})

// WebSocket
app.use(FeatureToggles, {
  liveUpdates: {
    type:           'websocket',
    url:            'wss://flags.example.com/ws',
    reconnectDelay: 5000, // ms, default: 3000
  },
})
```

The server should push a JSON object with the changed flags only — unchanged flags are preserved.

```json
{ "betaSearch": true }
```

---

## Flag metadata & expiry

```ts
app.use(FeatureToggles, {
  flags: { newDashboard: true, christmasBanner: true },
  meta: {
    newDashboard: {
      description: 'New dashboard with charts',
      owner:       'team-frontend',
      addedAt:     '2025-03-01',
      ticket:      'PROJ-1234',
    },
  },
  expiry: {
    christmasBanner: '2025-01-10',
  },
})
```

```ts
const { getFlagMeta, isExpired } = useFeatureProvider()

getFlagMeta('newDashboard')    // → { description, owner, addedAt, ticket }
isExpired('christmasBanner')   // → true after 2025-01-10
```

A warning is printed in the dev console for expired flags. Metadata is visible in `<FeatureDevTools>` and the CLI.

---

## Type safety

Extend the built-in `FeatureFlagNames` interface to get autocomplete and compile-time errors on flag names everywhere — `useFeature`, `setFlag`, `isEnabled`, `<Feature name="...">`, etc.

```ts
// feature-flags.d.ts (or any .d.ts file in your project)
declare module 'vue-feature-toggles' {
  interface FeatureFlagNames {
    newDashboard: true
    betaSearch:   true
    darkMode:     true
  }
}
```

```ts
useFeature('newDashbord')  // TS error: Argument of type '"newDashbord"' is not assignable
useFeature('newDashboard') // ✔
```

---

## `<FeatureDevTools>` panel

A floating overlay for inspecting and controlling flags at runtime.

```vue
<script setup>
import { FeatureDevTools } from 'vue-feature-toggles'
const isDev = import.meta.env.DEV
</script>

<template>
  <RouterView />
  <FeatureDevTools v-if="isDev" />
</template>
```

The panel is organized into three tabs, each with its own content and action buttons.

#### Flags tab

The default view — lists every known flag with full controls.

- **Search** by flag name and **filter** by source (`url`, `runtime`, `rules`, `loader`, `static`, `default`)
- Each row shows: flag name, source badge, value badge, and contextual inline badges:
  - ⚠ — flag has passed its expiry date
  - ⛓ — dependency violation (a required flag is disabled)
  - 💾 — override is persisted to `localStorage`
  - ℹ — metadata available (hover for description, owner, ticket, addedAt)
- **Toggle** boolean flags on/off with a single click
- **Edit variant** — click the variant badge to edit inline; confirm with Enter or ✓
- **Reset** any individual runtime or URL override back to its original source
- **Variables** — flags with `variables` configured show a `▸ N` expand button; click to reveal per-variable inputs where you can read and change values in place
- **Footer actions**: Reset all · Reload from loader · Copy URL · Export overrides as JSON · Import overrides from JSON
- **Profiles** — if saved profiles exist, a dropdown lets you switch between them instantly; a name input + Save button lets you snapshot the current flag state as a new profile

#### Groups tab

Shows every group defined in the `groups` option.

- Each group row displays the group name, an `N/M` enabled counter, an `ALL ON / PARTIAL` status badge, and **ON / OFF / reset** buttons that affect all members at once
- Member flags are shown as colored chips (green = enabled, grey = disabled)
- **Footer**: Reset all groups

#### History tab

A chronological log of the last 20 flag changes recorded during the session.

- Each entry shows: timestamp, flag name, source badge, new value badge
- **Footer**: Clear

#### General

- **Draggable** — drag by the header; the widget is viewport-clamped so it can never leave the screen; position is saved in `sessionStorage` across page reloads
- **Collapsible** — collapse to a title bar with the chevron button

---

## Vue DevTools integration

A custom inspector tab and timeline layer appear in the browser Vue DevTools extension when `@vue/devtools-api` is installed.

```sh
npm install --save-dev @vue/devtools-api
```

The integration is **optional** — the plugin loads it dynamically and silently skips it when the package is absent or DevTools are closed.

- **Inspector** — all flags with value and source badges, full metadata in the detail pane
- **Timeline** — every flag change is logged with previous value, new value, and source

No configuration needed — the integration activates automatically in dev mode.

---

## Nuxt module

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['vue-feature-toggles/nuxt'],

  featureToggles: {
    flags:          { newDashboard: true, betaSearch: false },
    urlOverrides:   true,
    urlPrefix:      'feature',
    defaultValue:   false,
    reloadInterval: 0,
    meta:           { newDashboard: { owner: 'alice', addedAt: '2025-03-01' } },
    expiry:         { betaBanner: '2025-06-01' },
    groups:         { beta: ['betaSearch'] },
    dependencies:   { aiSuggestions: ['newSearch'] },
    liveUpdates:    { type: 'sse', url: '/api/flags/stream' },
  },
})
```

- `<Feature>`, `<FeatureVariant>`, and `v-feature` are registered globally
- SSR hydration via `nuxtApp.payload` is handled automatically — no `ssrState` config needed
- `$featureToggles` is injected into `nuxtApp`

```ts
// plugins/my-plugin.ts
export default defineNuxtPlugin((nuxtApp) => {
  const { $featureToggles } = nuxtApp
  console.log($featureToggles.flags.value)
})
```

#### Custom loader with Nuxt

The `loader` option is a function and cannot be serialized in `nuxt.config`. Use a plugin instead:

```ts
// plugins/feature-toggles.ts
import { FeatureToggles } from 'vue-feature-toggles'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(FeatureToggles, {
    loader: async () => {
      return $fetch('/api/flags')
    },
    urlOverrides: true,
  })
})
```

---

## Testing utilities

```sh
# No extra install needed — included in vue-feature-toggles
```

```ts
import { createTestFeatureProvider, withFeatures, setTestFlag, resetTestProvider } from 'vue-feature-toggles/testing'
```

#### Mount with flags

```ts
import { mount } from '@vue/test-utils'
import { withFeatures } from 'vue-feature-toggles/testing'

const wrapper = mount(MyComponent, withFeatures({
  newDashboard: true,
  betaSearch:   false,
}))
```

#### Full provider access in tests

```ts
import { createTestFeatureProvider } from 'vue-feature-toggles/testing'

const { install, provider } = createTestFeatureProvider({ newDashboard: true })

const wrapper = mount(MyComponent, {
  global: { plugins: [{ install }] },
})

provider.setFlag('newDashboard', false)
await nextTick()
```

#### Change flags mid-test

```ts
import { setTestFlag } from 'vue-feature-toggles/testing'

it('hides the component when flag is off', async () => {
  const wrapper = mount(MyComponent, withFeatures({ betaSearch: true }))
  expect(wrapper.find('[data-testid="beta"]').exists()).toBe(true)

  await setTestFlag('betaSearch', false) // awaits nextTick automatically
  expect(wrapper.find('[data-testid="beta"]').exists()).toBe(false)
})
```

#### Cleanup

```ts
import { resetTestProvider } from 'vue-feature-toggles/testing'

afterEach(() => resetTestProvider())
```

The `vue-feature-toggles/testing` entry point is excluded from the production bundle.

---

## Storybook addon

```ts
// .storybook/preview.ts
import { withFeatureToggles } from 'vue-feature-toggles/storybook'

export const decorators = [
  withFeatureToggles({ betaSearch: false }) // global defaults
]
```

```ts
// MyComponent.stories.ts
export const WithBetaSearch: Story = {
  parameters: {
    featureToggles: {
      betaSearch:   true,
      newDashboard: false,
    },
  },
}
```

Per-story `parameters.featureToggles` are merged on top of the global defaults. The `vue-feature-toggles/storybook` entry point is excluded from the production bundle.

---

## CLI

```sh
npx vue-feature-toggles <command> [options]
```

The CLI reads a `feature-toggles.config.js` (or `.mjs` / `.json`) file in the project root.

```js
// feature-toggles.config.js
export default {
  flags:  { newDashboard: true, betaSearch: false },
  meta:   { newDashboard: { owner: 'alice', addedAt: '2024-01-15', ticket: 'PROJ-42' } },
  expiry: { betaBanner: '2025-06-01' },
  groups: { beta: ['betaSearch'] },
}
```

#### `list` — show all flags

```sh
npx vue-feature-toggles list
```

Prints a table with current value, description, owner, ticket, expiry badge, and group membership.

#### `check` — find unknown flag references

```sh
npx vue-feature-toggles check
npx vue-feature-toggles check --src src/features
```

Scans `.ts`, `.tsx`, `.js`, `.jsx`, `.vue` files for `useFeature(...)`, `v-feature="..."`, `isEnabled(...)` calls. Reports any flag names not found in the config, with "did you mean?" suggestions. Exits with code 1 if unknown references are found — safe to use in CI.

#### `stale` — find flags overdue for cleanup

```sh
npx vue-feature-toggles stale
npx vue-feature-toggles stale --months 6
```

Reports boolean `true` flags whose `meta.addedAt` is older than `--months` (default: 3).

#### Global options

| Option            | Default                             | Description                    |
| ----------------- | ----------------------------------- | ------------------------------ |
| `--config <path>` | `feature-toggles.config.js`         | Path to config file            |
| `--root <path>`   | `.`                                 | Project root directory         |
| `--src <path>`    | `src` *(check only)*                | Source directory to scan       |
| `--months <n>`    | `3` *(stale only)*                  | Age threshold in months        |

---

## Loader providers

The plugin is backend-agnostic — pass any async function as `loader`:

```ts
// REST API
loader: async () => fetch('/api/flags').then(r => r.json())

// LaunchDarkly
loader: async () => {
  const client = LDClient.initialize(envKey, user)
  await client.waitUntilReady()
  return client.allFlags()
}

// localStorage
loader: async () => JSON.parse(localStorage.getItem('feature-flags') ?? '{}')

// Role-based
loader: async () => {
  const user = await getUser()
  return {
    adminPanel:   user.role === 'admin',
    betaFeature:  user.plan === 'pro',
    newDashboard: true,
  }
}
```

---

## Types

```ts
import type {
  FeatureTogglesOptions,
  FeatureProvider,
  FlagSource,
  FlagValue,
  FlagMeta,
  FlagName,
  SetFlagOptions,
  LiveUpdatesOptions,
} from 'vue-feature-toggles'
```

```ts
// FlagValue is boolean OR a variant string
type FlagValue = boolean | string

// All flag source tiers
type FlagSource = 'url' | 'runtime' | 'rules' | 'loader' | 'static' | 'default'

interface FlagMeta {
  description?: string
  owner?:       string
  addedAt?:     string  // ISO date string, e.g. '2025-03-01'
  ticket?:      string
}

interface SetFlagOptions {
  persist?: boolean  // save to localStorage
}

interface LiveUpdatesOptions {
  type:             'sse' | 'websocket'
  url:              string
  reconnectDelay?:  number  // ms, default: 3000
}

// FlagName resolves to a union of your declared flag names when FeatureFlagNames is augmented,
// or falls back to string when it is empty.
type FlagName = keyof FeatureFlagNames extends never ? string : keyof FeatureFlagNames
```

---

## Exports

```ts
// Main entry — vue-feature-toggles
import {
  FeatureToggles,      // plugin for app.use()
  Feature,             // <Feature> component
  FeatureVariant,      // <FeatureVariant> component
  FeatureDevTools,     // DevTools overlay component
  vFeature,            // v-feature directive
  useFeature,          // composable
  useFeatureVariant,   // composable for variant flags
  useFeatureProvider,  // low-level composable
  FEATURE_PROVIDER_KEY,
} from 'vue-feature-toggles'

import type {
  FeatureTogglesOptions, FeatureProvider,
  FlagSource, FlagValue, FlagMeta, FlagName,
  SetFlagOptions, LiveUpdatesOptions,
} from 'vue-feature-toggles'

// Testing utilities (excluded from production bundle)
import { createTestFeatureProvider, withFeatures, setTestFlag, resetTestProvider } from 'vue-feature-toggles/testing'

// Storybook decorator (excluded from production bundle)
import { withFeatureToggles } from 'vue-feature-toggles/storybook'

// Nuxt module
// modules: ['vue-feature-toggles/nuxt']
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
- `@nuxt/kit` — required only when using the Nuxt module (included automatically with any Nuxt 3 installation)
- `@vue/devtools-api` — optional, enables the Vue DevTools inspector/timeline integration

---

## License

MIT

---

## Author

Danil Lisin Vladimirovich aka Macrulez

GitHub: [macrulezru](https://github.com/macrulezru) · Website: [macrulez.ru](https://macrulez.ru/)

Questions and bugs — [issues](https://github.com/macrulezru/vue-feature-toggles/issues)

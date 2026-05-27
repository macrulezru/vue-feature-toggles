<div align="center" style="background:#111827;border-radius:20px;padding:28px 20px 20px;margin-bottom:32px">
  <h1 style="color:#f9fafb;margin:0 0 32px;font-size:2.2em;letter-spacing:-0.03em;font-weight:700;font-family:sans-serif">
    vue-feature-toggles
  </h1>
  <img
    src="https://s3.twcstorage.ru/c9a2cc89-780f97fd-311d-4a1a-b86f-c25665c9dc46/images/npm/vue-feature-toggles.webp"
    alt="vue-feature-toggles"
    style="max-width:100%;width:auto;height:300px;border-radius:12px"
  />
</div>

Lightweight, backend-agnostic feature flags plugin for Vue 3 — boolean and multivariate flags, contextual rules, URL overrides, live updates, SSR hydration, a DevTools overlay, and a CLI — with a single peer dependency.

---

## Contents

- [Features](#features)
- [Installation](#installation)
- [Demo](#demo)
- [Quick start](#quick-start)
- [Initialization options](#initialization-options)
- [`<Feature>` component](#feature-component)
- [`v-feature` directive](#v-feature-directive)
- [`useFeature`](#usefeature)
- [Multivariate flags](#multivariate-flags--featurevariant)
- [`useFeatureProvider`](#usefeatureprovider)
- [Feature variables](#feature-variables)
- [Flag groups](#flag-groups)
- [Flag dependencies](#flag-dependencies)
- [Contextual rules](#contextual-rules)
- [URL overrides](#url-overrides)
- [Persistent overrides](#persistent-overrides)
- [Override profiles](#override-profiles)
- [SSR / Hydration](#ssr--hydration)
- [Live updates](#live-updates-sse--websocket)
- [Flag metadata & expiry](#flag-metadata--expiry)
- [Type safety](#type-safety)
- [`<FeatureDevTools>` panel](#featuredevtools-panel)
- [Vue DevTools integration](#vue-devtools-integration)
- [Nuxt module](#nuxt-module)
- [Testing utilities](#testing-utilities)
- [Storybook addon](#storybook-addon)
- [CLI](#cli)
- [Adapter loaders](#adapter-loaders)
- [Vite plugin](#vite-plugin)
- [TypeScript types](#typescript-types)
- [Exports](#exports)
- [Architecture](#architecture)
- [Bundle size & peer dependencies](#bundle-size--peer-dependencies)

---

## Features

- **`FeatureToggles` plugin** — Vue plugin with static flags, async loader, polling interval, URL overrides, SSR state, and live updates in one `app.use()` call
- **`<Feature>` component** — conditional rendering via default / fallback / loading slots; inverted mode; group checks; optional HTML wrapper tag
- **`v-feature` directive** — `v-show`-style toggle (`display: none`) for single flags, inverted flags, or AND checks across multiple flags
- **`useFeature`** — composable returning reactive `Ref<boolean>` per flag or `Record<string, Ref<boolean>>` for multiple flags
- **Multivariate flags** — string variants for A/B tests and rollouts; `useFeatureVariant` composable; `<FeatureVariant>` with named slots per variant
- **`useFeatureProvider`** — full low-level API: `setFlag`, `resetFlag`, `reload`, `watchFlag`, groups, profiles, variables, dependencies, expiry, and more
- **Contextual rules** — reactive functions evaluated as flag sources; priority below URL overrides and `setFlag`, above loader and static
- **URL overrides** — query params override flags without a page reload; configurable prefix; works for boolean and variant flags and variables
- **Persistent overrides** — `setFlag(..., { persist: true })` saves to `localStorage`; survives page reloads; `clearPersistedFlags()` for cleanup
- **Override profiles** — named sets of overrides stored in `localStorage`; switchable from the DevTools panel; useful for QA and demos
- **Flag groups** — `setGroup('beta', false)` toggles a whole group at once; `isGroupEnabled` is `true` only when all members are on
- **Flag dependencies** — dependent flag forced off when its required flag is disabled; violations exposed via `getDependencyViolations()`
- **Live updates** — SSE or WebSocket push; server sends only changed flags; automatic reconnect
- **Flag metadata & expiry** — `description`, `owner`, `addedAt`, `ticket` per flag; automatic date-based expiry with dev-console warnings
- **`<FeatureDevTools>`** — floating overlay with Flags / Groups / History tabs; search, filter by source, per-flag controls, variable editor, profile switcher; draggable, collapsible
- **Vue DevTools integration** — optional `@vue/devtools-api`; inspector tab and timeline layer; loads dynamically, silently skips when absent
- **Nuxt module** — global component registration, automatic SSR hydration via `nuxtApp.payload`, `$featureToggles` injection
- **Testing utilities** — `withFeatures`, `createTestFeatureProvider`, `setTestFlag`, `resetTestProvider`; excluded from production bundle
- **Storybook addon** — `withFeatureToggles` decorator with per-story `parameters.featureToggles`; excluded from production bundle
- **Adapter loaders** — pre-built loaders for LaunchDarkly, Unleash, and Flagsmith
- **Vite plugin** — strips `<FeatureDevTools>` from templates in production builds automatically
- **CLI** — `list`, `check`, `stale` commands; reads config directly from source files; CI-safe exit codes
- **Full TypeScript** — augment `FeatureFlagNames` interface for autocomplete and compile-time errors on flag names everywhere

---

## Installation

```bash
npm install vue-feature-toggles
```

Peer dependency:

```bash
npm install vue@>=3.0
```

---

## Demo

```bash
git clone https://github.com/macrulezru/vue-feature-toggles.git
cd vue-feature-toggles
npm install
npm run dev
```

Opens at `http://localhost:5174`. The demo covers all three interfaces — component, directive, and composable — with runtime flag controls and URL override examples.

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

## `<Feature>` component

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

### Props

| Prop       | Type                  | Default | Description                                             |
| ---------- | --------------------- | ------- | ------------------------------------------------------- |
| `name`     | `string`              | —       | Flag name                                               |
| `group`    | `string`              | —       | Group name (alternative to `name`)                      |
| `fallback` | `string \| Component` | `null`  | What to render when the flag is off                     |
| `inverted` | `boolean`             | `false` | Render when the flag is `false`                         |
| `tag`      | `string`              | —       | Wrap content in an HTML element (no wrapper by default) |

### Slots

| Slot       | Description                                  |
| ---------- | -------------------------------------------- |
| `default`  | Content when the flag is on                  |
| `fallback` | Content when the flag is off                 |
| `loading`  | Content while flags are loading via `loader` |

---

## `v-feature` directive

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

## `useFeature`

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

## Multivariate flags & `<FeatureVariant>`

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

## `useFeatureProvider`

Full access to the provider internals — use for imperative flag control, observability, and advanced integrations.

```ts
import { useFeatureProvider } from 'vue-feature-toggles'

const {
  // State
  flags,      // Ref<Record<string, FlagValue>> — all current flag values
  isLoading,  // Ref<boolean> — true while loader is running
  isReady,    // Ref<boolean> — true after first load

  // Boolean flags
  isEnabled,     // (name) => boolean
  setFlag,       // (name, value, options?) => void
  resetFlag,     // (name) => void
  resetAll,      // () => void
  reload,        // () => Promise<void>
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
  isPersisted,         // (name) => boolean
  clearPersistedFlags, // () => void

  // Metadata & expiry
  getFlagMeta, // (name) => FlagMeta | undefined
  isExpired,   // (name) => boolean

  // SSR
  serialize,   // () => Record<string, FlagValue>

  // Subscriptions
  watchFlag,   // (name, callback, options?) => WatchStopHandle

  // Rollout introspection
  getRollout,       // (name) => number | undefined
  getSchedule,      // (name) => FlagSchedule | undefined
  isScheduleActive, // (name) => boolean

  // Introspection
  listVariables, // (flagName) => string[]
  listGroups,    // () => Record<string, string[]>
} = useFeatureProvider()
```

### Common patterns

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

### Priority order (highest → lowest)

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
import { serializeFlags } from 'vue-feature-toggles'

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

### Flags tab

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
- **Variables** — flags with `variables` configured show a `▸ N` expand button; click to reveal per-variable inputs
- **Footer actions**: Reset all · Reload from loader · Copy URL · Export overrides as JSON · Import overrides from JSON
- **Profiles** — if saved profiles exist, a dropdown lets you switch between them instantly

### Groups tab

Shows every group defined in the `groups` option.

- Each group row displays: group name, `N/M` enabled counter, `ALL ON / PARTIAL` status badge, and **ON / OFF / reset** buttons
- Member flags shown as colored chips (green = enabled, grey = disabled)
- **Footer**: Reset all groups

### History tab

A chronological log of the last 20 flag changes recorded during the session.

- Each entry shows: timestamp, flag name, source badge, new value badge
- **Footer**: Clear

### General

- **Draggable** — drag by the header; viewport-clamped; position saved in `sessionStorage`
- **Collapsible** — collapse to a title bar with the chevron button

---

## Vue DevTools integration

A custom inspector tab and timeline layer appear in the browser Vue DevTools extension when `@vue/devtools-api` is installed.

```bash
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

### Custom loader with Nuxt

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

```ts
import { createTestFeatureProvider, withFeatures, setTestFlag, resetTestProvider } from 'vue-feature-toggles/testing'
```

### Mount with flags

```ts
import { mount } from '@vue/test-utils'
import { withFeatures } from 'vue-feature-toggles/testing'

const wrapper = mount(MyComponent, withFeatures({
  newDashboard: true,
  betaSearch:   false,
}))
```

### Full provider access in tests

```ts
import { createTestFeatureProvider } from 'vue-feature-toggles/testing'

const { install, provider } = createTestFeatureProvider({ newDashboard: true })

const wrapper = mount(MyComponent, {
  global: { plugins: [{ install }] },
})

provider.setFlag('newDashboard', false)
await nextTick()
```

### Change flags mid-test

```ts
import { setTestFlag } from 'vue-feature-toggles/testing'

it('hides the component when flag is off', async () => {
  const wrapper = mount(MyComponent, withFeatures({ betaSearch: true }))
  expect(wrapper.find('[data-testid="beta"]').exists()).toBe(true)

  await setTestFlag('betaSearch', false) // awaits nextTick automatically
  expect(wrapper.find('[data-testid="beta"]').exists()).toBe(false)
})
```

### Cleanup

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

```bash
npx vue-feature-toggles <command> [options]
```

The CLI reads configuration directly from your source files — no separate config file needed. It scans for `app.use(FeatureToggles, { ... })` and statically extracts `flags`, `meta`, `expiry`, `groups`, and `dependencies`.

```ts
// main.ts — the CLI reads this automatically
app.use(FeatureToggles, {
  flags:  { newDashboard: true, betaSearch: false, checkoutFlow: 'v1' },
  meta:   { newDashboard: { owner: 'alice', addedAt: '2024-01-15', ticket: 'PROJ-42' } },
  expiry: { betaBanner: '2025-06-01' },
  groups: { beta: ['betaSearch'] },
  // rules, loader — dynamic, not parsed by CLI
})
```

If you need an explicit override (e.g. in a monorepo), create `feature-toggles.config.js` in the project root — it takes priority over source scanning:

```js
// feature-toggles.config.js  (optional explicit override)
export default {
  flags:  { newDashboard: true, betaSearch: false },
  meta:   { newDashboard: { owner: 'alice', addedAt: '2024-01-15' } },
}
```

### `list` — show all flags

```bash
npx vue-feature-toggles list
```

Prints an aligned table with flag name, value, source, owner, addedAt, expiry badge, and group membership.

```
Flag             Value  Source  Owner      Added       Expiry     Groups
──────────────────────────────────────────────────────────────────────────
newDashboard     true   static  frontend   2025-01-15             layout
betaSearch       false  static  search-…   2025-06-01             beta
checkoutFlow     v1     static  checkout   2025-09-01
christmasBanner  true   static  marketing  2024-11-01  [EXPIRED]
```

### `check` — find unknown flag references

```bash
npx vue-feature-toggles check
npx vue-feature-toggles check ./src/features
npx vue-feature-toggles check --src src/features
```

Scans `.ts`, `.tsx`, `.js`, `.jsx`, `.vue` files for `useFeature(...)`, `v-feature="..."`, `isEnabled(...)` calls. Lists each found reference — ✅ known, ❌ unknown with "did you mean?" suggestion. Exits with code 1 on unknown references — safe for CI.

```
✅ newDashboard
✅ betaSearch
❌ newCheckout  — unknown flag. Did you mean: checkoutFlow?
```

### `stale` — find flags overdue for cleanup

```bash
npx vue-feature-toggles stale
npx vue-feature-toggles stale --months 6
```

Reports boolean `true` flags whose `meta.addedAt` is older than `--months` (default: 3). These are candidates for removal — the feature has been live long enough that the flag is dead code.

### Global options

| Option            | Default              | Description                    |
| ----------------- | -------------------- | ------------------------------ |
| `--config <path>` | *(scan source files)* | Explicit config file override  |
| `--root <path>`   | `.`                  | Project root directory         |
| `--src <path>`    | `src` *(check only)* | Source directory to scan       |
| `--months <n>`    | `3` *(stale only)*   | Age threshold in months        |

---

## Adapter loaders

Pre-built loaders for common flag management services, imported from `vue-feature-toggles/adapters`.

```ts
import { launchDarklyLoader, unleashLoader, flagsmithLoader } from 'vue-feature-toggles/adapters'
```

### LaunchDarkly

```ts
app.use(FeatureToggles, {
  loader: launchDarklyLoader({
    clientSideId: 'your-client-side-id',
    user: { key: userId },
  }),
})
```

### Unleash

```ts
app.use(FeatureToggles, {
  loader: unleashLoader({
    url:       'https://unleash.example.com/api',
    appName:   'my-app',
    clientKey: 'default:development.abc123',
    userId,    // optional — adds UNLEASH-INSTANCEID header
  }),
})
```

### Flagsmith

```ts
app.use(FeatureToggles, {
  loader: flagsmithLoader({
    apiKey:   'ser.your-api-key',
    identity: userId, // optional — enables per-user evaluation
  }),
})
```

---

## Vite plugin

Automatically strips `<FeatureDevTools>` and its import from all source files during production builds — no `v-if="isDev"` wrapper needed.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { featureTogglesPlugin } from 'vue-feature-toggles/vite'

export default defineConfig({
  plugins: [vue(), featureTogglesPlugin()],
})
```

| Option          | Default | Description                                       |
| --------------- | ------- | ------------------------------------------------- |
| `stripDevTools` | `true`  | Remove `<FeatureDevTools>` from templates in prod |

---

## TypeScript types

All public types are exported from the package root:

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
  type:            'sse' | 'websocket'
  url:             string
  reconnectDelay?: number  // ms, default: 3000
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

// Adapter loaders (LaunchDarkly, Unleash, Flagsmith)
import { launchDarklyLoader, unleashLoader, flagsmithLoader } from 'vue-feature-toggles/adapters'

// Vite plugin — strips <FeatureDevTools> in production builds
import { featureTogglesPlugin } from 'vue-feature-toggles/vite'

// Nuxt module
// modules: ['vue-feature-toggles/nuxt']
```

---

## Architecture

```
vue-feature-toggles
│
├── FeatureProvider  (core singleton, created by the plugin)
│     FlagStore        — Map<name, FlagValue>; reactive via shallowRef
│     SourceIndex      — Map<name, FlagSource>; priority tier per flag
│     VariableStore    — Map<flagName+varName, Ref<T>>
│     ProfileStore     — reads/writes named snapshots to localStorage
│
├── Priority chain  (highest → lowest)
│     UrlOverrideLayer   — reads query params on init; reactively updates via URLSearchParams
│     RuntimeLayer       — setFlag() / setVariant() / setVariable(); persist option → localStorage
│     RulesLayer         — watches reactive rule functions; re-evaluates when deps change
│     LoaderLayer        — async loader; optional polling via setInterval; live update listener
│     StaticLayer        — flags/variables from plugin options
│     DefaultLayer       — defaultValue fallback
│
├── DependencyManager
│     Computes forced-off flags when required flags are disabled
│     Emits dev-console warnings on violation; exposes getDependencyViolations()
│
├── GroupManager
│     setGroup() fans out to all member flags via RuntimeLayer
│     isGroupEnabled() checks all members synchronously
│
├── ExpiryManager
│     Compares meta.expiry dates against Date.now() on every isEnabled() call
│     Expired flags return defaultValue; dev-console warning on first access
│
├── LiveUpdatesManager
│     SSE — EventSource; auto-reconnect on error
│     WebSocket — native WebSocket; configurable reconnectDelay
│     Both merge the received partial flags object into LoaderLayer
│
├── <Feature> / <FeatureVariant>
│     Inject FEATURE_PROVIDER_KEY; render via computed isEnabled / getVariant
│     Loading slot shown while isLoading.value is true
│
├── v-feature directive
│     beforeMount + updated hooks; sets el.style.display based on flag value
│
├── useFeature / useFeatureVariant
│     Thin wrappers returning computed Refs from FeatureProvider
│
├── <FeatureDevTools>
│     Three-tab overlay: Flags · Groups · History
│     Draggable via mousedown + mousemove; position persisted in sessionStorage
│     Reads/writes directly via useFeatureProvider()
│
├── DevTools integration  (optional @vue/devtools-api)
│     Loaded dynamically; silently skips if package absent
│     Inspector: all flags with source badges
│     Timeline: flag change events with prev/next value
│
├── /testing  (separate entry point)
│     createTestFeatureProvider — isolated FeatureProvider, no localStorage side-effects
│     withFeatures — @vue/test-utils mount options shorthand
│     setTestFlag — sets flag + awaits nextTick
│     resetTestProvider — clears all runtime overrides
│
├── /storybook  (separate entry point)
│     withFeatureToggles — Storybook decorator; merges story parameters on top of global defaults
│
├── /adapters  (separate entry point)
│     launchDarklyLoader, unleashLoader, flagsmithLoader
│     Each returns an async () => Record<string, FlagValue> compatible with the loader option
│
├── /vite  (separate entry point)
│     featureTogglesPlugin — Vite transform that removes <FeatureDevTools> in production
│
└── /nuxt  (module)
      Registers <Feature>, <FeatureVariant>, v-feature globally via addComponent / addDirective
      Installs plugin via addPlugin with runtimeConfig.featureToggles
      Handles SSR state via nuxtApp.payload (no ssrState config needed)
```

---

## Bundle size & peer dependencies

| Entry point                       | Peer deps              | Notes                                         |
| --------------------------------- | ---------------------- | --------------------------------------------- |
| `vue-feature-toggles`             | `vue ^3.0`             | Core — plugin, components, directive, composables |
| `vue-feature-toggles/testing`     | `vue ^3.0`             | Test helpers only; excluded from prod bundle  |
| `vue-feature-toggles/storybook`   | `vue ^3.0`             | Storybook decorator only; excluded from prod  |
| `vue-feature-toggles/adapters`    | `vue ^3.0`             | LaunchDarkly, Unleash, Flagsmith loaders      |
| `vue-feature-toggles/vite`        | `vite ^4`              | Vite transform plugin                         |
| `vue-feature-toggles/nuxt`        | `vue ^3.0`, `@nuxt/kit` (optional peer) | Nuxt 3 module             |

The package ships as tree-shakeable ESM (`dist/*.js`) and CommonJS (`dist/*.cjs`). `@vue/devtools-api` is an optional peer dependency — the DevTools integration is loaded dynamically and silently skipped when the package is absent or when Vue DevTools are closed.

---

## License

MIT

---

## Author

Danil Lisin Vladimirovich aka Macrulez

GitHub: [macrulezru](https://github.com/macrulezru) · Website: [macrulez.ru/en](https://macrulez.ru/en)

Questions and bugs — [issues](https://github.com/macrulezru/vue-feature-toggles/issues)

---

## 💖 Support the project

Open source takes time and effort. If my work saves you time or brings value, consider supporting further development.

<a href="https://donate.cryptocloud.plus/M6O34NIN" target="_blank">
  <img src="https://img.shields.io/badge/Donate-CryptoCloud-8A2BE2?style=for-the-badge&logo=cryptocurrency&logoColor=white" alt="Donate via CryptoCloud">
</a>

Thank you for being part of this journey. ❤️

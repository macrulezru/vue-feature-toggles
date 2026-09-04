# **Feature Toggles**

![Feature Toggles](https://github.com/macrulezru/assets/blob/master/packages-images/vue-feature-toggles.png?raw=true)

Lightweight, backend-agnostic feature flags plugin for Vue 3 — boolean and multivariate flags, contextual rules, URL overrides, live updates, SSR hydration, a DevTools overlay, and a CLI — with a single peer dependency.

---

## Features

- **`FeatureToggles` plugin** — Vue plugin with static flags, async loader, polling interval, URL overrides, SSR state, and live updates in one `app.use()` call
- **`<Feature>` component** — conditional rendering via default / fallback / loading slots; inverted mode; group checks; optional HTML wrapper tag
- **`v-feature` directive** — `v-show`-style toggle (`display: none`) for single flags, inverted flags, or AND checks across multiple flags
- **`useFeature`** — composable returning reactive `Ref<boolean>` per flag or `Record<string, Ref<boolean>>` for multiple flags
- **Multivariate flags** — string variants for A/B tests and rollouts; `useFeatureVariant` composable; `<FeatureVariant>` with named slots per variant
- **`useFeatureProvider`** — full low-level API: `setFlag`, `resetFlag`, `reload`, `watchFlag`, groups, profiles, variables, dependencies, expiry, and more
- **Contextual rules** — reactive functions evaluated as flag sources; priority below URL overrides and `setFlag`, above loader and static
- **Percentage rollout** — `{ value, rollout }` flag definitions bucket users deterministically by `userId`, without a backend
- **Scheduling** — activate or deactivate a flag automatically between two dates, independent of any manual override
- **URL overrides** — query params override flags without a page reload; configurable prefix; works for boolean and variant flags and variables
- **Persistent overrides** — `setFlag(..., { persist: true })`/`setVariant(..., { persist: true })` saves to `localStorage`; survives page reloads; `clearPersistedFlags()` for cleanup
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

| Dependency          | Minimum version | Needed for                                                  |
| -------------------- | ------------------ | -------------------------------------------------------------- |
| Vue                 | `3.0+`             | Everything (only required peer)                                 |
| Node.js             | `18+`              | Build/dev tooling, CLI                                          |
| `@nuxt/kit`         | `3.0+`             | The Nuxt module (`vue-feature-toggles/nuxt`), optional peer     |
| `@vue/devtools-api` | `7.0+`             | Vue DevTools browser-extension integration, optional peer       |

`vite` is **not** a peer dependency of the package — `vue-feature-toggles/vite` is a plain Vite plugin, so it only needs whatever `vite` your project already has installed as a build tool.

```bash
npm install vue-feature-toggles
```

### Quick start

```ts
// main.ts
import { createApp } from 'vue'
import { FeatureToggles } from 'vue-feature-toggles'
import App from './App.vue'

const app = createApp(App)

app.use(FeatureToggles, {
  flags: {
    newDashboard: true,
    betaSearch: false,
    darkMode: true,
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

## Documentation & links

- 📖 **Full documentation:** [npm.vuecraft.ru/en/packages/vue-feature-toggles](https://npm.vuecraft.ru/en/packages/vue-feature-toggles/guide/overview.html)
- 🌐 **VueCraft:** [vuecraft.ru/en](https://vuecraft.ru/en)
- 👤 **Author:** [macrulez.ru/en](https://macrulez.ru/en)
- 💻 **GitHub:** [macrulezru/vue-feature-toggles](https://github.com/macrulezru/vue-feature-toggles)
- 📦 **NPM:** [vue-feature-toggles](https://www.npmjs.com/package/vue-feature-toggles)
- 🐛 **Issues:** [github.com/macrulezru/vue-feature-toggles/issues](https://github.com/macrulezru/vue-feature-toggles/issues)

---

## License

MIT

---

## 💖 Support the project

Open source takes time and effort. If this library saves you time or brings value, consider supporting further development.

<a href="https://donate.cryptocloud.plus/M6O34NIN" target="_blank">
  <img src="https://img.shields.io/badge/Donate-CryptoCloud-8A2BE2?style=for-the-badge&logo=cryptocurrency&logoColor=white" alt="Donate via CryptoCloud">
</a>

Thank you for being part of this journey. ❤️

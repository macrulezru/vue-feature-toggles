/**
 * Vue DevTools integration for vue-feature-toggles.
 * Requires @vue/devtools-api as an optional peer dependency.
 * Silently skips when devtools are not available or the package is not installed.
 */
import { watch } from 'vue'
import type { App } from 'vue'
import type { FeatureProvider } from './core/types'

const INSPECTOR_ID = 'vue-feature-toggles'
const TIMELINE_ID  = 'vue-feature-toggles'

export function setupVueDevtools(app: App, provider: FeatureProvider): void {
  // Dynamic import keeps @vue/devtools-api out of the main bundle.
  // Silently fails if the package is not installed or devtools are unavailable.
  import('@vue/devtools-api').then(({ setupDevtoolsPlugin }) => {
    setupDevtoolsPlugin(
      {
        id: 'vue-feature-toggles',
        label: 'Feature Toggles',
        packageName: 'vue-feature-toggles',
        homepage: 'https://github.com/macrulezru/vue-feature-toggles',
        logo: 'https://vuejs.org/images/logo.png',
        app,
      },
      (api) => {
        // ── Inspector (flag tree) ──────────────────────────────────────────────
        api.addInspector({
          id: INSPECTOR_ID,
          label: 'Feature Toggles',
          icon: 'flag',
          treeFilterPlaceholder: 'Search flags…',
        })

        api.on.getInspectorTree((payload) => {
          if (payload.inspectorId !== INSPECTOR_ID) return
          payload.rootNodes = Object.entries(provider.flags.value).map(([name, value]) => ({
            id: name,
            label: name,
            tags: [
              {
                label: String(value),
                textColor: 0x000000,
                backgroundColor: typeof value === 'boolean'
                  ? (value ? 0xd1fae5 : 0xfee2e2)
                  : 0xede9fe,
              },
              {
                label: provider.getFlagSource(name),
                textColor: 0x374151,
                backgroundColor: 0xf3f4f6,
              },
            ],
          }))
        })

        api.on.getInspectorState((payload) => {
          if (payload.inspectorId !== INSPECTOR_ID) return
          const name = payload.nodeId
          const meta = provider.getFlagMeta(name)
          payload.state = {
            Flag: [
              { key: 'value',     value: provider.flags.value[name] },
              { key: 'source',    value: provider.getFlagSource(name) },
              { key: 'expired',   value: provider.isExpired(name) },
              { key: 'persisted', value: provider.isPersisted(name) },
            ],
            ...(meta ? {
              Meta: [
                { key: 'description', value: meta.description ?? '—' },
                { key: 'owner',       value: meta.owner ?? '—' },
                { key: 'ticket',      value: meta.ticket ?? '—' },
                { key: 'addedAt',     value: meta.addedAt ?? '—' },
              ],
            } : {}),
          }
        })

        // ── Timeline ─────────────────────────────────────────────────────────
        api.addTimelineLayer({
          id: TIMELINE_ID,
          color: 0x41b883,
          label: 'Feature Flag Changes',
        })

        watch(
          () => ({ ...provider.flags.value }),
          (newFlags, oldFlags) => {
            if (!oldFlags) return
            for (const [name, value] of Object.entries(newFlags)) {
              if (oldFlags[name] !== value) {
                api.addTimelineEvent({
                  layerId: TIMELINE_ID,
                  event: {
                    time: Date.now(),
                    title: name,
                    subtitle: `→ ${value}`,
                    data: {
                      flag: name,
                      value,
                      previousValue: oldFlags[name],
                      source: provider.getFlagSource(name),
                    },
                  },
                })
                api.sendInspectorTree(INSPECTOR_ID)
                api.sendInspectorState(INSPECTOR_ID)
              }
            }
          },
        )
      },
    )
  }).catch(() => {
    // @vue/devtools-api not installed or devtools inactive — skip silently
  })
}

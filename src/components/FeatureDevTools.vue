<script lang="ts">
import { defineComponent, inject, computed, ref, h, Fragment } from 'vue'
import type { VNode } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider, FlagSource } from '../core/types'

const SOURCE_STYLES: Record<FlagSource, { background: string; color: string; label: string }> = {
  url:     { background: '#dbeafe', color: '#1e40af', label: 'url' },
  runtime: { background: '#ffedd5', color: '#9a3412', label: 'runtime' },
  loader:  { background: '#ede9fe', color: '#5b21b6', label: 'loader' },
  static:  { background: '#f3f4f6', color: '#374151', label: 'static' },
  default: { background: '#f9fafb', color: '#9ca3af', label: 'default' },
}

const BASE: Record<string, string | number> = {
  position:   'fixed',
  bottom:     '16px',
  right:      '16px',
  zIndex:     99999,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize:   '12px',
  lineHeight: '1.5',
  color:      '#1f2937',
  background: '#ffffff',
  border:     '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow:  '0 4px 24px rgba(0,0,0,.12)',
  minWidth:   '280px',
  maxWidth:   '380px',
  maxHeight:  '480px',
  overflow:   'hidden',
  display:    'flex',
  flexDirection: 'column',
}

export default defineComponent({
  name: 'FeatureDevTools',

  props: {
    title: { type: String, default: 'Feature Toggles' },
  },

  setup(props) {
    const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)
    const collapsed = ref(false)

    const flagEntries = computed(() => {
      if (!provider) return []
      return Object.entries(provider.flags.value).map(([name, value]) => ({
        name,
        value,
        source: provider.getFlagSource(name),
        isOverridden: ['url', 'runtime'].includes(provider.getFlagSource(name)),
      }))
    })

    const toggle = (name: string, current: boolean) => provider?.setFlag(name, !current)
    const reset  = (name: string) => provider?.resetFlag(name)

    return () => {
      if (!provider) return null

      const header: VNode = h('div', {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: '#f9fafb',
          borderBottom: collapsed.value ? 'none' : '1px solid #e5e7eb',
          cursor: 'default',
          borderRadius: collapsed.value ? '8px' : '8px 8px 0 0',
          userSelect: 'none',
        },
      }, [
        h('span', { style: { fontWeight: 700, fontSize: '11px', letterSpacing: '.04em', textTransform: 'uppercase', color: '#6b7280' } },
          `🚩 ${props.title}`),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
          h('span', { style: { fontSize: '10px', color: provider.isLoading.value ? '#d97706' : '#10b981' } },
            provider.isLoading.value ? '● loading' : provider.isReady.value ? '● ready' : '○ idle'),
          h('button', {
            style: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px', color: '#9ca3af' },
            onClick: () => { collapsed.value = !collapsed.value },
          }, [
            h('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: 14,
              height: 14,
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': 2.5,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
              style: { transition: 'transform .2s', transform: collapsed.value ? 'rotate(-90deg)' : 'rotate(0deg)' },
            }, [
              h('polyline', { points: '6 9 12 15 18 9' }),
            ]),
          ]),
        ]),
      ])

      if (collapsed.value) return h('div', { style: BASE }, [header])

      const rows: VNode[] = flagEntries.value.map(({ name, value, source, isOverridden }) => {
        const src = SOURCE_STYLES[source]
        return h('div', {
          key: name,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderBottom: '1px solid #f3f4f6',
          },
        }, [
          h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, name),
          h('span', {
            style: { padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600,
              background: src.background, color: src.color },
          }, src.label),
          h('span', {
            style: { padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
              background: value ? '#d1fae5' : '#fee2e2', color: value ? '#065f46' : '#991b1b' },
          }, value ? 'ON' : 'OFF'),
          h('button', {
            style: { padding: '2px 6px', borderRadius: '3px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '10px' },
            onClick: () => toggle(name, value),
          }, 'toggle'),
          isOverridden
            ? h('button', {
                style: { padding: '2px 6px', borderRadius: '3px', border: '1px solid #fca5a5', background: '#fff', cursor: 'pointer', fontSize: '10px', color: '#dc2626' },
                onClick: () => reset(name),
              }, 'reset')
            : null,
        ])
      })

      const footer: VNode = h('div', {
        style: { padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', background: '#f9fafb', borderRadius: '0 0 8px 8px' },
      }, [
        h('button', {
          style: { flex: 1, padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '11px' },
          onClick: () => provider.resetAll(),
        }, 'Reset all overrides'),
        h('button', {
          style: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: '11px' },
          onClick: () => provider.reload(),
          title: 'Reload flags from loader',
        }, '↺ reload'),
      ])

      const list: VNode = h('div', { style: { overflowY: 'auto', flex: 1 } }, rows)

      return h('div', { style: BASE }, [header, list, footer])
    }
  },
})
</script>

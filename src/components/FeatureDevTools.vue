<script lang="ts">
import { defineComponent, inject, computed, ref, watch, h } from 'vue'
import type { VNode } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider, FlagSource, FlagValue } from '../core/types'

type Tab = 'flags' | 'groups' | 'history'

interface HistoryEntry {
  time: string
  name: string
  value: FlagValue
  source: FlagSource
}

const SOURCE_STYLES: Record<FlagSource, { bg: string; color: string }> = {
  url:     { bg: '#dbeafe', color: '#1e40af' },
  runtime: { bg: '#ffedd5', color: '#9a3412' },
  rules:   { bg: '#dcfce7', color: '#166534' },
  loader:  { bg: '#ede9fe', color: '#5b21b6' },
  static:  { bg: '#f3f4f6', color: '#374151' },
  default: { bg: '#f9fafb', color: '#9ca3af' },
}

const ALL_SOURCES: FlagSource[] = ['url', 'runtime', 'rules', 'loader', 'static', 'default']

const BTN: Record<string, string | number> = {
  padding: '2px 7px', borderRadius: '3px', border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', fontSize: '10px', flexShrink: 0,
}

const BTN_XS: Record<string, string | number> = {
  ...BTN, padding: '1px 5px',
}

function svgIcon(width: number, height: number, sw: number, children: VNode[]): VNode {
  return h('svg', {
    width, height, viewBox: `0 0 ${width} ${height}`,
    fill: 'none', stroke: 'currentColor', 'stroke-width': sw,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    style: { display: 'block' }, 'aria-hidden': 'true',
  }, children)
}

const IconX = (): VNode => svgIcon(10, 10, 2, [
  h('line', { x1: 2, y1: 2, x2: 8, y2: 8 }),
  h('line', { x1: 8, y1: 2, x2: 2, y2: 8 }),
])

const IconExport = (): VNode => svgIcon(12, 12, 1.75, [
  h('line', { x1: 6, y1: 10, x2: 6, y2: 3 }),
  h('polyline', { points: '3,6 6,3 9,6' }),
  h('line', { x1: 1, y1: 11, x2: 11, y2: 11 }),
])

const IconImport = (): VNode => svgIcon(12, 12, 1.75, [
  h('line', { x1: 6, y1: 2, x2: 6, y2: 9 }),
  h('polyline', { points: '3,6 6,9 9,6' }),
  h('line', { x1: 1, y1: 11, x2: 11, y2: 11 }),
])

function parseVarVal(s: string): unknown {
  if (s === 'true') return true
  if (s === 'false') return false
  const n = Number(s)
  if (!isNaN(n) && s.trim() !== '') return n
  return s
}

function getInitialPos(): { x: number; y: number } {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const s = sessionStorage.getItem('vue-ft-devtools-pos')
      if (s) return JSON.parse(s)
    } catch {}
  }
  if (typeof window !== 'undefined') {
    return { x: Math.max(20, window.innerWidth - 460), y: Math.max(20, window.innerHeight - 640) }
  }
  return { x: 20, y: 20 }
}

export default defineComponent({
  name: 'FeatureDevTools',
  props: { title: { type: String, default: 'Feature Toggles' } },

  setup(props) {
    const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

    // ── Panel state ──────────────────────────────────────────────────────────
    const collapsed       = ref(false)
    const activeTab       = ref<Tab>('flags')
    const searchQuery     = ref('')
    const sourceFilter    = ref<FlagSource | ''>('')
    const showImport      = ref(false)
    const importJson      = ref('')
    const history         = ref<HistoryEntry[]>([])
    const pos             = ref(getInitialPos())
    const panelRef        = ref<HTMLElement | null>(null)
    const copyLabel       = ref('Copy URL')
    const newProfileName  = ref('')

    // Variables state: draft inputs per flag+varName
    const expandedVars    = ref<Set<string>>(new Set())
    const varInputs       = ref<Record<string, Record<string, string>>>({})

    // Variant editing state
    const editingVariant      = ref<string | null>(null)
    const editingVariantValue = ref('')

    // ── History tracking ─────────────────────────────────────────────────────
    if (provider) {
      watch(
        () => ({ ...provider.flags.value }),
        (newVals, oldVals) => {
          if (!oldVals) return
          const entries: HistoryEntry[] = []
          for (const [name, val] of Object.entries(newVals)) {
            if (oldVals[name] !== val) {
              entries.push({
                time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                name, value: val,
                source: provider.getFlagSource(name),
              })
            }
          }
          if (entries.length) history.value = [...entries, ...history.value].slice(0, 20)
        },
      )
    }

    // ── Computed ─────────────────────────────────────────────────────────────
    const flagEntries = computed(() => {
      if (!provider) return []
      const violations = provider.getDependencyViolations()
      let entries = Object.entries(provider.flags.value).map(([name, value]) => {
        const varNames = provider.listVariables(name)
        return {
          name, value,
          isVariant:     typeof value === 'string',
          source:        provider.getFlagSource(name),
          isOverridden:  ['url', 'runtime'].includes(provider.getFlagSource(name)),
          isExpired:     provider.isExpired(name),
          isPersisted:   provider.isPersisted(name),
          meta:          provider.getFlagMeta(name),
          depViolations: violations[name] ?? [],
          varNames,
          hasVars:       varNames.length > 0,
        }
      })
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        entries = entries.filter(e => e.name.toLowerCase().includes(q))
      }
      if (sourceFilter.value) {
        entries = entries.filter(e => e.source === sourceFilter.value)
      }
      return entries
    })

    const groupEntries = computed(() => {
      if (!provider) return []
      return Object.entries(provider.listGroups()).map(([name, members]) => ({
        name, members,
        enabled: provider.isGroupEnabled(name),
        enabledCount: members.filter(m => {
          const v = provider.flags.value[m]
          return v === true || (typeof v === 'string' && v !== '' && v !== 'false' && v !== '0')
        }).length,
      }))
    })

    const profileNames = computed(() => provider?.listProfiles() ?? [])

    // ── Viewport-clamped drag ─────────────────────────────────────────────────
    const startDrag = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('button,select,input,textarea')) return
      const startX = e.clientX - pos.value.x
      const startY = e.clientY - pos.value.y
      const onMove = (ev: MouseEvent) => {
        const w = panelRef.value?.offsetWidth ?? 380
        const h = panelRef.value?.offsetHeight ?? (collapsed.value ? 38 : 420)
        pos.value = {
          x: Math.max(0, Math.min(ev.clientX - startX, window.innerWidth - w)),
          y: Math.max(0, Math.min(ev.clientY - startY, window.innerHeight - h)),
        }
      }
      const onUp = () => {
        try { sessionStorage.setItem('vue-ft-devtools-pos', JSON.stringify(pos.value)) } catch {}
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
      e.preventDefault()
    }

    // ── Variable actions ──────────────────────────────────────────────────────
    const toggleVarExpand = (flagName: string, varNames: string[]) => {
      const next = new Set(expandedVars.value)
      if (next.has(flagName)) {
        next.delete(flagName)
      } else {
        next.add(flagName)
        if (!varInputs.value[flagName]) varInputs.value[flagName] = {}
        for (const varName of varNames) {
          if (!(varName in varInputs.value[flagName])) {
            varInputs.value[flagName][varName] = String(provider?.getVariable(flagName, varName).value ?? '')
          }
        }
      }
      expandedVars.value = next
    }

    const setVarFromInput = (flagName: string, varName: string) => {
      const raw = varInputs.value[flagName]?.[varName] ?? ''
      const parsed = parseVarVal(raw)
      provider?.setVariable(flagName, varName, parsed)
      if (!varInputs.value[flagName]) varInputs.value[flagName] = {}
      varInputs.value[flagName][varName] = String(parsed)
    }

    // ── Variant editing ───────────────────────────────────────────────────────
    const startVariantEdit = (name: string, cur: string) => {
      editingVariant.value = name
      editingVariantValue.value = cur
    }
    const confirmVariantEdit = () => {
      if (editingVariant.value) provider?.setVariant(editingVariant.value, editingVariantValue.value)
      editingVariant.value = null
      editingVariantValue.value = ''
    }
    const cancelVariantEdit = () => {
      editingVariant.value = null
      editingVariantValue.value = ''
    }

    // ── Flag actions ──────────────────────────────────────────────────────────
    const toggle = (name: string, value: FlagValue) => {
      if (typeof value === 'boolean') provider?.setFlag(name, !value)
    }

    const copyUrl = () => {
      if (!provider) return
      const url = new URL(window.location.href)
      for (const e of flagEntries.value) {
        if (provider.getFlagSource(e.name) === 'runtime') {
          url.searchParams.set(`feature:${e.name}`, String(e.value))
        }
      }
      navigator.clipboard?.writeText(url.toString())
      copyLabel.value = 'Copied!'
      setTimeout(() => { copyLabel.value = 'Copy URL' }, 2000)
    }

    const exportOverrides = () => {
      if (!provider) return
      const data: Record<string, FlagValue> = {}
      for (const e of flagEntries.value) {
        if (e.source === 'runtime') data[e.name] = e.value
      }
      navigator.clipboard?.writeText(JSON.stringify(data, null, 2))
    }

    const applyImport = () => {
      if (!provider) return
      try {
        const data = JSON.parse(importJson.value) as Record<string, FlagValue>
        for (const [name, value] of Object.entries(data)) {
          if (typeof value === 'boolean') provider.setFlag(name, value)
          else if (typeof value === 'string') provider.setVariant(name, value)
        }
        showImport.value = false
        importJson.value = ''
      } catch {}
    }

    const saveProfile = () => {
      if (!provider || !newProfileName.value.trim()) return
      provider.saveProfile(newProfileName.value.trim(), { ...provider.flags.value })
      newProfileName.value = ''
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return () => {
      if (!provider) return null

      const panelStyle: Record<string, string | number> = {
        position: 'fixed', left: `${pos.value.x}px`, top: `${pos.value.y}px`,
        zIndex: 99999, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px', lineHeight: 1.5, color: '#1f2937', background: '#ffffff',
        border: '1px solid #e5e7eb', borderRadius: '8px',
        boxShadow: '0 4px 24px rgba(0,0,0,.12)',
        minWidth: '320px', maxWidth: '460px', maxHeight: '640px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }

      // ── Header ────────────────────────────────────────────────────────────
      const header: VNode = h('div', {
        style: {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 12px', background: '#f9fafb',
          borderBottom: collapsed.value ? 'none' : '1px solid #e5e7eb',
          borderRadius: collapsed.value ? '8px' : '8px 8px 0 0',
          cursor: 'grab', userSelect: 'none',
        },
        onMousedown: startDrag,
      }, [
        h('span', {
          style: { fontWeight: 700, fontSize: '11px', letterSpacing: '.04em', textTransform: 'uppercase', color: '#6b7280' },
        }, `🚩 ${props.title}`),
        h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, [
          h('span', { style: { fontSize: '10px', color: provider.isLoading.value ? '#d97706' : '#10b981' } },
            provider.isLoading.value ? '● loading' : provider.isReady.value ? '● ready' : '○ idle'),
          h('button', {
            style: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af', display: 'flex', alignItems: 'center' },
            onClick: () => { collapsed.value = !collapsed.value },
          }, [
            h('svg', {
              xmlns: 'http://www.w3.org/2000/svg', width: 14, height: 14, viewBox: '0 0 24 24',
              fill: 'none', stroke: 'currentColor', 'stroke-width': 2.5,
              'stroke-linecap': 'round', 'stroke-linejoin': 'round',
              style: { transition: 'transform .2s', transform: collapsed.value ? 'rotate(-90deg)' : 'rotate(0deg)' },
            }, [h('polyline', { points: '6 9 12 15 18 9' })]),
          ]),
        ]),
      ])

      if (collapsed.value) return h('div', { ref: panelRef, style: panelStyle }, [header])

      // ── Tab bar ───────────────────────────────────────────────────────────
      const tabDefs: { key: Tab; label: string; badge: number }[] = [
        { key: 'flags',   label: 'Flags',   badge: Object.keys(provider.flags.value).length },
        { key: 'groups',  label: 'Groups',  badge: Object.keys(provider.listGroups()).length },
        { key: 'history', label: 'History', badge: history.value.length },
      ]

      const tabBar: VNode = h('div', {
        style: { display: 'flex', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '0 8px' },
      }, tabDefs.map(tab =>
        h('button', {
          style: {
            padding: '5px 10px 4px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '11px', fontWeight: activeTab.value === tab.key ? 700 : 400,
            color: activeTab.value === tab.key ? '#111827' : '#9ca3af',
            borderBottom: activeTab.value === tab.key ? '2px solid #374151' : '2px solid transparent',
            marginBottom: '-1px',
          },
          onClick: () => { activeTab.value = tab.key },
        }, tab.badge > 0 ? `${tab.label} ${tab.badge}` : tab.label),
      ))

      // ─────────────────────────────────────────────────────────────────────
      // FLAGS TAB
      // ─────────────────────────────────────────────────────────────────────
      const flagsToolbar: VNode = h('div', {
        style: { display: 'flex', gap: '6px', padding: '6px 10px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' },
      }, [
        h('input', {
          type: 'text', placeholder: '🔍 search…',
          value: searchQuery.value,
          onInput: (e: Event) => { searchQuery.value = (e.target as HTMLInputElement).value },
          style: { flex: 1, padding: '3px 7px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '11px', outline: 'none', background: '#fafafa' },
        }),
        h('select', {
          value: sourceFilter.value,
          onChange: (e: Event) => { sourceFilter.value = (e.target as HTMLSelectElement).value as FlagSource | '' },
          style: { padding: '3px 5px', borderRadius: '4px', border: '1px solid #e5e7eb', fontSize: '10px', background: '#fafafa', cursor: 'pointer' },
        }, [
          h('option', { value: '' }, 'all'),
          ...ALL_SOURCES.map(s => h('option', { value: s }, s)),
        ]),
      ])

      const renderFlagRows = (): VNode[] => {
        const rows: VNode[] = []

        for (const entry of flagEntries.value) {
          const { name, value, isVariant, source, isOverridden, isExpired, isPersisted, meta, depViolations, varNames, hasVars } = entry
          const src = SOURCE_STYLES[source]
          const hasDeps = depViolations.length > 0
          const isEditing = editingVariant.value === name
          const isVarsOpen = expandedVars.value.has(name)

          const metaParts: string[] = []
          if (meta?.description) metaParts.push(meta.description)
          if (meta?.owner)       metaParts.push(`Owner: ${meta.owner}`)
          if (meta?.ticket)      metaParts.push(`Ticket: ${meta.ticket}`)
          if (meta?.addedAt)     metaParts.push(`Added: ${meta.addedAt}`)
          const metaTitle = metaParts.join('\n') || undefined

          // Value cell — toggle or variant input
          const valueCell: VNode = isVariant
            ? (isEditing
              ? h('div', { style: { display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 } }, [
                  h('input', {
                    type: 'text', value: editingVariantValue.value,
                    onInput: (e: Event) => { editingVariantValue.value = (e.target as HTMLInputElement).value },
                    onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') confirmVariantEdit(); if (e.key === 'Escape') cancelVariantEdit() },
                    onVnodeMounted: (vn: VNode) => (vn.el as HTMLInputElement)?.focus(),
                    style: { width: '68px', padding: '1px 4px', border: '1px solid #93c5fd', borderRadius: '3px', fontSize: '10px', outline: 'none' },
                  }),
                  h('button', { style: { ...BTN_XS, border: '1px solid #86efac', color: '#166534' }, onClick: confirmVariantEdit }, '✓'),
                  h('button', { style: { ...BTN_XS, border: '1px solid #fca5a5', color: '#dc2626' }, onClick: cancelVariantEdit }, '✗'),
                ])
              : h('span', {
                  title: 'Click to edit',
                  style: { padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', flexShrink: 0, cursor: 'pointer', userSelect: 'none' },
                  onClick: () => startVariantEdit(name, String(value)),
                }, String(value))
            )
            : h('span', {
                style: { padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, flexShrink: 0, background: value ? '#d1fae5' : '#fee2e2', color: value ? '#065f46' : '#991b1b' },
              }, value ? 'ON' : 'OFF')

          rows.push(h('div', {
            key: name,
            style: { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderBottom: '1px solid #f3f4f6', background: isExpired ? '#fffbeb' : hasDeps ? '#fff7ed' : undefined },
          }, [
            h('span', {
              style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isExpired ? '#92400e' : hasDeps ? '#9a3412' : undefined },
              title: metaTitle,
            }, [
              name,
              isExpired ? h('span', { style: { marginLeft: '4px', fontSize: '10px', color: '#d97706' }, title: 'Expired' }, '⚠') : null,
              hasDeps   ? h('span', { style: { marginLeft: '4px', fontSize: '10px', color: '#dc2626' }, title: `Requires: ${depViolations.join(', ')}` }, '⛓') : null,
              meta      ? h('span', { style: { marginLeft: '3px', fontSize: '10px', color: '#9ca3af', cursor: 'help' }, title: metaTitle }, 'ℹ') : null,
            ]),
            isPersisted ? h('span', { title: 'Persisted in localStorage', style: { fontSize: '10px' } }, '💾') : null,
            h('span', { style: { padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 600, background: src.bg, color: src.color, flexShrink: 0 } }, source),
            valueCell,
            !isVariant
              ? h('button', { style: BTN, onClick: () => toggle(name, value) }, 'toggle')
              : null,
            isOverridden && !isEditing
              ? h('button', {
                  title: 'Reset override',
                  style: { ...BTN, border: '1px solid #fca5a5', color: '#dc2626', padding: '2px 5px', display: 'flex', alignItems: 'center' },
                  onClick: () => provider.resetFlag(name),
                }, [IconX()])
              : null,
            hasVars
              ? h('button', {
                  title: `${varNames.length} variable${varNames.length !== 1 ? 's' : ''}`,
                  style: { ...BTN, background: isVarsOpen ? '#ede9fe' : '#fff', color: isVarsOpen ? '#5b21b6' : '#6b7280' },
                  onClick: () => toggleVarExpand(name, varNames),
                }, `${isVarsOpen ? '▾' : '▸'} ${varNames.length}`)
              : null,
          ]))

          // Variable sub-rows
          if (isVarsOpen) {
            for (const varName of varNames) {
              const currentVal = provider.getVariable(name, varName).value
              const inputVal = varInputs.value[name]?.[varName] ?? String(currentVal ?? '')
              rows.push(h('div', {
                key: `${name}::${varName}`,
                style: { display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 10px 3px 26px', background: '#faf8ff', borderBottom: '1px solid #f0ecff' },
              }, [
                h('span', { style: { flex: 1, fontSize: '10px', color: '#7c3aed', fontWeight: 500 } }, varName),
                h('span', { style: { fontSize: '10px', color: '#a78bfa', flexShrink: 0 } }, String(currentVal ?? '—')),
                h('input', {
                  type: 'text', value: inputVal,
                  onInput: (e: Event) => {
                    if (!varInputs.value[name]) varInputs.value[name] = {}
                    varInputs.value[name][varName] = (e.target as HTMLInputElement).value
                  },
                  onKeydown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter') setVarFromInput(name, varName)
                    if (e.key === 'Escape') {
                      if (!varInputs.value[name]) varInputs.value[name] = {}
                      varInputs.value[name][varName] = String(provider.getVariable(name, varName).value ?? '')
                    }
                  },
                  style: { width: '72px', padding: '2px 4px', border: '1px solid #c4b5fd', borderRadius: '3px', fontSize: '10px', outline: 'none', background: '#fdf8ff' },
                }),
                h('button', {
                  style: { ...BTN_XS, border: '1px solid #c4b5fd', color: '#5b21b6' },
                  onClick: () => setVarFromInput(name, varName),
                }, 'set'),
              ]))
            }
          }
        }

        if (rows.length === 0) {
          return [h('div', { style: { padding: '16px', color: '#9ca3af', fontSize: '11px', textAlign: 'center' } }, 'No flags match.')]
        }
        return rows
      }

      const flagsFooter: VNode = h('div', {
        style: { padding: '7px 10px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 8px 8px', flexShrink: 0 },
      }, [
        // Profiles row
        profileNames.value.length > 0
          ? h('div', { style: { display: 'flex', gap: '5px', marginBottom: '6px', alignItems: 'center' } }, [
              h('select', {
                value: '',
                onChange: (e: Event) => {
                  const n = (e.target as HTMLSelectElement).value
                  if (n) provider.loadProfile(n)
                  ;(e.target as HTMLSelectElement).value = ''
                },
                style: { flex: 1, padding: '3px 6px', borderRadius: '4px', border: '1px solid #d1d5db', background: '#fff', fontSize: '11px', cursor: 'pointer' },
              }, [
                h('option', { value: '', disabled: true }, 'Load profile…'),
                h('option', { value: 'default' }, '⟲ default'),
                ...profileNames.value.map(n => h('option', { value: n }, n)),
              ]),
              // Save current as profile
              h('input', {
                type: 'text', placeholder: 'profile name',
                value: newProfileName.value,
                onInput: (e: Event) => { newProfileName.value = (e.target as HTMLInputElement).value },
                onKeydown: (e: KeyboardEvent) => { if (e.key === 'Enter') saveProfile() },
                style: { width: '90px', padding: '3px 5px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '10px', outline: 'none' },
              }),
              h('button', { style: { ...BTN, padding: '3px 6px' }, onClick: saveProfile }, 'Save'),
            ])
          : null,
        // Action buttons
        h('div', { style: { display: 'flex', gap: '5px', flexWrap: 'wrap' } }, [
          h('button', { style: { ...BTN, flex: 1, padding: '4px' }, onClick: () => provider.resetAll() }, 'Reset all'),
          h('button', { style: { ...BTN, padding: '4px 7px' }, onClick: () => provider.reload(), title: 'Reload from loader' }, '↺'),
          h('button', { style: { ...BTN, padding: '4px 7px' }, onClick: copyUrl }, copyLabel.value),
          h('button', {
            title: 'Copy overrides as JSON',
            style: { ...BTN, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: '4px' },
            onClick: exportOverrides,
          }, [IconExport(), 'export']),
          h('button', {
            style: { ...BTN, padding: '4px 7px', display: 'flex', alignItems: 'center', gap: '4px', background: showImport.value ? '#ede9fe' : '#fff', color: showImport.value ? '#5b21b6' : undefined },
            onClick: () => { showImport.value = !showImport.value },
          }, [IconImport(), 'import']),
        ]),
        // Import section
        showImport.value
          ? h('div', { style: { marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '4px' } }, [
              h('textarea', {
                placeholder: '{"flagName": true, "variant": "v2"}',
                value: importJson.value,
                onInput: (e: Event) => { importJson.value = (e.target as HTMLTextAreaElement).value },
                style: { width: '100%', height: '54px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', fontSize: '10px', fontFamily: 'ui-monospace', resize: 'vertical', boxSizing: 'border-box' },
              }),
              h('div', { style: { display: 'flex', gap: '4px' } }, [
                h('button', { style: { ...BTN, flex: 1, padding: '3px' }, onClick: applyImport }, 'Apply'),
                h('button', { style: BTN, onClick: () => { showImport.value = false; importJson.value = '' } }, 'Cancel'),
              ]),
            ])
          : null,
      ])

      // ─────────────────────────────────────────────────────────────────────
      // GROUPS TAB
      // ─────────────────────────────────────────────────────────────────────
      const renderGroupRows = (): VNode[] => {
        const gs = groupEntries.value
        if (gs.length === 0) {
          return [h('div', { style: { padding: '24px 16px', color: '#9ca3af', fontSize: '11px', textAlign: 'center' } }, [
            h('div', {}, '○ No groups configured.'),
            h('div', { style: { marginTop: '4px', fontSize: '10px' } }, 'Add groups in your FeatureToggles options.'),
          ])]
        }
        return gs.map(({ name, members, enabled, enabledCount }) =>
          h('div', { key: name, style: { padding: '7px 10px', borderBottom: '1px solid #f3f4f6' } }, [
            h('div', { style: { display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' } }, [
              h('span', { style: { flex: 1, fontWeight: 600, fontSize: '11px' } }, name),
              h('span', { style: { fontSize: '10px', color: '#9ca3af' } }, `${enabledCount}/${members.length}`),
              h('span', {
                style: { padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, flexShrink: 0, background: enabled ? '#d1fae5' : '#fee2e2', color: enabled ? '#065f46' : '#991b1b' },
              }, enabled ? 'ALL ON' : 'PARTIAL'),
              h('button', { style: { ...BTN_XS, border: '1px solid #86efac', color: '#166534' }, onClick: () => provider.setGroup(name, true) }, 'ON'),
              h('button', { style: { ...BTN_XS, border: '1px solid #fca5a5', color: '#dc2626' }, onClick: () => provider.setGroup(name, false) }, 'OFF'),
              h('button', { style: BTN_XS, onClick: () => provider.resetGroup(name) }, 'reset'),
            ]),
            // Member chips
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '3px', paddingLeft: '2px' } },
              members.map(m => {
                const v = provider.flags.value[m]
                const on = v === true || (typeof v === 'string' && v !== '' && v !== 'false' && v !== '0')
                return h('span', {
                  key: m,
                  style: { padding: '1px 6px', borderRadius: '10px', fontSize: '10px', background: on ? '#d1fae5' : '#f3f4f6', color: on ? '#065f46' : '#9ca3af' },
                }, m)
              })
            ),
          ])
        )
      }

      const groupsFooter: VNode = h('div', {
        style: { padding: '7px 10px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 8px 8px', flexShrink: 0 },
      }, [
        h('div', { style: { display: 'flex', gap: '5px' } }, [
          h('button', {
            style: { ...BTN, flex: 1, padding: '4px', border: '1px solid #fca5a5', color: '#dc2626' },
            onClick: () => groupEntries.value.forEach(g => provider.resetGroup(g.name)),
            disabled: groupEntries.value.length === 0,
          }, 'Reset all groups'),
        ]),
      ])

      // ─────────────────────────────────────────────────────────────────────
      // HISTORY TAB
      // ─────────────────────────────────────────────────────────────────────
      const renderHistoryRows = (): VNode[] => {
        if (history.value.length === 0) {
          return [h('div', { style: { padding: '24px 16px', color: '#9ca3af', fontSize: '11px', textAlign: 'center' } }, '○ No flag changes recorded yet.')]
        }
        return history.value.map((e, i) =>
          h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderBottom: '1px solid #f3f4f6', fontSize: '10px' } }, [
            h('span', { style: { color: '#9ca3af', flexShrink: 0 } }, e.time),
            h('span', { style: { flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, e.name),
            h('span', { style: { padding: '1px 5px', borderRadius: '3px', background: SOURCE_STYLES[e.source].bg, color: SOURCE_STYLES[e.source].color, flexShrink: 0 } }, e.source),
            h('span', {
              style: {
                padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700, flexShrink: 0,
                background: e.value === true ? '#d1fae5' : e.value === false ? '#fee2e2' : '#ede9fe',
                color:      e.value === true ? '#065f46' : e.value === false ? '#991b1b' : '#5b21b6',
              },
            }, String(e.value)),
          ])
        )
      }

      const historyFooter: VNode = h('div', {
        style: { padding: '7px 10px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 8px 8px', flexShrink: 0 },
      }, [
        h('div', { style: { display: 'flex', gap: '5px', alignItems: 'center' } }, [
          h('button', {
            style: { ...BTN, padding: '4px 8px' },
            onClick: () => { history.value = [] },
          }, 'Clear'),
          h('span', { style: { fontSize: '10px', color: '#9ca3af' } }, `${history.value.length} / 20`),
        ]),
      ])

      // ── Assemble ─────────────────────────────────────────────────────────
      const isFlags   = activeTab.value === 'flags'
      const isGroups  = activeTab.value === 'groups'

      const tabContent: VNode[] = isFlags
        ? [flagsToolbar, h('div', { style: { overflowY: 'auto', flex: 1 } }, renderFlagRows())]
        : isGroups
          ? [h('div', { style: { overflowY: 'auto', flex: 1 } }, renderGroupRows())]
          : [h('div', { style: { overflowY: 'auto', flex: 1 } }, renderHistoryRows())]

      const tabFooter = isFlags ? flagsFooter : isGroups ? groupsFooter : historyFooter

      return h('div', { ref: panelRef, style: panelStyle }, [
        header,
        tabBar,
        ...tabContent,
        tabFooter,
      ])
    }
  },
})
</script>

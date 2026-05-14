<script setup lang="ts">
import { inject, computed, ref, provide, watch } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider, FlagSource, FlagValue } from '../core/types'
import { ALL_SOURCES } from '../ui/shared'
import type { FlagEntry, HistoryEntry } from '../ui/shared'
import { DT_THEME_KEY, LIGHT_THEME, DARK_THEME } from '../ui/theme'
import type { DtTheme } from '../ui/theme'
import DtButton from '../ui/dt-button.vue'
import DtIcon from '../ui/dt-icon.vue'
import DtSearch from '../ui/dt-search.vue'
import DtSelect from '../ui/dt-select.vue'
import DtFlagRow from '../ui/dt-flag-row.vue'
import DtGroupRow from '../ui/dt-group-row.vue'
import DtHistoryRow from '../ui/dt-history-row.vue'

type Tab = 'flags' | 'groups' | 'history'

const props = withDefaults(defineProps<{
  title?: string
  theme?: 'light' | 'dark' | 'auto'
}>(), {
  title: 'Feature Toggles',
  theme: 'auto',
})

const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

// ── Theme ─────────────────────────────────────────────────────────────────────
const prefersDark = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false,
)

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', e => { prefersDark.value = e.matches })
}

const themeOverride = ref<DtTheme | null>(null)

const effectiveTheme = computed<DtTheme>(() => {
  if (themeOverride.value) return themeOverride.value
  if (props.theme === 'dark')  return 'dark'
  if (props.theme === 'light') return 'light'
  return prefersDark.value ? 'dark' : 'light'
})

provide(DT_THEME_KEY, effectiveTheme)

function toggleTheme() {
  themeOverride.value = effectiveTheme.value === 'dark' ? 'light' : 'dark'
}

const themeVars = computed(() =>
  effectiveTheme.value === 'dark' ? DARK_THEME : LIGHT_THEME
)

// ── Panel state ───────────────────────────────────────────────────────────────
const collapsed      = ref(false)
const activeTab      = ref<Tab>('flags')
const searchQuery    = ref('')
const sourceFilter   = ref<FlagSource | ''>('')
const showImport     = ref(false)
const importJson     = ref('')
const history        = ref<HistoryEntry[]>([])
const panelRef       = ref<HTMLElement>()
const copyLabel      = ref('Copy URL')
const newProfileName = ref('')
const expandedVars   = ref<Set<string>>(new Set())
const varInputs      = ref<Record<string, Record<string, string>>>({})
const editingVariant      = ref<string | null>(null)
const editingVariantValue = ref('')

// ── Initial position ──────────────────────────────────────────────────────────
function getInitialPos() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const s = sessionStorage.getItem('vue-ft-devtools-pos')
      if (s) return JSON.parse(s) as { x: number; y: number }
    } catch {}
  }
  if (typeof window !== 'undefined') {
    return { x: Math.max(20, window.innerWidth - 480), y: Math.max(20, window.innerHeight - 660) }
  }
  return { x: 20, y: 20 }
}

const pos = ref(getInitialPos())

// ── History tracking ──────────────────────────────────────────────────────────
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
            name,
            value: val,
            source: provider.getFlagSource(name),
          })
        }
      }
      if (entries.length) history.value = [...entries, ...history.value].slice(0, 20)
    },
  )
}

// ── Computed ──────────────────────────────────────────────────────────────────
const flagEntries = computed((): FlagEntry[] => {
  if (!provider) return []
  const violations = provider.getDependencyViolations()
  let entries = Object.entries(provider.flags.value).map(([name, value]) => {
    const varNames = provider.listVariables(name)
    return {
      name, value,
      isVariant:    typeof value === 'string',
      source:       provider.getFlagSource(name),
      isOverridden: ['url', 'runtime'].includes(provider.getFlagSource(name)),
      isExpired:    provider.isExpired(name),
      isPersisted:  provider.isPersisted(name),
      meta:         provider.getFlagMeta(name),
      depViolations: violations[name] ?? [],
      varNames,
      hasVars:      varNames.length > 0,
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
    enabled:      provider.isGroupEnabled(name),
    enabledCount: members.filter(m => {
      const v = provider.flags.value[m]
      return v === true || (typeof v === 'string' && v !== '' && v !== 'false' && v !== '0')
    }).length,
  }))
})

const profileNames = computed(() => provider?.listProfiles() ?? [])

const sourceOptions = computed(() => [
  { value: '', label: 'All sources' },
  ...ALL_SOURCES.map(s => ({ value: s, label: s })),
])

const tabDefs = computed(() => [
  { key: 'flags'   as const, label: 'Flags',   icon: 'flag'   as const, badge: Object.keys(provider?.flags.value ?? {}).length },
  { key: 'groups'  as const, label: 'Groups',  icon: 'layers' as const, badge: Object.keys(provider?.listGroups() ?? {}).length },
  { key: 'history' as const, label: 'History', icon: 'clock'  as const, badge: history.value.length },
])

const varValuesMap = computed(() => {
  const result: Record<string, Record<string, string>> = {}
  if (!provider) return result
  for (const flagName of expandedVars.value) {
    const entry = flagEntries.value.find(e => e.name === flagName)
    if (!entry) continue
    result[flagName] = {}
    for (const varName of entry.varNames) {
      result[flagName][varName] = String(provider.getVariable(flagName, varName).value ?? '')
    }
  }
  return result
})

// ── Styles ────────────────────────────────────────────────────────────────────
const panelStyle = computed(() => ({
  position:      'fixed' as const,
  left:          `${pos.value.x}px`,
  top:           `${pos.value.y}px`,
  zIndex:        99999,
  fontFamily:    'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize:      '12px',
  lineHeight:    1.5,
  color:         'var(--dt-text)',
  background:    'var(--dt-bg)',
  border:        '1px solid var(--dt-border)',
  borderRadius:  '10px',
  boxShadow:     'var(--dt-shadow)',
  minWidth:      '320px',
  maxWidth:      '460px',
  maxHeight:     '660px',
  overflow:      'hidden',
  display:       'flex',
  flexDirection: 'column' as const,
  ...themeVars.value,
}))

const headerStyle = computed(() => ({
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'space-between',
  padding:        '9px 12px',
  background:     'var(--dt-bg-subtle)',
  borderBottom:   collapsed.value ? 'none' : '1px solid var(--dt-border)',
  borderRadius:   collapsed.value ? '10px' : '10px 10px 0 0',
  cursor:         'grab',
  userSelect:     'none' as const,
}))

const statusStyle = computed(() => ({
  fontSize:   '10px',
  color:      provider?.isLoading.value ? 'var(--dt-warn)' : 'var(--dt-success)',
  flexShrink: 0,
}))

const statusText = computed(() =>
  provider?.isLoading.value ? '● loading' : provider?.isReady.value ? '● ready' : '○ idle',
)

const chevronStyle = computed(() => ({
  transition: 'transform .2s',
  transform:  collapsed.value ? 'rotate(-90deg)' : 'rotate(0deg)',
}))

function tabStyle(key: Tab) {
  const active = activeTab.value === key
  return {
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '5px',
    padding:      '5px 10px',
    borderRadius: '6px',
    border:       'none',
    fontSize:     '11px',
    fontWeight:   active ? 600 : 500,
    color:        active ? 'var(--dt-accent)' : 'var(--dt-text-muted)',
    background:   active ? 'var(--dt-bg)' : 'transparent',
    cursor:       'pointer',
    transition:   'all .15s',
    boxShadow:    active ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
    flexShrink:   0,
  }
}

function tabBadgeStyle(key: Tab) {
  const active = activeTab.value === key
  return {
    fontSize:    '9px',
    fontWeight:  700,
    padding:     '1px 5px',
    borderRadius: '8px',
    background:  active ? 'var(--dt-accent-bg)' : 'var(--dt-bg-muted)',
    color:       active ? 'var(--dt-accent)' : 'var(--dt-text-faint)',
    lineHeight:  1.5,
    minWidth:    '16px',
    textAlign:   'center' as const,
  }
}

const footerStyle = {
  padding:      '7px 10px',
  borderTop:    '1px solid var(--dt-border)',
  background:   'var(--dt-bg-subtle)',
  borderRadius: '0 0 10px 10px',
  flexShrink:   0,
}

const iconBtnStyle = {
  background:    'none',
  border:        'none',
  cursor:        'pointer',
  padding:       '3px',
  color:         'var(--dt-text-faint)',
  display:       'flex',
  alignItems:    'center',
  borderRadius:  '4px',
  flexShrink:    0,
}

// ── Viewport-clamped drag ─────────────────────────────────────────────────────
function startDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button,select,input,textarea')) return
  const startX = e.clientX - pos.value.x
  const startY = e.clientY - pos.value.y
  const onMove = (ev: MouseEvent) => {
    const w = panelRef.value?.offsetWidth  ?? 400
    const h = panelRef.value?.offsetHeight ?? (collapsed.value ? 40 : 440)
    pos.value = {
      x: Math.max(0, Math.min(ev.clientX - startX, window.innerWidth  - w)),
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

// ── Variable actions ──────────────────────────────────────────────────────────
function toggleVarExpand(flagName: string, varNames: string[]) {
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

function updateVarInput(flagName: string, varName: string, val: string) {
  if (!varInputs.value[flagName]) varInputs.value[flagName] = {}
  varInputs.value[flagName][varName] = val
}

function setVarFromInput(flagName: string, varName: string) {
  const raw = varInputs.value[flagName]?.[varName] ?? ''
  let parsed: unknown = raw
  if (raw === 'true')  parsed = true
  else if (raw === 'false') parsed = false
  else { const n = Number(raw); if (!isNaN(n) && raw.trim() !== '') parsed = n }
  provider?.setVariable(flagName, varName, parsed)
  if (!varInputs.value[flagName]) varInputs.value[flagName] = {}
  varInputs.value[flagName][varName] = String(parsed)
}

// ── Variant editing ───────────────────────────────────────────────────────────
function startVariantEdit(name: string, cur: string) {
  editingVariant.value = name
  editingVariantValue.value = cur
}
function confirmVariantEdit() {
  if (editingVariant.value) provider?.setVariant(editingVariant.value, editingVariantValue.value)
  editingVariant.value = null
  editingVariantValue.value = ''
}
function cancelVariantEdit() {
  editingVariant.value = null
  editingVariantValue.value = ''
}

// ── Flag actions ──────────────────────────────────────────────────────────────
function toggle(name: string, value: FlagValue) {
  if (typeof value === 'boolean') provider?.setFlag(name, !value)
}

function copyUrl() {
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

function exportOverrides() {
  if (!provider) return
  const data: Record<string, FlagValue> = {}
  for (const e of flagEntries.value) {
    if (e.source === 'runtime') data[e.name] = e.value
  }
  navigator.clipboard?.writeText(JSON.stringify(data, null, 2))
}

function applyImport() {
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

function saveProfile() {
  if (!provider || !newProfileName.value.trim()) return
  provider.saveProfile(newProfileName.value.trim(), { ...provider.flags.value })
  newProfileName.value = ''
}

function onLoadProfile(e: Event) {
  const n = (e.target as HTMLSelectElement).value
  if (n) provider?.loadProfile(n)
  ;(e.target as HTMLSelectElement).value = ''
}

function resetAllGroups() {
  groupEntries.value.forEach(g => provider?.resetGroup(g.name))
}
</script>

<template>
  <div v-if="provider" ref="panelRef" :style="panelStyle">

    <!-- ── Header ── -->
    <div :style="headerStyle" @mousedown="startDrag">
      <div style="display:flex;align-items:center;gap:7px">
        <DtIcon name="flag" style="color:var(--dt-accent);flex-shrink:0" />
        <span style="font-weight:700;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dt-text-muted)">
          {{ props.title }}
        </span>
      </div>
      <div style="display:flex;gap:2px;align-items:center">
        <span :style="statusStyle">{{ statusText }}</span>
        <button :style="iconBtnStyle" title="Toggle theme" @click="toggleTheme">
          <DtIcon :name="effectiveTheme === 'dark' ? 'sun' : 'moon'" />
        </button>
        <button :style="iconBtnStyle" @click="collapsed = !collapsed">
          <DtIcon name="chevron-down" :style="chevronStyle" />
        </button>
      </div>
    </div>

    <template v-if="!collapsed">

      <!-- ── Tab bar ── -->
      <div style="display:flex;gap:2px;padding:6px 10px;background:var(--dt-bg-subtle);border-bottom:1px solid var(--dt-border)">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          :style="tabStyle(tab.key)"
          @click="activeTab = tab.key"
        >
          <DtIcon :name="tab.icon" />
          {{ tab.label }}
          <span v-if="tab.badge > 0" :style="tabBadgeStyle(tab.key)">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- FLAGS TAB                                                             -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'flags'">

        <!-- Toolbar -->
        <div style="display:flex;gap:6px;padding:7px 10px;border-bottom:1px solid var(--dt-border);align-items:center">
          <DtSearch v-model="searchQuery" placeholder="Search flags…" />
          <DtSelect
            :model-value="sourceFilter"
            :options="sourceOptions"
            @update:model-value="sourceFilter = $event as FlagSource | ''"
          />
        </div>

        <!-- Flag list -->
        <div style="overflow-y:auto;flex:1">
          <div v-if="flagEntries.length === 0" style="padding:20px 16px;color:var(--dt-text-faint);font-size:11px;text-align:center">
            No flags match.
          </div>
          <template v-for="entry in flagEntries" :key="entry.name">
            <DtFlagRow
              :entry="entry"
              :is-editing="editingVariant === entry.name"
              :editing-value="editingVariantValue"
              :is-vars-open="expandedVars.has(entry.name)"
              :var-inputs="varInputs[entry.name] ?? {}"
              :var-values="varValuesMap[entry.name] ?? {}"
              @toggle="toggle(entry.name, entry.value)"
              @reset="provider.resetFlag(entry.name)"
              @start-edit="startVariantEdit(entry.name, String(entry.value))"
              @confirm-edit="confirmVariantEdit"
              @cancel-edit="cancelVariantEdit"
              @update:editing-value="editingVariantValue = $event"
              @toggle-vars="toggleVarExpand(entry.name, entry.varNames)"
              @var-input="(varName, val) => updateVarInput(entry.name, varName, val)"
              @set-var="(varName) => setVarFromInput(entry.name, varName)"
            />
          </template>
        </div>

        <!-- Flags footer -->
        <div :style="footerStyle">
          <div v-if="profileNames.length > 0" style="display:flex;gap:5px;margin-bottom:6px;align-items:center">
            <select
              value=""
              @change="onLoadProfile($event)"
              style="flex:1;padding:3px 6px;border-radius:5px;border:1px solid var(--dt-border-strong);background:var(--dt-bg);color:var(--dt-text);font-size:11px;cursor:pointer"
            >
              <option value="" disabled>Load profile…</option>
              <option value="default">⟲ default</option>
              <option v-for="n in profileNames" :key="n" :value="n">{{ n }}</option>
            </select>
            <input
              type="text"
              placeholder="profile name"
              :value="newProfileName"
              @input="newProfileName = ($event.target as HTMLInputElement).value"
              @keydown.enter="saveProfile"
              style="width:90px;padding:3px 5px;border-radius:5px;border:1px solid var(--dt-border-strong);font-size:10px;outline:none;background:var(--dt-bg);color:var(--dt-text)"
            />
            <DtButton @click="saveProfile">Save</DtButton>
          </div>
          <div style="display:flex;gap:5px;margin-bottom:5px">
            <DtButton :flex="true" variant="danger" @click="provider.resetAll()">Reset all</DtButton>
            <DtButton title="Reload from loader" @click="provider.reload()" style="font-size:14px;line-height:1">↺</DtButton>
          </div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <DtButton @click="copyUrl">{{ copyLabel }}</DtButton>
            <DtButton title="Copy overrides as JSON" @click="exportOverrides">
              <DtIcon name="export" /> export
            </DtButton>
            <DtButton :active="showImport" @click="showImport = !showImport">
              <DtIcon name="import" /> import
            </DtButton>
          </div>
          <div v-if="showImport" style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
            <textarea
              placeholder='{"flagName": true, "variant": "v2"}'
              :value="importJson"
              @input="importJson = ($event.target as HTMLTextAreaElement).value"
              style="width:100%;height:54px;padding:4px;border-radius:5px;border:1px solid var(--dt-border-strong);font-size:10px;font-family:ui-monospace;resize:vertical;box-sizing:border-box;background:var(--dt-bg);color:var(--dt-text)"
            />
            <div style="display:flex;gap:4px">
              <DtButton :flex="true" @click="applyImport">Apply</DtButton>
              <DtButton @click="showImport = false; importJson = ''">Cancel</DtButton>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- GROUPS TAB                                                            -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'groups'">
        <div style="overflow-y:auto;flex:1">
          <div v-if="groupEntries.length === 0" style="padding:28px 16px;color:var(--dt-text-faint);font-size:11px;text-align:center">
            <div>No groups configured.</div>
            <div style="margin-top:4px;font-size:10px;color:var(--dt-text-faint)">Add groups in your FeatureToggles options.</div>
          </div>
          <DtGroupRow
            v-for="g in groupEntries"
            :key="g.name"
            :name="g.name"
            :members="g.members"
            :enabled="g.enabled"
            :enabled-count="g.enabledCount"
            :flag-values="provider.flags.value"
            @enable-all="provider.setGroup(g.name, true)"
            @disable-all="provider.setGroup(g.name, false)"
            @reset="provider.resetGroup(g.name)"
          />
        </div>
        <div :style="footerStyle">
          <DtButton
            :flex="true"
            variant="danger"
            :disabled="groupEntries.length === 0"
            @click="resetAllGroups"
          >Reset all groups</DtButton>
        </div>
      </template>

      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <!-- HISTORY TAB                                                           -->
      <!-- ══════════════════════════════════════════════════════════════════════ -->
      <template v-else>
        <div style="overflow-y:auto;flex:1">
          <div v-if="history.length === 0" style="padding:28px 16px;color:var(--dt-text-faint);font-size:11px;text-align:center">
            No flag changes recorded yet.
          </div>
          <DtHistoryRow
            v-for="(e, i) in history"
            :key="i"
            :time="e.time"
            :name="e.name"
            :value="e.value"
            :source="e.source"
          />
        </div>
        <div :style="footerStyle">
          <div style="display:flex;gap:5px;align-items:center">
            <DtButton @click="history = []">Clear</DtButton>
            <span style="font-size:10px;color:var(--dt-text-faint)">{{ history.length }} / 20</span>
          </div>
        </div>
      </template>

    </template>
  </div>
</template>

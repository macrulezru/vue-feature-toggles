<script setup lang="ts">
import { inject, computed, ref, watch } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider, FlagSource, FlagValue } from '../core/types'
import { ALL_SOURCES } from './devtools/shared'
import type { FlagEntry, HistoryEntry } from './devtools/shared'
import DtButton from './devtools/DtButton.vue'
import DtFlagRow from './devtools/DtFlagRow.vue'
import DtGroupRow from './devtools/DtGroupRow.vue'
import DtHistoryRow from './devtools/DtHistoryRow.vue'

type Tab = 'flags' | 'groups' | 'history'

const props = withDefaults(defineProps<{ title?: string }>(), { title: 'Feature Toggles' })

const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

// ── Panel state ─────────────────────────────────────────────────────────────
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

// ── Initial position ─────────────────────────────────────────────────────────
function getInitialPos() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const s = sessionStorage.getItem('vue-ft-devtools-pos')
      if (s) return JSON.parse(s) as { x: number; y: number }
    } catch {}
  }
  if (typeof window !== 'undefined') {
    return { x: Math.max(20, window.innerWidth - 460), y: Math.max(20, window.innerHeight - 640) }
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

const tabDefs = computed(() => [
  { key: 'flags'   as const, label: 'Flags',   badge: Object.keys(provider?.flags.value ?? {}).length },
  { key: 'groups'  as const, label: 'Groups',  badge: Object.keys(provider?.listGroups() ?? {}).length },
  { key: 'history' as const, label: 'History', badge: history.value.length },
])

// Current variable values for expanded flags
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
  position:   'fixed' as const,
  left:       `${pos.value.x}px`,
  top:        `${pos.value.y}px`,
  zIndex:     99999,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize:   '12px',
  lineHeight: 1.5,
  color:      '#1f2937',
  background: '#ffffff',
  border:     '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow:  '0 4px 24px rgba(0,0,0,.12)',
  minWidth:   '320px',
  maxWidth:   '460px',
  maxHeight:  '640px',
  overflow:   'hidden',
  display:    'flex',
  flexDirection: 'column' as const,
}))

const headerStyle = computed(() => ({
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'space-between',
  padding:         '7px 12px',
  background:      '#f9fafb',
  borderBottom:    collapsed.value ? 'none' : '1px solid #e5e7eb',
  borderRadius:    collapsed.value ? '8px' : '8px 8px 0 0',
  cursor:          'grab',
  userSelect:      'none' as const,
}))

const statusStyle = computed(() => ({
  fontSize: '10px',
  color: provider?.isLoading.value ? '#d97706' : '#10b981',
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
    padding:      '5px 10px 4px',
    border:       'none',
    background:   'none',
    cursor:       'pointer',
    fontSize:     '11px',
    fontWeight:   active ? 700 : 400,
    color:        active ? '#111827' : '#9ca3af',
    borderBottom: active ? '2px solid #374151' : '2px solid transparent',
    marginBottom: '-1px',
  }
}

const footerStyle = {
  padding:      '7px 10px',
  borderTop:    '1px solid #e5e7eb',
  background:   '#f9fafb',
  borderRadius: '0 0 8px 8px',
  flexShrink:   0,
}

// ── Viewport-clamped drag ─────────────────────────────────────────────────────
function startDrag(e: MouseEvent) {
  if ((e.target as HTMLElement).closest('button,select,input,textarea')) return
  const startX = e.clientX - pos.value.x
  const startY = e.clientY - pos.value.y
  const onMove = (ev: MouseEvent) => {
    const w = panelRef.value?.offsetWidth  ?? 380
    const h = panelRef.value?.offsetHeight ?? (collapsed.value ? 38 : 420)
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
      <span style="font-weight:700;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#6b7280">
        🚩 {{ props.title }}
      </span>
      <div style="display:flex;gap:6px;align-items:center">
        <span :style="statusStyle">{{ statusText }}</span>
        <button
          style="background:none;border:none;cursor:pointer;padding:2px;color:#9ca3af;display:flex;align-items:center"
          @click="collapsed = !collapsed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="chevronStyle">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
    </div>

    <template v-if="!collapsed">

      <!-- ── Tab bar ── -->
      <div style="display:flex;background:#f9fafb;border-bottom:1px solid #e5e7eb;padding:0 8px">
        <button
          v-for="tab in tabDefs"
          :key="tab.key"
          :style="tabStyle(tab.key)"
          @click="activeTab = tab.key"
        >{{ tab.label }}{{ tab.badge > 0 ? ` ${tab.badge}` : '' }}</button>
      </div>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- FLAGS TAB                                                           -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <template v-if="activeTab === 'flags'">

        <!-- Toolbar -->
        <div style="display:flex;gap:6px;padding:6px 10px;border-bottom:1px solid #f3f4f6;align-items:center">
          <input
            type="text"
            placeholder="🔍 search…"
            :value="searchQuery"
            @input="searchQuery = ($event.target as HTMLInputElement).value"
            style="flex:1;padding:3px 7px;border-radius:4px;border:1px solid #e5e7eb;font-size:11px;outline:none;background:#fafafa"
          />
          <select
            :value="sourceFilter"
            @change="sourceFilter = ($event.target as HTMLSelectElement).value as FlagSource | ''"
            style="padding:3px 5px;border-radius:4px;border:1px solid #e5e7eb;font-size:10px;background:#fafafa;cursor:pointer"
          >
            <option value="">all</option>
            <option v-for="s in ALL_SOURCES" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>

        <!-- Flag list -->
        <div style="overflow-y:auto;flex:1">
          <div v-if="flagEntries.length === 0" style="padding:16px;color:#9ca3af;font-size:11px;text-align:center">
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
          <!-- Profiles row -->
          <div v-if="profileNames.length > 0" style="display:flex;gap:5px;margin-bottom:6px;align-items:center">
            <select
              value=""
              @change="onLoadProfile($event)"
              style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #d1d5db;background:#fff;font-size:11px;cursor:pointer"
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
              style="width:90px;padding:3px 5px;border-radius:4px;border:1px solid #d1d5db;font-size:10px;outline:none"
            />
            <DtButton style="padding:3px 6px" @click="saveProfile">Save</DtButton>
          </div>
          <!-- Action buttons -->
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <DtButton :flex="true" style="padding:4px" @click="provider.resetAll()">Reset all</DtButton>
            <DtButton style="padding:4px 7px" title="Reload from loader" @click="provider.reload()">↺</DtButton>
            <DtButton style="padding:4px 7px" @click="copyUrl">{{ copyLabel }}</DtButton>
            <DtButton style="padding:4px 7px" title="Copy overrides as JSON" @click="exportOverrides">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">
                <line x1="6" y1="10" x2="6" y2="3" /><polyline points="3,6 6,3 9,6" /><line x1="1" y1="11" x2="11" y2="11" />
              </svg>
              export
            </DtButton>
            <DtButton style="padding:4px 7px" :active="showImport" @click="showImport = !showImport">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">
                <line x1="6" y1="2" x2="6" y2="9" /><polyline points="3,6 6,9 9,6" /><line x1="1" y1="11" x2="11" y2="11" />
              </svg>
              import
            </DtButton>
          </div>
          <!-- Import section -->
          <div v-if="showImport" style="margin-top:6px;display:flex;flex-direction:column;gap:4px">
            <textarea
              placeholder='{"flagName": true, "variant": "v2"}'
              :value="importJson"
              @input="importJson = ($event.target as HTMLTextAreaElement).value"
              style="width:100%;height:54px;padding:4px;border-radius:4px;border:1px solid #d1d5db;font-size:10px;font-family:ui-monospace;resize:vertical;box-sizing:border-box"
            />
            <div style="display:flex;gap:4px">
              <DtButton :flex="true" style="padding:3px" @click="applyImport">Apply</DtButton>
              <DtButton @click="showImport = false; importJson = ''">Cancel</DtButton>
            </div>
          </div>
        </div>
      </template>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- GROUPS TAB                                                          -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <template v-else-if="activeTab === 'groups'">
        <div style="overflow-y:auto;flex:1">
          <div v-if="groupEntries.length === 0" style="padding:24px 16px;color:#9ca3af;font-size:11px;text-align:center">
            <div>○ No groups configured.</div>
            <div style="margin-top:4px;font-size:10px">Add groups in your FeatureToggles options.</div>
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
            variant="danger"
            :flex="true"
            style="padding:4px"
            :disabled="groupEntries.length === 0"
            @click="resetAllGroups"
          >Reset all groups</DtButton>
        </div>
      </template>

      <!-- ════════════════════════════════════════════════════════════════════ -->
      <!-- HISTORY TAB                                                         -->
      <!-- ════════════════════════════════════════════════════════════════════ -->
      <template v-else>
        <div style="overflow-y:auto;flex:1">
          <div v-if="history.length === 0" style="padding:24px 16px;color:#9ca3af;font-size:11px;text-align:center">
            ○ No flag changes recorded yet.
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
            <DtButton style="padding:4px 8px" @click="history = []">Clear</DtButton>
            <span style="font-size:10px;color:#9ca3af">{{ history.length }} / 20</span>
          </div>
        </div>
      </template>

    </template>
  </div>
</template>

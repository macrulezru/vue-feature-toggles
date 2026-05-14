<script setup lang="ts">
import { ref, watch, nextTick, computed, inject } from 'vue'
import { SOURCE_STYLES, SOURCE_STYLES_DARK } from './shared'
import type { FlagEntry } from './shared'
import { DT_THEME_KEY } from './theme'
import DtBadge from './dt-badge.vue'
import DtButton from './dt-button.vue'
import DtToggle from './dt-toggle.vue'
import DtIcon from './dt-icon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  entry: FlagEntry
  isEditing: boolean
  editingValue: string
  isVarsOpen: boolean
  varInputs: Record<string, string>
  varValues: Record<string, string>
}>()

const emit = defineEmits<{
  toggle: []
  reset: []
  startEdit: []
  confirmEdit: []
  cancelEdit: []
  'update:editingValue': [val: string]
  toggleVars: []
  varInput: [varName: string, val: string]
  setVar: [varName: string]
}>()

const editInput = ref<HTMLInputElement>()
const theme = inject(DT_THEME_KEY, ref<'light' | 'dark'>('light'))

watch(() => props.isEditing, (val) => {
  if (val) nextTick(() => editInput.value?.focus())
})

const metaTitle = computed(() => {
  const m = props.entry.meta
  if (!m) return undefined
  const parts: string[] = []
  if (m.description) parts.push(m.description)
  if (m.owner)       parts.push(`Owner: ${m.owner}`)
  if (m.ticket)      parts.push(`Ticket: ${m.ticket}`)
  if (m.addedAt)     parts.push(`Added: ${m.addedAt}`)
  return parts.join('\n') || undefined
})

const srcStyle = computed(() =>
  theme.value === 'dark'
    ? SOURCE_STYLES_DARK[props.entry.source]
    : SOURCE_STYLES[props.entry.source]
)

const variantBadge = computed(() => ({
  bg:    theme.value === 'dark' ? '#2e1065' : '#ede9fe',
  color: theme.value === 'dark' ? '#c4b5fd' : '#5b21b6',
}))

const variantLabel = computed(() =>
  typeof props.entry.value === 'string' ? props.entry.value : '',
)

const rowBg = computed(() => {
  const d = theme.value === 'dark'
  if (props.entry.isExpired)            return d ? '#451a03' : '#fffbeb'
  if (props.entry.depViolations.length) return d ? '#3b0764' : '#fff7ed'
  return undefined
})

const nameColor = computed(() => {
  const d = theme.value === 'dark'
  if (props.entry.isExpired)            return d ? '#fbbf24' : '#92400e'
  if (props.entry.depViolations.length) return d ? '#f87171' : '#9a3412'
  return undefined
})

const varRowStyle = computed(() => ({
  background:   theme.value === 'dark' ? '#1a1035' : '#faf8ff',
  borderBottom: theme.value === 'dark' ? '1px solid #2e1065' : '1px solid #f0ecff',
}))

function onVarKeydown(e: KeyboardEvent, varName: string) {
  if (e.key === 'Enter')  emit('setVar', varName)
  if (e.key === 'Escape') emit('varInput', varName, props.varValues[varName] ?? '')
}
</script>

<template>
  <!-- Main flag row -->
  <div
    :style="{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderBottom: '1px solid var(--dt-border)',
      background: rowBg,
    }"
  >
    <!-- Toggle (boolean flags) / spacer (variant flags) -->
    <DtToggle v-if="!entry.isVariant" :model-value="entry.value as boolean" @update:model-value="$emit('toggle')" />
    <span v-else style="display:inline-block;width:37px;flex-shrink:0" />

    <!-- Name -->
    <span
      :title="metaTitle"
      :style="{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: nameColor ?? 'var(--dt-text)' }"
    >
      {{ entry.name }}
      <span v-if="entry.isExpired"           style="margin-left:4px;font-size:10px;color:var(--dt-warn)" title="Expired">⚠</span>
      <span v-if="entry.depViolations.length" style="margin-left:4px;font-size:10px;color:var(--dt-danger)" :title="`Requires: ${entry.depViolations.join(', ')}`">⛓</span>
      <span v-if="entry.meta"                style="margin-left:3px;font-size:10px;color:var(--dt-text-faint);cursor:help" :title="metaTitle">ℹ</span>
    </span>

    <span v-if="entry.isPersisted" title="Persisted in localStorage" style="font-size:10px">💾</span>

    <DtBadge :bg="srcStyle.bg" :color="srcStyle.color">{{ entry.source }}</DtBadge>

    <!-- Variant flag value -->
    <template v-if="entry.isVariant">
      <div v-if="isEditing" style="display:flex;gap:2px;align-items:center;flex-shrink:0">
        <input
          ref="editInput"
          type="text"
          :value="editingValue"
          @input="$emit('update:editingValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter="$emit('confirmEdit')"
          @keydown.escape="$emit('cancelEdit')"
          style="width:68px;padding:1px 4px;border:1px solid var(--dt-accent);border-radius:3px;font-size:10px;outline:none;background:var(--dt-bg);color:var(--dt-text)"
        />
        <DtButton size="xs" variant="success" @click="$emit('confirmEdit')">✓</DtButton>
        <DtButton size="xs" variant="danger"  @click="$emit('cancelEdit')">✗</DtButton>
      </div>
      <DtBadge
        v-else
        :bg="variantBadge.bg"
        :color="variantBadge.color"
        :bold="true"
        style="cursor:pointer;user-select:none"
        title="Click to edit"
        @click="$emit('startEdit')"
      >{{ variantLabel }}</DtBadge>
    </template>

    <!-- Reset override -->
    <DtButton
      v-if="entry.isOverridden && !isEditing"
      size="xs" variant="danger"
      title="Reset override"
      @click="$emit('reset')"
    ><DtIcon name="x" /></DtButton>

    <!-- Expand variables -->
    <DtButton
      v-if="entry.hasVars"
      size="sm"
      :title="`${entry.varNames.length} variable${entry.varNames.length !== 1 ? 's' : ''}`"
      :active="isVarsOpen"
      @click="$emit('toggleVars')"
    >{{ isVarsOpen ? '▾' : '▸' }} {{ entry.varNames.length }}</DtButton>
  </div>

  <!-- Variable sub-rows -->
  <template v-if="isVarsOpen">
    <div
      v-for="varName in entry.varNames"
      :key="`${entry.name}::${varName}`"
      :style="{ display:'flex', alignItems:'center', gap:'5px', padding:'3px 10px 3px 26px', ...varRowStyle }"
    >
      <span style="flex:1;font-size:10px;color:var(--dt-accent);font-weight:500">{{ varName }}</span>
      <span style="font-size:10px;color:var(--dt-text-faint);flex-shrink:0">{{ varValues[varName] ?? '—' }}</span>
      <input
        type="text"
        :value="varInputs[varName] ?? varValues[varName] ?? ''"
        @input="$emit('varInput', varName, ($event.target as HTMLInputElement).value)"
        @keydown="onVarKeydown($event, varName)"
        style="width:72px;padding:2px 4px;border:1px solid var(--dt-accent);border-radius:3px;font-size:10px;outline:none;background:var(--dt-accent-bg);color:var(--dt-text)"
      />
      <DtButton size="xs" variant="primary" @click="$emit('setVar', varName)">set</DtButton>
    </div>
  </template>
</template>

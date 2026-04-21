<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { SOURCE_STYLES } from './shared'
import type { FlagEntry } from './shared'
import DtBadge from './DtBadge.vue'
import DtButton from './DtButton.vue'
import DtToggle from './DtToggle.vue'

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

const srcStyle = computed(() => SOURCE_STYLES[props.entry.source])

const variantBadgeStyle = { bg: '#ede9fe', color: '#5b21b6' }

const variantLabel = computed(() =>
  typeof props.entry.value === 'string' ? props.entry.value : '',
)

const rowBg = computed(() => {
  if (props.entry.isExpired) return '#fffbeb'
  if (props.entry.depViolations.length > 0) return '#fff7ed'
  return undefined
})

const nameColor = computed(() => {
  if (props.entry.isExpired) return '#92400e'
  if (props.entry.depViolations.length > 0) return '#9a3412'
  return undefined
})

function onVarKeydown(e: KeyboardEvent, varName: string) {
  if (e.key === 'Enter') emit('setVar', varName)
  if (e.key === 'Escape') emit('varInput', varName, props.varValues[varName] ?? '')
}
</script>

<template>
  <!-- Main flag row -->
  <div
    :style="{
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '4px 10px', borderBottom: '1px solid #f3f4f6',
      background: rowBg,
    }"
  >
    <span
      :title="metaTitle"
      :style="{
        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        color: nameColor,
      }"
    >
      {{ entry.name }}
      <span v-if="entry.isExpired"   style="margin-left:4px;font-size:10px;color:#d97706" title="Expired">⚠</span>
      <span v-if="entry.depViolations.length" style="margin-left:4px;font-size:10px;color:#dc2626" :title="`Requires: ${entry.depViolations.join(', ')}`">⛓</span>
      <span v-if="entry.meta"        style="margin-left:3px;font-size:10px;color:#9ca3af;cursor:help" :title="metaTitle">ℹ</span>
    </span>

    <span v-if="entry.isPersisted" title="Persisted in localStorage" style="font-size:10px">💾</span>

    <DtBadge :bg="srcStyle.bg" :color="srcStyle.color">{{ entry.source }}</DtBadge>

    <!-- Variant flag -->
    <template v-if="entry.isVariant">
      <div v-if="isEditing" style="display:flex;gap:2px;align-items:center;flex-shrink:0">
        <input
          ref="editInput"
          type="text"
          :value="editingValue"
          @input="$emit('update:editingValue', ($event.target as HTMLInputElement).value)"
          @keydown.enter="$emit('confirmEdit')"
          @keydown.escape="$emit('cancelEdit')"
          style="width:68px;padding:1px 4px;border:1px solid #93c5fd;border-radius:3px;font-size:10px;outline:none"
        />
        <DtButton size="xs" variant="success" @click="$emit('confirmEdit')">✓</DtButton>
        <DtButton size="xs" variant="danger"  @click="$emit('cancelEdit')">✗</DtButton>
      </div>
      <DtBadge
        v-else
        :bg="variantBadgeStyle.bg"
        :color="variantBadgeStyle.color"
        :bold="true"
        style="cursor:pointer;user-select:none"
        title="Click to edit"
        @click="$emit('startEdit')"
      >{{ variantLabel }}</DtBadge>
    </template>

    <!-- Boolean flag -->
    <template v-else>
      <DtToggle :model-value="entry.value as boolean" @update:model-value="$emit('toggle')" />
    </template>

    <DtButton
      v-if="entry.isOverridden && !isEditing"
      size="xs"
      variant="danger"
      title="Reset override"
      @click="$emit('reset')"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block">
        <line x1="2" y1="2" x2="8" y2="8" /><line x1="8" y1="2" x2="2" y2="8" />
      </svg>
    </DtButton>

    <DtButton
      v-if="entry.hasVars"
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
      style="display:flex;align-items:center;gap:5px;padding:3px 10px 3px 26px;background:#faf8ff;border-bottom:1px solid #f0ecff"
    >
      <span style="flex:1;font-size:10px;color:#7c3aed;font-weight:500">{{ varName }}</span>
      <span style="font-size:10px;color:#a78bfa;flex-shrink:0">{{ varValues[varName] ?? '—' }}</span>
      <input
        type="text"
        :value="varInputs[varName] ?? varValues[varName] ?? ''"
        @input="$emit('varInput', varName, ($event.target as HTMLInputElement).value)"
        @keydown="onVarKeydown($event, varName)"
        style="width:72px;padding:2px 4px;border:1px solid #c4b5fd;border-radius:3px;font-size:10px;outline:none;background:#fdf8ff"
      />
      <DtButton size="xs" variant="primary" @click="$emit('setVar', varName)">set</DtButton>
    </div>
  </template>
</template>

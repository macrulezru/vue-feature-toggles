<script setup lang="ts">
import { inject, ref, computed } from 'vue'
import type { FlagValue } from '../core/types'
import { DT_THEME_KEY } from './theme'
import DtButton from './dt-button.vue'
import DtToggle from './dt-toggle.vue'
import DtIcon from './dt-icon.vue'

const props = defineProps<{
  name: string
  members: string[]
  enabled: boolean
  enabledCount: number
  flagValues: Record<string, FlagValue>
}>()

const emit = defineEmits<{
  enableAll: []
  disableAll: []
  reset: []
}>()

const theme = inject(DT_THEME_KEY, ref<'light' | 'dark'>('light'))

function isMemberOn(member: string): boolean {
  const v = props.flagValues[member]
  return v === true || (typeof v === 'string' && v !== '' && v !== 'false' && v !== '0')
}

function memberStyle(member: string) {
  const on = isMemberOn(member)
  const d = theme.value === 'dark'
  return {
    padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
    background: on ? (d ? '#052e16' : '#d1fae5') : (d ? '#3f3f46' : '#f3f4f6'),
    color:      on ? (d ? '#86efac' : '#065f46') : (d ? '#71717a' : '#9ca3af'),
  }
}
</script>

<template>
  <div style="padding:7px 10px;border-bottom:1px solid var(--dt-border)">
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
      <DtToggle
        :model-value="enabled"
        @update:model-value="$event ? emit('enableAll') : emit('disableAll')"
      />
      <span style="flex:1;font-weight:600;font-size:11px;color:var(--dt-text)">{{ name }}</span>
      <span style="font-size:10px;color:var(--dt-text-faint)">{{ enabledCount }}/{{ members.length }}</span>
      <DtButton size="xs" variant="danger" title="Reset group overrides" @click="$emit('reset')">
        <DtIcon name="x" />
      </DtButton>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;padding-left:2px">
      <span
        v-for="member in members"
        :key="member"
        :style="memberStyle(member)"
      >{{ member }}</span>
    </div>
  </div>
</template>

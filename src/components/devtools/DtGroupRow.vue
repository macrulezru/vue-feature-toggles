<script setup lang="ts">
import type { FlagValue } from '../../core/types'
import DtButton from './DtButton.vue'
import DtToggle from './DtToggle.vue'
import DtIcon from './DtIcon.vue'

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

function isMemberOn(member: string): boolean {
  const v = props.flagValues[member]
  return v === true || (typeof v === 'string' && v !== '' && v !== 'false' && v !== '0')
}


</script>

<template>
  <div style="padding:7px 10px;border-bottom:1px solid #f3f4f6">
    <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px">
      <span style="flex:1;font-weight:600;font-size:11px">{{ name }}</span>
      <span style="font-size:10px;color:#9ca3af">{{ enabledCount }}/{{ members.length }}</span>
      <DtToggle
        :model-value="enabled"
        @update:model-value="$event ? emit('enableAll') : emit('disableAll')"
      />
      <DtButton size="xs" variant="danger" title="Reset group overrides" @click="$emit('reset')">
        <DtIcon name="x" />
      </DtButton>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:3px;padding-left:2px">
      <span
        v-for="member in members"
        :key="member"
        :style="{
          padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
          background: isMemberOn(member) ? '#d1fae5' : '#f3f4f6',
          color: isMemberOn(member) ? '#065f46' : '#9ca3af',
        }"
      >{{ member }}</span>
    </div>
  </div>
</template>

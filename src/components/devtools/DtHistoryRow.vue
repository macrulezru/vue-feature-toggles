<script setup lang="ts">
import { computed } from 'vue'
import type { FlagSource, FlagValue } from '../../core/types'
import { SOURCE_STYLES } from './shared'
import DtBadge from './DtBadge.vue'

const props = defineProps<{
  time: string
  name: string
  value: FlagValue
  source: FlagSource
}>()

const valueBadge = computed(() => {
  if (props.value === true)  return { bg: '#d1fae5', color: '#065f46' }
  if (props.value === false) return { bg: '#fee2e2', color: '#991b1b' }
  return { bg: '#ede9fe', color: '#5b21b6' }
})
</script>

<template>
  <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid #f3f4f6;font-size:10px">
    <span style="color:#9ca3af;flex-shrink:0">{{ time }}</span>
    <span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ name }}</span>
    <DtBadge :bg="SOURCE_STYLES[source].bg" :color="SOURCE_STYLES[source].color">{{ source }}</DtBadge>
    <DtBadge :bg="valueBadge.bg" :color="valueBadge.color" :bold="true">{{ String(value) }}</DtBadge>
  </div>
</template>

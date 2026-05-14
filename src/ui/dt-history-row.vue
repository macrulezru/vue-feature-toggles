<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import type { FlagSource, FlagValue } from '../core/types'
import { SOURCE_STYLES, SOURCE_STYLES_DARK } from './shared'
import { DT_THEME_KEY } from './theme'
import DtBadge from './dt-badge.vue'

const props = defineProps<{
  time: string
  name: string
  value: FlagValue
  source: FlagSource
}>()

const theme = inject(DT_THEME_KEY, ref<'light' | 'dark'>('light'))

const srcStyle = computed(() =>
  theme.value === 'dark' ? SOURCE_STYLES_DARK[props.source] : SOURCE_STYLES[props.source]
)

const valueBadge = computed(() => {
  const d = theme.value === 'dark'
  if (props.value === true)  return { bg: d ? '#052e16' : '#d1fae5', color: d ? '#86efac' : '#065f46' }
  if (props.value === false) return { bg: d ? '#450a0a' : '#fee2e2', color: d ? '#fca5a5' : '#991b1b' }
  return { bg: d ? '#2e1065' : '#ede9fe', color: d ? '#c4b5fd' : '#5b21b6' }
})
</script>

<template>
  <div style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-bottom:1px solid var(--dt-border);font-size:10px">
    <span style="color:var(--dt-text-faint);flex-shrink:0">{{ time }}</span>
    <span style="flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dt-text)">{{ name }}</span>
    <DtBadge :bg="srcStyle.bg" :color="srcStyle.color">{{ source }}</DtBadge>
    <DtBadge :bg="valueBadge.bg" :color="valueBadge.color" :bold="true">{{ String(value) }}</DtBadge>
  </div>
</template>

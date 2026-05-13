<script setup lang="ts">
defineProps<{ name: 'x' | 'export' | 'import' | 'chevron-down' }>()
</script>

<template>
  <svg
    v-if="name === 'x'"
    width="10" height="10" viewBox="0 0 10 10"
    fill="none" stroke="currentColor" stroke-width="2"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <line x1="2" y1="2" x2="8" y2="8" />
    <line x1="8" y1="2" x2="2" y2="8" />
  </svg>

  <svg
    v-else-if="name === 'export'"
    width="12" height="12" viewBox="0 0 12 12"
    fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <line x1="6" y1="10" x2="6" y2="3" />
    <polyline points="3,6 6,3 9,6" />
    <line x1="1" y1="11" x2="11" y2="11" />
  </svg>

  <svg
    v-else-if="name === 'import'"
    width="12" height="12" viewBox="0 0 12 12"
    fill="none" stroke="currentColor" stroke-width="1.75"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <line x1="6" y1="2" x2="6" y2="9" />
    <polyline points="3,6 6,9 9,6" />
    <line x1="1" y1="11" x2="11" y2="11" />
  </svg>

  <svg
    v-else-if="name === 'chevron-down'"
    width="14" height="14" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="2.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
</template>

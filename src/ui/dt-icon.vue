<script setup lang="ts">
defineProps<{ name: 'x' | 'export' | 'import' | 'chevron-down' | 'flag' | 'layers' | 'clock' | 'sun' | 'moon' | 'search' }>()
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

  <svg
    v-else-if="name === 'flag'"
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <line x1="3" y1="1" x2="3" y2="13" />
    <path d="M3 1h8l-2 4 2 4H3" />
  </svg>

  <svg
    v-else-if="name === 'layers'"
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <polyline points="1,5 7,2 13,5 7,8 1,5" />
    <polyline points="1,8.5 7,11.5 13,8.5" />
  </svg>

  <svg
    v-else-if="name === 'clock'"
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <circle cx="7" cy="7" r="5.5" />
    <polyline points="7,4 7,7 9.5,9" />
  </svg>

  <svg
    v-else-if="name === 'sun'"
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <circle cx="7" cy="7" r="2.5" />
    <line x1="7" y1="1" x2="7" y2="2.5" />
    <line x1="7" y1="11.5" x2="7" y2="13" />
    <line x1="1" y1="7" x2="2.5" y2="7" />
    <line x1="11.5" y1="7" x2="13" y2="7" />
    <line x1="2.93" y1="2.93" x2="3.99" y2="3.99" />
    <line x1="10.01" y1="10.01" x2="11.07" y2="11.07" />
    <line x1="11.07" y1="2.93" x2="10.01" y2="3.99" />
    <line x1="3.99" y1="10.01" x2="2.93" y2="11.07" />
  </svg>

  <svg
    v-else-if="name === 'search'"
    width="13" height="13" viewBox="0 0 13 13"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <circle cx="5.5" cy="5.5" r="4" />
    <line x1="8.5" y1="8.5" x2="12" y2="12" />
  </svg>

  <svg
    v-else-if="name === 'moon'"
    width="14" height="14" viewBox="0 0 14 14"
    fill="none" stroke="currentColor" stroke-width="1.5"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" style="display:block;flex-shrink:0"
  >
    <path d="M11.5 8.5A5 5 0 0 1 5.5 2.5a5 5 0 1 0 6 6z" />
  </svg>
</template>

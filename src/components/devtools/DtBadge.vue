<script setup lang="ts">
defineProps<{
  bg: string
  color: string
  bold?: boolean
}>()
</script>

<template>
  <span
    :style="{
      padding: '1px 5px',
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: bold ? 700 : 600,
      background: bg,
      color,
      flexShrink: 0,
    }"
  ><slot /></span>
</template>

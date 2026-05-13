<script setup lang="ts">
import { computed } from 'vue'

/**
 * size:
 *   (default) — footer/action buttons  4px 8px
 *   sm        — row-level buttons       2px 6px
 *   xs        — compact inline buttons  1px 5px
 */
const props = defineProps<{
  size?: 'sm' | 'xs'
  variant?: 'default' | 'danger' | 'success' | 'primary'
  active?: boolean
  flex?: boolean
  disabled?: boolean
  title?: string
}>()

const style = computed(() => {
  const padding =
    props.size === 'xs' ? '1px 5px' :
    props.size === 'sm' ? '2px 6px' :
                          '4px 8px'

  const base = {
    padding,
    borderRadius: '3px',
    cursor:       props.disabled ? 'not-allowed' : 'pointer',
    fontSize:     '11px',
    lineHeight:   1,
    flexShrink:   0,
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '4px',
    opacity:      props.disabled ? 0.5 : 1,
    whiteSpace:   'nowrap' as const,
    ...(props.flex ? { flex: 1, justifyContent: 'center' } : {}),
  }

  if (props.variant === 'danger') {
    return { ...base, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626' }
  }
  if (props.variant === 'success') {
    return { ...base, border: '1px solid #86efac', background: '#fff', color: '#166534' }
  }
  if (props.variant === 'primary') {
    return { ...base, border: '1px solid #c4b5fd', background: props.active ? '#ede9fe' : '#fff', color: '#5b21b6' }
  }
  return {
    ...base,
    border:     '1px solid #d1d5db',
    background: props.active ? '#ede9fe' : '#fff',
    color:      props.active ? '#5b21b6' : '#374151',
  }
})
</script>

<template>
  <button :style="style" :disabled="disabled" :title="title">
    <slot />
  </button>
</template>

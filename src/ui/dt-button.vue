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
    props.size === 'xs' ? '2px 6px' :
    props.size === 'sm' ? '3px 7px' :
                          '5px 10px'

  const base = {
    padding,
    borderRadius: '6px',
    cursor:       props.disabled ? 'not-allowed' : 'pointer',
    fontSize:     '11px',
    lineHeight:   1,
    flexShrink:   0,
    display:      'inline-flex',
    alignItems:   'center',
    gap:          '4px',
    opacity:      props.disabled ? 0.45 : 1,
    whiteSpace:   'nowrap' as const,
    transition:   'opacity .15s',
    ...(props.flex ? { flex: 1, justifyContent: 'center' } : {}),
  }

  if (props.variant === 'danger') {
    return { ...base, border: '1px solid var(--dt-danger)', background: 'var(--dt-danger-bg)', color: 'var(--dt-danger)' }
  }
  if (props.variant === 'success') {
    return { ...base, border: '1px solid var(--dt-success)', background: 'var(--dt-success-bg)', color: 'var(--dt-success)' }
  }
  if (props.variant === 'primary') {
    return { ...base, border: '1px solid var(--dt-accent)', background: props.active ? 'var(--dt-accent-bg)' : 'var(--dt-bg)', color: 'var(--dt-accent)' }
  }
  return {
    ...base,
    border:     '1px solid var(--dt-border-strong)',
    background: props.active ? 'var(--dt-accent-bg)' : 'var(--dt-bg)',
    color:      props.active ? 'var(--dt-accent)' : 'var(--dt-text)',
  }
})
</script>

<template>
  <button :style="style" :disabled="disabled" :title="title">
    <slot />
  </button>
</template>

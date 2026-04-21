<script setup lang="ts">
defineProps<{
  modelValue: boolean
  disabled?: boolean
}>()

defineEmits<{ 'update:modelValue': [val: boolean] }>()
</script>

<template>
  <button
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    :style="{
      position:   'relative',
      display:    'inline-flex',
      alignItems: 'center',
      width:      '28px',
      height:     '15px',
      borderRadius: '8px',
      border:     'none',
      padding:    0,
      cursor:     disabled ? 'not-allowed' : 'pointer',
      background: modelValue ? '#10b981' : '#d1d5db',
      transition: 'background .15s',
      flexShrink: 0,
      outline:    'none',
    }"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span
      :style="{
        position:     'absolute',
        width:        '11px',
        height:       '11px',
        borderRadius: '50%',
        background:   '#fff',
        boxShadow:    '0 1px 2px rgba(0,0,0,.25)',
        transition:   'left .15s',
        left:         modelValue ? '15px' : '2px',
      }"
    />
  </button>
</template>

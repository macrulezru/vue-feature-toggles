<script setup lang="ts">
import DtIcon from './dt-icon.vue'

defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
}>()
defineEmits<{ 'update:modelValue': [val: string] }>()
</script>

<template>
  <div style="position:relative;display:inline-flex;align-items:center;flex-shrink:0">
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      style="appearance:none;-webkit-appearance:none;padding:5px 26px 5px 8px;border-radius:6px;border:1px solid var(--dt-border);font-size:11px;font-family:inherit;line-height:1.4;outline:none;background:var(--dt-bg);color:var(--dt-text);cursor:pointer;transition:border-color .15s"
    >
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
      >{{ opt.label }}</option>
    </select>
    <span style="position:absolute;right:6px;color:var(--dt-text-faint);display:flex;pointer-events:none">
      <DtIcon name="chevron-down" />
    </span>
  </div>
</template>

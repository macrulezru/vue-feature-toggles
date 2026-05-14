<script setup lang="ts">
import DtIcon from './dt-icon.vue'

defineProps<{ modelValue: string; placeholder?: string }>()
defineEmits<{ 'update:modelValue': [val: string] }>()
</script>

<template>
  <div style="position:relative;display:flex;align-items:center;flex:1;min-width:0">
    <span style="position:absolute;left:8px;color:var(--dt-text-faint);display:flex;pointer-events:none;z-index:1">
      <DtIcon name="search" />
    </span>
    <input
      type="text"
      :placeholder="placeholder ?? 'Search…'"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      style="width:100%;padding:5px 8px 5px 28px;border-radius:6px;border:1px solid var(--dt-border);font-size:11px;font-family:inherit;line-height:1.4;outline:none;background:var(--dt-bg);color:var(--dt-text);box-sizing:border-box;transition:border-color .15s"
    />
  </div>
</template>

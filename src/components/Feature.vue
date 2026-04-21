<script setup lang="ts">
import { inject, computed, useSlots } from 'vue'
import type { Component } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider } from '../core/types'

const props = defineProps<{
  name?: string
  group?: string
  fallback?: string | Component
  inverted?: boolean
  tag?: string
}>()

const slots = useSlots()
const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

const isLoading = computed(() => provider?.isLoading.value ?? false)

const shouldShow = computed(() => {
  let enabled: boolean
  if (props.group)     enabled = provider?.isGroupEnabled(props.group) ?? false
  else if (props.name) enabled = provider?.isEnabled(props.name) ?? false
  else                 enabled = false
  return props.inverted ? !enabled : enabled
})

const fallbackComponent = computed(() =>
  props.fallback && typeof props.fallback === 'object' ? (props.fallback as Component) : null,
)
const fallbackText = computed(() =>
  typeof props.fallback === 'string' ? props.fallback : '',
)
</script>

<template>
  <!--
    Two identical branches: one wrapped in the dynamic tag, one raw (Fragment).
    The duplication is intentional — Vue templates can't conditionally omit a wrapper
    without duplicating the inner content.
  -->
  <component :is="tag" v-if="tag">
    <slot v-if="isLoading && slots.loading" name="loading" />
    <slot v-else-if="shouldShow" />
    <slot v-else-if="slots.fallback" name="fallback" />
    <component v-else-if="fallbackComponent" :is="fallbackComponent" />
    <template v-else-if="fallbackText">{{ fallbackText }}</template>
  </component>

  <template v-else>
    <slot v-if="isLoading && slots.loading" name="loading" />
    <slot v-else-if="shouldShow" />
    <slot v-else-if="slots.fallback" name="fallback" />
    <component v-else-if="fallbackComponent" :is="fallbackComponent" />
    <template v-else-if="fallbackText">{{ fallbackText }}</template>
  </template>
</template>

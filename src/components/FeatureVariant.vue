<script setup lang="ts">
import { inject, computed, useSlots } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider } from '../core/types'

const props = defineProps<{
  name: string
}>()

const slots = useSlots()
const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

const variant = computed(() => provider?.getVariant(props.name) ?? '')
</script>

<template>
  <slot v-if="variant && slots[variant]" :name="variant" />
  <slot v-else name="fallback" />
</template>

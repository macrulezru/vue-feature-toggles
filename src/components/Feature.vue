<script lang="ts">
import { defineComponent, inject, computed, h, Fragment, createTextVNode } from 'vue'
import type { PropType, Component, VNode } from 'vue'
import { FEATURE_PROVIDER_KEY } from '../core/FeatureProvider'
import type { FeatureProvider } from '../core/types'

export default defineComponent({
  name: 'Feature',

  props: {
    name: { type: String, required: true },
    fallback: { type: [String, Object] as PropType<string | Component>, default: null },
    inverted: { type: Boolean, default: false },
    tag: { type: String, default: undefined },
  },

  setup(props, { slots }) {
    const provider = inject<FeatureProvider>(FEATURE_PROVIDER_KEY)

    const isEnabled = computed(() => provider?.isEnabled(props.name) ?? false)
    const shouldShow = computed(() => (props.inverted ? !isEnabled.value : isEnabled.value))
    const isLoading = computed(() => provider?.isLoading.value ?? false)

    const wrap = (nodes: VNode[]) => {
      if (!nodes.length) return null
      return props.tag ? h(props.tag, nodes) : h(Fragment, null, nodes)
    }

    return () => {
      if (isLoading.value && slots.loading) {
        return wrap(slots.loading())
      }

      if (shouldShow.value) {
        return slots.default ? wrap(slots.default()) : null
      }

      if (slots.fallback) {
        return wrap(slots.fallback())
      }

      if (typeof props.fallback === 'string' && props.fallback) {
        const nodes = [createTextVNode(props.fallback)]
        return props.tag ? h(props.tag, nodes) : h(Fragment, null, nodes)
      }

      if (props.fallback && typeof props.fallback === 'object') {
        const nodes = [h(props.fallback as Component)]
        return props.tag ? h(props.tag, nodes) : h(Fragment, null, nodes)
      }

      return null
    }
  },
})
</script>

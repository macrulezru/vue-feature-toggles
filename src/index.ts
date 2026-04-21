export { FeatureToggles } from './plugin'
export { default as Feature } from './components/Feature.vue'
export { default as FeatureVariant } from './components/FeatureVariant.vue'
export { default as FeatureDevTools } from './components/FeatureDevTools.vue'
export { vFeature } from './directives/vFeature'
export { useFeature, useFeatureVariant } from './composables/useFeature'
export { useFeatureProvider } from './composables/useFeatureProvider'
export { serializeFlags } from './ssr'
export type {
  FeatureTogglesOptions,
  FeatureProvider,
  FlagSource,
  FlagValue,
  FlagName,
  FlagMeta,
  SetFlagOptions,
  LiveUpdatesOptions,
  FeatureFlagNames,
} from './core/types'

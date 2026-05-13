export { FeatureToggles } from './plugin'
export { default as Feature } from './components/feature.vue'
export { default as FeatureVariant } from './components/feature-variant.vue'
export { default as FeatureDevTools } from './components/feature-dev-tools.vue'
export { vFeature } from './directives/vFeature'
export { useFeature, useFeatureVariant } from './composables/useFeature'
export { useFeatureProvider } from './composables/useFeatureProvider'
export { serializeFlags } from './ssr'
export type {
  FeatureTogglesOptions,
  FeatureProvider,
  FlagSource,
  FlagValue,
  FlagDefinition,
  FlagName,
  FlagMeta,
  FlagSchedule,
  SetFlagOptions,
  WatchFlagOptions,
  LiveUpdatesOptions,
  FeatureFlagNames,
} from './core/types'

import type { InjectionKey, Ref } from 'vue'

export type DtTheme = 'light' | 'dark'

export const DT_THEME_KEY: InjectionKey<Ref<DtTheme>> = Symbol('dt-theme')

type CSSVars = Record<string, string>

export const LIGHT_THEME: CSSVars = {
  '--dt-bg':            '#ffffff',
  '--dt-bg-subtle':     '#f4f4f5',
  '--dt-bg-muted':      '#e4e4e7',
  '--dt-border':        '#e4e4e7',
  '--dt-border-strong': '#d4d4d8',
  '--dt-text':          '#18181b',
  '--dt-text-muted':    '#71717a',
  '--dt-text-faint':    '#a1a1aa',
  '--dt-accent':        '#7c3aed',
  '--dt-accent-bg':     '#f5f3ff',
  '--dt-toggle-on':     '#10b981',
  '--dt-toggle-off':    '#d4d4d8',
  '--dt-danger':        '#ef4444',
  '--dt-danger-bg':     '#fff1f2',
  '--dt-success':       '#10b981',
  '--dt-success-bg':    '#f0fdf4',
  '--dt-warn':          '#d97706',
  '--dt-warn-bg':       '#fffbeb',
  '--dt-shadow':        '0 8px 32px rgba(0,0,0,.12), 0 2px 8px rgba(0,0,0,.06)',
}

export const DARK_THEME: CSSVars = {
  '--dt-bg':            '#18181b',
  '--dt-bg-subtle':     '#27272a',
  '--dt-bg-muted':      '#3f3f46',
  '--dt-border':        '#3f3f46',
  '--dt-border-strong': '#52525b',
  '--dt-text':          '#fafafa',
  '--dt-text-muted':    '#a1a1aa',
  '--dt-text-faint':    '#71717a',
  '--dt-accent':        '#a78bfa',
  '--dt-accent-bg':     '#2e1065',
  '--dt-toggle-on':     '#34d399',
  '--dt-toggle-off':    '#3f3f46',
  '--dt-danger':        '#f87171',
  '--dt-danger-bg':     '#450a0a',
  '--dt-success':       '#34d399',
  '--dt-success-bg':    '#052e16',
  '--dt-warn':          '#fbbf24',
  '--dt-warn-bg':       '#451a03',
  '--dt-shadow':        '0 8px 32px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3)',
}

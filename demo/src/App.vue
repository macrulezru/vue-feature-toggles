<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useFeature, useFeatureVariant, useFeatureProvider,
  Feature, FeatureVariant, FeatureDevTools,
} from '../../src/index'

const {
  flags, isLoading, isReady,
  setFlag, setVariant, resetFlag, resetAll,
  getFlagSource, getVariable, setVariable,
  setGroup, resetGroup, isGroupEnabled,
  getDependencyViolations, isPersisted, watchFlag,
} = useFeatureProvider()

// ── Composables ────────────────────────────────────────────────────────────
const isNewDashboard  = useFeature('newDashboard')
const { betaSearch, darkMode } = useFeature(['betaSearch', 'darkMode'])
const allEnabled       = useFeature('newDashboard', 'darkMode')
const checkoutVariant  = useFeatureVariant('checkoutFlow')

// ── Feature variables (reactive refs) ────────────────────────────────────
const accentColor = getVariable<string>('newDashboard', 'accentColor')
const maxWidgets  = getVariable<number>('newDashboard', 'maxWidgets')
const welcomeText = getVariable<string>('newDashboard', 'welcomeText')

const varColor = ref(String(accentColor.value))
const varMax   = ref(String(maxWidgets.value))
const varText  = ref(String(welcomeText.value))

const applyVars = () => {
  setVariable('newDashboard', 'accentColor', varColor.value)
  setVariable('newDashboard', 'maxWidgets', parseInt(varMax.value, 10) || 1)
  setVariable('newDashboard', 'welcomeText', varText.value)
}

// ── watchFlag log ─────────────────────────────────────────────────────────
const watchLog = ref<string[]>([])
watchFlag('newDashboard', (val, prev) => {
  watchLog.value.unshift(`[${new Date().toLocaleTimeString()}] ${prev} → ${val}`)
  if (watchLog.value.length > 5) watchLog.value.pop()
})

// ── Dependency violations ─────────────────────────────────────────────────
const violations = computed(() => getDependencyViolations())

// ── Helpers ───────────────────────────────────────────────────────────────
const boolFlags = ['newDashboard', 'betaSearch', 'darkMode', 'maintenanceMode', 'aiSuggestions', 'christmasBanner']

const toggleBool = (name: string) => setFlag(name, !(flags.value[name] as boolean))
const togglePersist = (name: string) => setFlag(name, !(flags.value[name] as boolean), { persist: true })
</script>

<template>
  <div class="demo">
    <h1>vue-feature-toggles <span class="version">v0.1.5 demo</span></h1>

    <!-- ── 1. Runtime controls ──────────────────────────────────────────── -->
    <section>
      <h2>1. Runtime controls</h2>
      <p class="hint">isLoading: <b>{{ isLoading }}</b> · isReady: <b>{{ isReady }}</b></p>

      <table class="flag-table">
        <thead><tr><th>Flag</th><th>Value</th><th>Source</th><th>Persisted</th><th>Actions</th></tr></thead>
        <tbody>
          <tr v-for="name in boolFlags" :key="name">
            <td><code>{{ name }}</code></td>
            <td>
              <span class="badge" :class="flags[name] ? 'on' : 'off'">
                {{ flags[name] ? 'ON' : 'OFF' }}
              </span>
            </td>
            <td><span class="source-badge" :class="getFlagSource(name)">{{ getFlagSource(name) }}</span></td>
            <td>{{ isPersisted(name) ? '💾' : '—' }}</td>
            <td class="actions">
              <button @click="toggleBool(name)">toggle</button>
              <button @click="togglePersist(name)" title="Toggle + persist to localStorage">persist</button>
              <button @click="resetFlag(name)" class="btn-reset">reset</button>
            </td>
          </tr>
          <tr>
            <td><code>checkoutFlow</code></td>
            <td><span class="badge variant">{{ flags.checkoutFlow }}</span></td>
            <td><span class="source-badge" :class="getFlagSource('checkoutFlow')">{{ getFlagSource('checkoutFlow') }}</span></td>
            <td>—</td>
            <td class="actions">
              <button @click="setVariant('checkoutFlow', 'v1')">v1</button>
              <button @click="setVariant('checkoutFlow', 'v2')">v2</button>
              <button @click="setVariant('checkoutFlow', 'control')">control</button>
              <button @click="resetFlag('checkoutFlow')" class="btn-reset">reset</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="row" style="margin-top: 10px; gap: 8px">
        <button @click="resetAll">Reset all overrides</button>
      </div>
      <p class="hint url-hint">
        URL override: <code>?feature:newDashboard=false&amp;feature:checkoutFlow=v2</code>
      </p>
    </section>

    <!-- ── 2. &lt;Feature&gt; component ──────────────────────────────────── -->
    <section>
      <h2>2. &lt;Feature&gt; component</h2>

      <div class="demo-grid">
        <div class="demo-box">
          <div class="demo-label">name="newDashboard"</div>
          <Feature name="newDashboard">
            <p class="ok">✔ New dashboard is enabled.</p>
          </Feature>
        </div>

        <div class="demo-box">
          <div class="demo-label">fallback slot</div>
          <Feature name="betaSearch">
            <template #default><p class="ok">✔ Beta search bar</p></template>
            <template #fallback><p class="off-text">○ Legacy search bar (fallback)</p></template>
          </Feature>
        </div>

        <div class="demo-box">
          <div class="demo-label">inverted</div>
          <Feature name="maintenanceMode" :inverted="true">
            <p class="ok">✔ App running normally</p>
          </Feature>
          <Feature name="maintenanceMode">
            <p class="warn">⚠ Maintenance mode active</p>
          </Feature>
        </div>

        <div class="demo-box">
          <div class="demo-label">loading slot (loader flag)</div>
          <Feature name="loaderFlag">
            <template #loading><p class="muted">⟳ Loading…</p></template>
            <template #default><p class="ok">✔ loaderFlag ON</p></template>
            <template #fallback><p class="off-text">○ loaderFlag OFF</p></template>
          </Feature>
        </div>
      </div>
    </section>

    <!-- ── 3. v-feature directive ────────────────────────────────────────── -->
    <section>
      <h2>3. v-feature directive</h2>
      <div class="demo-grid">
        <div class="demo-box">
          <div class="demo-label">v-feature (v-show when ON)</div>
          <div v-feature="'newDashboard'" class="ok">✔ newDashboard is ON</div>
        </div>
        <div class="demo-box">
          <div class="demo-label">v-feature:not (v-show when OFF)</div>
          <div v-feature:not="'betaSearch'" class="ok">✔ betaSearch is OFF</div>
        </div>
        <div class="demo-box">
          <div class="demo-label">v-feature array (AND)</div>
          <div v-feature="['newDashboard', 'darkMode']" class="ok">✔ Both newDashboard AND darkMode are ON</div>
        </div>
      </div>
    </section>

    <!-- ── 4. useFeature composable ──────────────────────────────────────── -->
    <section>
      <h2>4. useFeature composable</h2>
      <div class="kv-list">
        <div><code>useFeature('newDashboard')</code> → <b>{{ isNewDashboard }}</b></div>
        <div><code>useFeature(['betaSearch', 'darkMode'])</code> → betaSearch: <b>{{ betaSearch }}</b>, darkMode: <b>{{ darkMode }}</b></div>
        <div><code>useFeature('newDashboard', 'darkMode')</code> (AND) → <b>{{ allEnabled }}</b></div>
        <div><code>useFeatureVariant('checkoutFlow')</code> → <b>"{{ checkoutVariant }}"</b></div>
      </div>
    </section>

    <!-- ── 5. Multivariate flags + &lt;FeatureVariant&gt; ─────────────────── -->
    <section>
      <h2>5. Multivariate flags &amp; &lt;FeatureVariant&gt;</h2>
      <p class="hint">
        Current variant: <span class="badge variant">{{ checkoutVariant || 'none' }}</span>
        — switch via the table above or DevTools.
      </p>

      <FeatureVariant name="checkoutFlow">
        <template #v1>
          <div class="variant-box v1">
            <strong>Checkout v1</strong> — classic single-page form
          </div>
        </template>
        <template #v2>
          <div class="variant-box v2">
            <strong>Checkout v2</strong> — new step-by-step wizard ✨
          </div>
        </template>
        <template #fallback>
          <div class="variant-box fallback">
            <strong>Checkout (fallback)</strong> — unknown variant
          </div>
        </template>
      </FeatureVariant>
    </section>

    <!-- ── 6. Feature variables ──────────────────────────────────────────── -->
    <section>
      <h2>6. Feature variables</h2>
      <p class="hint">Variables are scoped to a flag and share its priority chain.</p>

      <div class="vars-preview" :style="{ borderColor: accentColor, '--accent': accentColor }">
        <div class="vars-header" :style="{ background: accentColor }">
          {{ welcomeText }}
        </div>
        <div class="vars-body">
          <div class="widget" v-for="n in maxWidgets" :key="n">Widget {{ n }}</div>
        </div>
      </div>

      <div class="var-controls">
        <label>accentColor <input v-model="varColor" type="color" /></label>
        <label>maxWidgets <input v-model="varMax" type="number" min="1" max="12" style="width:50px" /></label>
        <label>welcomeText <input v-model="varText" style="width:200px" /></label>
        <button @click="applyVars">Apply</button>
      </div>
      <p class="hint">URL override: <code>?feature-var:newDashboard:accentColor=%23e11d48</code></p>
    </section>

    <!-- ── 7. Flag groups ────────────────────────────────────────────────── -->
    <section>
      <h2>7. Flag groups</h2>
      <p class="hint">Groups let you control multiple flags with a single call.</p>

      <div class="demo-grid">
        <div class="demo-box" v-for="group in ['beta', 'layout']" :key="group">
          <div class="demo-label">group: <code>{{ group }}</code></div>
          <div class="row" style="align-items: center; gap: 8px; margin-bottom: 8px">
            <span class="badge" :class="isGroupEnabled(group) ? 'on' : 'off'">
              {{ isGroupEnabled(group) ? 'ALL ON' : 'PARTIAL' }}
            </span>
            <button @click="setGroup(group, true)">Enable all</button>
            <button @click="setGroup(group, false)">Disable all</button>
            <button @click="resetGroup(group)" class="btn-reset">Reset</button>
          </div>
          <Feature :group="group">
            <p class="ok">✔ All flags in "{{ group }}" are enabled</p>
            <template #fallback><p class="off-text">○ Some flags in "{{ group }}" are off</p></template>
          </Feature>
        </div>
      </div>
    </section>

    <!-- ── 8. Flag dependencies ──────────────────────────────────────────── -->
    <section>
      <h2>8. Flag dependencies</h2>
      <p class="hint">
        <code>aiSuggestions</code> depends on <code>betaSearch</code>.
        When <code>betaSearch</code> is OFF, <code>aiSuggestions</code> is forced OFF.
      </p>

      <div class="kv-list">
        <div>
          betaSearch:
          <span class="badge" :class="flags.betaSearch ? 'on' : 'off'">{{ flags.betaSearch ? 'ON' : 'OFF' }}</span>
          <button style="margin-left: 8px" @click="toggleBool('betaSearch')">toggle</button>
        </div>
        <div>
          aiSuggestions:
          <span class="badge" :class="flags.aiSuggestions ? 'on' : 'off'">{{ flags.aiSuggestions ? 'ON' : 'OFF' }}</span>
          <span v-if="violations.aiSuggestions" class="warn-inline">
            ⛓ forced OFF — requires: {{ violations.aiSuggestions.join(', ') }}
          </span>
        </div>
      </div>

      <Feature name="aiSuggestions">
        <div class="ok">✔ AI Suggestions panel is active</div>
        <template #fallback><div class="off-text">○ AI Suggestions unavailable (enable betaSearch first)</div></template>
      </Feature>
    </section>

    <!-- ── 9. Contextual rules ────────────────────────────────────────────── -->
    <section>
      <h2>9. Contextual rules</h2>
      <p class="hint">
        <code>darkMode</code> is driven by <code>prefers-color-scheme: dark</code>.
        Source will show <code>rules</code> unless overridden via setFlag or URL.
      </p>
      <div class="kv-list">
        <div>
          darkMode value: <span class="badge" :class="flags.darkMode ? 'on' : 'off'">{{ flags.darkMode ? 'ON' : 'OFF' }}</span>
          — source: <span class="source-badge" :class="getFlagSource('darkMode')">{{ getFlagSource('darkMode') }}</span>
        </div>
      </div>
      <p class="hint">Override in DevTools or via <code>?feature:darkMode=false</code></p>
    </section>

    <!-- ── 10. watchFlag + persistent overrides ───────────────────────────── -->
    <section>
      <h2>10. watchFlag &amp; persistent overrides</h2>

      <div class="demo-grid">
        <div class="demo-box">
          <div class="demo-label">watchFlag('newDashboard', callback)</div>
          <p class="hint">Toggle newDashboard above to see events appear here.</p>
          <div v-if="watchLog.length === 0" class="muted">No events yet.</div>
          <div v-for="(entry, i) in watchLog" :key="i" class="watch-entry">{{ entry }}</div>
        </div>

        <div class="demo-box">
          <div class="demo-label">Persistent overrides (localStorage)</div>
          <p class="hint">Click "persist" in the table above. The flag survives page reload.</p>
          <div class="kv-list">
            <div v-for="name in boolFlags" :key="name">
              <code>{{ name }}</code>: {{ isPersisted(name) ? '💾 persisted' : '—' }}
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── 11. Expiry ─────────────────────────────────────────────────────── -->
    <section>
      <h2>11. Flag expiry</h2>
      <p class="hint">
        <code>christmasBanner</code> expired on <code>2025-01-10</code>. A console warning is printed in dev mode.
        In DevTools it shows a ⚠ badge and yellow row background.
      </p>
      <Feature name="christmasBanner">
        <div class="warn">🎄 Christmas banner (this flag has expired — clean it up!)</div>
        <template #fallback><div class="off-text">○ christmasBanner is off</div></template>
      </Feature>
    </section>

    <FeatureDevTools />
  </div>
</template>

<style scoped>
.demo {
  font-family: system-ui, sans-serif;
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  color: #1f2937;
}

h1 {
  font-size: 22px;
  margin-bottom: 4px;
}
.version {
  font-size: 13px;
  font-weight: 400;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 999px;
  vertical-align: middle;
}

h2 {
  font-size: 15px;
  margin: 0 0 10px;
  color: #374151;
}

section {
  margin-bottom: 32px;
  padding: 16px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.hint {
  font-size: 12px;
  color: #6b7280;
  margin: 4px 0 10px;
}

.url-hint {
  margin-top: 8px;
}

code {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  background: #f3f4f6;
  padding: 1px 5px;
  border-radius: 3px;
}

.row {
  display: flex;
  align-items: center;
}

/* ── Tables ── */
.flag-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.flag-table th {
  text-align: left;
  padding: 5px 8px;
  border-bottom: 1px solid #e5e7eb;
  font-size: 11px;
  color: #6b7280;
  font-weight: 600;
}
.flag-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f3f4f6;
  vertical-align: middle;
}
.actions {
  display: flex;
  gap: 4px;
}

/* ── Badges ── */
.badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 700;
}
.badge.on      { background: #d1fae5; color: #065f46; }
.badge.off     { background: #fee2e2; color: #991b1b; }
.badge.variant { background: #ede9fe; color: #5b21b6; }

.source-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  font-family: ui-monospace, monospace;
}
.source-badge.url     { background: #dbeafe; color: #1e40af; }
.source-badge.runtime { background: #ffedd5; color: #9a3412; }
.source-badge.rules   { background: #dcfce7; color: #166534; }
.source-badge.loader  { background: #ede9fe; color: #5b21b6; }
.source-badge.static  { background: #f3f4f6; color: #374151; }
.source-badge.default { background: #f9fafb; color: #9ca3af; }

/* ── Buttons ── */
button {
  padding: 3px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 11px;
  line-height: 1.5;
}
button:hover { background: #f9fafb; }
.btn-reset { border-color: #fca5a5; color: #dc2626; }
.btn-reset:hover { background: #fff1f2; }

/* ── Text states ── */
.ok       { color: #065f46; font-size: 13px; margin: 4px 0; }
.off-text { color: #9ca3af; font-size: 13px; margin: 4px 0; }
.warn     { color: #92400e; font-size: 13px; margin: 4px 0; }
.muted    { color: #9ca3af; font-size: 12px; }
.warn-inline { color: #dc2626; font-size: 11px; margin-left: 8px; }

/* ── Demo grid ── */
.demo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.demo-box {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fafafa;
}
.demo-label {
  font-size: 10px;
  color: #9ca3af;
  font-family: ui-monospace, monospace;
  margin-bottom: 8px;
  border-bottom: 1px solid #f3f4f6;
  padding-bottom: 4px;
}

/* ── KV list ── */
.kv-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  line-height: 1.6;
}

/* ── Variant boxes ── */
.variant-box {
  padding: 14px 16px;
  border-radius: 6px;
  font-size: 13px;
}
.variant-box.v1      { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; }
.variant-box.v2      { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.variant-box.fallback{ background: #f9fafb; border: 1px solid #d1d5db; color: #6b7280; }

/* ── Variables preview ── */
.vars-preview {
  border: 2px solid var(--accent, #4f46e5);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 14px;
}
.vars-header {
  padding: 10px 14px;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
}
.vars-body {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px;
}
.widget {
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  font-size: 11px;
  background: #fff;
  color: #374151;
}
.var-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  font-size: 12px;
}
.var-controls label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.var-controls input[type="text"],
.var-controls input[type="number"] {
  padding: 3px 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 11px;
}

/* ── watchFlag ── */
.watch-entry {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  padding: 3px 0;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}
</style>

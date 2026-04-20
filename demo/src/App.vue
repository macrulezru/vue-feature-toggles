<script setup lang="ts">
import { useFeature, useFeatureProvider, Feature, FeatureDevTools } from '../../src/index'

const { flags, isLoading, isReady, setFlag, resetFlag, resetAll } = useFeatureProvider()

const isNewDashboard = useFeature('newDashboard')
const { betaSearch, darkMode } = useFeature(['betaSearch', 'darkMode'])
const allEnabled = useFeature('newDashboard', 'darkMode')

const toggle = (name: string) => setFlag(name, !flags.value[name])

const allFlagNames = ['newDashboard', 'betaSearch', 'darkMode', 'maintenanceMode']
</script>

<template>
  <h1>vue-feature-toggles demo</h1>

  <!-- Runtime controls -->
  <section>
    <h2>Runtime controls</h2>
    <div v-for="name in allFlagNames" :key="name" class="flag-row">
      <code>{{ name }}</code>
      <span class="badge" :class="flags[name] ? 'on' : 'off'">
        {{ flags[name] ? 'ON' : 'OFF' }}
      </span>
      <button @click="toggle(name)">Toggle</button>
      <button @click="resetFlag(name)">Reset</button>
    </div>
    <button @click="resetAll" style="margin-top: 8px">Reset all overrides</button>
    <p>isLoading: {{ isLoading }} | isReady: {{ isReady }}</p>
    <p class="url-hint">URL override example: ?feature:newDashboard=false&amp;feature:betaSearch=true</p>
  </section>

  <!-- Component: basic -->
  <section>
    <h2>&lt;Feature&gt; — basic</h2>
    <Feature name="newDashboard">
      <p>New Dashboard is <strong>enabled</strong>.</p>
    </Feature>
    <Feature name="betaSearch">
      <p>Beta Search is enabled.</p>
    </Feature>
  </section>

  <!-- Component: fallback slot -->
  <section>
    <h2>&lt;Feature&gt; — fallback slot</h2>
    <Feature name="betaSearch">
      <template #default><p>Beta Search Bar (new)</p></template>
      <template #fallback><p>Legacy Search Bar (fallback slot)</p></template>
    </Feature>
  </section>

  <!-- Component: fallback prop -->
  <section>
    <h2>&lt;Feature&gt; — fallback prop (string)</h2>
    <Feature name="betaSearch" fallback="Feature is under development">
      <p>Beta Search is active.</p>
    </Feature>
  </section>

  <!-- Component: inverted -->
  <section>
    <h2>&lt;Feature inverted&gt;</h2>
    <Feature name="maintenanceMode" :inverted="true">
      <p>App is running normally (maintenanceMode is OFF).</p>
    </Feature>
    <Feature name="maintenanceMode">
      <p>Maintenance mode is ACTIVE.</p>
    </Feature>
  </section>

  <!-- Component: tag prop -->
  <section>
    <h2>&lt;Feature tag="div"&gt;</h2>
    <Feature name="newDashboard" tag="div" style="border: 2px solid green; padding: 8px">
      <p>Wrapped in a &lt;div&gt; via tag prop.</p>
    </Feature>
  </section>

  <!-- Component: loading slot -->
  <section>
    <h2>&lt;Feature&gt; — loading slot (loader flag)</h2>
    <Feature name="loaderFlag">
      <template #loading><p>Loading flags from server…</p></template>
      <template #default><p>loaderFlag is ON (loaded from loader).</p></template>
      <template #fallback><p>loaderFlag is OFF.</p></template>
    </Feature>
  </section>

  <!-- Directive -->
  <section>
    <h2>v-feature directive</h2>
    <div v-feature="'newDashboard'">v-feature="'newDashboard'" — visible when ON</div>
    <div v-feature:not="'betaSearch'">v-feature:not="'betaSearch'" — visible when OFF</div>
    <div v-feature="['newDashboard', 'darkMode']">
      v-feature="['newDashboard', 'darkMode']" — visible when BOTH are ON
    </div>
  </section>

  <!-- Composable -->
  <section>
    <h2>useFeature composable</h2>
    <p>isNewDashboard (single): {{ isNewDashboard }}</p>
    <p>betaSearch (from array): {{ betaSearch }}</p>
    <p>darkMode (from array): {{ darkMode }}</p>
    <p>allEnabled = newDashboard AND darkMode: {{ allEnabled }}</p>
  </section>

  <FeatureDevTools />
</template>

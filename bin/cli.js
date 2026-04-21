#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'
import { pathToFileURL } from 'node:url'

// ── ANSI colors ───────────────────────────────────────────────────────────────
const c = {
  green:  s => `\x1b[32m${s}\x1b[0m`,
  red:    s => `\x1b[31m${s}\x1b[0m`,
  yellow: s => `\x1b[33m${s}\x1b[0m`,
  cyan:   s => `\x1b[36m${s}\x1b[0m`,
  gray:   s => `\x1b[90m${s}\x1b[0m`,
  bold:   s => `\x1b[1m${s}\x1b[0m`,
  dim:    s => `\x1b[2m${s}\x1b[0m`,
}

// ── CLI arg parsing ───────────────────────────────────────────────────────────
const argv = process.argv.slice(2)

function getFlag(name, fallback = undefined) {
  const i = argv.indexOf(name)
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback
}

function hasFlag(name) {
  return argv.includes(name)
}

const command   = argv.find(a => !a.startsWith('-'))
const configArg = getFlag('--config')
const rootArg   = getFlag('--root', '.')
const root      = resolve(process.cwd(), rootArg)

// ── Config loading ────────────────────────────────────────────────────────────
async function loadConfig() {
  const candidates = configArg
    ? [resolve(process.cwd(), configArg)]
    : [
        join(root, 'feature-toggles.config.js'),
        join(root, 'feature-toggles.config.mjs'),
        join(root, 'feature-toggles.config.json'),
      ]

  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      if (p.endsWith('.json')) {
        return JSON.parse(readFileSync(p, 'utf8'))
      }
      const mod = await import(pathToFileURL(p).href)
      return mod.default ?? mod
    } catch (e) {
      console.error(c.red(`Failed to load config: ${p}`))
      console.error(c.dim(e.message))
      process.exit(1)
    }
  }

  console.error(c.red('No config file found.'))
  console.error(c.dim('Expected: feature-toggles.config.js | .mjs | .json'))
  process.exit(1)
}

// ── File walker ───────────────────────────────────────────────────────────────
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.nuxt', 'coverage', '.output'])
const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.vue'])

async function* walkFiles(dir) {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) yield* walkFiles(full)
    } else if (SOURCE_EXTS.has(extname(entry.name))) {
      yield full
    }
  }
}

// ── Flag reference extraction ─────────────────────────────────────────────────
const REF_PATTERNS = [
  // useFeature('flagName') or useFeatureVariant('flagName')
  /useFeature(?:Variant)?\(\s*['"`]([^'"`]+)['"`]/g,
  // useFeature(['flag1', 'flag2'])
  /useFeature\(\s*\[([^\]]+)\]/g,
  // v-feature="'flagName'"  or  v-feature="\"flagName\""
  /v-feature=(?:'|")['"`]([^'"`]+)['"`](?:'|")/g,
  // isEnabled('flagName')  getVariant('flagName')
  /(?:isEnabled|getVariant|setFlag|resetFlag|watchFlag)\(\s*['"`]([^'"`]+)['"`]/g,
]

const ARRAY_ITEM = /['"`]([^'"`]+)['"`]/g

function extractFlagRefs(content) {
  const refs = new Set()

  for (const pattern of REF_PATTERNS) {
    pattern.lastIndex = 0
    let m
    while ((m = pattern.exec(content)) !== null) {
      const captured = m[1]
      // Could be an array body like "'flag1', 'flag2'"
      if (captured.includes("'") || captured.includes('"') || captured.includes('`')) {
        ARRAY_ITEM.lastIndex = 0
        let item
        while ((item = ARRAY_ITEM.exec(captured)) !== null) refs.add(item[1])
      } else {
        refs.add(captured)
      }
    }
  }

  return refs
}

// ── Levenshtein edit distance ─────────────────────────────────────────────────
function editDistance(a, b) {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

function closestFlag(name, known) {
  let best = null, bestDist = Infinity
  for (const k of known) {
    const d = editDistance(name, k)
    if (d < bestDist) { bestDist = d; best = k }
  }
  return bestDist <= 3 ? best : null
}

// ── list command ──────────────────────────────────────────────────────────────
async function cmdList(config) {
  const flags    = config.flags    ?? {}
  const meta     = config.meta     ?? {}
  const expiry   = config.expiry   ?? {}
  const groups   = config.groups   ?? {}
  const now      = new Date()

  const names = Object.keys(flags)
  if (names.length === 0) {
    console.log(c.dim('No flags defined in config.'))
    return
  }

  // Build reverse group map
  const flagGroups = {}
  for (const [group, members] of Object.entries(groups)) {
    for (const f of members) {
      flagGroups[f] = flagGroups[f] ? [...flagGroups[f], group] : [group]
    }
  }

  const COL = { name: 0, value: 0, desc: 0 }
  for (const n of names) {
    COL.name  = Math.max(COL.name,  n.length)
    COL.value = Math.max(COL.value, String(flags[n]).length)
    COL.desc  = Math.max(COL.desc,  (meta[n]?.description ?? '').length)
  }

  console.log(c.bold(`\nFeature flags  ${c.dim(`(${names.length} total)`)}\n`))

  for (const name of names) {
    const value   = flags[name]
    const m       = meta[name] ?? {}
    const exp     = expiry[name]
    const grps    = flagGroups[name] ?? []

    const isOn    = value === true || (typeof value === 'string' && value !== '')
    const icon    = isOn ? c.green('✔') : c.dim('○')
    const valStr  = typeof value === 'boolean'
      ? (value ? c.green('true') : c.red('false'))
      : c.cyan(`"${value}"`)

    let expired = false
    if (exp) {
      const expDate = new Date(exp)
      expired = !isNaN(expDate) && expDate < now
    }

    const namePad = name.padEnd(COL.name)
    const valPad  = String(value).padEnd(COL.value)

    let line = `  ${icon}  ${c.bold(namePad)}  ${valStr.padEnd(COL.value + 10)}`

    if (m.description) line += `  ${c.dim(m.description)}`

    const badges = []
    if (expired)        badges.push(c.red('[expired]'))
    if (m.owner)        badges.push(c.gray(`@${m.owner}`))
    if (m.ticket)       badges.push(c.cyan(m.ticket))
    if (grps.length)    badges.push(c.dim(`[${grps.join(', ')}]`))
    if (m.addedAt)      badges.push(c.dim(`added ${m.addedAt}`))

    if (badges.length) line += `  ${badges.join('  ')}`

    console.log(line)
  }
  console.log()
}

// ── check command ─────────────────────────────────────────────────────────────
async function cmdCheck(config) {
  const known = new Set(Object.keys(config.flags ?? {}))
  const srcDir = resolve(root, getFlag('--src', 'src'))

  if (!existsSync(srcDir)) {
    console.error(c.red(`Source directory not found: ${srcDir}`))
    process.exit(1)
  }

  console.log(c.bold(`\nChecking flag references in ${c.cyan(srcDir)}\n`))

  const unknown = []    // { file, name, suggestion }
  let filesScanned = 0

  for await (const file of walkFiles(srcDir)) {
    filesScanned++
    let content
    try { content = readFileSync(file, 'utf8') } catch { continue }

    const refs = extractFlagRefs(content)
    for (const ref of refs) {
      if (!known.has(ref)) {
        unknown.push({ file, name: ref, suggestion: closestFlag(ref, known) })
      }
    }
  }

  console.log(c.dim(`Scanned ${filesScanned} files, ${known.size} known flags.\n`))

  if (unknown.length === 0) {
    console.log(c.green('✔ All flag references are valid.\n'))
    return
  }

  for (const { file, name, suggestion } of unknown) {
    const rel = file.replace(root + '/', '').replace(root + '\\', '')
    let msg = `  ${c.red('✖')}  ${c.bold(name)}  ${c.dim(rel)}`
    if (suggestion) msg += `  ${c.yellow(`→ did you mean "${suggestion}"?`)}`
    console.log(msg)
  }

  console.log()
  console.error(c.red(`${unknown.length} unknown flag reference(s) found.`))
  process.exit(1)
}

// ── stale command ─────────────────────────────────────────────────────────────
async function cmdStale(config) {
  const months  = parseInt(getFlag('--months', '3'), 10)
  const flags   = config.flags ?? {}
  const meta    = config.meta  ?? {}
  const now     = new Date()
  const cutoff  = new Date(now)
  cutoff.setMonth(cutoff.getMonth() - months)

  const stale = []

  for (const [name, value] of Object.entries(flags)) {
    if (value !== true) continue
    const addedAt = meta[name]?.addedAt
    if (!addedAt) continue
    const added = new Date(addedAt)
    if (!isNaN(added) && added < cutoff) {
      stale.push({ name, addedAt, meta: meta[name] })
    }
  }

  console.log(c.bold(`\nStale flags  ${c.dim(`(true for > ${months} months)`)}\n`))

  if (stale.length === 0) {
    console.log(c.green(`✔ No stale flags found.\n`))
    return
  }

  for (const { name, addedAt, meta: m } of stale) {
    const added  = new Date(addedAt)
    const ageDays = Math.floor((now - added) / 86400000)
    const ageStr = ageDays >= 365
      ? `${(ageDays / 365).toFixed(1)}y`
      : `${Math.floor(ageDays / 30)}mo`

    let line = `  ${c.yellow('⚠')}  ${c.bold(name)}  ${c.dim(`added ${addedAt} (${ageStr} ago)`)}`
    if (m?.owner)  line += `  ${c.gray(`@${m.owner}`)}`
    if (m?.ticket) line += `  ${c.cyan(m.ticket)}`
    console.log(line)
  }

  console.log()
  console.log(c.yellow(`${stale.length} stale flag(s) found. Consider cleaning them up.`))
  console.log()
}

// ── help ──────────────────────────────────────────────────────────────────────
function printHelp() {
  console.log(`
${c.bold('vue-feature-toggles')} — CLI tools for feature flag management

${c.bold('Usage:')}
  vue-feature-toggles <command> [options]

${c.bold('Commands:')}
  ${c.cyan('list')}    Show all flags defined in config with metadata
  ${c.cyan('check')}   Scan source files for references to unknown flags
  ${c.cyan('stale')}   Find flags that have been ${c.bold('true')} for longer than N months

${c.bold('Options:')}
  ${c.cyan('--config <path>')}   Path to config file (default: feature-toggles.config.js)
  ${c.cyan('--root <path>')}     Project root (default: current directory)

${c.bold('check options:')}
  ${c.cyan('--src <path>')}      Source directory to scan (default: src)

${c.bold('stale options:')}
  ${c.cyan('--months <n>')}      Age threshold in months (default: 3)

${c.bold('Config file:')}  feature-toggles.config.js | .mjs | .json

  ${c.dim('export default {')}
  ${c.dim("  flags:  { newDashboard: true, betaSearch: false },")}
  ${c.dim("  meta:   { newDashboard: { owner: 'alice', addedAt: '2024-01-15', ticket: 'PROJ-42' } },")}
  ${c.dim("  expiry: { newDashboard: '2025-06-01' },")}
  ${c.dim("  groups: { beta: ['newDashboard', 'betaSearch'] },")}
  ${c.dim('}')}
`)
}

// ── main ──────────────────────────────────────────────────────────────────────
if (!command || command === 'help' || hasFlag('--help') || hasFlag('-h')) {
  printHelp()
  process.exit(0)
}

const config = await loadConfig()

if      (command === 'list')  await cmdList(config)
else if (command === 'check') await cmdCheck(config)
else if (command === 'stale') await cmdStale(config)
else {
  console.error(c.red(`Unknown command: ${command}`))
  printHelp()
  process.exit(1)
}

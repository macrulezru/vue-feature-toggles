#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { resolve, join, extname, sep } from 'node:path'
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
  // 1. Explicit --config flag or feature-toggles.config.{js,mjs,json} in root
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
      if (p.endsWith('.json')) return JSON.parse(readFileSync(p, 'utf8'))
      const mod = await import(pathToFileURL(p).href)
      return mod.default ?? mod
    } catch (e) {
      console.error(c.red(`Failed to load config: ${p}`))
      console.error(c.dim(e.message))
      process.exit(1)
    }
  }

  // 2. Scan source files for app.use(FeatureToggles, { ... })
  const found = await scanForPluginConfig()
  if (found) {
    const rel = found.sourceFile.replace(root + sep, '').replace(root + '/', '')
    console.log(c.dim(`Config scanned from: ${rel}\n`))
    return found.config
  }

  console.error(c.red('No feature toggles configuration found.'))
  console.error(c.dim('Add app.use(FeatureToggles, { flags: { ... } }) in your app, or create feature-toggles.config.js'))
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

// ── Static plugin config parser ───────────────────────────────────────────────
// Extracts the text between matching braces starting at str[openIdx] === '{'
function extractBracedBody(str, openIdx) {
  let depth = 0, inStr = false, sc = ''
  for (let i = openIdx; i < str.length; i++) {
    const ch = str[i]
    if (inStr) {
      if (ch === sc && str[i - 1] !== '\\') inStr = false
    } else if (ch === '"' || ch === "'" || ch === '`') {
      inStr = true; sc = ch
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return str.slice(openIdx + 1, i)
    }
  }
  return null
}

// Finds `name: { ... }` at the top level of body and returns inner content
function findSectionBody(body, name) {
  const re = new RegExp(`(?:^|,)[ \\t]*['"]?${name}['"]?[ \\t]*:[ \\t]*\\{`, 'gm')
  let m
  while ((m = re.exec(body)) !== null) {
    const openIdx = m.index + m[0].length - 1
    const inner = extractBracedBody(body, openIdx)
    if (inner !== null) return inner
  }
  return null
}

// Parse { key: literal, ... } — booleans, strings, numbers
function parseFlatObject(body) {
  const result = {}
  const re = /['"]?(\w[\w$]*)['"]?\s*:\s*(true|false|null|-?\d+(?:\.\d+)?|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g
  let m
  while ((m = re.exec(body)) !== null) {
    const raw = m[2]
    if      (raw === 'true')  result[m[1]] = true
    else if (raw === 'false') result[m[1]] = false
    else if (raw === 'null')  result[m[1]] = null
    else if (/^-?\d/.test(raw)) result[m[1]] = Number(raw)
    else result[m[1]] = raw.slice(1, -1)   // strip surrounding quotes
  }
  return result
}

// Parse { key: { subkey: literal, ... }, ... }
function parseNestedFlatObject(body) {
  const result = {}
  const re = /['"]?(\w[\w$]*)['"]?\s*:\s*\{/g
  let m
  while ((m = re.exec(body)) !== null) {
    const openIdx = body.indexOf('{', m.index + m[0].length - 1)
    if (openIdx === -1) continue
    const inner = extractBracedBody(body, openIdx)
    if (inner !== null) result[m[1]] = parseFlatObject(inner)
  }
  return result
}

// Parse { key: ['item', 'item'], ... }
function parseArrayObject(body) {
  const result = {}
  const re = /['"]?(\w[\w$]*)['"]?\s*:\s*\[/g
  let m
  while ((m = re.exec(body)) !== null) {
    const openIdx = body.indexOf('[', m.index + m[0].length - 1)
    if (openIdx === -1) continue
    let depth = 0, inStr = false, sc = '', end = -1
    for (let i = openIdx; i < body.length; i++) {
      const ch = body[i]
      if (inStr) {
        if (ch === sc && body[i - 1] !== '\\') inStr = false
      } else if (ch === '"' || ch === "'" || ch === '`') {
        inStr = true; sc = ch
      } else if (ch === '[') depth++
      else if (ch === ']') { depth--; if (depth === 0) { end = i; break } }
    }
    if (end === -1) continue
    const items = []
    const itemRe = /['"`]([^'"`]+)['"`]/g
    let im
    while ((im = itemRe.exec(body.slice(openIdx + 1, end))) !== null) items.push(im[1])
    result[m[1]] = items
  }
  return result
}

// Walk source files and find app.use(FeatureToggles, { ... })
async function scanForPluginConfig() {
  for await (const file of walkFiles(root)) {
    let content
    try { content = readFileSync(file, 'utf8') } catch { continue }

    const pluginMatch = /\.use\s*\(\s*FeatureToggles\s*,\s*\{/.exec(content)
    if (!pluginMatch) continue

    const openIdx = content.lastIndexOf('{', pluginMatch.index + pluginMatch[0].length)
    if (openIdx === -1) continue

    const configBody = extractBracedBody(content, openIdx)
    if (!configBody) continue

    const config = {}

    const flagsBody = findSectionBody(configBody, 'flags')
    if (flagsBody) config.flags = parseFlatObject(flagsBody)

    const metaBody = findSectionBody(configBody, 'meta')
    if (metaBody) config.meta = parseNestedFlatObject(metaBody)

    const expiryBody = findSectionBody(configBody, 'expiry')
    if (expiryBody) config.expiry = parseFlatObject(expiryBody)

    const groupsBody = findSectionBody(configBody, 'groups')
    if (groupsBody) config.groups = parseArrayObject(groupsBody)

    const depsBody = findSectionBody(configBody, 'dependencies')
    if (depsBody) config.dependencies = parseArrayObject(depsBody)

    if (config.flags && Object.keys(config.flags).length > 0) {
      return { config, sourceFile: file }
    }
  }
  return null
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
  const flags  = config.flags  ?? {}
  const meta   = config.meta   ?? {}
  const expiry = config.expiry ?? {}
  const groups = config.groups ?? {}
  const now    = new Date()

  const names = Object.keys(flags)
  if (names.length === 0) {
    console.log(c.dim('\nNo flags defined in config.\n'))
    return
  }

  // Reverse group map: flag → [group, ...]
  const flagGroups = {}
  for (const [group, members] of Object.entries(groups)) {
    for (const f of members) {
      if (!flagGroups[f]) flagGroups[f] = []
      flagGroups[f].push(group)
    }
  }

  // Build plain-text rows (no color yet — needed for width calculation)
  const rows = names.map(name => {
    const value   = flags[name]
    const m       = meta[name] ?? {}
    const exp     = expiry[name]
    const expired = exp ? (new Date(exp) < now) : false
    return {
      name,
      value:     String(value),
      rawValue:  value,
      source:    'static',
      owner:     m.owner   ?? '',
      added:     m.addedAt ?? '',
      expiry:    expired ? '[EXPIRED]' : '',
      groups:    (flagGroups[name] ?? []).join(', '),
      isExpired: expired,
    }
  })

  const HEADERS = ['Flag', 'Value', 'Source', 'Owner', 'Added', 'Expiry', 'Groups']
  const KEYS    = ['name', 'value', 'source', 'owner', 'added', 'expiry', 'groups']

  // Max width per column (header vs longest value)
  const widths = HEADERS.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[KEYS[i]].length)),
  )

  const totalWidth = widths.reduce((s, w) => s + w, 0) + 2 * (widths.length - 1)

  console.log()
  console.log(HEADERS.map((h, i) => c.bold(h.padEnd(widths[i]))).join('  '))
  console.log(c.dim('─'.repeat(totalWidth)))

  for (const row of rows) {
    // Pad each cell to its column width BEFORE applying color —
    // ANSI escape codes add invisible bytes that break padEnd alignment.
    const cells = KEYS.map((k, i) => row[k].padEnd(widths[i]))

    const colored = [
      row.isExpired ? c.yellow(cells[0]) : cells[0],
      typeof row.rawValue === 'boolean'
        ? (row.rawValue ? c.green(cells[1]) : c.red(cells[1]))
        : c.cyan(cells[1]),
      c.dim(cells[2]),
      cells[3].trim() ? c.gray(cells[3]) : cells[3],
      c.dim(cells[4]),
      row.isExpired ? c.yellow(cells[5]) : cells[5],
      c.dim(cells[6]),
    ]

    console.log(colored.join('  ').trimEnd())
  }

  console.log()
}

// ── check command ─────────────────────────────────────────────────────────────
async function cmdCheck(config) {
  const known = new Set(Object.keys(config.flags ?? {}))

  // Accept positional arg after 'check' (e.g. `check ./src`) or --src flag
  const cmdIdx      = argv.indexOf('check')
  const positional  = argv[cmdIdx + 1] && !argv[cmdIdx + 1].startsWith('-') ? argv[cmdIdx + 1] : null
  const srcDir      = resolve(root, positional ?? getFlag('--src', 'src'))

  if (!existsSync(srcDir)) {
    console.error(c.red(`Source directory not found: ${srcDir}`))
    process.exit(1)
  }

  console.log(c.bold(`\nChecking flag references in ${c.cyan(srcDir)}\n`))

  const foundValid   = new Set()          // known flag names referenced in source
  const foundUnknown = new Map()          // name → suggestion
  let filesScanned   = 0

  for await (const file of walkFiles(srcDir)) {
    filesScanned++
    let content
    try { content = readFileSync(file, 'utf8') } catch { continue }

    for (const ref of extractFlagRefs(content)) {
      if (known.has(ref)) {
        foundValid.add(ref)
      } else if (!foundUnknown.has(ref)) {
        foundUnknown.set(ref, closestFlag(ref, known))
      }
    }
  }

  console.log(c.dim(`Scanned ${filesScanned} files, ${known.size} known flags.\n`))

  if (foundValid.size === 0 && foundUnknown.size === 0) {
    console.log(c.dim('  No flag references found in source.\n'))
    return
  }

  // Valid refs first
  for (const name of [...foundValid].sort()) {
    console.log(`  ✅ ${name}`)
  }

  // Unknown refs
  for (const [name, suggestion] of foundUnknown) {
    let msg = `  ❌ ${c.bold(name)}  — unknown flag`
    if (suggestion) msg += `. Did you mean: ${c.yellow(suggestion)}?`
    console.log(msg)
  }

  console.log()

  if (foundUnknown.size > 0) {
    console.error(c.red(`${foundUnknown.size} unknown flag reference(s) found.`))
    process.exit(1)
  } else {
    console.log(c.green(`✔ All ${foundValid.size} flag reference(s) are valid.\n`))
  }
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

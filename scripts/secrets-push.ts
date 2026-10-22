/**
 * Push production secrets from .prod.vars to Cloudflare in one go.
 *
 *   bun run secrets:push            # sync .prod.vars → Cloudflare Worker secrets
 *   bun run secrets:push --dry-run  # show what would change, send nothing
 *   bun run secrets:push other.vars # use a different file
 *
 * Rules:
 *  - KEY=value lines are pushed (created or overwritten).
 *  - KEY= (empty) is skipped: whatever Cloudflare already has stays. Cloudflare never shows secret
 *    values back, so an empty line is how you say "keep the current one".
 *  - Nothing is ever deleted.
 * Non-secret config (APP_URL, EMAIL_FROM, ADMIN_EMAILS…) lives in wrangler.jsonc "vars" and ships
 * with `bun run deploy`; a secret can't share a name with one of those.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const dry = args.includes('--dry-run')
const file = args.find((a) => !a.startsWith('--')) ?? '.prod.vars'

if (!existsSync(file)) {
  console.error(`✗ ${file} not found. Copy .prod.vars.example to .prod.vars and fill it in.`)
  process.exit(1)
}

function parse(text: string) {
  const out: Record<string, string> = {}
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    out[key] = value
  }
  return out
}

const all = parse(readFileSync(file, 'utf8'))
const push = Object.fromEntries(Object.entries(all).filter(([, v]) => v !== ''))
const kept = Object.keys(all).filter((k) => all[k] === '')

// A secret with the same name as a plain var in wrangler.jsonc would clash on deploy.
const wranglerText = readFileSync('wrangler.jsonc', 'utf8')
const varsBlock = wranglerText.match(/"vars"\s*:\s*\{([^}]*)\}/)?.[1] ?? ''
const plainVars = [...varsBlock.matchAll(/"([A-Z0-9_]+)"\s*:/g)].map((m) => m[1])
const clash = Object.keys(push).filter((k) => plainVars.includes(k))
if (clash.length) {
  console.error(`✗ ${clash.join(', ')} ${clash.length === 1 ? 'is' : 'are'} plain vars in wrangler.jsonc. Change ${clash.length === 1 ? 'it' : 'them'} there instead.`)
  process.exit(1)
}

console.log(`From ${file}:`)
for (const k of Object.keys(push)) console.log(`  ↑ ${k}`)
for (const k of kept) console.log(`  · ${k} (empty, keeping Cloudflare's current value)`)
if (!Object.keys(push).length) {
  console.log('Nothing to push.')
  process.exit(0)
}
if (dry) {
  console.log('Dry run: nothing sent.')
  process.exit(0)
}

// Node can't reach the network on this machine, Bun can; run Wrangler under Bun.
const tmp = join(tmpdir(), `tinygig-secrets-${process.pid}.json`)
writeFileSync(tmp, JSON.stringify(push))
chmodSync(tmp, 0o600)
try {
  const r = spawnSync('bun', ['--bun', 'node_modules/wrangler/bin/wrangler.js', 'secret', 'bulk', tmp], { stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
} finally {
  rmSync(tmp, { force: true })
}
console.log(`✓ ${Object.keys(push).length} secret${Object.keys(push).length === 1 ? '' : 's'} synced. They take effect immediately, no deploy needed.`)

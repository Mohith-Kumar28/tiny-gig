/**
 * Prints a fresh VAPID key pair for browser push, ready to paste into .dev.vars or .prod.vars.
 *   bun run vapid:new
 * Replacing a live pair makes every device turn alerts on again, so only do it on purpose.
 */
const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey)
const b64url = (b: Uint8Array) => Buffer.from(b).toString('base64url')
console.log(`VAPID_PUBLIC_KEY=${b64url(raw)}\nVAPID_PRIVATE_KEY=${jwk.d}`)
export {}

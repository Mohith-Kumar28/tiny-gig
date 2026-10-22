import { buildPushPayload } from '@block65/webcrypto-web-push'
import { describe, expect, it } from 'vitest'

const b64u = (b: ArrayBuffer | Uint8Array) => Buffer.from(b as ArrayBuffer).toString('base64url')

describe('web push payload', () => {
  it('encrypts and signs with keys in the formats we store', async () => {
    const server = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
    const client = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    const vapid = {
      subject: 'mailto:ops@example.com',
      publicKey: b64u(await crypto.subtle.exportKey('raw', server.publicKey)),
      privateKey: (await crypto.subtle.exportKey('jwk', server.privateKey)).d,
    }
    const payload = await buildPushPayload(
      { data: { title: 'New gig', body: 'Say you’re interested', href: '/w/gigs/x' }, options: { ttl: 60 } },
      {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
        expirationTime: null,
        keys: { p256dh: b64u(await crypto.subtle.exportKey('raw', client.publicKey)), auth: b64u(crypto.getRandomValues(new Uint8Array(16))) },
      },
      vapid,
    )
    expect(payload.method.toUpperCase()).toBe('POST')
    expect(String((payload.headers as Record<string, string>).authorization)).toMatch(/^vapid t=.+, k=/)
  })
})

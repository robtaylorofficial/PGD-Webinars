import Mux from '@mux/mux-node'
import { SignJWT } from 'jose'

let _mux: Mux | null = null

export function getMux(): Mux {
  if (!_mux) {
    _mux = new Mux({
      tokenId: process.env.MUX_TOKEN_ID!,
      tokenSecret: process.env.MUX_TOKEN_SECRET!,
    })
  }
  return _mux
}

/**
 * Generate a signed Mux playback token valid for `expiresInSeconds`.
 * Used for both VOD and live playback IDs that have `signed` policy.
 */
export async function signMuxPlaybackToken(
  playbackId: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const keyId = process.env.MUX_SIGNING_KEY_ID!
  const privateKeyB64 = process.env.MUX_SIGNING_PRIVATE_KEY!

  // Mux signing keys are base64-encoded PEM
  const privateKeyPem = Buffer.from(privateKeyB64, 'base64').toString('utf-8')
  const keyData = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuffer(privateKeyPem),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const token = await new SignJWT({ sub: playbackId })
    .setProtectedHeader({ alg: 'RS256', kid: keyId })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(keyData)

  return token
}

function pemToBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binary = atob(b64)
  const buf = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i)
  return buf.buffer
}

/**
 * Get the Mux storyboard thumbnail URL for a chapter timestamp.
 * Returns a static image URL — no API call needed.
 */
export function muxThumbnailUrl(
  playbackId: string,
  timeSecs: number,
  width = 320,
): string {
  return `https://image.mux.com/${playbackId}/thumbnail.jpg?time=${timeSecs}&width=${width}`
}

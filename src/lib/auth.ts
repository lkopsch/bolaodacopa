import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET ?? process.env.ADMIN_PASSWORD ?? 'default-secret-change-me'

function base64url(buf: Buffer): string {
  return buf.toString('base64url')
}

function fromBase64url(str: string): Buffer {
  return Buffer.from(str, 'base64url')
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  const derived = scryptSync(password, salt, 64).toString('hex')
  return timingSafeEqual(Buffer.from(derived), Buffer.from(hash))
}

export function signToken(payload: Record<string, unknown>, expiresIn = '7d'): string {
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })))
  const body = base64url(Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 7 * 86400000 })))
  const signature = base64url(createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest())
  return `${header}.${body}.${signature}`
}

export function isAdminRequest(adminPassword: string | null, bearerToken: string | null): boolean {
  if (adminPassword && adminPassword === process.env.ADMIN_PASSWORD) return true
  if (bearerToken?.startsWith('Bearer ')) {
    const payload = verifyToken(bearerToken.slice(7))
    return payload?.is_admin === true
  }
  return false
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, signature] = parts
    const expectedSig = base64url(createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest())
    if (signature !== expectedSig) return null
    const payload = JSON.parse(fromBase64url(body).toString())
    if (payload.exp && Date.now() > payload.exp) return null
    return payload
  } catch {
    return null
  }
}

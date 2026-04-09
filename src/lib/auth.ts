import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import type { Session } from './types'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-prod'
const COOKIE_NAME = 'tfc_token'

export function signToken(session: Session): string {
  return jwt.sign(session, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): Session | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function tokenCookieHeader(token: string): string {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Strict`
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`
}

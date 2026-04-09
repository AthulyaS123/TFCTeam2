export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, tokenCookieHeader } from '@/lib/auth'
import {
  getUserIndex,
  saveUserIndex,
  saveUserProfile,
  saveUserPortfolio,
} from '@/lib/s3-data'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password || username.length < 3 || password.length < 6) {
    return NextResponse.json({ error: 'Username ≥ 3 chars and password ≥ 6 chars required' }, { status: 400 })
  }

  const index = await getUserIndex()
  if (index[username.toLowerCase()]) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 })
  }

  const userId = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(password, 12)
  const now = Date.now()

  index[username.toLowerCase()] = userId

  await Promise.all([
    saveUserIndex(index),
    saveUserProfile({ userId, username, passwordHash, createdAt: now }),
    saveUserPortfolio(userId, { balance: 100_000, holdings: {}, costBasis: {}, trades: [], totalFeesPaid: 0 }),
  ])

  const token = signToken({ userId, username })
  const res = NextResponse.json({ userId, username }, { status: 201 })
  res.headers.set('Set-Cookie', tokenCookieHeader(token))
  return res
}

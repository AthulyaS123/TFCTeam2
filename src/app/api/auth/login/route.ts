export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken, tokenCookieHeader } from '@/lib/auth'
import { getUserIndex, getUserProfile } from '@/lib/s3-data'

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 })
  }

  const index = await getUserIndex()
  const userId = index[username.toLowerCase()]
  if (!userId) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const profile = await getUserProfile(userId)
  if (!profile) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, profile.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = signToken({ userId, username: profile.username })
  const res = NextResponse.json({ userId, username: profile.username })
  res.headers.set('Set-Cookie', tokenCookieHeader(token))
  return res
}

import { NextRequest, NextResponse } from 'next/server'
import { getObject } from '@/lib/s3'

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
  const content = await getObject(key)
  return NextResponse.json({ key, content })
}

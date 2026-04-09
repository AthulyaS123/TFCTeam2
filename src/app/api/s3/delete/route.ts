import { NextRequest, NextResponse } from 'next/server'
import { deleteObject } from '@/lib/s3'

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key')
  if (!key) return NextResponse.json({ error: 'key is required' }, { status: 400 })
  await deleteObject(key)
  return NextResponse.json({ success: true, key })
}

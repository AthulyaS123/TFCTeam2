import { NextRequest, NextResponse } from 'next/server'
import { uploadObject } from '@/lib/s3'

export async function POST(req: NextRequest) {
  const { key, content, contentType } = await req.json()
  if (!key || content === undefined) {
    return NextResponse.json({ error: 'key and content are required' }, { status: 400 })
  }
  await uploadObject(key, content, contentType)
  return NextResponse.json({ success: true, key })
}

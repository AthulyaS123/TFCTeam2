import { NextRequest, NextResponse } from 'next/server'
import { listObjects } from '@/lib/s3'

export async function GET(req: NextRequest) {
  const prefix = req.nextUrl.searchParams.get('prefix') ?? ''
  const keys = await listObjects(prefix)
  return NextResponse.json({ keys })
}

export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getEventLog } from '@/lib/s3-data'

export async function GET() {
  const log = await getEventLog()
  return NextResponse.json(log)
}

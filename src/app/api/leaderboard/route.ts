export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getLeaderboard } from '@/lib/s3-data'

export async function GET() {
  const board = await getLeaderboard()
  return NextResponse.json(board)
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// Returns the furthest position reached for a registration — used for resume
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const registrationId = searchParams.get('registrationId')

  if (!registrationId) {
    return NextResponse.json({ positionSecs: 0 })
  }

  try {
    const latest = await prisma.watchEvent.findFirst({
      where: {
        registrationId,
        eventType: { in: ['PROGRESS', 'PAUSE', 'COMPLETE'] },
      },
      orderBy: { positionSecs: 'desc' },
    })

    return NextResponse.json({ positionSecs: latest?.positionSecs ?? 0 })
  } catch {
    return NextResponse.json({ positionSecs: 0 })
  }
}

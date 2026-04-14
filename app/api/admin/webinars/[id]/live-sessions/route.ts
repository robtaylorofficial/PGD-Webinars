import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { prisma } from '../../../../../../lib/prisma'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'ADMIN') return null
  return session
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const sessions = await prisma.liveSession.findMany({
    where: { webinarId: id },
    orderBy: { scheduledAt: 'desc' },
  })
  return NextResponse.json(sessions)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const session = await prisma.liveSession.create({
    data: {
      webinarId: id,
      scheduledAt: new Date(body.scheduledAt),
      durationMins: body.durationMins ?? 60,
      maxAttendees: body.maxAttendees ?? 100,
      status: 'SCHEDULED',
    },
  })
  return NextResponse.json(session, { status: 201 })
}

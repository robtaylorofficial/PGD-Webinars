import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { prisma } from '../../../../../../lib/prisma'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'ADMIN') return null
  return session
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: webinarId } = await params
  const body = await req.json()

  // Auto-assign sortOrder
  const count = await prisma.chapter.count({ where: { webinarId } })

  const chapter = await prisma.chapter.create({
    data: {
      webinarId,
      title: body.title ?? 'New Chapter',
      startTimeSecs: body.startTimeSecs ?? 0,
      sortOrder: body.sortOrder ?? count,
    },
  })

  return NextResponse.json(chapter)
}

// Bulk reorder
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: webinarId } = await params
  const { order } = await req.json() // array of { id, sortOrder }

  await Promise.all(
    (order as { id: string; sortOrder: number }[]).map((item) =>
      prisma.chapter.update({
        where: { id: item.id, webinarId },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  )

  return NextResponse.json({ ok: true })
}

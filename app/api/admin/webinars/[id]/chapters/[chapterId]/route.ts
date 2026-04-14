import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../../auth'
import { prisma } from '../../../../../../../lib/prisma'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'ADMIN') return null
  return session
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chapterId } = await params
  const body = await req.json()

  const chapter = await prisma.chapter.update({
    where: { id: chapterId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.startTimeSecs !== undefined && { startTimeSecs: body.startTimeSecs }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
  })

  return NextResponse.json(chapter)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chapterId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chapterId } = await params
  await prisma.chapter.delete({ where: { id: chapterId } })
  return NextResponse.json({ ok: true })
}

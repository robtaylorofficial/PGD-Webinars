import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../auth'
import { prisma } from '../../../../../lib/prisma'

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
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { sortOrder: 'asc' } },
      ctas: { orderBy: { triggerSecs: 'asc' } },
      liveSessions: { orderBy: { scheduledAt: 'asc' } },
      widgets: true,
      emailSteps: { orderBy: { stepNumber: 'asc' } },
      _count: { select: { registrations: true, watchEvents: true } },
    },
  })

  if (!webinar) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(webinar)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const {
    title, slug, subtitle, description, webinarType,
    accessType, priceGbp, status, metaTitle, metaDesc,
    thumbnailUrl,
  } = body

  // If slug changed, check uniqueness
  if (slug) {
    const existing = await prisma.webinar.findFirst({
      where: { slug, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: 'A webinar with this slug already exists' }, { status: 409 })
    }
  }

  const webinar = await prisma.webinar.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(slug !== undefined && { slug }),
      ...(subtitle !== undefined && { subtitle }),
      ...(description !== undefined && { description }),
      ...(webinarType !== undefined && { webinarType }),
      ...(accessType !== undefined && { accessType }),
      ...(priceGbp !== undefined && { priceGbp }),
      ...(status !== undefined && { status }),
      ...(metaTitle !== undefined && { metaTitle }),
      ...(metaDesc !== undefined && { metaDesc }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
    },
  })

  return NextResponse.json(webinar)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await prisma.webinar.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

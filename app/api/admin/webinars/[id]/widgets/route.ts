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
  const widgets = await prisma.widget.findMany({ where: { webinarId: id } })
  return NextResponse.json(widgets)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const widget = await prisma.widget.create({
    data: {
      webinarId: id,
      widgetType: body.widgetType ?? 'EXIT_INTENT',
      isActive: true,
      headline: body.headline ?? '',
      subheadline: body.subheadline ?? '',
      ctaLabel: body.ctaLabel ?? "Watch Now — It's Free",
      accentColor: body.accentColor ?? '#fbba00',
      cooldownHours: body.cooldownHours ?? 24,
      floatPosition: body.floatPosition ?? 'BOTTOM_RIGHT',
    },
  })
  return NextResponse.json(widget, { status: 201 })
}

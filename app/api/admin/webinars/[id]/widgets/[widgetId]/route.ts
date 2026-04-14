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
  { params }: { params: Promise<{ id: string; widgetId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { widgetId } = await params
  const body = await req.json()

  const widget = await prisma.widget.update({
    where: { id: widgetId },
    data: {
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.headline !== undefined && { headline: body.headline }),
      ...(body.subheadline !== undefined && { subheadline: body.subheadline }),
      ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
      ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
      ...(body.cooldownHours !== undefined && { cooldownHours: body.cooldownHours }),
      ...(body.floatPosition !== undefined && { floatPosition: body.floatPosition }),
      ...(body.darkMode !== undefined && { darkMode: body.darkMode }),
    },
  })
  return NextResponse.json(widget)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; widgetId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { widgetId } = await params
  await prisma.widget.delete({ where: { id: widgetId } })
  return NextResponse.json({ ok: true })
}

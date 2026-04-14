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
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ctaId } = await params
  const body = await req.json()

  const cta = await prisma.webinarCTA.update({
    where: { id: ctaId },
    data: {
      ...(body.triggerSecs !== undefined && { triggerSecs: body.triggerSecs }),
      ...(body.dismissSecs !== undefined && { dismissSecs: body.dismissSecs }),
      ...(body.headline !== undefined && { headline: body.headline }),
      ...(body.subheadline !== undefined && { subheadline: body.subheadline }),
      ...(body.ctaLabel !== undefined && { ctaLabel: body.ctaLabel }),
      ...(body.ctaUrl !== undefined && { ctaUrl: body.ctaUrl }),
      ...(body.displayStyle !== undefined && { displayStyle: body.displayStyle }),
      ...(body.backgroundColor !== undefined && { backgroundColor: body.backgroundColor }),
      ...(body.textColor !== undefined && { textColor: body.textColor }),
      ...(body.accentColor !== undefined && { accentColor: body.accentColor }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.productId !== undefined && { productId: body.productId }),
    },
  })

  return NextResponse.json(cta)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; ctaId: string }> },
) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ctaId } = await params
  await prisma.webinarCTA.delete({ where: { id: ctaId } })
  return NextResponse.json({ ok: true })
}

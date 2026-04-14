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

  const cta = await prisma.webinarCTA.create({
    data: {
      webinarId,
      triggerSecs: body.triggerSecs ?? 0,
      dismissSecs: body.dismissSecs ?? 30,
      headline: body.headline ?? 'Special offer',
      subheadline: body.subheadline ?? '',
      ctaLabel: body.ctaLabel ?? 'Find Out More',
      ctaUrl: body.ctaUrl ?? '',
      displayStyle: body.displayStyle ?? 'BANNER',
      backgroundColor: body.backgroundColor ?? '#000000',
      textColor: body.textColor ?? '#ffffff',
      accentColor: body.accentColor ?? '#fbba00',
      isActive: body.isActive ?? true,
      productId: body.productId ?? null,
    },
  })

  return NextResponse.json(cta)
}

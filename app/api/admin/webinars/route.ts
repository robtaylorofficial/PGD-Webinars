import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { prisma } from '../../../../lib/prisma'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'ADMIN') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const webinars = await prisma.webinar.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { registrations: true } } },
  })
  return NextResponse.json(webinars)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { title, slug, subtitle, description, webinarType, accessType, priceGbp, status, metaTitle, metaDesc } = body

  if (!title || !slug) {
    return NextResponse.json({ error: 'title and slug are required' }, { status: 400 })
  }

  // Check slug uniqueness
  const existing = await prisma.webinar.findUnique({ where: { slug } })
  if (existing) {
    return NextResponse.json({ error: 'A webinar with this slug already exists' }, { status: 409 })
  }

  const webinar = await prisma.webinar.create({
    data: {
      title,
      slug,
      subtitle: subtitle ?? '',
      description: description ?? '',
      webinarType: webinarType ?? 'ON_DEMAND',
      accessType: accessType ?? 'FREE',
      priceGbp: priceGbp ?? 0,
      status: status ?? 'DRAFT',
      metaTitle: metaTitle ?? '',
      metaDesc: metaDesc ?? '',
    },
  })

  return NextResponse.json(webinar, { status: 201 })
}

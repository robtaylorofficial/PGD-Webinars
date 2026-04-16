import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../../../auth'
import { prisma } from '../../../../../../lib/prisma'

// GET — return current thank you fields (used by upload poller)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const webinar = await prisma.webinar.findUnique({
      where: { id },
      select: {
        thankYouHeadline: true,
        thankYouMessage: true,
        thankYouVideoMuxPlaybackId: true,
        thankYouPrimaryCtaLabel: true,
        thankYouPrimaryCtaUrl: true,
        thankYouSecondaryCtaLabel: true,
        thankYouSecondaryCtaUrl: true,
        thankYouShowRating: true,
        thankYouShowShare: true,
      },
    })
    if (!webinar) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(webinar)
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

// PATCH — save thank you page settings
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  try {
    const body = await req.json()
    const {
      thankYouHeadline,
      thankYouMessage,
      thankYouVideoMuxPlaybackId,
      thankYouPrimaryCtaLabel,
      thankYouPrimaryCtaUrl,
      thankYouSecondaryCtaLabel,
      thankYouSecondaryCtaUrl,
      thankYouShowRating,
      thankYouShowShare,
    } = body

    const webinar = await prisma.webinar.update({
      where: { id },
      data: {
        thankYouHeadline: thankYouHeadline ?? '',
        thankYouMessage: thankYouMessage ?? '',
        thankYouVideoMuxPlaybackId: thankYouVideoMuxPlaybackId ?? '',
        thankYouPrimaryCtaLabel: thankYouPrimaryCtaLabel ?? '',
        thankYouPrimaryCtaUrl: thankYouPrimaryCtaUrl ?? '',
        thankYouSecondaryCtaLabel: thankYouSecondaryCtaLabel ?? '',
        thankYouSecondaryCtaUrl: thankYouSecondaryCtaUrl ?? '',
        thankYouShowRating: thankYouShowRating ?? true,
        thankYouShowShare: thankYouShowShare ?? true,
      },
    })

    return NextResponse.json({ ok: true, id: webinar.id })
  } catch {
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }
}

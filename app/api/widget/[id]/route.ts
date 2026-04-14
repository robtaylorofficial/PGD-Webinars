import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  try {
    const widget = await prisma.widget.findUnique({
      where: { id },
      include: {
        webinar: {
          select: {
            id: true,
            slug: true,
            title: true,
            subtitle: true,
            thumbnailUrl: true,
            accessType: true,
          },
        },
      },
    })

    if (!widget || !widget.isActive) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        id: widget.id,
        widgetType: widget.widgetType,
        headline: widget.headline,
        subheadline: widget.subheadline,
        ctaLabel: widget.ctaLabel,
        accentColor: widget.accentColor,
        darkMode: widget.darkMode,
        cooldownHours: widget.cooldownHours,
        floatPosition: widget.floatPosition,
        floatOffsetPx: widget.floatOffsetPx,
        exitDelayMs: widget.exitDelayMs,
        thumbnail: widget.thumbnailUrl || widget.webinar.thumbnailUrl,
        webinar: {
          id: widget.webinar.id,
          slug: widget.webinar.slug,
          title: widget.webinar.title,
          subtitle: widget.webinar.subtitle,
          accessType: widget.webinar.accessType,
        },
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

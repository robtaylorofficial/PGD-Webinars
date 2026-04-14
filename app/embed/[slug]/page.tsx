// Stripped iframe-ready registration page.
// No nav, no footer. Handles postMessage membership passthrough.
export const dynamic = 'force-dynamic'

import { prisma } from '../../../lib/prisma'
import { notFound } from 'next/navigation'
import EmbedShell from './embed-shell'

export default async function EmbedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      title: true,
      subtitle: true,
      thumbnailUrl: true,
      accessType: true,
      status: true,
      muxPlaybackId: true,
    },
  })

  if (!webinar || webinar.status === 'DRAFT') notFound()

  // If a valid token is already present, go straight to the player
  let hasAccess = false
  if (token) {
    const reg = await prisma.registration.findUnique({
      where: { accessToken: token },
    })
    hasAccess = !!reg?.accessGranted
  }

  return (
    <EmbedShell
      webinar={webinar}
      existingToken={hasAccess ? token! : null}
    />
  )
}

export const dynamic = 'force-dynamic'

import { prisma } from '../../../lib/prisma'
import { notFound } from 'next/navigation'
import { signMuxPlaybackToken } from '../../../lib/mux'
import ThankYouClient from './thank-you-client'

export default async function ThankYouPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; rating?: string }>
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

  if (!webinar) notFound()

  // Validate token
  let registration = null
  let firstName = 'there'
  if (token) {
    registration = await prisma.registration.findUnique({
      where: { accessToken: token },
      select: { id: true, name: true, email: true, accessToken: true },
    })
    if (registration?.name) {
      firstName = registration.name.split(' ')[0]
    } else if (registration?.email) {
      firstName = registration.email.split('@')[0]
    }
  }

  // Sign thank you video token if present
  let signedThankYouToken: string | null = null
  if (webinar.thankYouVideoMuxPlaybackId) {
    signedThankYouToken = await signMuxPlaybackToken(
      webinar.thankYouVideoMuxPlaybackId,
      3600,
    ).catch(() => null)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const shareUrl = `${appUrl}/webinars/${webinar.slug}`

  return (
    <ThankYouClient
      webinar={webinar}
      firstName={firstName}
      registrationToken={token ?? null}
      signedThankYouToken={signedThankYouToken}
      shareUrl={shareUrl}
    />
  )
}

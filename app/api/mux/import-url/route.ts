import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getMux } from '../../../../lib/mux'

/**
 * Converts various share-link formats into a direct-download URL that Mux can fetch.
 *
 * Supported:
 *   Google Drive  — drive.google.com/file/d/{id}/view  →  uc?export=download&id={id}&confirm=t
 *   Google Drive  — drive.google.com/open?id={id}      →  uc?export=download&id={id}&confirm=t
 *   Dropbox       — …?dl=0                             →  …?dl=1
 *   Everything else — passed through unchanged (direct MP4 link, Zoom download link, etc.)
 */
function resolveUrl(raw: string): { url: string; source: string } {
  try {
    const u = new URL(raw)

    // Google Drive — /file/d/{id}/view  or  /file/d/{id}/preview
    const driveFileMatch = u.pathname.match(/\/file\/d\/([^/]+)/)
    if ((u.hostname === 'drive.google.com' || u.hostname === 'docs.google.com') && driveFileMatch) {
      const fileId = driveFileMatch[1]
      return {
        url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
        source: 'Google Drive',
      }
    }

    // Google Drive — open?id={id}
    if (u.hostname === 'drive.google.com' && u.pathname === '/open') {
      const fileId = u.searchParams.get('id')
      if (fileId) {
        return {
          url: `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`,
          source: 'Google Drive',
        }
      }
    }

    // Dropbox — change dl=0 to dl=1
    if (u.hostname === 'www.dropbox.com' || u.hostname === 'dropbox.com') {
      u.searchParams.set('dl', '1')
      return { url: u.toString(), source: 'Dropbox' }
    }

    // YouTube — explicitly reject
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      throw new Error(
        'YouTube links are not supported — download the video as MP4 and upload the file instead, ' +
        'or use a Google Drive / Dropbox link.',
      )
    }

    // Everything else (direct MP4, Zoom cloud recording URL, Loom, etc.)
    return { url: raw, source: 'direct URL' }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('YouTube')) throw e
    throw new Error('Invalid URL — please paste a full https:// link.')
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { url, webinarId, waitingRoom, thankYou } = await req.json()

    if (!url || !webinarId) {
      return NextResponse.json({ error: 'url and webinarId are required' }, { status: 400 })
    }

    const { url: resolvedUrl, source } = resolveUrl(url.trim())

    // Build passthrough (same convention as /api/mux/upload)
    let passthrough = webinarId
    if (waitingRoom) passthrough = `waiting_room:${webinarId}`
    else if (thankYou) passthrough = `thank_you:${webinarId}`

    const mux = getMux()

    // Mux pulls the video directly from the URL — no browser upload needed
    const asset = await mux.video.assets.create({
      input: [{ url: resolvedUrl }],
      playback_policy: ['signed'],
      passthrough,
    })

    return NextResponse.json({
      assetId: asset.id,
      source,
      status: asset.status, // 'preparing'
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Import failed'
    console.error('[mux/import-url]', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

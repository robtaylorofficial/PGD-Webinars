import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '../../../../lib/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const { question, webinarId, registrationId, sessionId, positionSecs, history } = await req.json()

    if (!question?.trim() || !webinarId) {
      return new Response('question and webinarId required', { status: 400 })
    }

    // Load webinar + chapters for context
    const webinar = await prisma.webinar.findUnique({
      where: { id: webinarId },
      include: { chapters: { orderBy: { sortOrder: 'asc' } } },
    })

    if (!webinar) {
      return new Response('Webinar not found', { status: 404 })
    }

    // Determine which chapter the viewer is currently in
    const currentChapter = webinar.chapters.reduce(
      (acc: typeof webinar.chapters[0] | null, ch) =>
        positionSecs >= ch.startTimeSecs ? ch : acc,
      null,
    )

    // Chapters covered so far (up to current position)
    const coveredChapters = webinar.chapters.filter(
      (ch) => ch.startTimeSecs <= positionSecs,
    )

    // Build the system prompt
    const systemPrompt = `You are the AI Q&A assistant for a Plan Grow Do webinar.

Webinar: "${webinar.title}"
${webinar.subtitle ? `Subtitle: ${webinar.subtitle}` : ''}
${webinar.description ? `Description: ${webinar.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}` : ''}

The viewer is currently at ${formatTime(positionSecs)} in the webinar${currentChapter ? `, in the "${currentChapter.title}" section` : ''}.

${coveredChapters.length > 0 ? `Chapters covered so far:\n${coveredChapters.map((ch) => `• ${ch.title} (${formatTime(ch.startTimeSecs)})`).join('\n')}` : ''}

${webinar.chapters.filter((ch) => ch.startTimeSecs > positionSecs).length > 0
  ? `Still to come:\n${webinar.chapters.filter((ch) => ch.startTimeSecs > positionSecs).map((ch) => `• ${ch.title} (${formatTime(ch.startTimeSecs)})`).join('\n')}`
  : ''}

Guidelines:
- Answer concisely and practically in the Plan Grow Do spirit: actionable, no fluff
- Only reference content that has been covered in the video so far
- If a question relates to content coming up later, say: "That's covered in the [chapter name] section — keep watching!"
- If you genuinely don't know something, say so rather than guessing
- Keep answers under 150 words unless the question genuinely needs more depth
- Use British English
- Never mention that you are Claude or an AI language model — you are the PGD webinar assistant`

    // Build message history for multi-turn conversation
    type MessageParam = { role: 'user' | 'assistant'; content: string }
    const messages: MessageParam[] = [
      ...(history ?? []).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: question.trim() },
    ]

    // Stream the response
    const encoder = new TextEncoder()
    let fullAnswer = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: 400,
            system: systemPrompt,
            messages,
          })

          for await (const chunk of anthropicStream) {
            if (
              chunk.type === 'content_block_delta' &&
              chunk.delta.type === 'text_delta'
            ) {
              const text = chunk.delta.text
              fullAnswer += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // Signal completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          controller.close()

          // Persist the Q&A record (fire-and-forget)
          prisma.watchQA.create({
            data: {
              webinarId,
              registrationId: registrationId ?? null,
              sessionId: sessionId ?? '',
              positionSecs: positionSecs ?? 0,
              chapterTitle: currentChapter?.title ?? '',
              question: question.trim(),
              answer: fullAnswer,
            },
          }).catch((err: unknown) => console.error('[watch/qa] save error', err))

        } catch (err) {
          console.error('[watch/qa] stream error', err)
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate answer' })}\n\n`),
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[watch/qa] error', err)
    return new Response('Internal server error', { status: 500 })
  }
}

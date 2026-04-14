'use client'

import { useState, useRef, useEffect } from 'react'
import { usePlayerStore } from '../../lib/player-store'

interface Message {
  role: 'user' | 'assistant'
  content: string
  positionSecs?: number
  chapterTitle?: string
}

interface Props {
  webinarId: string
  registrationId: string
  sessionId: string
  chapters: { id: string; title: string; startTimeSecs: number; sortOrder: number }[]
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function WatchQA({ webinarId, registrationId, sessionId, chapters }: Props) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const setPlaying = usePlayerStore((s) => s.setPlaying)

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Find current chapter
  const currentChapter = chapters.reduce(
    (acc: typeof chapters[0] | null, ch) =>
      currentTime >= ch.startTimeSecs ? ch : acc,
    null,
  )

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setHasUnread(false)
    }
  }, [open])

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const question = input.trim()
    if (!question || streaming) return

    // Capture position at time of asking
    const positionSecs = currentTime
    const chapterTitle = currentChapter?.title ?? ''

    setInput('')
    setStreaming(true)

    // Pause video while reading the answer (good UX)
    setPlaying(false)

    const userMsg: Message = { role: 'user', content: question, positionSecs, chapterTitle }
    setMessages((prev) => [...prev, userMsg])

    // Add empty assistant message to stream into
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/watch/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          webinarId,
          registrationId,
          sessionId,
          positionSecs,
          history,
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Request failed')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = JSON.parse(line.slice(6))

          if (payload.error) {
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                role: 'assistant',
                content: 'Sorry, I could not generate an answer. Please try again.',
              }
              return updated
            })
            break
          }

          if (payload.done) break

          if (payload.text) {
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: updated[updated.length - 1].content + payload.text,
              }
              return updated
            })
          }
        }
      }

      if (!open) setHasUnread(true)
    } catch {
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        }
        return updated
      })
    }

    setStreaming(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Suggested questions based on current chapter
  const suggestions = currentChapter
    ? [
        `What did Robert mean in the ${currentChapter.title} section?`,
        `How do I apply what was just covered?`,
        `What are the key takeaways so far?`,
      ]
    : [
        'What is this webinar about?',
        'What are the key takeaways?',
        'How do I get started with this?',
      ]

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-pgd-purple-light border border-white/10 hover:border-pgd-yellow/50 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all relative"
      >
        <svg className="w-4 h-4 text-pgd-yellow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        Ask a question
        {hasUnread && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-pgd-yellow rounded-full" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="bg-pgd-purple-light border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pgd-yellow/20 rounded-full flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-pgd-yellow" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">PGD Assistant</p>
                {currentChapter && (
                  <p className="text-xs text-white/40">
                    Currently: {currentChapter.title} · {formatTime(currentTime)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/30 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-white/40 text-xs text-center">
                  Ask anything about the webinar — I know exactly where you are.
                </p>
                <div className="space-y-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50) }}
                      className="w-full text-left text-xs text-white/60 hover:text-white bg-pgd-purple hover:bg-white/5 border border-white/10 rounded-lg px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-1' : 'order-2'}`}>
                    {msg.role === 'user' && msg.chapterTitle && (
                      <p className="text-white/30 text-xs text-right mb-1">
                        @ {formatTime(msg.positionSecs ?? 0)} · {msg.chapterTitle}
                      </p>
                    )}
                    <div className={`rounded-xl px-3 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-pgd-yellow/20 text-white'
                        : 'bg-pgd-purple text-white/90'
                    }`}>
                      {msg.content || (
                        <span className="flex gap-1 items-center text-white/40">
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-3 flex-shrink-0">
            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question…"
                rows={1}
                disabled={streaming}
                className="flex-1 bg-pgd-purple border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-pgd-yellow resize-none disabled:opacity-50"
                style={{ minHeight: '42px', maxHeight: '120px' }}
              />
              <button
                type="submit"
                disabled={!input.trim() || streaming}
                className="bg-pgd-yellow text-pgd-purple rounded-xl p-2.5 hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </form>
            <p className="text-white/20 text-xs mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      )}
    </>
  )
}

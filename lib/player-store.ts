import { create } from 'zustand'

export interface WebinarCTAData {
  id: string
  triggerSecs: number
  dismissSecs: number
  headline: string
  subheadline: string
  ctaLabel: string
  ctaUrl: string
  displayStyle: string
  backgroundColor: string
  textColor: string
  accentColor: string
}

interface PlayerStore {
  currentTime: number
  duration: number
  isPlaying: boolean
  watchedSeconds: number      // max position reached (for resume)
  completionPct: number
  activeCta: WebinarCTAData | null
  dismissedCtaIds: Set<string>

  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  setPlaying: (b: boolean) => void
  setWatchedSeconds: (s: number) => void
  showCta: (cta: WebinarCTAData) => void
  dismissCta: (id: string) => void
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  watchedSeconds: 0,
  completionPct: 0,
  activeCta: null,
  dismissedCtaIds: new Set(),

  setCurrentTime: (t) => {
    const { duration, watchedSeconds } = get()
    set({
      currentTime: t,
      watchedSeconds: Math.max(watchedSeconds, t),
      completionPct: duration > 0 ? (t / duration) * 100 : 0,
    })
  },

  setDuration: (d) => set({ duration: d }),

  setPlaying: (b) => set({ isPlaying: b }),

  setWatchedSeconds: (s) => set({ watchedSeconds: s }),

  showCta: (cta) => set({ activeCta: cta }),

  dismissCta: (id) =>
    set((state) => {
      const next = new Set(state.dismissedCtaIds)
      next.add(id)
      return { activeCta: null, dismissedCtaIds: next }
    }),
}))

import { createStore } from 'zustand/vanilla'
import type { Review } from '@/types'
import { db, syncAll, syncDelete, syncPut } from '@/hooks/usePersistentStore'

export interface ReviewState {
  reviews: Review[]
  loaded: boolean
  hydrate: () => Promise<void>
  save: (review: Review) => Promise<void>
  remove: (id: string) => Promise<void>
  removeBySegment: (segmentId: string) => Promise<void>
}

export const reviewStore = createStore<ReviewState>((set, get) => ({
  reviews: [],
  loaded: false,
  hydrate: async () => {
    const reviews = await syncAll<Review>(db.reviews)
    reviews.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    set({ reviews, loaded: true })
  },
  save: async (review) => {
    await syncPut<Review>(db.reviews, review)
    await get().hydrate()
  },
  remove: async (id) => {
    await syncDelete(db.reviews, id)
    await get().hydrate()
  },
  removeBySegment: async (segmentId) => {
    const ids = get()
      .reviews.filter((item) => item.segmentId === segmentId)
      .map((item) => item.id)
    await db.reviews.bulkDelete(ids)
    await get().hydrate()
  }
}))

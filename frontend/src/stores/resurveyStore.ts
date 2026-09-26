import { createStore } from 'zustand/vanilla'
import type { ResurveyRecord } from '@/types'
import { db, syncAll, syncDelete, syncPut } from '@/hooks/usePersistentStore'

export interface ResurveyState {
  resurveys: ResurveyRecord[]
  loaded: boolean
  hydrate: () => Promise<void>
  save: (record: ResurveyRecord) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const resurveyStore = createStore<ResurveyState>((set, get) => ({
  resurveys: [],
  loaded: false,
  hydrate: async () => {
    const resurveys = await syncAll<ResurveyRecord>(db.resurveys)
    resurveys.sort((a, b) => `${a.date}${a.createdAt}`.localeCompare(`${b.date}${b.createdAt}`))
    set({ resurveys, loaded: true })
  },
  save: async (record) => {
    await syncPut<ResurveyRecord>(db.resurveys, record)
    await get().hydrate()
  },
  remove: async (id) => {
    await syncDelete<ResurveyRecord>(db.resurveys, id)
    await get().hydrate()
  }
}))

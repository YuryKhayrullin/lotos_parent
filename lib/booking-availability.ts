import { requestJson } from './api-client'
import { bookingApi, availabilityV2Schema, type AvailabilityBranch } from './booking-v2'
import type { z } from 'zod'
// Batch independent cards requesting the same range. No long-lived availability cache.
type Pending = { id: string; resolve: (x: AvailabilityBranch) => void; reject: (e: unknown) => void }
const batches = new Map<string, Pending[]>()
export function readAvailability(
  id: string,
  from: string,
  to: string,
  category: string,
): Promise<AvailabilityBranch> {
  const key = JSON.stringify([from, to, category])
  return new Promise((resolve, reject) => {
    const pending = batches.get(key)
    if (pending) {
      pending.push({ id, resolve, reject })
      return
    }
    batches.set(key, [{ id, resolve, reject }])
    setTimeout(() => {
      const jobs = batches.get(key)!
      batches.delete(key)
      const ids = [...new Set(jobs.map((j) => j.id))]
      for (let i = 0; i < ids.length; i += 12) {
        const group = ids.slice(i, i + 12),
          params = new URLSearchParams({ from, to })
        group.forEach((id) => params.append('branchId', id))
        if (category !== 'all') params.set('category', category)
        void requestJson<z.infer<typeof availabilityV2Schema>>(bookingApi + 'availability?' + params)
          .then((data) => {
            for (const j of jobs.filter((j) => group.includes(j.id))) {
              const b = data.branches.find((b) => b.branchId === j.id)
              if (!b) j.reject(new Error('Не удалось получить календарь бассейна'))
              else j.resolve(b)
            }
          })
          .catch((e) => jobs.filter((j) => group.includes(j.id)).forEach((j) => j.reject(e)))
      }
    }, 0)
  })
}

'use client'

import { useEffect } from 'react'

const HEARTBEAT_INTERVAL_MS = 60000

type Identity = { userId: string; email?: string; username?: string }

async function sendHeartbeat(identity: Identity, location?: string) {
  try {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      // email/username let the API resolve sessions whose id isn't a profile
      // UUID (the master admin), instead of silently matching nothing.
      body: JSON.stringify(location ? { ...identity, location } : identity)
    })
    const json = await res.json().catch(() => null)
    if (!res.ok || (json && json.success === false)) {
      // Surfacing this matters: a silent catch here is what hid the missing
      // last_seen_at/last_location columns for so long.
      console.warn('[ActivityTracker] Heartbeat rejeitado:', json?.error || res.status)
    }
  } catch (err) {
    console.warn('[ActivityTracker] Heartbeat falhou:', err)
  }
}

function resolveLocation(): Promise<string | undefined> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) return resolve(undefined)

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=14&addressdetails=1`
          )
          const data = await res.json()
          const a = data?.address
          if (!a) return resolve(undefined)
          const road = a.road || a.suburb || ''
          const city = a.city || a.town || a.village || a.municipality || ''
          const state = a.state || ''
          const label = [road, city, state].filter(Boolean).join(', ')
          resolve(label || undefined)
        } catch {
          resolve(undefined)
        }
      },
      () => resolve(undefined),
      { timeout: 8000, maximumAge: 60000 }
    )
  })
}

export default function ActivityTracker() {
  useEffect(() => {
    let intervalId: any = null
    let cancelled = false

    const updateActivity = async () => {
      let user: any
      try {
        const raw = localStorage.getItem('crm_current_user')
        if (!raw) return
        user = JSON.parse(raw)
      } catch {
        return
      }
      if (!user?.id) return

      const identity: Identity = {
        userId: user.id,
        email: user.email || undefined,
        username: user.username || undefined
      }

      // Record the access first, unconditionally. Geolocation used to gate
      // this entire call — if the permission prompt sat unanswered neither
      // callback fired, so no heartbeat was ever sent and "Último Acesso"
      // stayed empty for users who simply ignored the prompt.
      await sendHeartbeat(identity)

      const location = await resolveLocation()
      if (location && !cancelled) {
        await sendHeartbeat(identity, location)
      }
    }

    updateActivity()
    intervalId = setInterval(updateActivity, HEARTBEAT_INTERVAL_MS)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null
}

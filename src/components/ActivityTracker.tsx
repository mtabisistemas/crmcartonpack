'use client'

import { useEffect } from 'react'

export default function ActivityTracker() {
  useEffect(() => {
    let intervalId: any = null

    const updateActivity = async () => {
      try {
        const rawUser = localStorage.getItem('crm_current_user')
        if (!rawUser) return

        const user = JSON.parse(rawUser)
        if (!user || !user.id) return

        let locationString: string | null = null

        // Try getting browser geolocation coordinates
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const { latitude, longitude } = position.coords
                // Reverse geocode using Nominatim OpenStreetMap API
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
                  { headers: { 'User-Agent': 'CartonPackCRM/1.0' } }
                )
                const data = await res.json()
                if (data && data.address) {
                  const road = data.address.road || data.address.suburb || ''
                  const city = data.address.city || data.address.town || data.address.village || data.address.municipality || ''
                  const state = data.address.state || ''
                  locationString = [road, city, state].filter(Boolean).join(', ')
                }
              } catch (geoErr) {
                // Ignore geo errors
              }

              // Send heartbeat to API
              await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  location: locationString || undefined
                })
              }).catch(() => {})
            },
            async () => {
              // Geolocation denied or unavailable -> send heartbeat without GPS
              await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              }).catch(() => {})
            },
            { timeout: 8000, maximumAge: 60000 }
          )
        } else {
          // No geolocation support -> send heartbeat without GPS
          await fetch('/api/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id })
          }).catch(() => {})
        }
      } catch (err) {
        // Silently ignore activity tracker errors
      }
    }

    // Trigger initial update on mount
    updateActivity()

    // Heartbeat every 60 seconds
    intervalId = setInterval(updateActivity, 60000)

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [])

  return null
}

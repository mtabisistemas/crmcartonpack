import { Appointment } from '@/types'

export const APPOINTMENTS_STORAGE_KEY = 'cp_crm_appointments'

export function getAppointments(): Appointment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Error loading appointments:', e)
  }
  return []
}

export function getAppointmentsByDeal(dealId: string): Appointment[] {
  const all = getAppointments()
  return all.filter(a => a.deal_id === dealId)
}

export function saveAppointment(appointmentData: Omit<Appointment, 'id' | 'created_at'>): Appointment {
  const all = getAppointments()
  const now = new Date().toISOString()
  const newAppointment: Appointment = {
    ...appointmentData,
    id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    created_at: now,
    updated_at: now
  }

  const updated = [newAppointment, ...all]
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event('storage-appointments-changed'))
  }
  return newAppointment
}

export function updateAppointment(updatedApt: Appointment): Appointment {
  const all = getAppointments()
  const now = new Date().toISOString()
  const next = all.map(a => a.id === updatedApt.id ? { ...updatedApt, updated_at: now } : a)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('storage-appointments-changed'))
  }
  return updatedApt
}

export function deleteAppointment(appointmentId: string) {
  const all = getAppointments()
  const next = all.filter(a => a.id !== appointmentId)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('storage-appointments-changed'))
  }
}

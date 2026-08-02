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

// Sync appointment to contact activities list in crm_contacts & Supabase
export function syncAppointmentToContactActivity(apt: Appointment) {
  if (typeof window === 'undefined') return
  try {
    const compName = (apt.company_name || apt.contact_name || apt.deal_title || '').trim().toLowerCase()
    if (!compName) return

    const rawContacts = localStorage.getItem('crm_contacts')
    if (!rawContacts) return
    const contacts = JSON.parse(rawContacts)
    if (!Array.isArray(contacts)) return

    const now = new Date()
    const dateParts = apt.date ? apt.date.split('-').reverse().join('/') : `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    const timeStr = apt.time || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const timestampStr = `${dateParts} ${timeStr}`

    const statusLabel = apt.status === 'concluido' ? 'CONCLUÍDO' : apt.status === 'cancelado' ? 'CANCELADO' : 'AGENDADO'
    const typeLabel = (apt.type || 'visita').toUpperCase()

    const newActivity = {
      id: `act_apt_${apt.id}_${apt.status}`,
      type: apt.type === 'visita' ? 'reuniao' : apt.type === 'ligacao' ? 'ligacao' : apt.type === 'email' ? 'email' : 'reuniao',
      content: `Compromisso da Agenda (${typeLabel}) [${statusLabel}]: ${apt.title}${apt.notes ? ` — ${apt.notes}` : ''}`,
      timestamp: timestampStr,
      user_name: 'Agenda Comercial',
      author: 'Agenda Comercial'
    }

    let updatedAny = false
    const updatedContacts = contacts.map((c: any) => {
      const cComp = (c.company || c.name || '').trim().toLowerCase()
      const cName = (c.name || '').trim().toLowerCase()
      if (cComp === compName || cName === compName || (cComp && compName.includes(cComp)) || (cComp && cComp.includes(compName))) {
        updatedAny = true
        const existingActs = Array.isArray(c.activities) ? c.activities : []
        const filteredActs = existingActs.filter((a: any) => a.id !== newActivity.id)
        return {
          ...c,
          activities: [newActivity, ...filteredActs]
        }
      }
      return c
    })

    if (updatedAny) {
      localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
      window.dispatchEvent(new Event('storage-contacts-changed'))
      
      const matchedContact = updatedContacts.find((c: any) => {
        const cComp = (c.company || c.name || '').trim().toLowerCase()
        return cComp === compName || (cComp && compName.includes(cComp))
      })
      if (matchedContact) {
        fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: matchedContact.id,
            company: matchedContact.company,
            activities: matchedContact.activities
          })
        }).catch(() => {})
      }
    }
  } catch (e) {
    console.error('Error syncing appointment to contact activity:', e)
  }
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

  syncAppointmentToContactActivity(newAppointment)
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

  syncAppointmentToContactActivity(updatedApt)
  return updatedApt
}

export function deleteAppointment(appointmentId: string) {
  const all = getAppointments()
  const target = all.find(a => a.id === appointmentId)
  if (target) {
    syncAppointmentToContactActivity({ ...target, status: 'cancelado' })
  }
  const next = all.filter(a => a.id !== appointmentId)
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event('storage-appointments-changed'))
  }
}

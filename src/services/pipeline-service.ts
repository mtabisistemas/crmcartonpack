import { Deal, DealStage, normalizeDealStage } from '@/types'
import { MockContact } from '@/app/(crm)/contacts/page'
import { formatCnaeCode } from '@/lib/utils'

export const PIPELINE_STORAGE_KEY = 'cp_crm_pipeline_deals'
export const CONTACTS_STORAGE_KEY = 'crm_contacts'

export const DEFAULT_PIPELINE_DEALS: Deal[] = []

export function getPipelineDeals(defaultDeals: Deal[] = []): Deal[] {
  if (typeof window === 'undefined') return defaultDeals
  let rawDeals: Deal[] = defaultDeals
  try {
    const raw = localStorage.getItem(PIPELINE_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) rawDeals = parsed
    }
  } catch (e) {
    console.error(e)
  }

  // Always normalize stages for backward compatibility
  rawDeals = rawDeals.map(d => ({
    ...d,
    stage: normalizeDealStage(d.stage)
  }))

  // Auto-normalize deals missing representative against crm_contacts
  try {
    const rawContacts = localStorage.getItem(CONTACTS_STORAGE_KEY)
    if (rawContacts) {
      const contacts: MockContact[] = JSON.parse(rawContacts)
      rawDeals = rawDeals.map(d => {
        const dRep = d.assigned_to || d.contact?.representative
        if (!dRep) {
          const comp = (d.title || d.contact?.company || '').trim().toLowerCase()
          const matchedContact = contacts.find(c => (c.company || c.name || '').trim().toLowerCase() === comp)
          if (matchedContact && matchedContact.representative) {
            return {
              ...d,
              assigned_to: matchedContact.representative,
              contact: {
                ...d.contact,
                id: d.contact?.id || d.contact_id || `c-${Date.now()}`,
                name: d.contact?.name || d.title,
                company: d.contact?.company || d.title,
                representative: matchedContact.representative,
                created_at: d.contact?.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            }
          }
        }
        return d
      })
    }
  } catch (e) {}

  return rawDeals
}

export function savePipelineDeals(deals: Deal[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PIPELINE_STORAGE_KEY, JSON.stringify(deals))
  window.dispatchEvent(new Event('storage-deals-changed'))
}

export function createPipelineDeal(dealData: {
  title: string
  company: string
  contactName?: string
  phone?: string
  email?: string
  value?: number
  assignedToName?: string
  representative?: string
  stage?: DealStage
  notes?: string
  cnpj?: string
}, defaultDeals: Deal[] = []): Deal {
  const currentDeals = getPipelineDeals(defaultDeals)
  const now = new Date().toISOString()
  
  const rep = dealData.representative || dealData.assignedToName || ''
  
  const newDeal: Deal = {
    id: 'deal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: dealData.title,
    contact_id: 'c_' + Date.now(),
    stage: dealData.stage || 'leads',
    position: 0,
    estimated_value: dealData.value || 0,
    assigned_to: rep,
    stage_entered_at: now,
    created_at: now,
    updated_at: now,
    contact: {
      id: 'c_' + Date.now(),
      name: dealData.contactName || '',
      company: dealData.company || '',
      phone: dealData.phone,
      email: dealData.email,
      representative: rep,
      created_at: now,
      updated_at: now
    }
  }

  const updated = [newDeal, ...currentDeals]
  savePipelineDeals(updated)
  return newDeal
}

export function saveContactToCarteira(contactData: {
  razao_social: string
  cnpj: string
  cidade: string
  estado: string
  setor?: string
  cnae_codigo?: string
  cnae_descricao?: string
  representativeName: string
  phone?: string
  email?: string
  logradouro?: string
  porte?: string
}) {
  if (typeof window === 'undefined') return
  let contacts: MockContact[] = []
  try {
    const raw = localStorage.getItem(CONTACTS_STORAGE_KEY)
    if (raw) contacts = JSON.parse(raw)
  } catch (e) {
    console.error(e)
  }

  const cleanCnpj = (contactData.cnpj || '').replace(/\D/g, '')
  const cleanCompany = (contactData.razao_social || '').trim().toLowerCase()

  const existingIdx = contacts.findIndex(c => {
    const cCnpj = (c.cnpj || '').replace(/\D/g, '')
    const cCompany = (c.company || c.name || '').trim().toLowerCase()
    const matchCnpj = cleanCnpj.length >= 8 && cCnpj.length >= 8 && cleanCnpj === cCnpj
    const matchCompany = cleanCompany.length >= 3 && cCompany.length >= 3 && cleanCompany === cCompany
    return matchCnpj || matchCompany
  })
  if (existingIdx >= 0) return contacts[existingIdx]

  const newContact: MockContact = {
    id: 'cnt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: contactData.razao_social,
    company: contactData.razao_social,
    cnpj: contactData.cnpj,
    curve: (contactData.porte === 'Grande' ? 'A' : contactData.porte === 'Média' ? 'B' : 'C') as any,
    representative: contactData.representativeName,
    lastPurchaseDays: 0,
    phone: contactData.phone || '(51) 99999-9999',
    city: contactData.cidade,
    state: contactData.estado,
    status: 'prospeccao',
    email: contactData.email || '',
    tradeName: contactData.razao_social,
    registrationStatus: 'ATIVA',
    mainCnae: contactData.cnae_codigo ? `${formatCnaeCode(contactData.cnae_codigo)} - ${contactData.cnae_descricao || contactData.setor}` : contactData.setor,
    address: contactData.logradouro || '',
  }

  contacts = [newContact, ...contacts]
  localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
  window.dispatchEvent(new Event('storage-contacts-changed'))
  return newContact
}

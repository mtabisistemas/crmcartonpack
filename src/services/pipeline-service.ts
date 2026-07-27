import { Deal, DealStage } from '@/types'
import { MockContact } from '@/app/(crm)/contacts/page'
import { formatCnaeCode } from '@/lib/utils'

export const PIPELINE_STORAGE_KEY = 'cp_crm_pipeline_deals'
export const CONTACTS_STORAGE_KEY = 'crm_contacts'

export function getPipelineDeals(defaultDeals: Deal[] = []): Deal[] {
  if (typeof window === 'undefined') return defaultDeals
  try {
    const raw = localStorage.getItem(PIPELINE_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error(e)
  }
  return defaultDeals
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
  stage?: DealStage
  notes?: string
  cnpj?: string
}, defaultDeals: Deal[] = []): Deal {
  const currentDeals = getPipelineDeals(defaultDeals)
  const now = new Date().toISOString()
  
  const newDeal: Deal = {
    id: 'deal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title: dealData.title,
    contact_id: 'c_' + Date.now(),
    stage: dealData.stage || 'leads',
    position: 0,
    estimated_value: dealData.value || 0,
    stage_entered_at: now,
    created_at: now,
    updated_at: now,
    contact: {
      id: 'c_' + Date.now(),
      name: dealData.assignedToName ? `${dealData.assignedToName}` : (dealData.contactName || dealData.company),
      company: dealData.company,
      phone: dealData.phone,
      email: dealData.email,
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

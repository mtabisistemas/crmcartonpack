import { Deal, DealStage } from '@/types'
import { MockContact } from '@/app/(crm)/contacts/page'
import { formatCnaeCode } from '@/lib/utils'

export const PIPELINE_STORAGE_KEY = 'cp_crm_pipeline_deals'
export const CONTACTS_STORAGE_KEY = 'crm_contacts'

export const DEFAULT_PIPELINE_DEALS: Deal[] = [
  {
    id: 'deal_inpel_fechamento',
    title: 'INDUSTRIA DE PECAS INPEL SA',
    contact_id: 'cnt_inpel',
    stage: 'fechamento',
    position: 0,
    estimated_value: 12000,
    final_value: 12000,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_inpel',
      name: 'Andre Lazzari',
      company: 'INDUSTRIA DE PECAS INPEL SA',
      phone: '(51) 99888-7766',
      email: 'contato@inpel.com.br',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_inpel_visita_1',
    title: 'INDUSTRIA DE PECAS INPEL SA',
    contact_id: 'cnt_inpel',
    stage: 'visita',
    position: 0,
    estimated_value: 5000,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_inpel',
      name: 'Andre Lazzari',
      company: 'INDUSTRIA DE PECAS INPEL SA',
      phone: '(51) 99888-7766',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_inpel_visita_2',
    title: 'INDUSTRIA DE PECAS INPEL SA',
    contact_id: 'cnt_inpel',
    stage: 'visita',
    position: 1,
    estimated_value: 500,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_inpel',
      name: 'Andre Lazzari',
      company: 'INDUSTRIA DE PECAS INPEL SA',
      phone: '(51) 99888-7766',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_spezia_aprovacao',
    title: 'SPEZIA & CONDIMENTI LTDA',
    contact_id: 'cnt_spezia',
    stage: 'aprovacao',
    position: 0,
    estimated_value: 8500,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_spezia',
      name: 'SPEZIA & CONDIMENTI LTDA',
      company: 'SPEZIA & CONDIMENTI LTDA',
      phone: '(48) 98877-6655',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_spezia_briefing',
    title: 'SPEZIA & CONDIMENTI LTDA',
    contact_id: 'cnt_spezia',
    stage: 'briefing',
    position: 0,
    estimated_value: 8500,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_spezia',
      name: 'SPEZIA & CONDIMENTI LTDA',
      company: 'SPEZIA & CONDIMENTI LTDA',
      phone: '(48) 98877-6655',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_siqueira_potencial',
    title: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
    contact_id: 'cnt_siqueira',
    stage: 'potencial',
    position: 0,
    estimated_value: 2500,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_siqueira',
      name: 'Pamela de Siqueira Garay',
      company: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
      phone: '(51) 99123-4567',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_siqueira_prospect_1',
    title: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
    contact_id: 'cnt_siqueira',
    stage: 'prospect',
    position: 0,
    estimated_value: 0,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_siqueira',
      name: 'Pamela de Siqueira Garay',
      company: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_siqueira_prospect_2',
    title: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
    contact_id: 'cnt_siqueira',
    stage: 'prospect',
    position: 1,
    estimated_value: 0,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_siqueira',
      name: 'Pamela de Siqueira Garay',
      company: 'SIQUEIRA INTELIGENCIA FINANCEIRA LTDA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_parisotto_leads',
    title: 'MADEIREIRA PARISOTTO LTDA',
    contact_id: 'cnt_parisotto',
    stage: 'leads',
    position: 0,
    estimated_value: 0,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_parisotto',
      name: 'MADEIREIRA PARISOTTO LTDA',
      company: 'MADEIREIRA PARISOTTO LTDA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  },
  {
    id: 'deal_sinos_leads',
    title: 'SINOS TELECOMUNICACOES LTDA',
    contact_id: 'cnt_sinos',
    stage: 'leads',
    position: 1,
    estimated_value: 0,
    stage_entered_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    contact: {
      id: 'cnt_sinos',
      name: 'Eduarda Alves Talaska',
      company: 'SINOS TELECOMUNICACOES LTDA',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }
]

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

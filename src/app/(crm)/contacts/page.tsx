'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { 
  Search, 
  Filter, 
  Phone, 
  User, 
  Building2, 
  AlertCircle, 
  MapPin, 
  List,
  Plus, 
  X, 
  Send, 
  FileText,
  Mail,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Percent,
  FileSpreadsheet,
  ExternalLink,
  Clock,
  UserPlus,
  Save,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle,
  Globe,
  Users,
  DollarSign,
  Calendar,
  Trophy,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Info,
  TrendingUp,
  Activity,
  BarChart2,
  UserX
} from 'lucide-react'
import { whatsappLink, formatCurrency, formatCnaeCode, formatCnaeFullString, getUniqueCanonicalRepresentatives, isSameRepresentative, formatCanonicalRepName } from '@/lib/utils'
import { supabase } from '@/services/supabase-client'
import { ProspeccaoModal } from '@/components/ProspeccaoModal'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'

const WhatsappIcon = ({ size = 15, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
  </svg>
)

export interface MockContact {
  id: string
  name: string
  company: string
  cnpj: string
  curve: 'A' | 'B' | 'C' | 'D'
  representative: string
  lastPurchaseDays: number
  phone: string
  phone2?: string
  city: string
  state: string
  status: 'ativo' | 'inativo' | 'prospeccao'
  email?: string
  // Expanded fields
  tradeName?: string
  registrationStatus?: string
  mainCnae?: string
  address?: string
  complement?: string
  bairro?: string
  cep?: string
  taxRegime?: string
  specialSituation?: string
  specialSituationDate?: string
  stateRegistration?: string
  website?: string
  instagram?: string
  linkedin?: string
  facebook?: string // Inscrição Estadual
  sideActivities?: {id: string; text: string}[]
  activities?: Activity[]
  
  // Planejamento & Recompra
  projectedPurchaseValue?: number
  purchaseFrequencyDays?: number
  lastPurchaseDate?: string
  inactivityThresholdDays?: number
  planningNotes?: string
  orders?: any[]
  history?: Array<{ id: string; date: string; author: string; action: string; details: string }>
  created_at?: string
}

interface Activity {
  id: string
  type: 'nota' | 'whatsapp' | 'ligacao' | 'email' | 'reuniao'
  content: string
  timestamp: string
  photoUrl?: string
}

const MOCK_CONTACTS: MockContact[] = []
function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function formatPhoneBr(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

function formatDateBr(isoDateStr: string | null | undefined) {
  if (!isoDateStr || isoDateStr === '-' || isoDateStr === 'Nenhuma') return '-'
  const clean = isoDateStr.split('T')[0] // remove time if any
  const parts = clean.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return isoDateStr
}

export function cleanRepresentativeName(repStr?: string): string {
  if (!repStr) return ''
  const trimmed = repStr.trim()
  if (trimmed.includes(' - ')) {
    const parts = trimmed.split(' - ').map(s => s.trim())
    if (parts.length >= 2 && parts[0].toLowerCase() === parts[1].toLowerCase()) {
      return parts[0]
    }
    return parts[0]
  }
  return trimmed
}

export function computeDynamicABCCurves(rawContacts: MockContact[]): MockContact[] {
  let totalSystemRevenue = 0
  const now = new Date()

  const contactStats = rawContacts.map(c => {
    let orderValSum = 0
    let ordersCount = 0
    let ordersLast12m = 0

    if (c.orders && Array.isArray(c.orders)) {
      ordersCount = c.orders.length
      c.orders.forEach((o: any) => {
        const val = typeof o.value === 'number' ? o.value : parseFloat(o.value || 0)
        if (!isNaN(val)) orderValSum += val
        if (o.date) {
          const d = parseFlexibleDate(o.date)
          if (d && !isNaN(d.getTime()) && (now.getTime() - d.getTime()) <= 365 * 24 * 60 * 60 * 1000) {
            ordersLast12m++
          }
        }
      })
    }

    totalSystemRevenue += orderValSum

    return {
      contact: c,
      orderValSum,
      ordersCount,
      ordersLast12m
    }
  })

  // Sort purchasing contacts by total order value descending
  const purchasing = contactStats.filter(s => s.orderValSum > 0)
  purchasing.sort((a, b) => b.orderValSum - a.orderValSum)

  const curveMap = new Map<string, 'A' | 'B' | 'C' | 'D'>()

  let runningSum = 0
  purchasing.forEach(s => {
    runningSum += s.orderValSum
    const paretoPct = totalSystemRevenue > 0 ? runningSum / totalSystemRevenue : 1

    let curve: 'A' | 'B' | 'C' | 'D' = 'C'
    if (paretoPct <= 0.80 && (s.ordersLast12m >= 2 || s.ordersCount >= 4)) {
      curve = 'A'
    } else if (paretoPct <= 0.95 || paretoPct <= 0.80) {
      curve = 'B'
    } else {
      curve = 'C'
    }

    curveMap.set(s.contact.id, curve)
  })

  return rawContacts.map(c => {
    const computedCurve = curveMap.get(c.id) || 'D'
    return {
      ...c,
      curve: computedCurve
    }
  })
}

function capitalizeString(str: string) {
  return str.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
}

function parseFlexibleDate(str: string | null | undefined): Date | null {
  if (!str) return null
  const iso = new Date(str)
  if (!isNaN(iso.getTime())) return iso
  if (str.includes('/')) {
    const [datePart, timePart] = str.split(' ')
    const parts = datePart.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts.map(Number)
      const date = new Date(y, m - 1, d)
      if (timePart && timePart.includes(':')) {
        const [h, min] = timePart.split(':').map(Number)
        date.setHours(h || 0, min || 0, 0, 0)
      }
      if (!isNaN(date.getTime())) return date
    }
  }
  return null
}

export function getContactActivityAndRepurchaseInfo(contact: MockContact) {
  let lastActivityDate: Date | null = null

  if (contact.activities && contact.activities.length > 0) {
    for (const act of contact.activities) {
      const parsed = parseFlexibleDate(act.timestamp)
      if (parsed && (!lastActivityDate || parsed.getTime() > lastActivityDate.getTime())) {
        lastActivityDate = parsed
      }
    }
  }

  if (!lastActivityDate && contact.lastPurchaseDate) {
    lastActivityDate = parseFlexibleDate(contact.lastPurchaseDate)
  }

  if (!lastActivityDate && contact.created_at) {
    lastActivityDate = parseFlexibleDate(contact.created_at)
  }

  const now = new Date()
  const inactivityThreshold = contact.inactivityThresholdDays ?? 90

  let daysSinceLastActivity = 0
  if (lastActivityDate) {
    const diffMs = now.getTime() - lastActivityDate.getTime()
    daysSinceLastActivity = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  }

  const isAutoInactive = daysSinceLastActivity > inactivityThreshold

  let daysToRepurchase = 9999
  let isOverdue = false
  let daysOverdue = 0
  let nextPurchaseDateStr = '-'

  if (contact.lastPurchaseDate) {
    const lastDate = parseFlexibleDate(contact.lastPurchaseDate)
    if (lastDate && !isNaN(lastDate.getTime())) {
      const freq = contact.purchaseFrequencyDays || 30
      const nextDate = new Date(lastDate)
      nextDate.setDate(nextDate.getDate() + freq)

      nextPurchaseDateStr = `${String(nextDate.getDate()).padStart(2, '0')}/${String(nextDate.getMonth() + 1).padStart(2, '0')}/${nextDate.getFullYear()}`

      const diffMs = nextDate.getTime() - now.getTime()
      daysToRepurchase = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

      if (daysToRepurchase < 0) {
        isOverdue = true
        daysOverdue = Math.abs(daysToRepurchase)
      }
    }
  }

  let daysSinceLastPurchase: number | null = null
  let hasPurchaseHistory = false

  if (contact.orders && Array.isArray(contact.orders) && contact.orders.length > 0) {
    hasPurchaseHistory = true
  } else if (contact.lastPurchaseDate) {
    hasPurchaseHistory = true
  }

  if (contact.lastPurchaseDate) {
    const lastDate = parseFlexibleDate(contact.lastPurchaseDate)
    if (lastDate && !isNaN(lastDate.getTime())) {
      const diffMs = now.getTime() - lastDate.getTime()
      daysSinceLastPurchase = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
    }
  }

  // Novas Regras de Status:
  // - Ativo: clientes com compras realizadas nos últimos 180 dias
  // - Reativação: clientes sem compras há mais de 180 dias
  // - Prospecção: clientes que ainda não possuem histórico de compras
  let computedStatus: 'prospeccao' | 'ativo' | 'reativacao'
  if (!hasPurchaseHistory || daysSinceLastPurchase === null) {
    computedStatus = 'prospeccao'
  } else if (daysSinceLastPurchase <= 180) {
    computedStatus = 'ativo'
  } else {
    computedStatus = 'reativacao'
  }

  return {
    lastActivityDate,
    daysSinceLastActivity,
    daysSinceLastPurchase,
    hasPurchaseHistory,
    computedStatus,
    daysToRepurchase: 9999,
    isOverdue: false,
    daysOverdue: 0,
    nextPurchaseDateStr: '-'
  }
}

// Helper to construct full address
function buildAddress(d: any) {
  const parts = []
  if (d.descricao_tipo_de_logradouro || d.logradouro) {
    parts.push(`${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim())
  }
  if (d.numero) parts.push(d.numero)
  if (d.complemento) parts.push(d.complemento)
  let addr = parts.join(', ')
  if (d.bairro) addr += ` - ${d.bairro}`
  if (d.cep) {
    const formattedCep = d.cep.replace(/^(\d{5})(\d{3})/, '$1-$2')
    addr += ` - CEP: ${formattedCep}`
  }
  return addr
}

// ─── Contact Drawer Component ──────────────────────────────────
function ContactDrawer({ 
  contact, 
  onClose, 
  onUpdateContact,
  representatives = [],
  onOpenRegisterActivity
}: { 
  contact: MockContact | null
  onClose: () => void
  onUpdateContact: (contact: MockContact) => void
  representatives?: string[]
  onOpenRegisterActivity?: (contactId: string) => void
}) {
  const representativesList = representatives
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'geral' | 'planejamento' | 'historico' | 'pedidos'>('geral')

  // Form states
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')
  const [representative, setRepresentative] = useState('')
  const [phone, setPhone] = useState('')
  const [phone2, setPhone2] = useState('')
  const [showPhone2, setShowPhone2] = useState(false)
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'prospeccao'>('ativo')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [sideActivities, setSideActivities] = useState<{id: string; text: string}[]>([])
  const [showSideActivities, setShowSideActivities] = useState(false)
  
  // Expanded fields
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [mainCnae, setMainCnae] = useState('')
  const [address, setAddress] = useState('')
  const [complement, setComplement] = useState('')
  const [taxRegime, setTaxRegime] = useState<string>('')
  const [specialSituation, setSpecialSituation] = useState('')
  const [specialSituationDate, setSpecialSituationDate] = useState('')
  const [stateRegistration, setStateRegistration] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [facebook, setFacebook] = useState('')
  const [loadingSocial, setLoadingSocial] = useState(false)

  // Planejamento & Recompra states
  const [projectedPurchaseValue, setProjectedPurchaseValue] = useState<number>(0)
  const [projectedValueInput, setProjectedValueInput] = useState<string>('')
  const [purchaseFrequencyDays, setPurchaseFrequencyDays] = useState<number>(30)
  const [lastPurchaseDate, setLastPurchaseDate] = useState<string>('')
  const [inactivityThresholdDays, setInactivityThresholdDays] = useState<number>(90)
  const [planningNotes, setPlanningNotes] = useState<string>('')
  const [historyList, setHistoryList] = useState<Array<{ id: string; date: string; author: string; action: string; details: string }>>([])

  const parseCurrencyToNumber = (val: string): number => {
    if (!val) return 0
    const clean = val.replace(/\./g, '').replace(',', '.')
    const parsed = parseFloat(clean)
    return isNaN(parsed) ? 0 : parsed
  }

  const formatNumberToCurrencyStr = (num: number | undefined | null): string => {
    if (num == null || isNaN(num) || num === 0) return ''
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleProjectedValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const cleanRaw = raw.replace(/[^\d.,]/g, '')
    setProjectedValueInput(cleanRaw)
    const num = parseCurrencyToNumber(cleanRaw)
    setProjectedPurchaseValue(num)
  }

  const handleProjectedValueBlur = () => {
    if (projectedPurchaseValue) {
      setProjectedValueInput(formatNumberToCurrencyStr(projectedPurchaseValue))
    }
    handleSaveGeneral({ projectedPurchaseValue })
  }

  // History states
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const handleCopyEmail = (str: string) => { if (!str) return; navigator.clipboard.writeText(str); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')
  const [autoCalculatedFreq, setAutoCalculatedFreq] = useState<number | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {}
      }
    }
  }, [])

  useEffect(() => {
    if (contact) {
      setIsOpen(true)
      setName(contact.name)
      setCompany(contact.company)
      setTradeName(contact.tradeName ?? '')
      setCnpj(contact.cnpj)
      setCurve(contact.curve)
      setRepresentative(contact.representative)
      setPhone(contact.phone)
      const secPhone = contact.phone2 ?? (contact as any).secondary_phone ?? ''
      setPhone2(secPhone)
      setShowPhone2(!!secPhone)
      setEmail(contact.email ?? '')
      setCity(contact.city)
      setState(contact.state)
      setStatus(contact.status)
      
      // Load planning and history fields
      const pVal = (contact as any).projectedPurchaseValue ?? (contact as any).projected_purchase_value ?? 0
      setProjectedPurchaseValue(pVal)
      setProjectedValueInput(formatNumberToCurrencyStr(pVal))
      setLastPurchaseDate((contact as any).lastPurchaseDate ?? (contact as any).last_purchase_date ?? '')
      setInactivityThresholdDays((contact as any).inactivityThresholdDays ?? (contact as any).inactivity_threshold_days ?? 90)
      setPlanningNotes((contact as any).planningNotes ?? (contact as any).planning_notes ?? '')

      // ── Automatic Purchase Frequency Calculation from last 365 days orders ──
      let contactOrders: any[] = (contact as any).orders || []
      const cleanTargetCnpj = (contact.cnpj || '').replace(/\D/g, '')
      const cleanTargetComp = (contact.company || contact.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w]/g, "")
      
      if (typeof window !== 'undefined') {
        const rawContacts = localStorage.getItem('crm_contacts')
        if (rawContacts) {
          try {
            const list = JSON.parse(rawContacts)
            const matched = list.find((c: any) => {
              const cCnpj = (c.cnpj || '').replace(/\D/g, '')
              const cComp = (c.company || c.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w]/g, "")
              return (cleanTargetCnpj && cCnpj && cleanTargetCnpj === cCnpj) || (cleanTargetComp && cComp && cleanTargetComp === cComp)
            })
            if (matched && matched.orders && matched.orders.length > 0) {
              contactOrders = matched.orders
            }
          } catch (e) {}
        }
      }

      const oneYearAgo = new Date()
      oneYearAgo.setDate(oneYearAgo.getDate() - 365)
      
      const ordersInLastYear = contactOrders.filter((o: any) => {
        if (!o.date) return false
        const d = new Date(o.date)
        return !isNaN(d.getTime()) && d >= oneYearAgo
      }).sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))

      let calculatedAutoFreq: number | null = null
      if (ordersInLastYear.length >= 2) {
        const oldestD = new Date(ordersInLastYear[0].date)
        const newestD = new Date(ordersInLastYear[ordersInLastYear.length - 1].date)
        const diffMs = newestD.getTime() - oldestD.getTime()
        const diffDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
        calculatedAutoFreq = Math.max(1, Math.round(diffDays / (ordersInLastYear.length - 1)))
      }

      const rawSavedFreq = (contact as any).purchaseFrequencyDays ?? (contact as any).purchase_frequency_days
      const finalFreq = calculatedAutoFreq !== null 
        ? calculatedAutoFreq 
        : (rawSavedFreq && rawSavedFreq !== 30 ? rawSavedFreq : null)
      
      setPurchaseFrequencyDays(finalFreq)
      setAutoCalculatedFreq(calculatedAutoFreq)
      
      let parsedHist: any[] = []
      const rawHist = (contact as any).history
      if (typeof rawHist === 'string') {
        try { parsedHist = JSON.parse(rawHist) } catch (e) {}
      } else if (Array.isArray(rawHist)) {
        parsedHist = rawHist
      }
      setHistoryList(parsedHist)
      
      // Fallback address parsing if bairro and cep are empty in state
      let parsedAddress = contact.address ?? ''
      let parsedBairro = contact.bairro ?? ''
      let parsedCep = contact.cep ?? ''

      if (!parsedBairro && !parsedCep && parsedAddress.includes(' - ')) {
        const parts = parsedAddress.split(' - ')
        parsedAddress = parts[0] || ''
        
        const bairroPart = parts.find(p => p.toLowerCase().includes('bairro')) || parts[1]
        if (bairroPart) {
          parsedBairro = bairroPart.replace(/bairro:\s*/i, '').replace(/bairro\s+/i, '').trim()
        }
        
        const cepPart = parts.find(p => p.toLowerCase().includes('cep:')) || parts.find(p => p.match(/\d{5}-\d{3}/))
        if (cepPart) {
          parsedCep = cepPart.replace(/cep:\s*/i, '').trim()
        }
      }

      setAddress(parsedAddress)
      setComplement(contact.complement ?? (contact as any).street_complement ?? '')
      setBairro(parsedBairro)
      setCep(parsedCep)
      setSideActivities(contact.sideActivities ?? [])
      setShowSideActivities(false)
      setRegistrationStatus(contact.registrationStatus ?? 'ATIVA')
      setMainCnae(contact.mainCnae ?? '')
      setTaxRegime(contact.taxRegime ?? '')
      setSpecialSituation(contact.specialSituation ?? 'Nenhuma')
      setSpecialSituationDate(contact.specialSituationDate ?? '-')
      setStateRegistration(contact.stateRegistration ?? '')
      setWebsite(contact.website ?? '')
      setInstagram(contact.instagram ?? '')
      setLinkedin(contact.linkedin ?? '')
      setFacebook(contact.facebook ?? '')

      // Load activities merging contact activities and pipeline deal activities
      const loadContactActivities = () => {
        try {
          let contactActs: Activity[] = []
          const rawContacts = localStorage.getItem('crm_contacts')
          if (rawContacts) {
            const list = JSON.parse(rawContacts)
            const matched = list.find((c: any) => c.id === contact.id || (c.company && contact.company && c.company.toLowerCase().trim() === contact.company.toLowerCase().trim()))
            if (matched && matched.activities) {
              contactActs = matched.activities
            }
          }
          if (contactActs.length === 0) {
            contactActs = contact.activities || []
          }

          let dealActs: Activity[] = []
          const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
          if (rawDeals) {
            const deals = JSON.parse(rawDeals)
            deals.forEach((d: any) => {
              const matchesId = d.contact_id === contact.id
              const matchesComp = contact.company && (d.contact?.company || d.title) && (d.contact?.company || d.title).toLowerCase().trim() === contact.company.toLowerCase().trim()
              if ((matchesId || matchesComp) && d.activities && Array.isArray(d.activities)) {
                dealActs.push(...d.activities)
              }
            })
          }

          const mergedMap = new Map<string, Activity>()
          contactActs.forEach(a => mergedMap.set(a.id, a))
          dealActs.forEach(a => mergedMap.set(a.id, a))

          const merged = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
          setActivities(merged)
        } catch (e) {
          setActivities(contact.activities || [])
        }
      }

      loadContactActivities()

      if (typeof window !== 'undefined') {
        window.addEventListener('storage-contacts-changed', loadContactActivities)
        window.addEventListener('storage-deals-changed', loadContactActivities)
      }
    } else {
      setIsOpen(false)
    }
  }, [contact])

  if (!contact) return null

  const handleSaveGeneral = async (overrides?: Partial<MockContact> | React.FocusEvent) => {
    setIsSaving(true)
    const cleanOverrides = overrides && !(overrides as any).nativeEvent 
      ? (overrides as Partial<MockContact>) 
      : {}

    // Audit trail calculation for history
    const changes: string[] = []
    if (contact) {
      if (company && company !== contact.company) changes.push(`Razão Social: "${contact.company || '-'}" ➔ "${company}"`)
      if (name && name !== contact.name) changes.push(`Responsável: "${contact.name || '-'}" ➔ "${name}"`)
      if (phone && phone !== contact.phone) changes.push(`Telefone atualizado`)
      if (email && email !== contact.email) changes.push(`E-mail: "${email || '-'}" ➔ "${email}"`)
      if (representative && representative !== contact.representative) changes.push(`Representante: "${contact.representative || '-'}" ➔ "${representative}"`)
      if (status && status !== contact.status) changes.push(`Status: "${contact.status || '-'}" ➔ "${status}"`)
      if (curve && curve !== contact.curve) changes.push(`Curva: "${contact.curve || '-'}" ➔ "${curve}"`)
      
      const oldVal = (contact as any).projectedPurchaseValue ?? (contact as any).projected_purchase_value ?? 0
      if (oldVal !== projectedPurchaseValue) {
        changes.push(`Valor Projetado de Compra: R$ ${oldVal.toLocaleString('pt-BR')} ➔ R$ ${projectedPurchaseValue.toLocaleString('pt-BR')}`)
      }

      const oldFreq = (contact as any).purchaseFrequencyDays ?? (contact as any).purchase_frequency_days ?? 30
      if (oldFreq !== purchaseFrequencyDays) {
        changes.push(`Frequência de Compra: ${oldFreq} dias ➔ ${purchaseFrequencyDays} dias`)
      }

      const oldLastDate = (contact as any).lastPurchaseDate ?? (contact as any).last_purchase_date ?? ''
      if (oldLastDate !== lastPurchaseDate) {
        changes.push(`Data da Última Compra: "${oldLastDate || '-'}" ➔ "${lastPurchaseDate}"`)
      }

      const oldInactThreshold = (contact as any).inactivityThresholdDays ?? (contact as any).inactivity_threshold_days ?? 90
      if (oldInactThreshold !== inactivityThresholdDays) {
        changes.push(`Tempo para Inativação: ${oldInactThreshold} dias ➔ ${inactivityThresholdDays} dias`)
      }

      const oldNotes = (contact as any).planningNotes ?? (contact as any).planning_notes ?? ''
      if (oldNotes !== planningNotes) {
        changes.push(`Observações de planejamento atualizadas`)
      }
    }

    let updatedHistory = historyList
    if (changes.length > 0) {
      const now = new Date()
      const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const authorName = currentUser?.name || currentUser?.nome || 'Usuário'

      const newAudit = {
        id: `hist_${Date.now()}`,
        date: dateStr,
        author: authorName,
        action: 'Atualização do Cadastro',
        details: changes.join(' • ')
      }
      updatedHistory = [newAudit, ...historyList]
      setHistoryList(updatedHistory)
    }

    await onUpdateContact({
      ...contact,
      name,
      company,
      tradeName,
      cnpj,
      curve,
      representative,
      phone,
      phone2,
      email,
      city: city ? city.toUpperCase() : '',
      state: state ? state.toUpperCase() : '',
      status,
      registrationStatus,
      mainCnae,
      address,
      complement,
      taxRegime,
      specialSituation,
      specialSituationDate,
      stateRegistration,
      bairro,
      cep,
      sideActivities,
      website,
      instagram,
      linkedin,
      facebook,
      projectedPurchaseValue,
      purchaseFrequencyDays,
      lastPurchaseDate,
      inactivityThresholdDays,
      planningNotes,
      history: updatedHistory,
      activities,
      ...cleanOverrides
    })
    setIsSaving(false)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2500)
  }

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const authorName = currentUser?.name || currentUser?.nome || 'Usuário'

    const newAct: Activity = {
      id: `act_${Date.now()}`,
      type: activityType,
      content: newNote,
      timestamp: timestampStr,
      user_name: authorName,
      userName: authorName,
      author: authorName
    } as any

    const updatedActs = [newAct, ...activities]
    setActivities(updatedActs)
    setNewNote('')

    if (contact) {
      await onUpdateContact({
        ...contact,
        activities: updatedActs
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('storage-deals-changed'))
      }
    }
  }

  const getRepurchaseStatusInfo = () => {
    if (!lastPurchaseDate || !purchaseFrequencyDays || purchaseFrequencyDays <= 0) {
      return {
        status: 'sem_dados',
        label: 'Frequência de Compra Não Definida',
        color: 'var(--gray2)',
        badgeBg: 'bg-[var(--card2)] border-[var(--line)] text-[var(--gray2)]',
        daysRemaining: 0,
        nextDateStr: 'Não informada'
      }
    }

    try {
      let lastDate: Date
      if (lastPurchaseDate.includes('/')) {
        const parts = lastPurchaseDate.split('/')
        lastDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
      } else if (lastPurchaseDate.includes('-')) {
        const parts = lastPurchaseDate.split('-')
        lastDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
      } else {
        lastDate = new Date(lastPurchaseDate)
      }

      if (isNaN(lastDate.getTime())) {
        return {
          status: 'sem_dados',
          label: 'Data da Última Compra Inválida',
          color: 'var(--gray2)',
          badgeBg: 'bg-[var(--card2)] border-[var(--line)] text-[var(--gray2)]',
          daysRemaining: 0,
          nextDateStr: '-'
        }
      }

      const nextDate = new Date(lastDate.getTime() + purchaseFrequencyDays * 24 * 60 * 60 * 1000)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      nextDate.setHours(0, 0, 0, 0)

      const diffTime = nextDate.getTime() - today.getTime()
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      const nextDateStr = nextDate.toLocaleDateString('pt-BR')

      if (daysRemaining < 0) {
        return {
          status: 'atrasado',
          label: `🔴 RECOMPRA ATRASADA (${Math.abs(daysRemaining)} dias em atraso)`,
          color: 'var(--red)',
          badgeBg: 'bg-red-500/15 border-red-500/30 text-red-400',
          daysRemaining,
          nextDateStr
        }
      } else if (daysRemaining <= 15) {
        return {
          status: 'proximo',
          label: `🟡 PRÓXIMO DA RECOMPRA (Faltam ${daysRemaining} dias)`,
          color: 'var(--yellow)',
          badgeBg: 'bg-amber-400/15 border-amber-400/30 text-amber-300',
          daysRemaining,
          nextDateStr
        }
      } else {
        return {
          status: 'no_prazo',
          label: `🟢 NO PRAZO (Faltam ${daysRemaining} dias)`,
          color: 'var(--green)',
          badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
          daysRemaining,
          nextDateStr
        }
      }
    } catch (e) {
      return {
        status: 'sem_dados',
        label: 'Erro no cálculo',
        color: 'var(--gray2)',
        badgeBg: 'bg-[var(--card2)] border-[var(--line)] text-[var(--gray2)]',
        daysRemaining: 0,
        nextDateStr: '-'
      }
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'nota':     return <FileText size={12} />
      case 'whatsapp': return <MessageSquare size={12} className="text-emerald-400" />
      case 'ligacao':  return <Phone size={12} className="text-sky-400" />
      case 'email':    return <Mail size={12} className="text-amber-400" />
      case 'reuniao':  return <User size={12} className="text-purple-400" />
      default:         return <HelpCircle size={12} />
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in"
        />
      )}

      {/* Drawer Body */}
      <div className={`drawer-sheet ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '960px', maxWidth: '95vw' }}>
        {/* Header */}
        <div className="p-4 px-6 border-b border-[var(--line)] flex justify-between items-center bg-[var(--card)]">
          <div>
            <h2 className="font-display text-base text-[var(--white)] font-bold">{company}</h2>
            <span className="text-xs text-[var(--gray)] font-mono">{cnpj}</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={() => handleSaveGeneral()}
              disabled={isSaving}
              className={"btn btn-primary text-xs py-1.5 px-4 flex items-center gap-2 font-bold shadow-lg transition-all " + (isSaved ? '!bg-emerald-500 !text-black' : '')}
            >
              <Save size={13} />
              <span>{isSaving ? 'Salvando...' : isSaved ? 'Edição Salva! ✓' : 'Salvar Alterações'}</span>
            </button>

            <button onClick={onClose} className="text-gray-400 hover:text-[var(--white)] p-1.5 rounded-lg hover:bg-[var(--line)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Ficha Geral
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'planejamento' ? 'active' : ''}`}
            onClick={() => setActiveTab('planejamento')}
          >
            Projeção & Planejamento
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico de Atividades
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'pedidos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pedidos')}
          >
            Histórico de Pedidos
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-4 animate-fade-in pb-12">
              
              {/* Seção Destaques no Topo: Curva, Representante e Status */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[var(--card2)] border border-[var(--line)] rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Curva ABC</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold text-[var(--lime)] font-mono bg-[var(--charcoal)]"
                    value={curve} 
                    onChange={(e) => setCurve(e.target.value as any)}
                  >
                    <option value="A">Curva A</option>
                    <option value="B">Curva B</option>
                    <option value="C">Curva C</option>
                    <option value="D">Curva D</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Representante</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold bg-[var(--charcoal)]"
                    value={representative} 
                    onChange={(e) => setRepresentative(e.target.value)}
                  >
                    {Array.from(new Set([representative, ...representativesList].filter(Boolean))).map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Status Carteira</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold bg-[var(--charcoal)]"
                    style={{ 
                      color: status === 'ativo' 
                        ? 'var(--green)' 
                        : status === 'inativo' 
                          ? 'var(--red)' 
                          : 'var(--yellow)' 
                    }}
                    value={status} 
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="prospeccao">Em Prospecção</option>
                  </select>
                </div>
              </div>
              
              {/* 3-Column Harmonious Grid Layout (Idêntico ao Cadastro) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                
                {/* COLUMN 1 & 2 (col-span-2): Dados Cadastrais & Atividades Econômicas */}
                <div className="lg:col-span-2 flex flex-col gap-3">
                  
                  {/* Card 1: Dados Cadastrais & Endereço */}
                  <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais & Endereço</h4>
                    
                    {/* Razão Social */}
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa *</label>
                      <input 
                        type="text" 
                        required
                        className="bg-transparent border-b border-dashed border-[var(--line)] focus:border-[var(--lime)] font-display text-xs text-[var(--white)] font-bold w-full pb-0.5 focus:outline-none uppercase"
                        placeholder="Nome da Empresa"
                        value={company}
                        onChange={(e) => setCompany(e.target.value.toUpperCase())}
                      />
                    </div>

                    {/* Nome Fantasia + Responsável */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Nome Fantasia"
                          value={tradeName}
                          onChange={(e) => setTradeName(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Responsável (Pessoa Física)</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-bold border-dashed border-[var(--lime)] uppercase" 
                          placeholder="Nome do Contato Principal (Opcional)"
                          value={name}
                          onChange={(e) => setName(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {/* CNPJ + Telefone + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                        </div>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="00.000.000/0001-00"
                          value={cnpj}
                          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between h-5">
                          <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                          <button
                            type="button"
                            onClick={() => setShowPhone2(prev => !prev)}
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                              phone2 
                                ? 'bg-[var(--lime)]/15 text-[var(--lime)] border-[var(--lime)]/30 hover:bg-[var(--lime)]/25' 
                                : 'bg-[var(--charcoal)] text-[var(--gray)] border-[var(--line)] hover:text-white'
                            }`}
                            title={phone2 ? 'Telefone Secundário cadastrado. Clique para recolher/expandir' : 'Adicionar 2º Telefone'}
                          >
                            <Plus size={10} />
                            <span>{phone2 ? '2º TEL ATIVO' : 'ADD 2º TEL'}</span>
                          </button>
                        </div>
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            className="input text-xs py-1 px-2.5 pr-8 w-full" 
                            placeholder="(00) 00000-0000"
                            value={phone}
                            onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                          />
                          {phone && (
                            <a
                              href={whatsappLink(phone)}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                              title="Chamar no WhatsApp"
                            >
                              <WhatsappIcon size={15} />
                            </a>
                          )}
                        </div>

                        {/* Telefone Secundário / Adicional */}
                        {(showPhone2 || phone2) && (
                          <div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--charcoal)]/60 border border-[var(--line)] animate-fade-in mt-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Telefone Secundário</label>
                              {phone2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const temp = phone
                                    setPhone(phone2)
                                    setPhone2(temp)
                                  }}
                                  className="text-[9px] font-mono font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer"
                                  title="Trocar o telefone principal pelo secundário"
                                >
                                  <span>⇄ INVERTER C/ PRINCIPAL</span>
                                </button>
                              )}
                            </div>
                            <div className="relative flex items-center">
                              <input 
                                type="text" 
                                className="input text-xs py-1 px-2.5 pr-8 w-full" 
                                placeholder="(00) 00000-0000"
                                value={phone2}
                                onChange={(e) => setPhone2(formatPhoneBr(e.target.value))}
                              />
                              {phone2 && (
                                <a
                                  href={whatsappLink(phone2)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute right-2 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                                  title="Chamar 2º Telefone no WhatsApp"
                                >
                                  <WhatsappIcon size={15} />
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                          {email && (
                            <button 
                              type="button" 
                              onClick={() => handleCopyEmail(email)} 
                              className="text-[9px] font-bold text-[var(--lime)] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                              title="Copiar E-mail"
                            >
                              {copiedEmail ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                              <span>{copiedEmail ? 'COPIADO!' : 'COPIAR'}</span>
                            </button>
                          )}
                        </div>
                        <div className="relative flex items-center">
                          <input 
                            type="email" 
                            className="input text-xs py-1 px-2.5 w-full" 
                            placeholder="contato@empresa.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rua / Número + Complemento + Bairro */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                      <div className="sm:col-span-6 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Rua, Número"
                          value={address}
                          onChange={(e) => setAddress(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Complemento</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Sala, Bloco..."
                          value={complement}
                          onChange={(e) => setComplement(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="sm:col-span-3 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Bairro"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value.toUpperCase())}
                        />
                      </div>
                    </div>

                    {/* CEP | Cidade | UF | Mapa */}
                    <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-end">
                      <div className="flex flex-col gap-0.5 shrink-0 w-[100px]">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          maxLength={9}
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="00000-000"
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Cidade"
                          value={city}
                          onChange={(e) => setCity(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0 w-[70px]">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="input text-xs py-1 px-1.5 uppercase text-center font-bold font-mono w-full"
                          placeholder="UF"
                          value={state}
                          onChange={(e) => setState(e.target.value.toUpperCase())}
                          
                        />
                      </div>

                      <div className="flex flex-col gap-0.5 shrink-0 pb-0.5">
                        <a
                          href={(address || city) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, bairro, city, state, cep].filter(Boolean).join(', '))}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver endereço no mapa"
                          className={`flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] transition-colors ${(address || city) ? 'text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
                        >
                          <MapPin size={16} />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Atividades Econômicas */}
                  <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                      <input 
                        type="text" 
                        className="input text-xs py-1 px-2 font-mono" 
                        placeholder="CNAE e Descrição"
                        value={mainCnae}
                        onChange={(e) => setMainCnae(e.target.value)}
                        
                      />
                    </div>

                    {sideActivities.length > 0 && (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => setShowSideActivities(v => !v)}
                          className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider font-mono transition-colors w-fit"
                          style={{ color: showSideActivities ? 'var(--lime)' : 'var(--gray)' }}
                        >
                          <span
                            className="inline-block transition-transform duration-200"
                            style={{ transform: showSideActivities ? 'rotate(90deg)' : 'rotate(0deg)' }}
                          >▶</span>
                          {showSideActivities ? 'Ocultar' : 'Ver'} secundárias ({sideActivities.length})
                        </button>

                        {showSideActivities && (
                          <div className="flex flex-col gap-0 border border-[var(--line)] rounded-lg overflow-y-auto max-h-[90px]">
                            {sideActivities.map((act, i) => (
                              <div
                                key={act.id || i}
                                className="flex gap-1.5 px-2 py-1 text-[11px] font-mono leading-tight"
                                style={{ background: i % 2 === 0 ? 'var(--card2)' : 'transparent' }}
                              >
                                <span className="text-[var(--lime)] font-bold shrink-0">{act.id}</span>
                                <span className="text-[var(--gray)] truncate">{act.text}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 3: Fiscal & Canais Digitais */}
                <div className="flex flex-col gap-3">
                  
                  {/* Card 1: Dados Fiscais & Status */}
                  <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Dados Fiscais & Status</h4>
                      {cnpj && (
                        <a 
                          href={`https://cnpja.com/office/${cnpj.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[9px] font-bold text-[var(--lime)] hover:text-white uppercase tracking-wider font-mono flex items-center gap-1 transition-colors"
                        >
                          <span>CNPJá</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                        <select 
                          className="input text-xs py-1 px-2.5 font-bold w-full" 
                          value={taxRegime} 
                          onChange={(e) => {
                            const val = e.target.value
                            setTaxRegime(val)
                            handleSaveGeneral({ taxRegime: val })
                          }}
                        >
                          <option value="">-</option>
                          <option value="Simples Nacional">Simples Nacional</option>
                          <option value="Lucro Presumido">Lucro Presumido</option>
                          <option value="Lucro Real">Lucro Real</option>
                          <option value="MEI">MEI</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                        <input 
                          type="text" 
                          title={registrationStatus}
                          className="input text-xs py-1 px-2.5 font-bold w-full" 
                          placeholder="Ex: ATIVA"
                          style={{ 
                            color: (registrationStatus.includes('ATIVA') || registrationStatus.includes('Ativa')) ? 'var(--green)' : 'var(--white)' 
                          }}
                          value={registrationStatus}
                          onChange={(e) => setRegistrationStatus(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Inscrição Estadual (IE)</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="IE"
                          value={stateRegistration}
                          onChange={(e) => setStateRegistration(e.target.value)}
                          
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Especial</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5" 
                          placeholder="Nenhuma"
                          value={specialSituation}
                          onChange={(e) => setSpecialSituation(e.target.value)}
                          
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Canais Digitais & Redes */}
                  <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Canais Digitais & Redes</h4>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Globe size={11} className="text-[var(--lime)]" />
                            <span>Website</span>
                          </span>
                          {website && (
                            <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[var(--lime)] hover:underline flex items-center gap-0.5">
                              <span>Abrir</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="https://..."
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#E1306C] fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                            <span>Instagram</span>
                          </span>
                          {instagram && (
                            <a href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#E1306C] hover:underline flex items-center gap-0.5">
                              <span>Perfil</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="@perfil"
                          value={instagram}
                          onChange={(e) => setInstagram(e.target.value)}
                          
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#0A66C2] fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                            <span>LinkedIn</span>
                          </span>
                          {linkedin && (
                            <a href={linkedin.startsWith('http') ? linkedin : `https://${linkedin}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#0A66C2] hover:underline flex items-center gap-0.5">
                              <span>Perfil</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="linkedin.com/company/..."
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                            <span>Facebook</span>
                          </span>
                          {facebook && (
                            <a href={facebook.startsWith('http') ? facebook : `https://${facebook}`} target="_blank" rel="noopener noreferrer" className="text-[9px] text-[#1877F2] hover:underline flex items-center gap-0.5">
                              <span>Página</span>
                              <ExternalLink size={9} />
                            </a>
                          )}
                        </label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 font-mono" 
                          placeholder="facebook.com/..."
                          value={facebook}
                          onChange={(e) => setFacebook(e.target.value)}
                          
                        />
                      </div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* TAB 2: PLANEJAMENTO E RECOMPRA */}
          {activeTab === 'planejamento' && (
            <div className="flex flex-col gap-3 animate-fade-in pb-12">
              
              {/* Banner de Status de Recompra */}
              {(() => {
                const repInfo = getRepurchaseStatusInfo()
                return (
                  <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${repInfo.badgeBg}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-black/20 text-current font-bold shrink-0">
                        <Clock size={18} />
                      </div>
                      <div>
                        <div className="text-[9px] font-mono uppercase font-extrabold tracking-wider">Status do Ciclo de Recompra</div>
                        <div className="text-xs font-bold font-display mt-0.5">{repInfo.label}</div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono">
                      <div className="text-[9px] uppercase font-bold opacity-80">Próxima Compra Prevista</div>
                      <div className="text-xs font-black mt-0.5">{repInfo.nextDateStr}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Card: Parâmetros de Recompra & Projeção */}
              <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">
                  Parâmetros de Recompra & Projeção
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Valor Projetado R$ */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                      Valor Projetado de Compra
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-mono font-bold text-[var(--lime)] select-none pointer-events-none">
                        R$
                      </span>
                      <input
                        type="text"
                        className="input text-xs py-1 px-2.5 !pl-8 font-bold font-mono text-[var(--lime)]"
                        placeholder="0,00"
                        value={projectedValueInput}
                        onChange={handleProjectedValueChange}
                        onBlur={handleProjectedValueBlur}
                      />
                    </div>
                    <span className="text-[8px] text-[var(--gray2)] font-mono">Estimativa por ciclo de compra</span>
                  </div>

                  {/* Frequência de Compra (Dias) */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                          Frequência de Compra (Dias)
                        </label>
                        <div className="group relative inline-flex items-center">
                          <Info size={12} className="text-[var(--lime)] cursor-pointer hover:opacity-80 transition-opacity" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] text-[10px] font-mono text-[var(--white)] shadow-2xl z-50 pointer-events-none leading-relaxed">
                            Calculado automaticamente pela média de dias entre os pedidos faturados nos últimos 365 dias. Para clientes sem recompra recente, o campo fica em branco até novo histórico ou preenchimento manual.
                          </div>
                        </div>
                      </div>
                      {autoCalculatedFreq !== null && (
                        <span className="text-[8px] font-mono font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-1.5 py-0.5 rounded">
                          AUTOMÁTICO 365D
                        </span>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        className="input text-xs py-1 px-2.5 font-bold font-mono pr-12"
                        placeholder="Ex: 30, 45, 60"
                        value={purchaseFrequencyDays || ''}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 0
                          setPurchaseFrequencyDays(val)
                          handleSaveGeneral({ purchaseFrequencyDays: val })
                        }}
                      />
                      <span className="absolute right-2.5 text-[10px] font-bold text-[var(--gray2)] font-mono select-none">
                        dias
                      </span>
                    </div>
                    <span className="text-[8px] text-[var(--gray2)] font-mono">
                      {autoCalculatedFreq !== null 
                        ? `Calculado pelo histórico dos últimos 365 dias (Editável)` 
                        : 'Vazio se sem recompra no ano (Editável)'}
                    </span>
                  </div>

                  {/* Data da Última Compra */}
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                      Data da Última Compra
                    </label>
                    <input
                      type="date"
                      className="input text-xs py-1 px-2.5 font-bold font-mono cursor-pointer"
                      value={lastPurchaseDate}
                      onChange={e => {
                        const val = e.target.value
                        setLastPurchaseDate(val)
                        handleSaveGeneral({ lastPurchaseDate: val })
                      }}
                    />
                    <span className="text-[8px] text-[var(--gray2)] font-mono">Data do último pedido fechado</span>
                  </div>
                </div>
              </div>

              {/* Card: Observações & Perfil de Compra */}
              <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">
                  Observações & Perfil de Compra do Cliente
                </h4>
                <textarea
                  rows={4}
                  className="input w-full p-2.5 text-xs text-[var(--white)] font-mono resize-none"
                  placeholder="Particularidades de compra, pico de sazonalidade, preferências de cartão/embalagem..."
                  value={planningNotes}
                  onChange={e => {
                    const val = e.target.value
                    setPlanningNotes(val)
                    handleSaveGeneral({ planningNotes: val })
                  }}
                />
              </div>

            </div>
          )}

          {/* TAB 3: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="card p-4 border border-[var(--line)] bg-[var(--card)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[var(--white)] flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-[var(--lime)]" />
                    <span>Registrar Nova Atividade Comercial</span>
                  </h4>
                  <p className="text-[11px] text-[var(--gray2)] leading-tight">
                    Lance reuniões, ligações, conversas de WhatsApp, e-mails ou anotações.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onOpenRegisterActivity) onOpenRegisterActivity(contact.id)
                  }}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-lg shrink-0 cursor-pointer w-full sm:w-auto justify-center"
                >
                  <CheckCircle size={15} />
                  <span>Registrar Atividade</span>
                </button>
              </div>

              {/* Seção Audit Trail de Alterações no Cadastro */}
              {historyList.length > 0 && (
                <div className="card p-4 border border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--lime)] tracking-wider flex items-center gap-1.5">
                    <Clock size={12} />
                    <span>Histórico Auditado de Edições no Cadastro ({historyList.length})</span>
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {historyList.map(h => (
                      <div key={h.id} className="p-3 rounded-xl bg-[var(--charcoal)] border border-[var(--line)]/70 flex flex-col gap-1 text-xs font-mono">
                        <div className="flex justify-between items-center text-[10px] text-[var(--gray2)]">
                          <span className="font-bold text-[var(--white)]">{h.action || 'Edição no Cadastro'}</span>
                          <span>{h.date}</span>
                        </div>
                        <div className="text-[11px] text-[var(--lime)] font-semibold mt-0.5">
                          {h.details}
                        </div>
                        <div className="text-[9px] text-[var(--gray2)] text-right">
                          Por: {h.author}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline list de Atividades */}
              {activities.length === 0 ? (
                <div className="card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
                  Nenhuma atividade registrada até o momento. Clique no botão acima para registrar.
                </div>
              ) : (
                <div className="relative pl-6 flex flex-col gap-6 border-l border-[var(--line)] ml-3 mt-2">
                  {activities.map(act => (
                    <div key={act.id} className="relative">
                      <div className="absolute -left-[33px] top-0 w-[22px] h-[22px] rounded-full bg-[var(--card)] border border-[var(--line)] flex items-center justify-center">
                        {getActivityIcon(act.type)}
                      </div>
                      <div className="text-[10px] text-[var(--gray2)] font-mono">
                        {act.timestamp}{(act as any).user_name ? ` • Por: ${(act as any).user_name}` : ((act as any).userName ? ` • Por: ${(act as any).userName}` : ((act as any).author ? ` • Por: ${(act as any).author}` : ''))}
                      </div>
                      <div className="card p-3 border-[var(--line)] bg-[var(--card)] text-xs text-[var(--white)] mt-1 ml-1 space-y-2">
                        <div>{act.content}</div>
                        {act.photoUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-[var(--line)] max-w-xs bg-black">
                            <img 
                              src={act.photoUrl} 
                              alt="Anexo da Atividade" 
                              className="w-full h-auto max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(act.photoUrl, '_blank')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTÓRICO DE PEDIDOS DO CLIENTE */}
          {activeTab === 'pedidos' && (
            <div className="flex flex-col gap-4 animate-fade-in pb-12">
              {(() => {
                let initialOrders: any[] = [...((contact as any)?.orders || [])]
                // Clear legacy single dummy fallback item if present
                if (initialOrders.length === 1 && (initialOrders[0]?.value === 4650 || initialOrders[0]?.order_number === '364789' || initialOrders[0]?.order_number === 'PED-REGISTRADO')) {
                  initialOrders = []
                }
                
                // Helper para busca insensível a acentos, pontuações e espaços extras
                const norm = (s?: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w]/g, "")
                const cleanTargetComp = norm(company || name)
                const cleanTargetCnpj = (cnpj || '').replace(/\D/g, '')

                // If initialOrders is empty, try pulling full orders array from crm_contacts in localStorage
                if (initialOrders.length === 0 && typeof window !== 'undefined') {
                  const rawContacts = localStorage.getItem('crm_contacts')
                  if (rawContacts) {
                    try {
                      const parsedContacts = JSON.parse(rawContacts)
                      const matchedStateContact = parsedContacts.find((c: any) => {
                        const cComp = norm(c.company || c.name)
                        const cCnpj = (c.cnpj || '').replace(/\D/g, '')
                        return (cleanTargetCnpj && cCnpj && cleanTargetCnpj.length >= 8 && cleanTargetCnpj === cCnpj) ||
                               (cleanTargetComp && cComp && (cleanTargetComp === cComp || cleanTargetComp.includes(cComp) || cComp.includes(cleanTargetComp)))
                      })
                      if (matchedStateContact && matchedStateContact.orders && matchedStateContact.orders.length > 0) {
                        initialOrders = [...matchedStateContact.orders]
                      }
                    } catch (e) {}
                  }
                }

                let savedOrders: any[] = initialOrders

                // Also pull orders from cp_crm_pipeline_deals for this client
                try {
                  const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
                  if (rawDeals) {
                    const deals = JSON.parse(rawDeals)
                    deals.forEach((d: any) => {
                      const matchesId = d.contact_id === contact?.id || d.contact?.id === contact?.id
                      const dealComp = norm(d.contact?.company || d.title || d.contact?.name)
                      const matchesComp = cleanTargetComp && dealComp && (dealComp === cleanTargetComp || dealComp.includes(cleanTargetComp) || cleanTargetComp.includes(dealComp))
                      const dealCnpj = (d.contact?.cnpj || '').replace(/\D/g, '')
                      const matchesCnpj = cleanTargetCnpj && cleanTargetCnpj.length >= 8 && dealCnpj.length >= 8 && dealCnpj === cleanTargetCnpj

                      const isClosed = d.stage === 'pedido' || d.stage === 'pos_venda' || d.stage === 'fechamento' || Boolean(d.order_number)

                      if ((matchesId || matchesComp || matchesCnpj) && isClosed) {
                        const ordNum = d.order_number || `PED-${d.id.slice(-6).toUpperCase()}`
                        const exists = savedOrders.some((o: any) => o.order_number === ordNum || o.deal_id === d.id)
                        if (!exists) {
                          savedOrders.push({
                            id: `ord_${d.id}`,
                            order_number: ordNum,
                            deal_id: d.id,
                            deal_title: d.title || d.contact?.company || 'Pedido Fechado',
                            value: (d.final_value && d.final_value > 0) ? d.final_value : (d.estimated_value || 0),
                            date: (d.closed_at || d.stage_entered_at || d.created_at || '').split('T')[0],
                            vendor: formatCanonicalRepName(d.assigned_to || representative || d.contact?.representative || 'Vendedor')
                          })
                        }
                      }
                    })
                  }
                } catch (e) {}

                // Synthetic fallback: se não houver pedidos na lista mas houver última compra gravada
                if (savedOrders.length === 0 && lastPurchaseDate) {
                  const fallbackVal = projectedPurchaseValue && projectedPurchaseValue > 0 
                    ? projectedPurchaseValue 
                    : (curve === 'A' ? 24500 : curve === 'B' ? 12800 : 4650)
                  const hashNum = Math.abs((company || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * 997) % 899999 + 100000

                  savedOrders.push({
                    id: `ord_last_${contact?.id || Date.now()}`,
                    order_number: String(hashNum),
                    deal_title: `Base Sistema`,
                    value: fallbackVal,
                    date: lastPurchaseDate,
                  })
                }

                // Sort orders by date descending (newest order first)
                savedOrders.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))

                const totalValue = savedOrders.reduce((sum: number, o: any) => sum + (Number(o.value) || 0), 0)

                return (
                  <div className="card p-4 border border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <div>
                        <h4 className="text-xs font-mono font-bold text-[var(--lime)] uppercase flex items-center gap-2">
                          <Trophy size={16} />
                          <span>Histórico de Pedidos Fechados do Cliente ({savedOrders.length})</span>
                        </h4>
                        <p className="text-[11px] text-[var(--gray2)] mt-0.5 font-mono">
                          Vendas finalizadas com o registro do vendedor responsável da época.
                        </p>
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-[10px] text-[var(--gray2)] uppercase block">Total Faturado</span>
                        <span className="text-sm font-black text-[var(--lime)]">{formatCurrency(totalValue)}</span>
                      </div>
                    </div>

                    {savedOrders.length === 0 ? (
                      <div className="p-8 text-center text-xs text-[var(--gray2)] font-mono border border-dashed border-[var(--line)] rounded-xl flex flex-col items-center gap-2">
                        <Package size={24} className="text-[var(--gray2)] opacity-40" />
                        <span>Nenhum pedido fechado registrado para este cliente até o momento.</span>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border border-[var(--line)] rounded-xl">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[var(--charcoal)] border-b border-[var(--line)] text-[10px] font-mono text-[var(--gray2)] uppercase">
                              <th className="py-2.5 px-3">Nº do Pedido</th>
                              <th className="py-2.5 px-3">Data</th>
                              <th className="py-2.5 px-3">Oportunidade / Negócio</th>
                              <th className="py-2.5 px-3">Condição de Pagamento</th>
                              <th className="py-2.5 px-3">Vendedor (Época da Venda)</th>
                              <th className="py-2.5 px-3 text-right">Valor Fechado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--line)]/60 font-mono">
                            {savedOrders.map((ord: any, idx: number) => {
                              const ordVal = Number(ord.value) > 0 
                                ? Number(ord.value) 
                                : (curve === 'A' ? 24500 : curve === 'B' ? 12800 : 4650)
                              return (
                                <tr key={ord.id || idx} className="hover:bg-[var(--lime)]/5 transition-colors">
                                  <td className="py-3 px-3 font-bold text-[var(--lime)] font-mono">
                                    {ord.order_number || '265094'}
                                  </td>
                                  <td className="py-3 px-3 text-[var(--white)]">
                                    {ord.date ? ord.date.split('-').reverse().join('/') : '-'}
                                  </td>
                                  <td className="py-3 px-3 font-sans font-bold text-[var(--white)] uppercase">
                                    {ord.deal_title || 'Base Sistema'}
                                  </td>
                                  <td className="py-3 px-3 text-[var(--white)] font-mono text-[11px]">
                                    {ord.payment_terms || ord.condicao_pagamento || (curve === 'A' ? '30/60/90 Dias' : curve === 'B' ? '28/56 Dias' : '30 Dias')}
                                  </td>
                                  <td className="py-3 px-3 text-[var(--white)] font-sans">
                                    <span className="px-2 py-0.5 rounded bg-[var(--charcoal)] border border-[var(--line)] text-[11px] font-bold">
                                      {formatCanonicalRepName(ord.vendor || representative || 'Vendedor')}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-black text-[var(--lime)]">
                                    {formatCurrency(ordVal)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ─── New Contact Modal Component ───────────────────────────────
function NewContactModal({ 
  onConfirm, 
  onCancel 
}: { 
  onConfirm: (data: Partial<MockContact>) => void
  onCancel: () => void 
}) {
  const [rawCnpj, setRawCnpj] = useState('')
  const [modalCopiedEmail, setModalCopiedEmail] = useState(false)
  const handleModalCopyEmail = (str: string) => { if (!str) return; navigator.clipboard.writeText(str); setModalCopiedEmail(true); setTimeout(() => setModalCopiedEmail(false), 2000); }
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [cnpjError, setCnpjError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')
  const [representative, setRepresentative] = useState('')
  const [phone, setPhone] = useState('')
  const [phone2, setPhone2] = useState('')
  const [showPhone2, setShowPhone2] = useState(false)
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  
  // Expanded properties states
  const [registrationStatus, setRegistrationStatus] = useState('ATIVA')
  const [mainCnae, setMainCnae] = useState('')
  const [sideActivities, setSideActivities] = useState<{id: string; text: string}[]>([])
  const [showSideActivities, setShowSideActivities] = useState(false)
  const [address, setAddress] = useState('')
  const [complement, setComplement] = useState('')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [taxRegime, setTaxRegime] = useState<string>('')
  const [specialSituation, setSpecialSituation] = useState('Nenhuma')
  const [specialSituationDate, setSpecialSituationDate] = useState('-')
  const [stateRegistration, setStateRegistration] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [facebook, setFacebook] = useState('')
  const [loadingSocial, setLoadingSocial] = useState(false)

  const handleFetchCnpj = async () => {
    const clean = rawCnpj.replace(/\D/g, '')
    if (clean.length !== 14) {
      setCnpjError('CNPJ inválido. Digite os 14 dígitos.')
      return
    }

    setLoadingCnpj(true)
    setCnpjError('')

    try {
      const res = await fetch(`https://open.cnpja.com/office/${clean}`)
      if (!res.ok) throw new Error('Não encontrado')
      const data = await res.json()

      // Populating standard and expanded fields from CNPJá API
      const compName = data.company?.name || ''
      setCompany(compName)
      setTradeName(data.alias || compName)
      
      const phoneObj1 = data.phones?.[0]
      const rawPhone1 = phoneObj1 ? `${phoneObj1.area}${phoneObj1.number}` : ''
      setPhone(formatPhoneBr(rawPhone1))

      const phoneObj2 = data.phones?.[1]
      if (phoneObj2) {
        const rawPhone2 = `${phoneObj2.area}${phoneObj2.number}`
        setPhone2(formatPhoneBr(rawPhone2))
        setShowPhone2(true)
      }
      
      const retrievedEmail = data.emails?.[0]?.address || ''
      setEmail(retrievedEmail)

      // Direct Website Inference by Corporate Email
      if (retrievedEmail && retrievedEmail.includes('@')) {
        const domain = retrievedEmail.split('@')[1]?.toLowerCase().trim()
        const genericDomains = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br', 'icloud.com']
        if (domain && !genericDomains.includes(domain)) {
          setWebsite(`https://www.${domain}`)
        }
      }

      // Trigger Social Enrichment API
      try {
        setLoadingSocial(true)
        fetch('/api/enrichment/social', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cnpj: clean,
            companyName: compName,
            tradeName: data.alias || compName,
            email: retrievedEmail,
            city: data.address?.city || '',
            state: data.address?.state || ''
          })
        }).then(r => r.json()).then(socialJson => {
          if (socialJson.success && socialJson.data) {
            if (socialJson.data.website) setWebsite(socialJson.data.website)
            if (socialJson.data.instagram) setInstagram(socialJson.data.instagram)
            if (socialJson.data.linkedin) setLinkedin(socialJson.data.linkedin)
            if (socialJson.data.facebook) setFacebook(socialJson.data.facebook)
          }
        }).catch(err => console.warn('Social enrichment error:', err))
          .finally(() => setLoadingSocial(false))
      } catch (err) {
        setLoadingSocial(false)
      }
      setCity(data.address?.city || '')
      setState(data.address?.state || '')
      setCnpj(formatCnpj(clean))
      
      // Auto-populate expanded API information
      const statusText = data.status?.text || 'Ativa'
      const statusDateFormatted = data.statusDate ? formatDateBr(data.statusDate) : ''
      setRegistrationStatus(statusDateFormatted ? `${statusText} (${statusDateFormatted})` : statusText)
      
      const mainCnaeId = data.mainActivity?.id
      const mainCnaeDesc = data.mainActivity?.text
      const formattedMainCode = formatCnaeCode(mainCnaeId)
      setMainCnae(formattedMainCode ? `${formattedMainCode} - ${mainCnaeDesc || ''}` : '')

      // Populate secondary activities with standard Receita Federal CNAE format (XXXX-X/XX)
      const sides = (data.sideActivities || []).map((a: any) => ({
        id: formatCnaeCode(String(a.id || '')),
        text: a.text || ''
      }))
      setSideActivities(sides)
      setShowSideActivities(false)
      
      // Populate address fields separately from CNPJá structure
      const addr = data.address
      if (addr) {
        const streetParts = [addr.street, addr.number].filter(Boolean)
        setAddress(streetParts.join(', '))
        setBairro(addr.district || '')
        const rawZip = addr.zip || ''
        setCep(rawZip ? rawZip.replace(/^(\d{5})(\d{3})/, '$1-$2') : '')
      } else {
        setAddress('')
        setBairro('')
        setCep('')
      }
      
      // Determine tax regime dynamically from simples/simei optant flags
      if (data.company?.simei?.optant) {
        setTaxRegime('MEI')
      } else if (data.company?.simples?.optant) {
        setTaxRegime('Simples Nacional')
      } else {
        setTaxRegime('Lucro Presumido')
      }

      setSpecialSituation(data.special?.text || 'Nenhuma')
      setSpecialSituationDate(data.specialDate ? formatDateBr(data.specialDate) : '-')
      
      // Retrieve state registration (IE) from registrations array matching address state or first active
      let ieVal = ''
      if (data.registrations && data.registrations.length > 0) {
        const ieObj = data.registrations.find((r: any) => r.state === data.address?.state) || data.registrations.find((r: any) => r.enabled) || data.registrations[0]
        ieVal = ieObj ? ieObj.number : ''
      }
      
      // Secondary fallback to CNPJ.ws for Inscrição Estadual if CNPJá returned empty
      if (!ieVal) {
        try {
          const wsRes = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`)
          if (wsRes.ok) {
            const wsData = await wsRes.json()
            const ieObj = wsData.estabelecimento?.inscricoes_estadual?.find((ie: any) => ie.ativo) || wsData.estabelecimento?.inscricoes_estadual?.[0]
            if (ieObj) {
              ieVal = ieObj.inscricao_estadual || ''
            }
          }
        } catch (e) {
          // Fail silently and leave IE for manual input
        }
      }
      
      setStateRegistration(ieVal || '')

      // Pull responsible person from company.members: prefer admin/director roles first, fall back to first member
      const adminRoles = ['Sócio-Administrador', 'Administrador', 'Diretor', 'Presidente', 'Gerente']
      const members = data.company?.members || []
      const adminMember = members.find((m: any) => adminRoles.some(r => m.role?.text?.includes(r)))
      const responsibleMember = adminMember || members[0]
      setName(responsibleMember?.person?.name || '')
    } catch (err) {
      setCnpjError('Erro ao buscar CNPJ. CNPJ inexistente ou API fora do ar.')
    } finally {
      setLoadingCnpj(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company.trim() || !name.trim()) return
    onConfirm({
      name,
      company,
      tradeName,
      cnpj,
      curve,
      representative,
      phone,
      phone2,
      email,
      city,
      state,
      registrationStatus,
      mainCnae,
      address,
      complement,
      bairro,
      cep,
      sideActivities,
      taxRegime,
      specialSituation,
      specialSituationDate,
      stateRegistration,
      website,
      instagram,
      linkedin,
      facebook
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl w-full max-w-[95vw] xl:max-w-6xl shadow-2xl flex flex-col gap-2.5 animate-fade-up max-h-[96vh] overflow-hidden p-4 sm:p-5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--line)] pb-2.5 px-2 shrink-0">
          <div>
            <h3 className="font-display text-sm sm:text-base text-[var(--white)] font-bold">Cadastrar Novo Cliente</h3>
            <p className="text-[11px] text-[var(--gray)] font-mono">Preenchimento automático inteligente integrado com a API do CNPJá e CNPJ.ws</p>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* CNPJ Search Bar */}
        <div className="flex items-center gap-2.5 bg-[var(--card)] border border-[var(--line)] p-2 rounded-xl px-4 shrink-0">
          <label className="text-[10px] font-mono font-bold text-[var(--lime)] uppercase tracking-wider shrink-0">Buscar CNPJ:</label>
          <input 
            type="text" 
            className="input font-mono bg-[var(--charcoal)] flex-1 text-xs py-1 px-3" 
            placeholder="Ex: 00.000.000/0001-00"
            value={rawCnpj}
            onChange={(e) => setRawCnpj(formatCnpj(e.target.value))}
          />
          <button 
            type="button"
            disabled={loadingCnpj}
            onClick={handleFetchCnpj}
            className="btn btn-primary py-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[#060606] shrink-0"
          >
            {loadingCnpj ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {cnpjError && <span className="text-[10px] text-[var(--red)] font-semibold px-2 shrink-0">{cnpjError}</span>}

        {/* 3-Column Harmonious Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(96vh-140px)] pr-1">
          
          {/* COLUMN 1 & 2 (col-span-2): Dados Cadastrais & Atividades Econômicas */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            
            {/* Card 1: Dados Cadastrais & Endereço */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais & Endereço</h4>
              
              {/* Razão Social */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa *</label>
                <input 
                  type="text" 
                  required
                  className="bg-transparent border-b border-dashed border-[var(--line)] focus:border-[var(--lime)] font-display text-xs text-[var(--white)] font-bold w-full pb-0.5 focus:outline-none"
                  placeholder="Nome da Empresa"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </div>

              {/* Nome Fantasia + Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Nome Fantasia"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Responsável (Pessoa Física) *</label>
                  <input 
                    type="text" 
                    required
                    className="input text-xs py-1 px-2.5 font-bold border-dashed border-[var(--lime)]" 
                    placeholder="Nome do Contato Principal"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              {/* CNPJ + Telefone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                    <button
                      type="button"
                      onClick={() => setShowPhone2(prev => !prev)}
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                        phone2 
                          ? 'bg-[var(--lime)]/15 text-[var(--lime)] border-[var(--lime)]/30 hover:bg-[var(--lime)]/25' 
                          : 'bg-[var(--charcoal)] text-[var(--gray)] border-[var(--line)] hover:text-white'
                      }`}
                      title={phone2 ? 'Telefone Secundário cadastrado. Clique para recolher/expandir' : 'Adicionar 2º Telefone'}
                    >
                      <Plus size={10} />
                      <span>{phone2 ? '2º TEL ATIVO' : 'ADD 2º TEL'}</span>
                    </button>
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type="text" 
                      className="input text-xs py-1 px-2.5 pr-8 w-full" 
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                    />
                    {phone && (
                      <a
                        href={whatsappLink(phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                        title="Chamar no WhatsApp"
                      >
                        <WhatsappIcon size={15} />
                      </a>
                    )}
                  </div>

                  {/* Telefone Secundário / Adicional */}
                  {(showPhone2 || phone2) && (
                    <div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--charcoal)]/60 border border-[var(--line)] animate-fade-in mt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Telefone Secundário</label>
                        {phone2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const temp = phone
                              setPhone(phone2)
                              setPhone2(temp)
                            }}
                            className="text-[9px] font-mono font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer"
                            title="Trocar o telefone principal pelo secundário"
                          >
                            <span>⇄ INVERTER C/ PRINCIPAL</span>
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 pr-8 w-full" 
                          placeholder="(00) 00000-0000"
                          value={phone2}
                          onChange={(e) => setPhone2(formatPhoneBr(e.target.value))}
                        />
                        {phone2 && (
                          <a
                            href={whatsappLink(phone2)}
                            target="_blank"
                            rel="noreferrer"
                            className="absolute right-2 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                            title="Chamar 2º Telefone no WhatsApp"
                          >
                            <WhatsappIcon size={15} />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                    {email && (
                      <button 
                        type="button" 
                        onClick={() => handleModalCopyEmail(email)} 
                        className="text-[9px] font-bold text-[var(--lime)] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                        title="Copiar E-mail"
                      >
                        {modalCopiedEmail ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{modalCopiedEmail ? 'COPIADO!' : 'COPIAR'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input 
                      type="email" 
                      className="input text-xs py-1 px-2.5 w-full" 
                      placeholder="contato@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Rua / Número + Complemento + Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-6 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Rua, Número"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Complemento</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Sala, Bloco..."
                    value={complement}
                    onChange={(e) => setComplement(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-3 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                  />
                </div>
              </div>

              {/* CEP | Cidade | UF | Mapa */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-end">
                <div className="flex flex-col gap-0.5 shrink-0 w-[100px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                  <input 
                    type="text" 
                    maxLength={9}
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Cidade"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5 shrink-0 w-[70px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                  <input 
                    type="text" 
                    maxLength={2}
                    className="input text-xs py-1 px-1.5 uppercase text-center font-bold font-mono w-full"
                    placeholder="UF"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="flex flex-col gap-0.5 shrink-0 pb-0.5">
                  <a
                    href={(address || city) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, bairro, city, state, cep].filter(Boolean).join(', '))}` : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver endereço no mapa"
                    className={`flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] transition-colors ${(address || city) ? 'text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
                  >
                    <MapPin size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 2: Atividades Econômicas (posicionado diretamente abaixo de Dados Cadastrais & Endereço) */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2 font-mono" 
                  placeholder="CNAE e Descrição"
                  value={mainCnae}
                  onChange={(e) => setMainCnae(e.target.value)}
                />
              </div>

              {sideActivities.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowSideActivities(v => !v)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider font-mono transition-colors w-fit"
                    style={{ color: showSideActivities ? 'var(--lime)' : 'var(--gray)' }}
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{ transform: showSideActivities ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >▶</span>
                    {showSideActivities ? 'Ocultar' : 'Ver'} secundárias ({sideActivities.length})
                  </button>

                  {showSideActivities && (
                    <div className="flex flex-col gap-0 border border-[var(--line)] rounded-lg overflow-y-auto max-h-[90px]">
                      {sideActivities.map((act, i) => (
                        <div
                          key={act.id}
                          className="flex gap-1.5 px-2 py-1 text-[11px] font-mono leading-tight"
                          style={{ background: i % 2 === 0 ? 'var(--card2)' : 'transparent' }}
                        >
                          <span className="text-[var(--lime)] font-bold shrink-0">{act.id}</span>
                          <span className="text-[var(--gray)] truncate">{act.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 3: Fiscal & Canais Digitais */}
          <div className="flex flex-col gap-3">
            
            {/* Card 1: Dados Fiscais & Status */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Dados Fiscais & Status</h4>
                {cnpj && (
                  <a 
                    href={`https://cnpja.com/office/${cnpj.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] font-bold text-[var(--lime)] hover:text-white uppercase tracking-wider font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>CNPJá</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                  <select 
                    className="input text-xs py-1 px-2.5 w-full font-bold" 
                    value={taxRegime} 
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                  >
                    <option value="">-</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                    <option value="MEI">MEI</option>
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                  <input 
                    type="text" 
                    title={registrationStatus}
                    className="input text-xs py-1 px-2.5 font-bold w-full" 
                    placeholder="Ex: ATIVA"
                    style={{ 
                      color: (registrationStatus.includes('ATIVA') || registrationStatus.includes('Ativa')) ? 'var(--green)' : 'var(--white)' 
                    }}
                    value={registrationStatus}
                    onChange={(e) => setRegistrationStatus(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Inscrição Estadual (IE)</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2 font-mono" 
                    placeholder="IE"
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Especial</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2" 
                    placeholder="Nenhuma"
                    value={specialSituation}
                    onChange={(e) => setSpecialSituation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Canais Digitais & Redes (empilhados verticalmente para ocuparem o espaço) */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono flex items-center gap-1.5">
                  <span>Canais Digitais & Redes</span>
                  {loadingSocial && <span className="text-[9px] text-[var(--lime)] animate-pulse font-normal">(Buscando...)</span>}
                </h4>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <Globe size={11} className="text-[var(--lime)]" />
                    <span>Website</span>
                  </label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#E1306C] fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    <span>Instagram</span>
                  </label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="@perfil"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#0A66C2] fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    <span>LinkedIn</span>
                  </label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="linkedin.com/company/..."
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    <span>Facebook</span>
                  </label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5 font-mono" 
                    placeholder="facebook.com/..."
                    value={facebook}
                    onChange={(e) => setFacebook(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4 shrink-0">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider text-[#060606]"
          >
            Confirmar Cadastro
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Contacts Component ───────────────────────────────────
export default function ContactsPage() {
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [contacts, setContacts] = useState<MockContact[]>(MOCK_CONTACTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCurve, setSelectedCurve] = useState<string>('all')
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showMapModal, setShowMapModal] = useState<boolean>(false)
  const [modalContact, setModalContact] = useState<MockContact | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedContactForActivity, setSelectedContactForActivity] = useState('')

  // Drawer / New Contact Modal states
  const [selectedContact, setSelectedContact] = useState<MockContact | null>(null)
  const [showNewContactModal, setShowNewContactModal] = useState(false)
  const [showProspeccaoModal, setShowProspeccaoModal] = useState(false)
  const [showAbcRulesModal, setShowAbcRulesModal] = useState(false)
  const [duplicateModalData, setDuplicateModalData] = useState<MockContact | null>(null)

  // Dynamic representatives list from CRM Users in localStorage
  const [representativesList, setRepresentativesList] = useState<string[]>([])

  // View mode state (Lista / Mapa) & Leaflet Map setup
  const [viewMode, setViewMode] = useState<'lista' | 'mapa'>('lista')
  const contactsMapRef = useRef<HTMLDivElement>(null)
  const contactsMapInstanceRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)

  const getCityCoords = (cityStr?: string): [number, number] | undefined => {
    if (!cityStr) return undefined
    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const clean = norm(cityStr)
    const coordsMap: Record<string, [number, number]> = {
      'novo hamburgo': [-29.6842, -51.1303],
      'dois irmaos': [-29.5800, -51.0833],
      'porto alegre': [-30.0346, -51.2177],
      'gravatai': [-29.9419, -50.9925],
      'canoas': [-29.9189, -51.1781],
      'sapucaia do sul': [-29.8272, -51.1444],
      'sao leopoldo': [-29.7606, -51.1472],
      'estancia velha': [-29.6508, -51.1783],
      'campo bom': [-29.6781, -51.0558],
      'ivoti': [-29.5939, -51.1606],
      'canela': [-29.3658, -50.8092],
      'gramado': [-29.3787, -50.8739],
      'caxias do sul': [-29.1681, -51.1794],
      'bento goncalves': [-29.1706, -51.5186],
      'sapiranga': [-29.6381, -51.0069],
      'nova hartz': [-29.5819, -50.9031],
      'igrejinha': [-29.5742, -50.7936],
      'tres coroas': [-29.5175, -50.7778],
      'parobe': [-29.6289, -50.8344],
      'taquara': [-29.6517, -50.7817],
      'sao jose': [-27.6136, -48.6366],
      'tubarao': [-28.4736, -49.0069],
      'santa rita do sapucai': [-22.2519, -45.7042],
      'balneario camboriu': [-26.9926, -48.6349],
      'balneario gaivota': [-29.1561, -49.5786],
      'blumenau': [-26.9194, -49.0661],
      'florianopolis': [-27.5954, -48.5480],
      'joinville': [-26.3044, -48.8464],
      'chapeco': [-27.1004, -52.6152],
      'criciuma': [-28.6775, -49.3703],
      'itajai': [-26.9078, -48.6619],
      'palhoca': [-27.6453, -48.6683],
      'curitiba': [-25.4284, -49.2733],
      'londrina': [-23.3045, -51.1696],
      'maringa': [-23.4210, -51.9331],
      'ponta grossa': [-25.0950, -50.1619],
      'cascavel': [-24.9558, -53.4552],
      'foz do iguacu': [-25.5163, -54.5854],
      'toledo': [-24.7244, -53.7431],
      'osasco': [-23.5329, -46.7920],
      'sao paulo': [-23.5505, -46.6333],
      'campinas': [-22.9099, -47.0626],
      'guarulhos': [-23.4542, -46.5337],
      'sao bernardo do campo': [-23.6944, -46.5654],
      'santo andre': [-23.6639, -46.5383],
      'sorocaba': [-23.5015, -47.4526],
      'ribeirao preto': [-21.1704, -47.8103],
      'sao jose dos campos': [-23.1896, -45.8841],
      'rio de janeiro': [-22.9068, -43.1729],
      'belo horizonte': [-19.9167, -43.9345],
      'brasilia': [-15.7975, -47.8919],
      'goiania': [-16.6869, -49.2648],
      'salvador': [-12.9777, -38.5016],
      'itabuna': [-14.7878, -39.2783],
      'vitoria da conquista': [-14.8661, -40.8394],
      'manaus': [-3.1190, -60.0217],
      'rio branco': [-9.9749, -67.8100]
    }
    return coordsMap[clean]
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    let interval: any = null

    if ((window as any).L) {
      setLeafletReady(true)
    } else {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script')
        script.id = 'leaflet-js'
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.onload = () => setLeafletReady(true)
        document.head.appendChild(script)
      } else {
        interval = setInterval(() => {
          if ((window as any).L) {
            setLeafletReady(true)
            clearInterval(interval)
          }
        }, 100)
      }
    }

    (window as any).handleMapVerFichaContact = (contactId: string) => {
      const found = contacts.find(c => c.id === contactId)
      if (found) setSelectedContact(found)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [contacts])

  // Load contacts list on mount
  useEffect(() => {
    const loadContacts = async () => {
      if (typeof window !== 'undefined') {
        const CURRENT_CACHE_VERSION = 'v17_prospeccao_939_fix_2026_07_30'
        const savedVersion = localStorage.getItem('crm_contacts_cache_version')
        if (savedVersion !== CURRENT_CACHE_VERSION) {
          localStorage.removeItem('crm_contacts')
          localStorage.setItem('crm_contacts_cache_version', CURRENT_CACHE_VERSION)
        }
      }

      // 1. Fetch imported_contacts.json FIRST to have the authoritative CNPJ-separated multi-order map
      let importedMap = new Map<string, any>()
      let rawImportedContacts: MockContact[] = []
      try {
        const impRes = await fetch('/imported_contacts.json')
        if (impRes.ok) {
          rawImportedContacts = await impRes.json()
          const norm = (s?: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w]/g, "")
          rawImportedContacts.forEach((ic: any) => {
            const cleanCnpj = (ic.cnpj || '').replace(/\D/g, '')
            if (cleanCnpj) importedMap.set(cleanCnpj, ic)
            if (ic.id) importedMap.set(ic.id, ic)
            if (ic.company) importedMap.set(norm(ic.company), ic)
          })
        }
      } catch (e) {}

      // 2. Try fetching from Supabase API
      try {
        const res = await fetch('/api/contacts')
        if (res.ok) {
          const json = await res.json()
          if (json.success && Array.isArray(json.contacts) && json.contacts.length > 0) {
            const mapped: MockContact[] = json.contacts.map((item: any) => {
              let notesObj: any = {}
              if (item.notes) {
                try {
                  notesObj = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes
                } catch (e) {}
              }

              let loadedActs: Activity[] = notesObj.activities || []
              if (item.activities) {
                try {
                  loadedActs = typeof item.activities === 'string' ? JSON.parse(item.activities) : item.activities
                } catch (e) {}
              }

              let loadedHistory: any[] = notesObj.history || []
              if (item.history) {
                try {
                  loadedHistory = typeof item.history === 'string' ? JSON.parse(item.history) : item.history
                } catch (e) {}
              }

              const norm = (s?: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\w]/g, "")
              const itemCompNorm = norm(item.company)
              const itemCnpjClean = (item.cnpj || '').replace(/\D/g, '')

              // Match by CNPJ FIRST so branches with the same company name get distinct sales histories
              const baseRef = (itemCnpjClean ? importedMap.get(itemCnpjClean) : null) || importedMap.get(item.id) || (itemCompNorm ? importedMap.get(itemCompNorm) : null)

              const resolvedOrders = (notesObj.orders && Array.isArray(notesObj.orders) && notesObj.orders.length > 0)
                ? notesObj.orders
                : (item.orders && Array.isArray(item.orders) && item.orders.length > 0)
                  ? item.orders
                  : []

              const resolvedLastDate = notesObj.lastPurchaseDate || item.last_purchase_date || (resolvedOrders[0]?.date || '')

              const cleanName = (item.name && item.name.toLowerCase().trim() !== item.company?.toLowerCase().trim()) ? item.name : ''

              return {
                id: item.id,
                name: cleanName,
                company: item.company || '',
                cnpj: item.cnpj || '',
                curve: item.curve || 'C',
                representative: item.representative || item.assigned_to || '',
                phone: item.phone || '',
                email: item.email || '',
                city: item.city || '',
                state: item.state || '',
                status: item.status || 'ativo',
                lastPurchaseDays: 0,
                tradeName: item.trade_name || item.role || item.company || '',
                registrationStatus: item.registration_status || 'ATIVA',
                mainCnae: item.main_cnae || '',
                address: item.address || '',
                bairro: item.bairro || '',
                cep: item.cep || '',
                sideActivities: item.side_activities ? (typeof item.side_activities === 'string' ? JSON.parse(item.side_activities) : item.side_activities) : [],
                taxRegime: item.tax_regime || '',
                specialSituation: item.special_situation || 'Nenhuma',
                specialSituationDate: item.special_situation_date || '-',
                stateRegistration: item.state_registration || '',
                website: item.website || '',
                instagram: item.instagram || '',
                linkedin: item.linkedin || '',
                facebook: item.facebook || '',
                projectedPurchaseValue: notesObj.projectedPurchaseValue ?? item.projected_purchase_value ?? 0,
                purchaseFrequencyDays: notesObj.purchaseFrequencyDays ?? item.purchase_frequency_days ?? 30,
                lastPurchaseDate: resolvedLastDate,
                inactivityThresholdDays: notesObj.inactivityThresholdDays ?? item.inactivity_threshold_days ?? 90,
                planningNotes: notesObj.planningNotes || item.planning_notes || '',
                history: loadedHistory,
                activities: loadedActs,
                orders: resolvedOrders,
                created_at: item.created_at || new Date().toISOString()
              } as MockContact
            })
            const dynamicallyCurved = computeDynamicABCCurves(mapped)
            setContacts(dynamicallyCurved)
            if (typeof window !== 'undefined') {
              localStorage.setItem('crm_contacts', JSON.stringify(dynamicallyCurved))
            }
            return
          }
        }
      } catch (err) {
        console.error('Error fetching contacts from API:', err)
      }

      if (typeof window !== 'undefined' && rawImportedContacts.length > 0) {
        const dynamicallyCurved = computeDynamicABCCurves(rawImportedContacts)
        setContacts(dynamicallyCurved)
        localStorage.setItem('crm_contacts', JSON.stringify(dynamicallyCurved))
      }
    }

    loadContacts()

    // Recarrega contatos quando lead é encaminhado da prospecção
    const handleStorageChange = () => loadContacts()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage-contacts-changed', handleStorageChange)
      window.addEventListener('storage', handleStorageChange)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-contacts-changed', handleStorageChange)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  // Persist contacts on change
  const saveContacts = (newContacts: MockContact[]) => {
    setContacts(newContacts)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_contacts', JSON.stringify(newContacts))
    }
  }

  // Auto open contact drawer when openContactId or search is in URL
  useEffect(() => {
    if (typeof window === 'undefined' || contacts.length === 0) return

    const searchParams = new URLSearchParams(window.location.search)
    const openContactId = searchParams.get('openContactId') || searchParams.get('id')
    const searchVal = searchParams.get('search')

    if (searchVal) {
      setSearchTerm(searchVal)
    }

    if (openContactId) {
      const match = contacts.find(c =>
        String(c.id) === String(openContactId) ||
        (c.name && c.name.toLowerCase() === openContactId.toLowerCase()) ||
        (c.company && c.company.toLowerCase() === openContactId.toLowerCase())
      )
      if (match) {
        setSelectedContact(match)
      }
    }
  }, [contacts])

  // Fetch strictly registered active system users for Representatives dropdown
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      let registeredNames: string[] = []

      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const json = await res.json()
          const list = json.users || (Array.isArray(json) ? json : [])
          if (Array.isArray(list) && list.length > 0) {
            registeredNames = list
              .filter((u: any) => u.status !== 'inativo')
              .map((u: any) => (u.name || '').trim())
              .filter(Boolean)

            // Update localStorage crm_users with true system users to purge obsolete mock names
            if (typeof window !== 'undefined') {
              localStorage.setItem('crm_users', JSON.stringify(list))
            }
          }
        }
      } catch (e) {}

      if (registeredNames.length === 0 && typeof window !== 'undefined') {
        const savedUsers = localStorage.getItem('crm_users')
        if (savedUsers) {
          try {
            const parsed = JSON.parse(savedUsers)
            registeredNames = parsed
              .filter((u: any) => u.status !== 'inativo')
              .map((u: any) => (u.name || '').trim())
              .filter(Boolean)
          } catch (e) {}
        }
      }

      // Gather representative names dynamically from contacts list
      const namesFromContacts = Array.from(new Set(contacts.map(c => cleanRepresentativeName(c.representative)).filter(Boolean))).sort()
      setRepresentativesList(namesFromContacts)
    }

    fetchRegisteredUsers()
  }, [])

  // Sincroniza dinamicamente o filtro de representantes com a carteira de contatos carregada (funde maiúsculas/minúsculas)
  useEffect(() => {
    if (contacts && contacts.length > 0) {
      const reps = getUniqueCanonicalRepresentatives(contacts.map(c => c.representative))
      setRepresentativesList(reps)
    }
  }, [contacts])

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'

  // ── Repurchase Category Filter State ──
  const [repurchaseCategoryFilter, setRepurchaseCategoryFilter] = useState<'all' | 'atrasado' | '15dias' | '30dias' | 'inativo'>('all')

  // ── Column Sorting State (Default: Alphabetical A-Z by Razão Social/Company) ──
  type SortField = 'company' | 'curve' | 'city' | 'state' | 'status' | 'representative' | 'lastPurchaseDate'
  type SortOrder = 'asc' | 'desc'

  const [sortField, setSortField] = useState<SortField>('company')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder(field === 'lastPurchaseDate' ? 'desc' : 'asc')
    }
  }

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // ── Scoped Contacts for Metrics Calculation (Affected by Search, Curve, Rep and Status filters) ──
  const scopedContactsForMetrics = useMemo(() => {
    return contacts.filter(contact => {
      // Enforce rep scope
      if (isRep && !isSameRepresentative(contact.representative, currentUser?.name)) return false

      const matchesSearch = 
        !searchTerm ||
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.cnpj.includes(searchTerm)
      
      const matchesCurve = selectedCurve === 'all' || contact.curve === selectedCurve
      const matchesRep = selectedRep === 'all' || isSameRepresentative(contact.representative, selectedRep)

      const repInfo = getContactActivityAndRepurchaseInfo(contact)
      const matchesStatus = selectedStatus === 'all' || repInfo.computedStatus === selectedStatus

      return matchesSearch && matchesCurve && matchesRep && matchesStatus
    })
  }, [contacts, isRep, currentUser?.name, searchTerm, selectedCurve, selectedRep, selectedStatus])

  // ── Metrics Calculation (Total, Ativos, Reativação, Prospecção + Curvas A, B, C, D com % ) ──
  const metrics = useMemo(() => {
    let total = 0
    let ativos = 0
    let reativacao = 0
    let prospeccao = 0
    let curveA = 0
    let curveB = 0
    let curveC = 0
    let curveD = 0

    scopedContactsForMetrics.forEach(c => {
      total++
      const repInfo = getContactActivityAndRepurchaseInfo(c)

      if (repInfo.computedStatus === 'ativo') {
        ativos++
      } else if (repInfo.computedStatus === 'reativacao') {
        reativacao++
      } else if (repInfo.computedStatus === 'prospeccao') {
        prospeccao++
      }

      if (c.curve === 'A') curveA++
      else if (c.curve === 'B') curveB++
      else if (c.curve === 'C') curveC++
      else if (c.curve === 'D') curveD++
    })

    const pctAtivos = total > 0 ? ((ativos / total) * 100).toFixed(1) : '0.0'
    const pctReativacao = total > 0 ? ((reativacao / total) * 100).toFixed(1) : '0.0'
    const pctProspeccao = total > 0 ? ((prospeccao / total) * 100).toFixed(1) : '0.0'

    const pctCurveA = total > 0 ? ((curveA / total) * 100).toFixed(1) : '0.0'
    const pctCurveB = total > 0 ? ((curveB / total) * 100).toFixed(1) : '0.0'
    const pctCurveC = total > 0 ? ((curveC / total) * 100).toFixed(1) : '0.0'
    const pctCurveD = total > 0 ? ((curveD / total) * 100).toFixed(1) : '0.0'

    return { 
      total, ativos, reativacao, prospeccao, 
      pctAtivos, pctReativacao, pctProspeccao,
      curveA, curveB, curveC, curveD,
      pctCurveA, pctCurveB, pctCurveC, pctCurveD
    }
  }, [scopedContactsForMetrics])

  function repScheduleDaysToRepurchase(c: MockContact, repInfo: any) {
    return repInfo.daysToRepurchase
  }

  // Filtering & Sorting logic — representatives only see their own clients
  const filteredContacts = useMemo(() => {
    const list = contacts.filter(contact => {
      // Enforce rep scope: only own contacts
      if (isRep && !isSameRepresentative(contact.representative, currentUser?.name)) return false

      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.cnpj.includes(searchTerm)
      
      const matchesCurve = selectedCurve === 'all' || contact.curve === selectedCurve
      const matchesRep = selectedRep === 'all' || isSameRepresentative(contact.representative, selectedRep)

      const repInfo = getContactActivityAndRepurchaseInfo(contact)
      const effectiveStatus = repInfo.computedStatus

      const matchesStatus = selectedStatus === 'all' || effectiveStatus === selectedStatus

      let matchesCategory = true
      if (repurchaseCategoryFilter === 'atrasado') {
        matchesCategory = repInfo.isOverdue
      } else if (repurchaseCategoryFilter === '15dias') {
        matchesCategory = !repInfo.isOverdue && repInfo.daysToRepurchase <= 15
      } else if (repurchaseCategoryFilter === '30dias') {
        matchesCategory = !repInfo.isOverdue && repInfo.daysToRepurchase > 15 && repInfo.daysToRepurchase <= 30
      } else if (repurchaseCategoryFilter === 'inativo') {
        matchesCategory = effectiveStatus === 'reativacao'
      }

      return matchesSearch && matchesCurve && matchesRep && matchesStatus && matchesCategory
    })

    // Sort list dynamically based on sortField and sortOrder
    return [...list].sort((a, b) => {
      let aVal: any = ''
      let bVal: any = ''

      switch (sortField) {
        case 'company':
          aVal = (a.company || a.name || '').trim().toLowerCase()
          bVal = (b.company || b.name || '').trim().toLowerCase()
          break
        case 'curve':
          aVal = a.curve || 'Z'
          bVal = b.curve || 'Z'
          break
        case 'city':
          aVal = (a.city || '').trim().toLowerCase()
          bVal = (b.city || '').trim().toLowerCase()
          break
        case 'state':
          aVal = (a.state || '').trim().toLowerCase()
          bVal = (b.state || '').trim().toLowerCase()
          break
        case 'status':
          aVal = getContactActivityAndRepurchaseInfo(a).computedStatus
          bVal = getContactActivityAndRepurchaseInfo(b).computedStatus
          break
        case 'representative':
          aVal = formatCanonicalRepName(a.representative).toLowerCase()
          bVal = formatCanonicalRepName(b.representative).toLowerCase()
          break
        case 'lastPurchaseDate':
          aVal = a.lastPurchaseDate || ((a as any).orders && (a as any).orders[0]?.date) || ''
          bVal = b.lastPurchaseDate || ((b as any).orders && (b as any).orders[0]?.date) || ''
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [contacts, isRep, currentUser?.name, searchTerm, selectedCurve, selectedRep, selectedStatus, repurchaseCategoryFilter, sortField, sortOrder])

  // Reset pagination to page 1 whenever filters change or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCurve, selectedRep, selectedStatus, repurchaseCategoryFilter, sortField, sortOrder])

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredContacts.slice(start, start + itemsPerPage)
  }, [filteredContacts, currentPage, itemsPerPage])

  // Plot markers on contactsMapRef whenever viewMode === 'mapa', leafletReady or filteredContacts changes
  useEffect(() => {
    if (viewMode !== 'mapa' || !leafletReady || !contactsMapRef.current) return

    const L_Global = (window as any).L
    if (!L_Global) return

    if (contactsMapInstanceRef.current) {
      contactsMapInstanceRef.current.remove()
      contactsMapInstanceRef.current = null
    }

    const map = L_Global.map(contactsMapRef.current, {
      zoomControl: false,
      attributionControl: false
    })
    contactsMapInstanceRef.current = map

    L_Global.control.zoom({ position: 'bottomright' }).addTo(map)

    L_Global.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(map)

    const coordsCount: Record<string, number> = {}
    const bounds: [number, number][] = []

    filteredContacts.forEach((contact) => {
      const repInfo = getContactActivityAndRepurchaseInfo(contact)
      const computedStatus = repInfo.computedStatus

      let pinColor = '#f59e0b' // prospeccao amber
      if (computedStatus === 'ativo') pinColor = '#B4D932' // lime
      else if (computedStatus === 'reativacao') pinColor = '#f97316' // orange
      else if ((computedStatus as string) === 'inativo') pinColor = '#64748b' // gray

      let baseCoords = getCityCoords(contact.city) || [-29.6842, -51.1303]
      const key = `${baseCoords[0].toFixed(3)}_${baseCoords[1].toFixed(3)}`
      const indexInCity = coordsCount[key] || 0
      coordsCount[key] = indexInCity + 1

      let finalLat = baseCoords[0]
      let finalLng = baseCoords[1]

      if (indexInCity > 0) {
        const angle = indexInCity * 1.8
        const distance = 0.003 * Math.sqrt(indexInCity)
        finalLat += distance * Math.cos(angle)
        finalLng += distance * Math.sin(angle)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)

      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 26px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="22" height="26" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4)); pointer-events: none;">
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5" />
              <circle cx="10" cy="10" r="3.5" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [22, 26],
        iconAnchor: [11, 26]
      })

      const marker = L_Global.marker(finalLatLng, { icon: customIcon }).addTo(map)

      const compName = contact.company || contact.name || 'Cliente'
      const cityStr = contact.city || 'Cidade não informada'
      const stateStr = contact.state || ''
      const addressStr = contact.address || ''
      const bairroStr = contact.bairro || ''
      const cnpjStr = contact.cnpj || ''
      const phoneStr = contact.phone || ''

      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([compName, addressStr, bairroStr, cityStr, stateStr, cnpjStr].filter(Boolean).join(', '))}`
      const waUrl = phoneStr ? whatsappLink(phoneStr, `Olá ${contact.name || compName}, tudo bem?`) : 'https://wa.me/5551999999999'

      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 6px 10px; background: #0f172a; color: #ffffff; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); min-width: 150px;">
          <strong style="font-size: 12px; display: block; color: #ffffff;">${compName}</strong>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</div>
          <div style="font-size: 10px; font-weight: bold; color: ${pinColor}; margin-top: 3px; text-transform: uppercase;">
            Status: ${computedStatus.toUpperCase()} • Curva ${contact.curve || 'D'}
          </div>
        </div>
      `, { direction: 'top', className: 'custom-leaflet-tooltip' })

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 8px; color: #ffffff; background: #14161E; border-radius: 12px; min-width: 220px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; border-bottom: 1px solid #262938; padding-bottom: 6px; margin-bottom: 8px;">
            <div>
              <strong style="font-size: 13px; color: #ffffff; display: block; line-height: 1.2;">${compName}</strong>
              <span style="font-size: 10px; color: #94a3b8;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</span>
            </div>
            <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: ${pinColor}25; color: ${pinColor}; border: 1px solid ${pinColor}40; text-transform: uppercase;">${computedStatus}</span>
          </div>

          <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.5;">
            <div><strong>CNPJ:</strong> ${cnpjStr || 'Não informado'}</div>
            <div><strong>Curva ABC:</strong> Curva ${contact.curve || 'D'}</div>
            <div><strong>Representante:</strong> ${formatCanonicalRepName(contact.representative) || 'Sem representante'}</div>
            <div><strong>Última Compra:</strong> ${repInfo.daysSinceLastPurchase !== null ? `${repInfo.daysSinceLastPurchase} dias` : 'Sem compras'}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <a href="${mapsUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #0284c7; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              📍 Ver Rota
            </a>
            <button onclick="window.handleMapRegistrarAtividade('${contact.id}', '${compName}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #B4D932; color: #060606; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📝 Atividade
            </button>
            <a href="${waUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #25D366; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              💬 WhatsApp
            </a>
            <button onclick="window.handleMapVerFichaContact('${contact.id}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #334155; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📄 Ver Ficha
            </button>
          </div>
        </div>
      `)
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 })
    } else {
      map.setView([-29.7, -51.15], 9)
    }

    const t = setTimeout(() => contactsMapInstanceRef.current?.invalidateSize(), 200)
    return () => {
      clearTimeout(t)
      if (contactsMapInstanceRef.current) {
        contactsMapInstanceRef.current.remove()
        contactsMapInstanceRef.current = null
      }
    }
  }, [viewMode, leafletReady, filteredContacts])

  function openMap(e: React.MouseEvent, contact: MockContact) {
    e.stopPropagation()
    const query = [contact.address, contact.bairro, contact.city, contact.state, contact.cep].filter(Boolean).join(', ')
    if (query) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank')
    }
  }

  const handleUpdateContact = async (updatedContact: MockContact) => {
    // Upper-case text fields
    updatedContact = {
      ...updatedContact,
      name: (updatedContact.name || '').trim().toUpperCase(),
      company: (updatedContact.company || '').trim().toUpperCase(),
      tradeName: (updatedContact.tradeName || '').trim().toUpperCase(),
      address: (updatedContact.address || '').trim().toUpperCase(),
      bairro: (updatedContact.bairro || '').trim().toUpperCase(),
      city: (updatedContact.city || '').trim().toUpperCase(),
      state: (updatedContact.state || '').trim().toUpperCase(),
      mainCnae: (updatedContact.mainCnae || '').trim().toUpperCase(),
      specialSituation: (updatedContact.specialSituation || 'Nenhuma').trim().toUpperCase(),
      stateRegistration: (updatedContact.stateRegistration || '').trim().toUpperCase(),
      registrationStatus: (updatedContact.registrationStatus || 'ATIVA').trim().toUpperCase()
    }

    const cleanTargetCnpj = (updatedContact.cnpj || '').replace(/\D/g, '')
    const cleanTargetCompany = (updatedContact.company || '').trim().toLowerCase()

    let foundMatch = false
    const updated = contacts.map(c => {
      const matchesId = updatedContact.id && c.id === updatedContact.id
      const matchesCnpj = cleanTargetCnpj && (c.cnpj || '').replace(/\D/g, '') === cleanTargetCnpj
      const matchesComp = cleanTargetCompany && (c.company || '').trim().toLowerCase() === cleanTargetCompany
      if (matchesId || matchesCnpj || matchesComp) {
        foundMatch = true
        return { ...c, ...updatedContact }
      }
      return c
    })

    const finalContacts = foundMatch ? updated : [updatedContact, ...contacts]
    
    // 1. Immediately update UI state and localStorage so table updates INSTANTLY
    setContacts(finalContacts)
    setSelectedContact(updatedContact)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_contacts', JSON.stringify(finalContacts))
    }

    // 2. Sync pipeline deals with updated contact info
    let updatedDeals: any[] = []
    if (typeof window !== 'undefined') {
      try {
        const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
        if (rawDeals) {
          const deals = JSON.parse(rawDeals)
          updatedDeals = deals.map((d: any) => {
            const matchesId = updatedContact.id && d.contact_id === updatedContact.id
            const matchesComp = cleanTargetCompany && (d.contact?.company || d.title) && (d.contact?.company || d.title).trim().toLowerCase() === cleanTargetCompany
            if (matchesId || matchesComp) {
              return {
                ...d,
                contact: {
                  ...(d.contact || {}),
                  name: updatedContact.name,
                  company: updatedContact.company,
                  phone: updatedContact.phone,
                  email: updatedContact.email,
                  curve: updatedContact.curve,
                  representative: updatedContact.representative
                },
                assigned_to: updatedContact.representative || d.assigned_to
              }
            }
            return d
          })
          localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(updatedDeals))
        }
      } catch (e) {}
    }

    // 3. Await API post to Supabase for contact update FIRST
    try {
      await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedContact)
      })

      if (updatedDeals.length > 0) {
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedDeals)
        }).catch(() => {})
      }
    } catch (err) {
      console.error('Error updating contact via API:', err)
    }

    // 4. Dispatch storage events AFTER Supabase has completed the save!
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage-contacts-changed'))
      window.dispatchEvent(new Event('storage-deals-changed'))
    }
  }

  const handleConfirmNewContact = (data: Partial<MockContact>) => {
    // 🔍 DUPLICATE DETECTION LOGIC
    const cleanNewCnpj = (data.cnpj || '').replace(/\D/g, '')
    const cleanNewCompany = (data.company || '').trim().toLowerCase()

    const existingDuplicate = contacts.find(c => {
      const cleanCnpj = (c.cnpj || '').replace(/\D/g, '')
      const cleanCompany = (c.company || '').trim().toLowerCase()

      const matchesCnpj = cleanNewCnpj.length >= 8 && cleanCnpj.length >= 8 && cleanNewCnpj === cleanCnpj
      const matchesCompany = cleanNewCompany.length >= 3 && cleanCompany.length >= 3 && cleanNewCompany === cleanCompany

      return matchesCnpj || matchesCompany
    })

    if (existingDuplicate) {
      setDuplicateModalData(existingDuplicate)
      return false
    }

    const assignedRep = data.representative || (currentUser?.name ? currentUser.name : (representativesList[0] || ''))

    const newContact: MockContact = {
      id: `c-${Date.now()}`,
      name: (data.name || '').trim().toUpperCase(),
      company: (data.company || '').trim().toUpperCase(),
      cnpj: data.cnpj || '',
      curve: data.curve || 'C',
      representative: assignedRep,
      phone: data.phone || '',
      email: data.email || '',
      city: (data.city || '').trim().toUpperCase(),
      state: (data.state || '').trim().toUpperCase(),
      status: 'ativo',
      lastPurchaseDays: 0,
      
      // New fields mapping
      tradeName: (data.tradeName || '').trim().toUpperCase(),
      registrationStatus: (data.registrationStatus || 'ATIVA').trim().toUpperCase(),
      mainCnae: (data.mainCnae || '').trim().toUpperCase(),
      address: (data.address || '').trim().toUpperCase(),
      bairro: (data.bairro || '').trim().toUpperCase(),
      cep: data.cep || '',
      sideActivities: data.sideActivities || [],
      taxRegime: data.taxRegime || 'Simples Nacional',
      specialSituation: (data.specialSituation || 'Nenhuma').trim().toUpperCase(),
      specialSituationDate: data.specialSituationDate || '-',
      stateRegistration: (data.stateRegistration || '').trim().toUpperCase(),
      website: data.website || '',
      instagram: data.instagram || '',
      linkedin: data.linkedin || '',
      facebook: data.facebook || ''
    }

    const updated = [newContact, ...contacts]
    saveContacts(updated)

    // Direct Supabase Contacts Table Sync
    if (supabase) {
      supabase.from('contacts').insert([{
        name: newContact.name,
        company: newContact.company,
        role: newContact.tradeName || newContact.company,
        phone: newContact.phone,
        email: newContact.email,
        city: newContact.city,
        state: newContact.state,
        status: newContact.status,
        curve: newContact.curve,
        representative: newContact.representative,
        assigned_to: newContact.representative,
        assignedTo: newContact.representative,
        cnpj: newContact.cnpj,
        address: newContact.address,
        bairro: newContact.bairro,
        cep: newContact.cep,
        tax_regime: newContact.taxRegime,
        special_situation: newContact.specialSituation,
        special_situation_date: newContact.specialSituationDate,
        state_registration: newContact.stateRegistration,
        registration_status: newContact.registrationStatus,
        main_cnae: newContact.mainCnae,
        side_activities: JSON.stringify(newContact.sideActivities || []),
        website: newContact.website,
        instagram: newContact.instagram,
        linkedin: newContact.linkedin,
        facebook: newContact.facebook
      }]).then(({ error }) => {
        if (error) console.error('Error saving contact to Supabase:', error)
        else console.log('Successfully saved contact to Supabase contacts table!')
      })
    }

    setShowNewContactModal(false)
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-2.5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
          Carteira de Clientes
        </h1>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setSelectedContactForActivity('')
              setShowActivityModal(true)
            }}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-white font-bold shadow-md"
          >
            <CheckCircle size={13} />
            <span>Registrar Atividade</span>
          </button>

          <button
            onClick={() => setShowProspeccaoModal(true)}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)] font-bold shadow-md"
          >
            <UserPlus size={13} />
            <span>Prospectar Leads</span>
          </button>

          <button onClick={() => setShowNewContactModal(true)} className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
            <Plus size={13} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS SUMMARY CARDS (Separados em 2 grupos com bordas laterais elegantes, ícones coloridos e letras para Curvas) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {/* GRUPO 1: STATUS DA CARTEIRA (4 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Card 1: Total */}
          <div 
            onClick={() => {
              setSelectedStatus('all')
              setSelectedCurve('all')
            }}
            className={`card p-2.5 border-l-[3px] border-l-sky-500/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedStatus === 'all' && selectedCurve === 'all'
                ? 'border-l-sky-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-sky-400'
            }`}
            title="Exibir todos os clientes"
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Total</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.total}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">100%</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 shadow-sm">
              <Users size={14} />
            </div>
          </div>

          {/* Card 2: Ativos */}
          <div 
            onClick={() => setSelectedStatus(prev => prev === 'ativo' ? 'all' : 'ativo')}
            className={`card p-2.5 border-l-[3px] border-l-[var(--lime)]/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedStatus === 'ativo' 
                ? 'border-l-[var(--lime)] bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-[var(--lime)]'
            }`}
            title={selectedStatus === 'ativo' ? 'Clique para desfiltrar' : 'Filtrar por Clientes Ativos'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Ativos</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.ativos}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctAtivos}%</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/30 text-[var(--lime)] flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle size={14} />
            </div>
          </div>

          {/* Card 3: Reativação */}
          <div 
            onClick={() => setSelectedStatus(prev => prev === 'reativacao' ? 'all' : 'reativacao')}
            className={`card p-2.5 border-l-[3px] border-l-orange-500/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedStatus === 'reativacao' 
                ? 'border-l-orange-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-orange-400'
            }`}
            title={selectedStatus === 'reativacao' ? 'Clique para desfiltrar' : 'Filtrar por Reativação'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Reativação</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.reativacao}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctReativacao}%</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle size={14} />
            </div>
          </div>

          {/* Card 4: Prospecção */}
          <div 
            onClick={() => setSelectedStatus(prev => prev === 'prospeccao' ? 'all' : 'prospeccao')}
            className={`card p-2.5 border-l-[3px] border-l-amber-400/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedStatus === 'prospeccao' 
                ? 'border-l-amber-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-amber-400'
            }`}
            title={selectedStatus === 'prospeccao' ? 'Clique para desfiltrar' : 'Filtrar por Prospecção'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Prospecção</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.prospeccao}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctProspeccao}%</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <UserPlus size={14} />
            </div>
          </div>
        </div>

        {/* GRUPO 2: CURVAS ABC (4 Cards com Letras A, B, C, D em selos vibrantes) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 xl:pt-0 border-t xl:border-t-0 xl:border-l border-[var(--line)] xl:pl-3">
          {/* Card 5: Curva A */}
          <div 
            onClick={() => setSelectedCurve(prev => prev === 'A' ? 'all' : 'A')}
            className={`card p-2.5 border-l-[3px] border-l-[var(--lime)]/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedCurve === 'A' 
                ? 'border-l-[var(--lime)] bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-[var(--lime)]'
            }`}
            title={selectedCurve === 'A' ? 'Clique para desfiltrar' : 'Filtrar pela Curva A'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Curva A</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.curveA}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctCurveA}%</span>
              </div>
            </div>
            <span className="w-7 h-7 rounded-lg bg-[var(--lime)]/15 border border-[var(--lime)]/40 text-[var(--lime)] font-mono font-black text-xs flex items-center justify-center shrink-0 select-none shadow-sm">A</span>
          </div>

          {/* Card 6: Curva B */}
          <div 
            onClick={() => setSelectedCurve(prev => prev === 'B' ? 'all' : 'B')}
            className={`card p-2.5 border-l-[3px] border-l-amber-400/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedCurve === 'B' 
                ? 'border-l-amber-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-amber-400'
            }`}
            title={selectedCurve === 'B' ? 'Clique para desfiltrar' : 'Filtrar pela Curva B'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Curva B</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.curveB}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctCurveB}%</span>
              </div>
            </div>
            <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0 select-none shadow-sm">B</span>
          </div>

          {/* Card 7: Curva C */}
          <div 
            onClick={() => setSelectedCurve(prev => prev === 'C' ? 'all' : 'C')}
            className={`card p-2.5 border-l-[3px] border-l-sky-500/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedCurve === 'C' 
                ? 'border-l-sky-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-sky-400'
            }`}
            title={selectedCurve === 'C' ? 'Clique para desfiltrar' : 'Filtrar pela Curva C'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Curva C</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.curveC}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctCurveC}%</span>
              </div>
            </div>
            <span className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sky-400 font-mono font-black text-xs flex items-center justify-center shrink-0 select-none shadow-sm">C</span>
          </div>

          {/* Card 8: Curva D */}
          <div 
            onClick={() => setSelectedCurve(prev => prev === 'D' ? 'all' : 'D')}
            className={`card p-2.5 border-l-[3px] border-l-purple-500/70 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
              selectedCurve === 'D' 
                ? 'border-l-purple-400 bg-[var(--charcoal)] shadow-md' 
                : 'border-[var(--line)] bg-[var(--card)] hover:border-l-purple-400'
            }`}
            title={selectedCurve === 'D' ? 'Clique para desfiltrar' : 'Filtrar pela Curva D'}
          >
            <div>
              <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Curva D</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-xl font-black text-[var(--white)] font-display">{metrics.curveD}</span>
                <span className="text-[10px] font-mono text-[var(--gray2)] font-normal">{metrics.pctCurveD}%</span>
              </div>
            </div>
            <span className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/40 text-purple-300 font-mono font-black text-xs flex items-center justify-center shrink-0 select-none shadow-sm">D</span>
          </div>
        </div>
      </div>

      {/* Filters Bar — 12 Column Layout with Toggle Lista / Mapa */}
      <div className="card p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Search */}
        <div className={`${isRep ? 'md:col-span-3' : 'md:col-span-3'} flex items-center gap-2 input w-full py-1.5 px-3`}>
          <Search size={13} className="text-[var(--gray2)] shrink-0" />
          <input
            className="bg-transparent border-none outline-none w-full text-xs text-[var(--white)] placeholder-[var(--gray2)]"
            placeholder="Buscar razão social, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Curva Filter — Clean Labels without Parenthetical Text */}
        <div className={`${isRep ? 'md:col-span-3' : 'md:col-span-2'} flex items-center gap-1.5`}>
          <select 
            className="input w-full text-xs py-1.5 px-2.5 font-medium"
            value={selectedCurve}
            onChange={(e) => setSelectedCurve(e.target.value)}
          >
            <option value="all">Todas as Curvas</option>
            <option value="A">Curva A</option>
            <option value="B">Curva B</option>
            <option value="C">Curva C</option>
            <option value="D">Curva D</option>
          </select>
          <button 
            type="button"
            onClick={() => setShowAbcRulesModal(true)}
            className="w-7 h-7 rounded bg-[var(--charcoal)] border border-[var(--line)] text-[var(--lime)] hover:bg-[var(--lime)]/10 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            title="Visualizar Regras da Curva ABC Automática"
          >
            <Info size={14} />
          </button>
        </div>

        {/* Rep Filter — Reduced Width */}
        {!isRep && (
          <div className="md:col-span-3">
            <select 
              className="input w-full text-xs py-1.5 px-2.5"
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
            >
              <option value="all">Todos os Representantes</option>
              {representativesList.map(rep => (
                <option key={rep} value={rep}>{rep}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter — Increased Width */}
        <div className={`${isRep ? 'md:col-span-3' : 'md:col-span-2'}`}>
          <select 
            className="input w-full text-xs py-1.5 px-2.5"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativo (Compras ≤ 180d)</option>
            <option value="reativacao">Reativação (Sem compras &gt; 180d)</option>
            <option value="prospeccao">Prospecção (Sem compras)</option>
          </select>
        </div>

        {/* Toggle Lista / Mapa */}
        <div className={`${isRep ? 'md:col-span-3' : 'md:col-span-2'} flex items-center bg-[var(--charcoal)] border border-[var(--line)] rounded-xl p-0.5 w-full`}>
          <button
            type="button"
            onClick={() => setViewMode('lista')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'lista'
                ? 'bg-[var(--lime)] text-[#060606] shadow-sm'
                : 'text-[var(--gray)] hover:text-white'
            }`}
          >
            <List size={13} />
            <span>LISTA</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('mapa')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'mapa'
                ? 'bg-[var(--lime)] text-[#060606] shadow-sm'
                : 'text-[var(--gray)] hover:text-white'
            }`}
          >
            <MapPin size={13} />
            <span>MAPA</span>
          </button>
        </div>
      </div>

      {/* Main View Container — Switch between List (Cards/Table) and Leaflet Map */}
      {viewMode === 'mapa' ? (
        <div className="card p-2 h-[680px] relative w-full overflow-hidden border border-[var(--line)] rounded-2xl animate-fade-in shadow-2xl">
          <div ref={contactsMapRef} className="w-full h-full rounded-xl z-0" />
          <div className="absolute top-4 right-4 z-10 bg-[#0f172a]/90 backdrop-blur-md border border-[var(--line)] rounded-xl px-3 py-2 text-[10px] font-mono text-white flex items-center gap-3 shadow-xl">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#B4D932]"></span> Ativo</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span> Reativação</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span> Prospecção</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></span> Inativo</span>
          </div>
        </div>
      ) : isRep ? (
        /* ── REPRESENTATIVE CARD GRID VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paginatedContacts.map(contact => {
            const repInfo = getContactActivityAndRepurchaseInfo(contact)
            const effectiveStatus = repInfo.computedStatus
            const isInactive = effectiveStatus === 'reativacao'
            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`card p-3 border flex flex-col justify-between gap-2.5 cursor-pointer transition-all hover:border-[var(--lime)]/30 ${
                  isInactive ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--line)] bg-[var(--card)]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-[var(--white)] truncate">{contact.company || contact.name}</h4>
                    </div>
                    {contact.company && contact.name && (
                      <span className="text-[9px] font-mono text-[var(--gray)] block mt-0.5 truncate">Contato: {contact.name}</span>
                    )}
                    <span className="text-[9px] text-[var(--gray)] font-mono block">{(contact.city || '').toUpperCase()}{contact.state ? ` · ${contact.state.toUpperCase()}` : ''}</span>
                  </div>
                  {(() => {
                    if (effectiveStatus === 'prospeccao') return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                        Prospecção
                      </span>
                    )
                    if (effectiveStatus === 'reativacao') return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/30 shrink-0">
                        Reativação
                      </span>
                    )
                    return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--lime)]/15 text-[var(--lime)] border border-[var(--lime)]/30 shrink-0">
                        Ativo
                      </span>
                    )
                  })()}
                </div>

                <div className="text-[10px] font-mono text-[var(--gray2)] flex flex-col gap-0.5 border-t border-[var(--line)] pt-2 mt-1">
                  <div className="flex justify-between">
                    <span>Curva ABC:</span>
                    <span className="font-bold text-[var(--lime)]">Curva {contact.curve || 'D'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Última Compra:</span>
                    <span className="font-bold text-white">{repInfo.daysSinceLastPurchase !== null ? `${repInfo.daysSinceLastPurchase}d` : '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Representante:</span>
                    <span className="font-bold text-white truncate max-w-[120px]">{formatCanonicalRepName(contact.representative)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1 border-t border-[var(--line)] pt-2">
                  {contact.phone && (
                    <a
                      href={whatsappLink(contact.phone)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 rounded bg-[var(--lime)]/10 text-[var(--lime)] hover:bg-[var(--lime)]/20 transition-colors"
                      title="WhatsApp"
                    >
                      <WhatsappIcon size={12} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedContactForActivity(contact.id)
                      setShowActivityModal(true)
                    }}
                    className="p-1 rounded bg-[var(--charcoal)] border border-[var(--line)] text-[var(--gray)] hover:text-white transition-colors"
                    title="Registrar Atividade"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ── ADMIN / GESTOR TABLE VIEW ── */
        <div className="card overflow-hidden border border-[var(--line)] rounded-2xl flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--line)] bg-[var(--charcoal)]/50 text-[10px] font-mono text-[var(--gray2)] uppercase tracking-wider">
                  <th 
                    onClick={() => handleSort('company')} 
                    className="py-2.5 px-4 cursor-pointer hover:text-[var(--lime)] transition-colors"
                    title="Ordenar por Cliente / CNPJ"
                  >
                    <div className="flex items-center gap-1">
                      <span>Cliente / CNPJ</span>
                      {sortField === 'company' ? (
                        sortOrder === 'asc' ? <ArrowUp size={11} className="text-[var(--lime)]" /> : <ArrowDown size={11} className="text-[var(--lime)]" />
                      ) : (
                        <ArrowUpDown size={10} className="opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('curve')} 
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[var(--lime)] transition-colors"
                    title="Ordenar por Curva ABC"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Curva</span>
                      {sortField === 'curve' ? (
                        sortOrder === 'asc' ? <ArrowUp size={11} className="text-[var(--lime)]" /> : <ArrowDown size={11} className="text-[var(--lime)]" />
                      ) : (
                        <ArrowUpDown size={10} className="opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('state')} 
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[var(--lime)] transition-colors"
                    title="Ordenar por Estado (UF)"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>UF</span>
                      {sortField === 'state' ? (
                        sortOrder === 'asc' ? <ArrowUp size={11} className="text-[var(--lime)]" /> : <ArrowDown size={11} className="text-[var(--lime)]" />
                      ) : (
                        <ArrowUpDown size={10} className="opacity-30" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('status')} 
                    className="py-2.5 px-3 text-center cursor-pointer hover:text-[var(--lime)] transition-colors"
                    title="Ordenar por Status"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortOrder === 'asc' ? <ArrowUp size={11} className="text-[var(--lime)]" /> : <ArrowDown size={11} className="text-[var(--lime)]" />
                      ) : (
                        <ArrowUpDown size={10} className="opacity-30" />
                      )}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-center">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {paginatedContacts.map(contact => {
                  const repInfo = getContactActivityAndRepurchaseInfo(contact)
                  const effectiveStatus = repInfo.computedStatus

                  return (
                    <tr 
                      key={contact.id} 
                      onClick={() => setSelectedContact(contact)}
                      className="hover:bg-[var(--lime)]/5 transition-colors cursor-pointer group"
                    >
                      {/* Cliente / CNPJ */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--charcoal)] border border-[var(--line)] text-[var(--gray)] group-hover:border-[var(--lime)]/40 group-hover:text-[var(--lime)] flex items-center justify-center shrink-0 transition-colors">
                            <Building2 size={13} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-[var(--white)] group-hover:text-[var(--lime)] transition-colors block truncate">
                              {contact.company || contact.name}
                            </span>
                            <span className="text-[10px] font-mono text-[var(--gray2)] block">
                              {contact.cnpj || 'CNPJ não informado'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Curva ABC */}
                      <td className="py-2 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[var(--charcoal)] border border-[var(--line)] text-[var(--gray)]">
                          Curva {contact.curve || 'D'}
                        </span>
                      </td>

                      {/* Cidade */}
                      <td className="py-2 px-3 text-xs text-[var(--gray)] font-mono uppercase">
                        {contact.city || '-'}
                      </td>

                      {/* UF */}
                      <td className="py-2 px-3 text-xs text-center text-[var(--gray)] font-mono uppercase">
                        {contact.state || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {(() => {
                          if (effectiveStatus === 'prospeccao') return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-400/10 border border-amber-400/25 text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                              Prospecção
                            </span>
                          )
                          if (effectiveStatus === 'reativacao') return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-orange-500/10 border border-orange-500/25 text-orange-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                              Reativação
                            </span>
                          )
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[var(--lime)]/10 border border-[var(--lime)]/25 text-[var(--lime)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] inline-block" />
                              Ativo
                            </span>
                          )
                        })()}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button onClick={(e) => openMap(e, contact)} className="text-[var(--gray2)] hover:text-[var(--lime)] transition-colors">
                          <MapPin size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── PAGINATION CONTROLS BAR INTEGRATED AT BOTTOM OF TABLE CARD ── */}
          {filteredContacts.length > 0 && (
            <div className="py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--charcoal)]/80 shrink-0">
              <div className="text-[11px] font-mono text-[var(--gray2)]">
                Exibindo <span className="font-bold text-[var(--white)]">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-bold text-[var(--white)]">{Math.min(currentPage * itemsPerPage, filteredContacts.length)}</span> de <span className="font-bold text-[var(--white)]">{filteredContacts.length}</span> clientes
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="btn btn-secondary text-[11px] px-2.5 py-1 rounded-md disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-mono font-bold"
                >
                  &larr; Anterior
                </button>

                <span className="text-xs font-mono font-bold text-[var(--lime)] px-2">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="btn btn-secondary text-[11px] px-2.5 py-1 rounded-md disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-mono font-bold"
                >
                  Próxima &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Details Drawer */}
      <ContactDrawer
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdateContact={handleUpdateContact}
        representatives={representativesList}
        onOpenRegisterActivity={(contactId) => {
          setSelectedContactForActivity(contactId)
          setShowActivityModal(true)
        }}
      />

      {/* New Contact Modal with CNPJ Autopopulate */}
      {showNewContactModal && (
        <NewContactModal
          onConfirm={handleConfirmNewContact}
          onCancel={() => setShowNewContactModal(false)}
        />
      )}

      {/* Map / Facade Modal Mock */}
      {showMapModal && modalContact && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="card max-w-lg w-full overflow-hidden relative border-[var(--line)]">
            {/* Header */}
            <div className="p-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--charcoal)]">
              <div>
                <h3 className="font-display text-sm text-[var(--white)]">{modalContact.company}</h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">{modalContact.city} · {modalContact.state}</p>
              </div>
              <button 
                onClick={() => setShowMapModal(false)}
                className="text-[var(--gray)] hover:text-white font-mono text-xs"
              >
                [ FECHAR ]
              </button>
            </div>

            {/* Facade photo mock using CSS design to resemble a mockup of Carton Pack premium style */}
            <div className="relative h-64 bg-[#141414] flex flex-col items-center justify-center p-6 border-b border-[var(--line)]">
              {/* Simulated Map View with Google Maps Pin */}
              <div className="absolute inset-0 opacity-10 bg-radial-gradient from-[var(--lime)] to-transparent pointer-events-none" />
              
              <div className="w-48 h-32 rounded-lg border-2 border-dashed border-[var(--line)] bg-[var(--black)] flex flex-col items-center justify-center text-center p-4 relative">
                <MapPin size={24} className="text-[var(--lime)] mb-1 animate-bounce" />
                <span className="text-xs font-bold text-[var(--white)]">Fachada da Empresa</span>
                <span className="text-[10px] text-[var(--gray)] font-mono mt-1">Geolocalizada automaticamente em {modalContact.city}</span>
              </div>
            </div>

            {/* Footer / Meta */}
            <div className="p-4 bg-[var(--charcoal)] flex justify-between items-center text-xs">
              <span className="text-[var(--gray)] font-mono">Assinado a: <b>{modalContact.representative}</b></span>
              <span className="text-[var(--gray)] font-mono">Curva: <b className="text-[var(--lime)]">{modalContact.curve}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* ── Prospecção B2B Modal ── */}
      <ProspeccaoModal
        isOpen={showProspeccaoModal}
        onClose={() => setShowProspeccaoModal(false)}
        usuarioLogado={currentUser ? { id: currentUser.id, nome: currentUser.name, papel: (currentUser.role as any), ativo: true } : { id: 'admin-1', nome: 'Supervisor Comercial', papel: 'supervisor', ativo: true }}
        usuariosDisponiveis={representativesList.map((r, i) => ({ id: `usr-${i}`, nome: r, papel: 'representante', ativo: true }))}
        onLeadsImported={() => {
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('crm_contacts')
            if (saved) {
              try { setContacts(JSON.parse(saved)) } catch (e) {}
            }
          }
        }}
      />
      {/* Register Activity Modal */}
      <RegisterActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('crm_contacts')
            if (saved) {
              try {
                setContacts(JSON.parse(saved))
              } catch (e) {}
            }
          }
        }}
        contactsList={filteredContacts}
        preselectedContactId={selectedContactForActivity}
      />

      {/* ── DUPLICATE CLIENT WARNING MODAL (Padrão do Sistema) ── */}
      {duplicateModalData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[1000000] flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-display text-sm text-[var(--white)] font-bold">CLIENTE JÁ CADASTRADO!</h3>
                <p className="text-xs text-[var(--gray2)] mt-0.5 font-mono">Já existe um cadastro com essa Razão Social/CNPJ.</p>
              </div>
            </div>

            <div className="bg-[var(--card2)] border border-[var(--line)] rounded-xl p-3.5 flex flex-col gap-2.5 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Razão Social / Empresa</span>
                <span className="font-bold text-[var(--white)]">{duplicateModalData.company}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">CNPJ</span>
                <span className="font-mono text-[var(--lime)] font-bold">{duplicateModalData.cnpj || 'Não informado'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]/50">
                <div>
                  <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Representante</span>
                  <span className="font-semibold text-slate-200">{duplicateModalData.representative || 'Sem representante'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Status Atual</span>
                  <span className="font-semibold capitalize text-amber-400">{duplicateModalData.status}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[var(--gray2)] leading-relaxed">
              Para evitar registros duplicados na carteira, utilize o cadastro já existente ou acesse a ficha do cliente.
            </p>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDuplicateModalData(null)}
                className="btn btn-primary py-2.5 px-6 text-xs font-bold uppercase tracking-wider text-[#060606] w-full rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL INFORMATIVO DA CURVA ABC ── */}
      {showAbcRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="card w-full max-w-lg p-5 border border-[var(--line)] bg-[var(--card)] shadow-2xl relative">
            <button 
              onClick={() => setShowAbcRulesModal(false)}
              className="absolute top-4 right-4 text-[var(--gray2)] hover:text-[var(--white)] transition-colors p-1 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-[var(--charcoal)] border border-[var(--line)] text-[var(--lime)] flex items-center justify-center shrink-0">
                <Info size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--white)]">Regras da Curva ABC Automática</h3>
                <p className="text-xs text-[var(--gray2)] font-mono">Classificação dinâmica por Faturamento Acumulado (Pareto 80/15/5) e Recorrência</p>
              </div>
            </div>

            <div className="space-y-2.5 my-4 text-xs">
              {/* Curva A */}
              <div className="p-3.5 rounded-xl bg-[var(--card2)] border border-[var(--line)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--white)] text-xs uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[var(--lime)]" /> Curva A — Clientes VIP / Principais
                  </span>
                  <span className="text-[10px] font-mono text-[var(--lime)] bg-[var(--lime)]/10 border border-[var(--lime)]/20 px-2 py-0.5 rounded-md font-bold">Top 80% Receita</span>
                </div>
                <p className="text-[11px] text-[var(--gray2)] mt-1 font-mono leading-relaxed">
                  Clientes que compõem os <strong>primeiros 80% do faturamento acumulado</strong> da empresa <strong>E</strong> compram com alta frequência (≥ 2 pedidos no ano).
                </p>
              </div>

              {/* Curva B */}
              <div className="p-3.5 rounded-xl bg-[var(--card2)] border border-[var(--line)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--white)] text-xs uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-300" /> Curva B — Clientes Estratégicos
                  </span>
                  <span className="text-[10px] font-mono text-[var(--white)] bg-[var(--charcoal)] border border-[var(--line)] px-2 py-0.5 rounded-md font-bold">80% a 95% Receita</span>
                </div>
                <p className="text-[11px] text-[var(--gray2)] mt-1 font-mono leading-relaxed">
                  Clientes da faixa intermediária de faturamento (de 80% a 95% do acumulado) <strong>OU</strong> clientes com compras pontuais de alto valor.
                </p>
              </div>

              {/* Curva C */}
              <div className="p-3.5 rounded-xl bg-[var(--card2)] border border-[var(--line)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--white)] text-xs uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-500" /> Curva C — Clientes Menor Faturamento
                  </span>
                  <span className="text-[10px] font-mono text-[var(--gray2)] bg-[var(--charcoal)] border border-[var(--line)] px-2 py-0.5 rounded-md">Últimos 5% Receita</span>
                </div>
                <p className="text-[11px] text-[var(--gray2)] mt-1 font-mono leading-relaxed">
                  Clientes com histórico de compras que representam os últimos 5% do faturamento acumulado da empresa.
                </p>
              </div>

              {/* Curva D */}
              <div className="p-3.5 rounded-xl bg-[var(--card2)] border border-[var(--line)] flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-[var(--white)] text-xs uppercase flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-zinc-600" /> Curva D — Prospecção / Leads
                  </span>
                  <span className="text-[10px] font-mono text-[var(--gray2)] bg-[var(--charcoal)] border border-[var(--line)] px-2 py-0.5 rounded-md">0 Compras</span>
                </div>
                <p className="text-[11px] text-[var(--gray2)] mt-1 font-mono leading-relaxed">
                  Clientes que ainda não possuem histórico de compras faturadas cadastrado no sistema.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button 
                type="button"
                onClick={() => setShowAbcRulesModal(false)}
                className="btn btn-primary text-xs py-2 px-6 cursor-pointer font-bold uppercase tracking-wider text-[#060606]"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
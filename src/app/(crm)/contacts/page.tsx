'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Search, 
  Filter, 
  Phone, 
  User, 
  Building2, 
  AlertCircle, 
  MapPin, 
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
  Calendar
} from 'lucide-react'
import { whatsappLink, formatCurrency, formatCnaeCode, formatCnaeFullString } from '@/lib/utils'
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
  city: string
  state: string
  status: 'ativo' | 'inativo' | 'prospeccao'
  email?: string
  // Expanded fields
  tradeName?: string
  registrationStatus?: string
  mainCnae?: string
  address?: string
  bairro?: string
  cep?: string
  taxRegime?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
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
  planningNotes?: string
  history?: Array<{ id: string; date: string; author: string; action: string; details: string }>
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

function capitalizeString(str: string) {
  return str.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
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
  const [activeTab, setActiveTab] = useState<'geral' | 'planejamento' | 'historico'>('geral')

  // Form states
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')
  const [representative, setRepresentative] = useState('')
  const [phone, setPhone] = useState('')
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
  const [taxRegime, setTaxRegime] = useState<'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'>('Simples Nacional')
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
  const [purchaseFrequencyDays, setPurchaseFrequencyDays] = useState<number>(30)
  const [lastPurchaseDate, setLastPurchaseDate] = useState<string>('')
  const [planningNotes, setPlanningNotes] = useState<string>('')
  const [historyList, setHistoryList] = useState<Array<{ id: string; date: string; author: string; action: string; details: string }>>([])

  // History states
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const handleCopyEmail = (str: string) => { if (!str) return; navigator.clipboard.writeText(str); setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000); }
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')

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
      setEmail(contact.email ?? '')
      setCity(contact.city)
      setState(contact.state)
      setStatus(contact.status)
      
      // Load planning and history fields
      setProjectedPurchaseValue((contact as any).projectedPurchaseValue ?? (contact as any).projected_purchase_value ?? 0)
      setPurchaseFrequencyDays((contact as any).purchaseFrequencyDays ?? (contact as any).purchase_frequency_days ?? 30)
      setLastPurchaseDate((contact as any).lastPurchaseDate ?? (contact as any).last_purchase_date ?? '')
      setPlanningNotes((contact as any).planningNotes ?? (contact as any).planning_notes ?? '')
      
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
      setBairro(parsedBairro)
      setCep(parsedCep)
      setSideActivities(contact.sideActivities ?? [])
      setShowSideActivities(false)
      setRegistrationStatus(contact.registrationStatus ?? 'ATIVA')
      setMainCnae(contact.mainCnae ?? '')
      setTaxRegime(contact.taxRegime ?? 'Simples Nacional')
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
      email,
      city,
      state,
      status,
      registrationStatus,
      mainCnae,
      address,
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
            Histórico
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
                    {representativesList.map(rep => (
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
                        <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Responsável (Pessoa Física) *</label>
                        <input 
                          type="text" 
                          required
                          className="input text-xs py-1 px-2.5 font-bold border-dashed border-[var(--lime)] uppercase" 
                          placeholder="Nome do Contato Principal"
                          value={name}
                          onChange={(e) => setName(e.target.value.toUpperCase())}
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
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
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

                    {/* Rua / Número + Bairro */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="sm:col-span-2 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1 px-2.5 uppercase" 
                          placeholder="Rua, Número"
                          value={address}
                          onChange={(e) => setAddress(e.target.value.toUpperCase())}
                        />
                      </div>
                      <div className="flex flex-col gap-0.5">
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

                    <div className="grid grid-cols-5 gap-2">
                      <div className="col-span-2 flex flex-col gap-0.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                        <select 
                          className="input text-xs py-1 px-2.5" 
                          value={taxRegime} 
                          onChange={(e) => {
                            const val = e.target.value as any
                            setTaxRegime(val)
                            handleSaveGeneral({ taxRegime: val })
                          }}
                        >
                          <option value="MEI">MEI</option>
                          <option value="Simples Nacional">Simples</option>
                          <option value="Lucro Presumido">Presumido</option>
                          <option value="Lucro Real">Lucro Real</option>
                        </select>
                      </div>

                      <div className="col-span-3 flex flex-col gap-0.5">
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
            <div className="flex flex-col gap-4 animate-fade-in pb-12">
              
              {/* Banner de Status de Recompra */}
              {(() => {
                const repInfo = getRepurchaseStatusInfo()
                return (
                  <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${repInfo.badgeBg}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/20 text-current font-bold shrink-0">
                        <Clock size={20} />
                      </div>
                      <div>
                        <div className="text-[10px] font-mono uppercase font-extrabold tracking-wider">Status do Ciclo de Recompra</div>
                        <div className="text-sm font-bold font-display mt-0.5">{repInfo.label}</div>
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 font-mono">
                      <div className="text-[9px] uppercase font-bold opacity-80">Próxima Compra Prevista</div>
                      <div className="text-sm font-black mt-0.5">{repInfo.nextDateStr}</div>
                    </div>
                  </div>
                )
              })()}

              {/* Grid de Campos: Valor Projetado, Frequência, Última Compra */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                
                {/* Valor Projetado R$ */}
                <div className="card p-3.5 border-[var(--line)] bg-[var(--card)] flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <DollarSign size={12} /> Valor Projetado de Compra
                  </label>
                  <div className="flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-3 py-2 focus-within:border-[var(--lime)]">
                    <span className="text-xs font-bold text-[var(--gray2)] font-mono">R$</span>
                    <input
                      type="number"
                      step="100"
                      className="bg-transparent border-none outline-none text-xs font-bold text-[var(--white)] font-mono w-full"
                      placeholder="0,00"
                      value={projectedPurchaseValue || ''}
                      onChange={e => setProjectedPurchaseValue(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--gray2)] font-mono">Estimativa de faturamento por ciclo de compra</span>
                </div>

                {/* Frequência de Compra (Dias) */}
                <div className="card p-3.5 border-[var(--line)] bg-[var(--card)] flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-sky-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Calendar size={12} /> Frequência de Compra (Dias)
                  </label>
                  <div className="flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-3 py-2 focus-within:border-sky-400">
                    <input
                      type="number"
                      min="1"
                      className="bg-transparent border-none outline-none text-xs font-bold text-[var(--white)] font-mono w-full"
                      placeholder="Ex: 30, 45, 60"
                      value={purchaseFrequencyDays || ''}
                      onChange={e => setPurchaseFrequencyDays(parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs font-bold text-[var(--gray2)] font-mono">dias</span>
                  </div>
                  <span className="text-[9px] text-[var(--gray2)] font-mono">Intervalo numérico em dias (ex: 30, 45, 60)</span>
                </div>

                {/* Data da Última Compra */}
                <div className="card p-3.5 border-[var(--line)] bg-[var(--card)] flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
                  <label className="text-[9px] font-bold text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1">
                    <Clock size={12} /> Data da Última Compra
                  </label>
                  <div className="flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-3 py-2 focus-within:border-amber-400">
                    <input
                      type="date"
                      className="bg-transparent border-none outline-none text-xs font-bold text-[var(--white)] font-mono w-full cursor-pointer"
                      value={lastPurchaseDate}
                      onChange={e => setLastPurchaseDate(e.target.value)}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--gray2)] font-mono">Data do último pedido fechado</span>
                </div>

              </div>

              {/* Observações e Perfil de Compra */}
              <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
                <label className="text-[10px] font-bold text-[var(--white)] uppercase font-mono tracking-wider flex items-center gap-1.5">
                  <FileText size={14} className="text-[var(--lime)]" />
                  <span>Observações & Perfil de Compra do Cliente</span>
                </label>
                <textarea
                  rows={4}
                  className="w-full bg-[var(--charcoal)] border border-[var(--line)] rounded-xl p-3 text-xs text-[var(--white)] outline-none focus:border-[var(--lime)] resize-none font-mono"
                  placeholder="Particularidades de compra, pico de sazonalidade, preferências de cartão/embalagem..."
                  value={planningNotes}
                  onChange={e => setPlanningNotes(e.target.value)}
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
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  
  // Expanded properties states
  const [registrationStatus, setRegistrationStatus] = useState('ATIVA')
  const [mainCnae, setMainCnae] = useState('')
  const [sideActivities, setSideActivities] = useState<{id: string; text: string}[]>([])
  const [showSideActivities, setShowSideActivities] = useState(false)
  const [address, setAddress] = useState('')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [taxRegime, setTaxRegime] = useState<'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'>('Simples Nacional')
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
      
      const phoneObj = data.phones?.[0]
      const rawPhone = phoneObj ? `${phoneObj.area}${phoneObj.number}` : ''
      setPhone(formatPhoneBr(rawPhone))
      
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
      email,
      city,
      state,
      registrationStatus,
      mainCnae,
      address,
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
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
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

              {/* Rua / Número + Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2.5" 
                    placeholder="Rua, Número"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
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

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                  <select 
                    className="input text-xs py-1 px-2.5" 
                    value={taxRegime} 
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                  >
                    <option value="MEI">MEI</option>
                    <option value="Simples Nacional">Simples</option>
                    <option value="Lucro Presumido">Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>

                <div className="col-span-3 flex flex-col gap-0.5">
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
  const [duplicateModalData, setDuplicateModalData] = useState<MockContact | null>(null)

  // Dynamic representatives list from CRM Users in localStorage
  const [representativesList, setRepresentativesList] = useState<string[]>([])

  // Load contacts and representatives on mount (fetching from Supabase contacts table)
  useEffect(() => {
    // Load current user session
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {
          console.error(e)
        }
      }
    }

    async function loadContacts() {
      let existingLocalMap = new Map<string, any>()
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('crm_contacts')
          if (raw) {
            const list = JSON.parse(raw)
            list.forEach((c: any) => {
              if (c.id) existingLocalMap.set(c.id, c)
              if (c.company) existingLocalMap.set(c.company.toLowerCase().trim(), c)
            })
          }
        } catch (e) {}
      }

      if (supabase) {
        try {
          const { data, error } = await supabase.from('contacts').select('*').order('created_at', { ascending: false })
          if (!error && data) {
            const mapped: MockContact[] = data.map((item: any) => {
              let loadedActs: Activity[] = []
              if (item.activities) {
                try {
                  loadedActs = typeof item.activities === 'string' ? JSON.parse(item.activities) : item.activities
                } catch (e) {}
              }
              const localMatched = existingLocalMap.get(item.id) || (item.company && existingLocalMap.get(item.company.toLowerCase().trim()))
              if (localMatched && localMatched.activities && Array.isArray(localMatched.activities)) {
                const actMap = new Map<string, Activity>()
                loadedActs.forEach((a: Activity) => actMap.set(a.id, a))
                localMatched.activities.forEach((a: Activity) => actMap.set(a.id, a))
                loadedActs = Array.from(actMap.values())
              }

              let loadedHistory: any[] = []
              if (item.history) {
                try {
                  loadedHistory = typeof item.history === 'string' ? JSON.parse(item.history) : item.history
                } catch (e) {}
              }

              let combinedHistory = loadedHistory
              if (localMatched && localMatched.history && Array.isArray(localMatched.history)) {
                const histMap = new Map<string, any>()
                loadedHistory.forEach((h: any) => histMap.set(h.id, h))
                localMatched.history.forEach((h: any) => histMap.set(h.id, h))
                combinedHistory = Array.from(histMap.values())
              }

              return {
                id: item.id,
                name: item.responsible || item.contact_name || item.name || localMatched?.name || '',
                company: item.company || localMatched?.company || '',
                cnpj: item.cnpj || localMatched?.cnpj || '',
                curve: item.curve || localMatched?.curve || 'C',
                representative: item.representative || item.assigned_to || item.assignedTo || localMatched?.representative || '',
                phone: item.phone || localMatched?.phone || '',
                email: item.email || localMatched?.email || '',
                city: item.city || localMatched?.city || '',
                state: item.state || localMatched?.state || '',
                status: item.status || localMatched?.status || 'ativo',
                lastPurchaseDays: 0,
                tradeName: item.role || item.trade_name || localMatched?.tradeName || item.company || '',
                registrationStatus: item.registration_status || localMatched?.registrationStatus || 'ATIVA',
                mainCnae: item.main_cnae || localMatched?.mainCnae || '',
                address: item.address || localMatched?.address || '',
                bairro: item.bairro || localMatched?.bairro || '',
                cep: item.cep || localMatched?.cep || '',
                sideActivities: item.side_activities ? (typeof item.side_activities === 'string' ? JSON.parse(item.side_activities) : item.side_activities) : (localMatched?.sideActivities || []),
                taxRegime: item.tax_regime || localMatched?.taxRegime || 'Simples Nacional',
                specialSituation: item.special_situation || localMatched?.specialSituation || 'Nenhuma',
                specialSituationDate: item.special_situation_date || localMatched?.specialSituationDate || '-',
                stateRegistration: item.state_registration || localMatched?.stateRegistration || '',
                website: item.website || localMatched?.website || '',
                instagram: item.instagram || localMatched?.instagram || '',
                linkedin: item.linkedin || localMatched?.linkedin || '',
                facebook: item.facebook || localMatched?.facebook || '',
                projectedPurchaseValue: item.projected_purchase_value ?? item.projectedPurchaseValue ?? localMatched?.projectedPurchaseValue ?? 0,
                purchaseFrequencyDays: item.purchase_frequency_days ?? item.purchaseFrequencyDays ?? localMatched?.purchaseFrequencyDays ?? 30,
                lastPurchaseDate: item.last_purchase_date || item.lastPurchaseDate || localMatched?.lastPurchaseDate || '',
                planningNotes: item.planning_notes || item.planningNotes || localMatched?.planningNotes || '',
                history: combinedHistory,
                activities: loadedActs
              }
            })
            setContacts(mapped)
            if (typeof window !== 'undefined') {
              localStorage.setItem('crm_contacts', JSON.stringify(mapped))
            }
            return
          }
        } catch (err) {
          console.error('Supabase load error:', err)
        }
      }

      if (typeof window !== 'undefined') {
        const savedContacts = localStorage.getItem('crm_contacts')
        if (savedContacts) {
          try {
            const parsed = JSON.parse(savedContacts)
            const clean = parsed.filter((c: any) => !c.company?.toUpperCase().includes('SIQUEIRA'))
            setContacts(clean)
            localStorage.setItem('crm_contacts', JSON.stringify(clean))
          } catch (e) {
            setContacts([])
          }
        } else {
          setContacts([])
        }

        const savedUsers = localStorage.getItem('crm_users')
        if (savedUsers) {
          try {
            const parsed = JSON.parse(savedUsers)
            const repsFromUsers = parsed
              .filter((u: any) => u.status === 'ativo' || u.status !== 'inativo')
              .map((u: any) => u.name)
            if (repsFromUsers.length > 0) {
              setRepresentativesList(repsFromUsers)
            }
          } catch (e) {
            console.error(e)
          }
        }
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

  // Fetch strictly registered active system users for Representatives dropdown
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      let registeredNames: string[] = []

      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const apiUsers = await res.json()
          if (Array.isArray(apiUsers) && apiUsers.length > 0) {
            registeredNames = apiUsers
              .filter((u: any) => u.status !== 'inativo')
              .map((u: any) => u.name.trim())
              .filter(Boolean)
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
              .map((u: any) => u.name.trim())
              .filter(Boolean)
          } catch (e) {}
        }
      }

      if (registeredNames.length > 0) {
        const unique = Array.from(new Set(registeredNames))
        setRepresentativesList(unique)
      }
    }

    fetchRegisteredUsers()

    if (typeof window !== 'undefined') {
      window.addEventListener('storage-users-changed', fetchRegisteredUsers)
      window.addEventListener('storage', fetchRegisteredUsers)
      return () => {
        window.removeEventListener('storage-users-changed', fetchRegisteredUsers)
        window.removeEventListener('storage', fetchRegisteredUsers)
      }
    }
  }, [])

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'

  // ── Pagination State ──
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // ── Scoped Contacts for Metrics Calculation ──
  const scopedContacts = useMemo(() => {
    return contacts.filter(contact => {
      if (isRep && contact.representative !== currentUser?.name) return false
      return true
    })
  }, [contacts, isRep, currentUser?.name])

  // ── Metrics Calculation (Total, Ativos, Inativos, Prospecção) ──
  const metrics = useMemo(() => {
    const total = scopedContacts.length
    const ativos = scopedContacts.filter(c => c.status === 'ativo' || (!c.status && (!c.lastPurchaseDays || c.lastPurchaseDays <= 30))).length
    const inativos = scopedContacts.filter(c => c.status === 'inativo' || (c.lastPurchaseDays && c.lastPurchaseDays > 30 && c.status !== 'prospeccao')).length
    const prospeccao = scopedContacts.filter(c => c.status === 'prospeccao').length
    return { total, ativos, inativos, prospeccao }
  }, [scopedContacts])

  // Filtering logic — representatives only see their own clients
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Enforce rep scope: only own contacts
      if (isRep && contact.representative !== currentUser?.name) return false

      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.cnpj.includes(searchTerm)
      
      const matchesCurve = selectedCurve === 'all' || contact.curve === selectedCurve
      const matchesRep = selectedRep === 'all' || contact.representative === selectedRep
      const matchesStatus = selectedStatus === 'all' || contact.status === selectedStatus

      return matchesSearch && matchesCurve && matchesRep && matchesStatus
    })
  }, [contacts, isRep, currentUser?.name, searchTerm, selectedCurve, selectedRep, selectedStatus])

  // Reset pagination to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCurve, selectedRep, selectedStatus])

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1
  const paginatedContacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredContacts.slice(start, start + itemsPerPage)
  }, [filteredContacts, currentPage, itemsPerPage])

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
    saveContacts(finalContacts)
    setSelectedContact(updatedContact)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('storage-contacts-changed'))
    }

    // Sync pipeline deals with updated contact info
    if (typeof window !== 'undefined') {
      try {
        const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
        if (rawDeals) {
          const deals = JSON.parse(rawDeals)
          const updatedDeals = deals.map((d: any) => {
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
                  curve: updatedContact.curve
                },
                assigned_to: updatedContact.representative || d.assigned_to
              }
            }
            return d
          })
          localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(updatedDeals))
          window.dispatchEvent(new Event('storage-deals-changed'))
        }
      } catch (e) {}
    }

    if (supabase) {
      try {
        const payload: any = {
          name: updatedContact.name,
          responsible: updatedContact.name,
          contact_name: updatedContact.name,
          company: updatedContact.company,
          trade_name: updatedContact.tradeName || updatedContact.company,
          role: updatedContact.tradeName || updatedContact.company,
          phone: updatedContact.phone,
          email: updatedContact.email,
          city: updatedContact.city,
          state: updatedContact.state,
          status: updatedContact.status,
          curve: updatedContact.curve,
          representative: updatedContact.representative,
          assigned_to: updatedContact.representative,
          assignedTo: updatedContact.representative,
          cnpj: updatedContact.cnpj,
          address: updatedContact.address,
          bairro: updatedContact.bairro,
          cep: updatedContact.cep,
          tax_regime: updatedContact.taxRegime,
          special_situation: updatedContact.specialSituation,
          special_situation_date: updatedContact.specialSituationDate,
          state_registration: updatedContact.stateRegistration,
          registration_status: updatedContact.registrationStatus,
          main_cnae: updatedContact.mainCnae,
          side_activities: JSON.stringify(updatedContact.sideActivities || []),
          website: updatedContact.website,
          instagram: updatedContact.instagram,
          linkedin: updatedContact.linkedin,
          facebook: updatedContact.facebook,
          projected_purchase_value: updatedContact.projectedPurchaseValue || 0,
          purchase_frequency_days: updatedContact.purchaseFrequencyDays || 30,
          last_purchase_date: updatedContact.lastPurchaseDate || '',
          planning_notes: updatedContact.planningNotes || '',
          history: JSON.stringify(updatedContact.history || []),
          activities: JSON.stringify(updatedContact.activities || []),
          updated_at: new Date().toISOString()
        }

        const cleanCnpj = (updatedContact.cnpj || '').replace(/\D/g, '')
        let updatedRows: any[] | null = null

        if (updatedContact.id) {
          const { data, error } = await supabase.from('contacts').update(payload).eq('id', updatedContact.id).select()
          if (!error && data && data.length > 0) {
            updatedRows = data
          }
        }

        if ((!updatedRows || updatedRows.length === 0) && updatedContact.cnpj) {
          const { data, error } = await supabase.from('contacts').update(payload).eq('cnpj', updatedContact.cnpj).select()
          if (!error && data && data.length > 0) {
            updatedRows = data
          }
        }

        if ((!updatedRows || updatedRows.length === 0) && cleanCnpj) {
          const { data, error } = await supabase.from('contacts').update(payload).ilike('cnpj', `%${cleanCnpj}%`).select()
          if (!error && data && data.length > 0) {
            updatedRows = data
          }
        }

        if ((!updatedRows || updatedRows.length === 0) && updatedContact.company) {
          const { data, error } = await supabase.from('contacts').update(payload).ilike('company', updatedContact.company).select()
          if (!error && data && data.length > 0) {
            updatedRows = data
          }
        }

        if (!updatedRows || updatedRows.length === 0) {
          await supabase.from('contacts').upsert([{ id: updatedContact.id || `ct_${Date.now()}`, ...payload }], { onConflict: 'id' })
        }
      } catch (err) {
        console.error('Error updating contact in Supabase:', err)
      }
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

      {/* ── KPI METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total de Clientes */}
        <div 
          onClick={() => setSelectedStatus('all')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedStatus === 'all' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Total de Clientes</span>
            <span className="text-xl font-black text-[var(--white)] font-display mt-0.5 block">{metrics.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
        </div>

        {/* Card 2: Clientes Ativos */}
        <div 
          onClick={() => setSelectedStatus('ativo')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedStatus === 'ativo' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Clientes Ativos</span>
            <span className="text-xl font-black text-[var(--lime)] font-display mt-0.5 block">{metrics.ativos}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/20 text-[var(--lime)] flex items-center justify-center shrink-0">
            <CheckCircle size={15} />
          </div>
        </div>

        {/* Card 3: Inativos / Alerta */}
        <div 
          onClick={() => setSelectedStatus('inativo')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedStatus === 'inativo' ? 'border-red-500 bg-red-500/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Inativos / Alerta</span>
            <span className="text-xl font-black text-red-400 font-display mt-0.5 block">{metrics.inativos}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
            <AlertTriangle size={15} />
          </div>
        </div>

        {/* Card 4: Em Prospecção */}
        <div 
          onClick={() => setSelectedStatus('prospeccao')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedStatus === 'prospeccao' ? 'border-amber-400 bg-amber-400/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Em Prospecção</span>
            <span className="text-xl font-black text-amber-400 font-display mt-0.5 block">{metrics.prospeccao}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <UserPlus size={15} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        {/* Search — spans 2 cols */}
        <div className={`${isRep ? 'md:col-span-3' : 'md:col-span-2'} flex items-center gap-2 input w-full py-1.5 px-3`}>
          <Search size={13} className="text-[var(--gray2)] shrink-0" />
          <input
            className="bg-transparent border-none outline-none w-full text-xs text-[var(--white)] placeholder-[var(--gray2)]"
            placeholder="Buscar razão social, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Curva Filter */}
        <div>
          <select 
            className="input w-full text-xs py-1.5 px-2.5"
            value={selectedCurve}
            onChange={(e) => setSelectedCurve(e.target.value)}
          >
            <option value="all">Todas as Curvas (ABC)</option>
            <option value="A">Curva A (Faturamento Alto)</option>
            <option value="B">Curva B (Faturamento Médio)</option>
            <option value="C">Curva C (Faturamento Baixo)</option>
            <option value="D">Curva D (Prospecção)</option>
          </select>
        </div>

        {/* Rep Filter — hidden for representatives */}
        {!isRep && (
          <div>
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

        {/* Status Filter */}
        <div>
          <select 
            className="input w-full text-xs py-1.5 px-2.5"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Clientes Ativos</option>
            <option value="inativo">Inativos / Alerta</option>
            <option value="prospeccao">Em Prospecção</option>
          </select>
        </div>
      </div>

      {/* List Container — Card Grid for reps, Table for admins */}
      {isRep ? (
        /* ── REPRESENTATIVE CARD GRID VIEW ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {paginatedContacts.map(contact => {
            const isInactive = contact.status === 'inativo' || (contact.lastPurchaseDays && contact.lastPurchaseDays > 30)
            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`card p-3 border flex flex-col justify-between gap-2.5 cursor-pointer transition-all hover:border-[var(--lime)]/30 ${
                  isInactive ? 'border-red-500/30 bg-red-500/5' : 'border-[var(--line)] bg-[var(--card)]'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--white)] truncate">{contact.company || contact.name}</h4>
                    {contact.company && contact.name && (
                      <span className="text-[9px] font-mono text-[var(--gray)] block mt-0.5 truncate">Contato: {contact.name}</span>
                    )}
                    <span className="text-[9px] text-[var(--gray)] font-mono block">{contact.city}{contact.state ? ` · ${contact.state}` : ''}</span>
                  </div>
                  {(() => {
                    const s = contact.status || 'ativo'
                    if (s === 'prospeccao') return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                        Prospecção
                      </span>
                    )
                    if (s === 'inativo') return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                        Inativo
                      </span>
                    )
                    return (
                      <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-[var(--lime)]/15 text-[var(--lime)] border border-[var(--lime)]/30 shrink-0">
                        Ativo
                      </span>
                    )
                  })()}
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-[var(--gray2)] mt-0.5">
                  <span>Última compra:</span>
                  <span className="font-bold text-[var(--white)]">{contact.lastPurchaseDays ? `${contact.lastPurchaseDays}d sem comprar` : 'Sem compras'}</span>
                </div>

                <div className="border-t border-[var(--line)] pt-2 flex items-center justify-around gap-1.5">
                  {/* Google Maps Navigation */}
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contact.company || contact.name} ${contact.city || ''}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Navegar / Como chegar"
                    className="btn btn-secondary p-1.5 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[var(--lime)] text-[var(--lime)] transition-transform hover:scale-105"
                  >
                    <MapPin size={13} />
                  </a>

                  {/* Phone Call */}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone.replace(/\D/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Ligar para o Cliente"
                      className="btn btn-secondary p-1.5 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-sky-500 text-sky-400 transition-transform hover:scale-105"
                    >
                      <Phone size={13} />
                    </a>
                  )}

                  {/* WhatsApp (Original Green #25D366) */}
                  {contact.phone && (
                    <a
                      href={whatsappLink(contact.phone, `Olá ${contact.name}, tudo bem?`)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      title="Chamar no WhatsApp"
                      className="btn btn-secondary p-1.5 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[#25D366]/50 text-[#25D366] transition-transform hover:scale-105"
                    >
                      <WhatsappIcon size={14} className="text-[#25D366]" />
                    </a>
                  )}

                  {/* Registrar Atividade */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedContactForActivity(contact.id)
                      setShowActivityModal(true)
                    }}
                    title="Registrar Atividade"
                    className="btn btn-secondary p-1.5 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[var(--lime)] text-[var(--lime)] transition-transform hover:scale-105"
                  >
                    <CheckCircle size={13} />
                  </button>
                </div>
              </div>
            )
          })}

          {filteredContacts.length === 0 && (
            <div className="col-span-full card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
              Nenhum cliente encontrado na sua carteira.
            </div>
          )}
        </div>
      ) : (
        /* ── ADMIN / MANAGER COMPACT TABLE VIEW ── */
        <div className="card overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-[var(--charcoal)] shadow-sm">
                <tr className="border-b border-[var(--line)] bg-[var(--charcoal)] font-mono text-[9px] text-[var(--gray)] uppercase tracking-wider">
                  <th className="py-2.5 px-3 pl-4">Cliente / CNPJ</th>
                  <th className="py-2.5 px-3 whitespace-nowrap">Curva</th>
                  <th className="py-2.5 px-3">Cidade</th>
                  <th className="py-2.5 px-3">UF</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Representante</th>
                  <th className="py-2.5 px-3">Última Compra</th>
                  <th className="py-2.5 px-3 pr-4 text-right">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {paginatedContacts.map(contact => {
                  return (
                    <tr 
                      key={contact.id} 
                      onClick={() => setSelectedContact(contact)}
                      className={`transition-all duration-150 cursor-pointer ${contact.status === 'inativo' ? 'bg-[rgba(226,72,61,0.08)] hover:bg-[rgba(226,72,61,0.15)] border-l-4 border-l-[var(--red)]' : 'hover:bg-[var(--charcoal)]'}`}
                    >
                      {/* Cliente Info */}
                      <td className="py-2 px-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[var(--line)] flex items-center justify-center text-[var(--white)] shrink-0">
                            <Building2 size={14} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--white)] flex items-center gap-2 truncate">
                              <span className="truncate">{contact.company}</span>
                              {contact.status === 'inativo' && (
                                <span className="font-mono text-[9px] text-[var(--gray)] flex items-center gap-1 font-normal shrink-0">
                                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                                  Inativo
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--gray)] font-mono leading-tight">{contact.cnpj}</div>
                          </div>
                        </div>
                      </td>

                      {/* Curva */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span 
                          className="font-mono text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap inline-block shrink-0"
                          style={{
                            background: contact.curve === 'A' ? 'rgba(180,217,50,0.12)' : contact.curve === 'B' ? 'rgba(240,196,25,0.1)' : 'rgba(255,255,255,0.05)',
                            color: contact.curve === 'A' ? 'var(--lime)' : contact.curve === 'B' ? 'var(--yellow)' : 'var(--gray)',
                            border: `1px solid ${contact.curve === 'A' ? 'rgba(180,217,50,0.25)' : contact.curve === 'B' ? 'rgba(240,196,25,0.2)' : 'var(--line)'}`
                          }}
                        >
                          Curva {contact.curve}
                        </span>
                      </td>

                      {/* Cidade */}
                      <td className="py-2 px-3">
                        <span className="text-[11px] text-[var(--white)] font-mono">{contact.city || <span className="text-[var(--gray2)]">-</span>}</span>
                      </td>

                      {/* UF */}
                      <td className="py-2 px-3">
                        <span className="text-[11px] font-bold text-[var(--gray)] font-mono uppercase">{contact.state || '-'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2 px-3">
                        {(() => {
                          const s = contact.status || 'ativo'
                          if (s === 'prospeccao') return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-amber-400/10 border border-amber-400/25 text-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" />
                              Prospecção
                            </span>
                          )
                          if (s === 'inativo') return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold bg-red-500/10 border border-red-500/25 text-red-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                              Inativo
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

                      {/* Representante */}
                      <td className="py-2 px-3 text-xs font-semibold text-[var(--white)]">
                        <div className="flex items-center gap-1.5">
                          <User size={11} className="text-[var(--gray)] shrink-0" />
                          <span className="truncate">{contact.representative && !['Diéssica Hartmann', 'Josimar Soares', 'Elci Alcantara'].includes(contact.representative) ? contact.representative : <span className="text-[var(--gray2)] font-normal italic">Sem representante</span>}</span>
                        </div>
                      </td>

                      {/* Ultima compra */}
                      <td className="py-2 px-3">
                        <div className="flex flex-col leading-tight">
                          <span className="text-xs font-bold text-[var(--white)] font-mono">{contact.lastPurchaseDays} dias</span>
                          <span className="text-[9px] text-[var(--gray2)] uppercase tracking-wider font-mono">sem comprar</span>
                        </div>
                      </td>

                      {/* Localizacao — Google Maps icon */}
                      <td className="py-2 px-3 pr-4 text-right">
                        <button 
                          onClick={(e) => openMap(e, contact)}
                          title="Ver no Google Maps"
                          className={`inline-flex items-center justify-center transition-colors ${
                            (contact.address || contact.city)
                              ? 'text-[var(--lime)] hover:opacity-70 cursor-pointer'
                              : 'text-[var(--gray2)] opacity-30 pointer-events-none'
                          }`}
                        >
                          <MapPin size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-[var(--gray2)] font-mono">
                      Nenhum cliente encontrado com os filtros selecionados.
                    </td>
                  </tr>
                )}
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

                <span className="text-[11px] font-mono font-bold text-[var(--lime)] px-2">
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
    </div>
  )
}
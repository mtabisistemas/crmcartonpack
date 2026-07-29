'use client'

import { useState, useEffect } from 'react'
import { Deal, DealStage, STAGE_CONFIG, Appointment } from '@/types'
import { 
  X, User, Mail, Phone, Building, Calendar, DollarSign, Tag,
  MessageSquare, FileText, Send, PhoneCall, Users, CheckCircle, ArrowRight, Save, Clock, Trash2, Edit2, Plus,
  Copy, Check, MapPin, ExternalLink
} from 'lucide-react'
import { formatCurrency, whatsappLink } from '@/lib/utils'
import { getAppointmentsByDeal, saveAppointment, updateAppointment, deleteAppointment } from '@/services/appointment-service'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'

interface Activity {
  id: string
  type: 'whatsapp' | 'ligacao' | 'email' | 'reuniao' | 'nota'
  content: string
  timestamp: string
  photoUrl?: string
}

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

interface DealDrawerProps {
  deal: Deal | null
  onClose: () => void
  onUpdateDeal: (updatedDeal: Deal) => void
}

export function DealDrawer({ deal, onClose, onUpdateDeal }: DealDrawerProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'agenda' | 'orcamento'>('geral')
  const [isOpen, setIsOpen] = useState(false)
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [copiedEmailToast, setCopiedEmailToast] = useState(false)

  // Deal fields (Geral Tab)
  const [title, setTitle] = useState('')
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>(undefined)
  const [estimatedValueInput, setEstimatedValueInput] = useState('')
  const [stage, setStage] = useState<DealStage>('leads')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactCnpj, setContactCnpj] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')

  // Timeline fields (Histórico Tab)
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')

  // Briefing / Costs Calculator (Orçamento Tab)
  const [boxType, setBoxType] = useState<'acoplada' | 'duplex' | 'triplex'>('acoplada')
  const [length, setLength] = useState(300) // mm
  const [width, setWidth] = useState(200)  // mm
  const [height, setHeight] = useState(150) // mm
  const [colors, setColors] = useState(2)    // 1-4 colors
  const [quantity, setQuantity] = useState(1000)
  const [margin, setMargin] = useState(35)   // %
  const [toolingCost, setToolingCost] = useState(1200) // cliché + faca setup cost

  const [representative, setRepresentative] = useState('')

  // Agenda / Appointments tab states
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [editingAptId, setEditingAptId] = useState<string | null>(null)
  const [aptTitle, setAptTitle] = useState('')
  const [aptType, setAptType] = useState<Appointment['type']>('visita')
  const [aptDate, setAptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [aptTime, setAptTime] = useState('09:00')
  const [aptNotes, setAptNotes] = useState('')

  const [currentUser, setCurrentUser] = useState<any | null>(null)

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

  // Load deal details
  useEffect(() => {
    if (deal) {
      setIsOpen(true)
      setTitle(deal.title)
      const val = deal.final_value ?? deal.estimated_value
      setEstimatedValue(val)
      setEstimatedValueInput(formatNumberToCurrencyStr(val))
      setStage(deal.stage)

      let initialContactName = deal.contact?.name ?? ''
      let initialContactCompany = deal.contact?.company ?? ''
      if (initialContactCompany === deal.title) initialContactCompany = ''
      if (initialContactName === deal.title) initialContactName = ''

      let phone = deal.contact?.phone ?? ''
      let email = deal.contact?.email ?? ''
      let cnpj = (deal.contact as any)?.cnpj ?? ''
      let address = (deal.contact as any)?.address ?? (deal.contact as any)?.city ?? ''
      let rep = deal.assigned_to ?? (deal as any).assignedTo ?? (deal as any).assignedToName ?? (deal as any).representative ?? ''

      // Auto-populate Phone, Email, CNPJ, Address, Company, and Representative from saved contacts database
      const searchCompany = (deal.contact?.company || deal.title || '').trim().toLowerCase()
      const searchName = (deal.contact?.name || '').trim().toLowerCase()

      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
        if (raw) {
          const contacts = JSON.parse(raw)
          const match = contacts.find((c: any) => {
            const cComp = (c.company || c.name || '').trim().toLowerCase()
            const cName = (c.name || '').trim().toLowerCase()
            return (searchCompany && cComp === searchCompany) || (searchName && cName === searchName)
          })
          if (match) {
            if (match.company && !initialContactCompany) initialContactCompany = match.company
            if (match.name && !initialContactName) initialContactName = match.name
            if (match.phone && !phone) phone = match.phone
            if (match.email && !email) email = match.email
            if (match.cnpj && !cnpj) cnpj = match.cnpj
            if (match.address && !address) address = match.address
            if (match.city && !address) address = match.city
            if (match.representative && !rep) rep = match.representative
          }
        }
      } catch (e) {}

      setContactName(initialContactName)
      setContactCompany(initialContactCompany || deal.contact?.company || '')
      setContactPhone(phone)
      setContactEmail(email)
      setContactCnpj(cnpj)
      setContactAddress(address)
      setRepresentative(rep)

      // Load activities combining deal and matched contact from crm_contacts
      const loadAllActivities = () => {
        const dealActs: Activity[] = (deal as any).activities || []
        let contactActs: Activity[] = []
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
          if (raw) {
            const contacts = JSON.parse(raw)
            const match = contacts.find((c: any) => {
              const cComp = (c.company || c.name || '').trim().toLowerCase()
              const cName = (c.name || '').trim().toLowerCase()
              return (deal.contact_id && c.id === deal.contact_id) || (searchCompany && cComp === searchCompany) || (searchName && cName === searchName)
            })
            if (match && match.activities) {
              contactActs = match.activities
            }
          }
        } catch (e) {}

        const mergedMap = new Map<string, Activity>()
        dealActs.forEach(a => mergedMap.set(a.id, a))
        contactActs.forEach(a => mergedMap.set(a.id, a))

        const merged = Array.from(mergedMap.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
        setActivities(merged)
      }

      loadAllActivities()

      if (typeof window !== 'undefined') {
        window.addEventListener('storage-contacts-changed', loadAllActivities)
        window.addEventListener('storage-deals-changed', loadAllActivities)
      }

      // Load deal appointments
      const dealApts = getAppointmentsByDeal(deal.id)
      setAppointments(dealApts)
      setAptTitle(`Compromisso - ${deal.contact?.company || deal.title}`)

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage-contacts-changed', loadAllActivities)
          window.removeEventListener('storage-deals-changed', loadAllActivities)
        }
      }
    } else {
      setIsOpen(false)
    }
  }, [deal])

  const handleSaveAppointmentForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!deal || !aptTitle.trim()) return

    if (editingAptId) {
      const existing = appointments.find(a => a.id === editingAptId)
      if (existing) {
        const updated = updateAppointment({
          ...existing,
          title: aptTitle,
          type: aptType,
          date: aptDate,
          time: aptTime,
          notes: aptNotes
        })
        setAppointments(prev => prev.map(a => a.id === updated.id ? updated : a))
      }
    } else {
      const created = saveAppointment({
        deal_id: deal.id,
        deal_title: deal.title,
        contact_name: contactName,
        company_name: contactCompany,
        title: aptTitle,
        type: aptType,
        date: aptDate,
        time: aptTime,
        notes: aptNotes,
        status: 'agendado'
      })
      setAppointments(prev => [created, ...prev])
    }
    resetAptForm()
  }

  const handleStartEditApt = (apt: Appointment) => {
    setEditingAptId(apt.id)
    setAptTitle(apt.title)
    setAptType(apt.type)
    setAptDate(apt.date)
    setAptTime(apt.time)
    setAptNotes(apt.notes || '')
  }

  const handleCancelApt = (aptId: string) => {
    deleteAppointment(aptId)
    setAppointments(prev => prev.filter(a => a.id !== aptId))
    if (editingAptId === aptId) resetAptForm()
  }

  const resetAptForm = () => {
    setEditingAptId(null)
    setAptTitle(deal ? `Compromisso - ${contactCompany || deal.title}` : '')
    setAptType('visita')
    setAptDate(new Date().toISOString().split('T')[0])
    setAptTime('09:00')
    setAptNotes('')
  }

  // Hide Budget tab if stage is downgraded
  useEffect(() => {
    const showBudget = ['briefing', 'aprovacao', 'fechamento', 'perdido', 'pos_venda'].includes(stage)
    if (!showBudget && activeTab === 'orcamento') {
      setActiveTab('geral')
    }
  }, [stage, activeTab])

  if (!deal) return null

  // Calculate pricing based on briefing dimensions
  const getMaterialCostPerM2 = () => {
    switch (boxType) {
      case 'acoplada': return 6.80 // R$/m2
      case 'duplex':   return 4.50
      case 'triplex':  return 5.50
    }
  }

  // Calculate sheet area (L x W x H) in m2 (simplified box blank layout: (2*L + 2*W + 40mm joiner) * (W + H + 20mm flaps))
  const blankWidthM = (2 * length + 2 * width + 40) / 1000
  const blankHeightM = (width + height + 20) / 1000
  const boxAreaM2 = blankWidthM * blankHeightM

  const materialCost = boxAreaM2 * getMaterialCostPerM2() * quantity
  const printingCost = (colors * 0.15) * quantity
  const productionCost = materialCost + printingCost + toolingCost
  
  // Cost plus margin
  const totalSuggested = productionCost / (1 - margin / 100)
  const unitPrice = totalSuggested / quantity

  const handleEstimatedValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const cleanRaw = raw.replace(/[^\d.,]/g, '')
    setEstimatedValueInput(cleanRaw)
    const num = parseCurrencyToNumber(cleanRaw)
    setEstimatedValue(num > 0 ? num : undefined)
  }

  const handleEstimatedValueBlur = () => {
    if (estimatedValue) {
      setEstimatedValueInput(formatNumberToCurrencyStr(estimatedValue))
    }
  }

  const handleSaveGeneral = async () => {
    const upperTitle = title.trim().toUpperCase()
    const upperContactName = contactName.trim().toUpperCase()
    const upperCompany = contactCompany.trim().toUpperCase()
    const upperAddress = contactAddress.trim().toUpperCase()

    const updatedDeal: Deal = {
      ...deal,
      title: upperTitle,
      estimated_value: estimatedValue,
      stage,
      assigned_to: representative,
      contact: {
        ...deal.contact,
        id: deal.contact?.id ?? 'c-temp',
        name: upperContactName,
        phone: contactPhone,
        email: contactEmail,
        company: upperCompany,
        curve: curve,
        representative: representative,
        cnpj: contactCnpj,
        address: upperAddress,
        city: upperAddress,
        created_at: deal.contact?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any
    }

    const isClosedStage = stage === 'fechamento' || stage === 'pedido' || stage === 'pos_venda'
    const todayStr = new Date().toISOString().split('T')[0]

    const companyToFind = upperCompany

    if (companyToFind) {
      // 1. Sincroniza cache local em crm_contacts
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
        if (raw) {
          const contactsList = JSON.parse(raw)
          const updatedContacts = contactsList.map((c: any) => {
            const matchesComp = c.company && c.company.trim().toLowerCase() === companyToFind.toLowerCase()
            const matchesName = c.name && c.name.trim().toLowerCase() === companyToFind.toLowerCase()
            if (matchesComp || matchesName) {
              return {
                ...c,
                representative: representative || c.representative,
                phone: contactPhone || c.phone,
                email: contactEmail || c.email,
                cnpj: contactCnpj || c.cnpj,
                address: upperAddress || c.address,
                city: upperAddress || c.city,
                curve: curve || c.curve,
                ...(isClosedStage ? { lastPurchaseDate: todayStr, last_purchase_date: todayStr, lastPurchaseDays: 0 } : {}),
              }
            }
            return c
          })
          localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
          window.dispatchEvent(new Event('storage-contacts-changed'))
        }
      } catch (e) {}

      // 2. Sincroniza diretamente no banco de dados Supabase (tabela 'contacts')
      try {
        const { supabase } = await import('@/services/supabase-client')
        if (supabase) {
          const payload: any = {
            updated_at: new Date().toISOString()
          }
          if (representative) payload.representative = representative
          if (contactPhone) payload.phone = contactPhone
          if (contactEmail) payload.email = contactEmail
          if (contactCnpj) payload.cnpj = contactCnpj
          if (upperAddress) {
            payload.address = upperAddress
            payload.city = upperAddress
          }
          if (curve) payload.curve = curve
          if (isClosedStage) payload.last_purchase_date = todayStr

          if (deal.contact?.id && !deal.contact.id.startsWith('c-')) {
            await supabase.from('contacts').update(payload).eq('id', deal.contact.id)
          } else if ((deal.contact as any)?.cnpj || contactCnpj) {
            await supabase.from('contacts').update(payload).eq('cnpj', (deal.contact as any)?.cnpj || contactCnpj)
          } else {
            await supabase.from('contacts').update(payload).ilike('company', companyToFind)
          }
          console.log('[DealDrawer] Contato sincronizado com sucesso no Supabase!')
        }
      } catch (err) {
        console.error('[DealDrawer] Erro ao atualizar contato no Supabase:', err)
      }
    }

    onUpdateDeal(updatedDeal)
    setIsSavedSuccess(true)
    setTimeout(() => setIsSavedSuccess(false), 2500)
  }

  const handleApplyBudgetToDeal = () => {
    const roundedValue = Math.round(totalSuggested)
    setEstimatedValue(roundedValue)
    const updatedDeal: Deal = {
      ...deal,
      estimated_value: roundedValue,
      contact: {
        ...deal.contact,
        id: deal.contact?.id ?? 'c-temp',
        name: contactName,
        phone: contactPhone,
        email: contactEmail,
        company: contactCompany,
        curve: curve,
        created_at: deal.contact?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    onUpdateDeal(updatedDeal)
    
    // Log in timeline
    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const budgetLog: Activity = {
      id: String(Date.now()),
      type: 'nota',
      content: `Ficha técnica atualizada: Caixa ${boxType.toUpperCase()} (${length}x${width}x${height}mm). Orçamento recalculado para ${formatCurrency(roundedValue)} (${quantity} un. a ${formatCurrency(unitPrice)}/un.).`,
      timestamp: timestampStr
    }
    setActivities(prev => [budgetLog, ...prev])
    setActiveTab('historico')
  }

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim() || !deal) return

    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const authorName = currentUser?.name || currentUser?.nome || 'Usuário'

    const activity: Activity = {
      id: `act_${Date.now()}`,
      type: activityType,
      content: newNote,
      timestamp: timestampStr,
      user_name: authorName,
      userName: authorName,
      author: authorName
    } as any

    const updatedActs = [activity, ...activities]
    setActivities(updatedActs)
    setNewNote('')

    // Update deal activities
    const updatedDeal: Deal = {
      ...deal,
      activities: updatedActs
    }
    onUpdateDeal(updatedDeal)

    // Save to contact in crm_contacts
    if (typeof window !== 'undefined') {
      const searchCompany = (deal.contact?.company || deal.title || '').trim().toLowerCase()
      const searchName = (deal.contact?.name || '').trim().toLowerCase()
      try {
        const raw = localStorage.getItem('crm_contacts')
        if (raw) {
          const contacts = JSON.parse(raw)
          const updatedContacts = contacts.map((c: any) => {
            const matchesId = deal.contact_id && c.id === deal.contact_id
            const matchesComp = searchCompany && c.company && c.company.toLowerCase().trim() === searchCompany
            const matchesName = searchName && c.name && c.name.toLowerCase().trim() === searchName
            if (matchesId || matchesComp || matchesName) {
              return {
                ...c,
                activities: [activity, ...(c.activities || [])]
              }
            }
            return c
          })
          localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
          window.dispatchEvent(new Event('storage-contacts-changed'))
          window.dispatchEvent(new Event('storage-deals-changed'))
        }
      } catch (e) {}
    }
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare size={12} className="text-[var(--lime)]" />
      case 'ligacao':  return <PhoneCall size={12} className="text-sky-400" />
      case 'email':    return <Mail size={12} className="text-purple-400" />
      case 'reuniao':  return <Users size={12} className="text-yellow-400" />
      case 'nota':     return <FileText size={12} className="text-gray-400" />
    }
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div 
        className={`drawer-overlay transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`drawer-container transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--card)]">
          <div>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase" style={{
              color: STAGE_CONFIG[stage].color,
              background: STAGE_CONFIG[stage].color + '15',
              border: `1px solid ${STAGE_CONFIG[stage].color}25`
            }}>
              {STAGE_CONFIG[stage].label}
            </span>
            <h2 className="font-display text-lg text-[var(--white)] mt-1.5">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Geral
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'agenda' ? 'active' : ''}`}
            onClick={() => setActiveTab('agenda')}
          >
            Agenda
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
          {['briefing', 'aprovacao', 'fechamento', 'perdido', 'pos_venda'].includes(stage) && (
            <button 
              className={`drawer-tab-btn ${activeTab === 'orcamento' ? 'active' : ''}`}
              onClick={() => setActiveTab('orcamento')}
            >
              Orçamento
            </button>
          )}
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-5">
              
              {/* Seção Negócio */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Dados do Negócio
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="label">Título da Oportunidade</label>
                  <input 
                    type="text" 
                    className="input uppercase" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value.toUpperCase())}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Valor Estimado</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-mono font-bold text-[var(--lime)] select-none pointer-events-none">
                        R$
                      </span>
                      <input 
                        type="text" 
                        className="input w-full !pl-9 font-mono text-xs font-bold text-[var(--lime)]" 
                        placeholder="0,00"
                        value={estimatedValueInput} 
                        onChange={handleEstimatedValueChange}
                        onBlur={handleEstimatedValueBlur}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Etapa Funil</label>
                    <select 
                      className="input" 
                      value={stage}
                      onChange={(e) => setStage(e.target.value as DealStage)}
                    >
                      {Object.keys(STAGE_CONFIG).map((key) => (
                        <option key={key} value={key}>
                          {STAGE_CONFIG[key as DealStage].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção Contato / Cliente */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Dados do Cliente
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Nome do Contato</label>
                  <div className="relative flex items-center">
                    <User size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      className="input w-full !pl-9 uppercase" 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Empresa</label>
                  <div className="relative flex items-center">
                    <Building size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      className="input w-full !pl-9 uppercase" 
                      value={contactCompany} 
                      onChange={(e) => setContactCompany(e.target.value.toUpperCase())}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">CNPJ</label>
                    <div className="relative flex items-center">
                      <FileText size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        className="input w-full !pl-9 font-mono text-xs" 
                        placeholder="00.000.000/0000-00"
                        value={contactCnpj} 
                        onChange={(e) => setContactCnpj(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Telefone (WhatsApp)</label>
                    <div className="relative flex items-center">
                      <Phone size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        className="input w-full !pl-9 !pr-9 font-mono text-xs" 
                        placeholder="(00) 00000-0000"
                        value={contactPhone} 
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                      {contactPhone && (
                        <a
                          href={whatsappLink(contactPhone)}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute right-2.5 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                          title="Chamar no WhatsApp"
                        >
                          <WhatsappIcon size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="label">E-mail</label>
                    {contactEmail && (
                      <button 
                        type="button" 
                        onClick={() => {
                          navigator.clipboard.writeText(contactEmail)
                          setCopiedEmailToast(true)
                          setTimeout(() => setCopiedEmailToast(false), 2000)
                        }} 
                        className="text-[9px] font-bold text-[var(--lime)] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                        title="Copiar E-mail"
                      >
                        {copiedEmailToast ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{copiedEmailToast ? 'COPIADO!' : 'COPIAR'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <Mail size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="email" 
                      className="input w-full !pl-9 font-mono text-xs" 
                      placeholder="email@empresa.com.br"
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Endereço Completo</label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                      <MapPin size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        className="input w-full !pl-9 uppercase text-xs font-mono" 
                        placeholder="RUA / AVENIDA, NÚMERO, BAIRRO, CIDADE - UF"
                        value={contactAddress} 
                        onChange={(e) => setContactAddress(e.target.value.toUpperCase())}
                      />
                    </div>
                    <a
                      href={contactAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contactAddress)}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver endereço no mapa"
                      className={`flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] transition-colors ${contactAddress ? 'text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
                    >
                      <MapPin size={16} />
                    </a>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="label">Representante / Vendedor</label>
                    <span className="text-[10px] font-mono text-[var(--gray2)]">(Altere no cadastro do cliente)</span>
                  </div>
                  <div className="relative flex items-center">
                    <Users size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      readOnly
                      disabled
                      className="input w-full !pl-9 bg-[var(--charcoal)] opacity-75 cursor-not-allowed text-[var(--gray)] font-medium" 
                      placeholder="Não definido"
                      value={representative || 'Não definido'} 
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: AGENDA */}
          {activeTab === 'agenda' && (
            <div className="flex flex-col gap-5">
              {/* Form para novo/edição compromisso */}
              <form onSubmit={handleSaveAppointmentForm} className="flex flex-col gap-3 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{editingAptId ? 'Editar Compromisso' : 'Agendar Novo Compromisso'}</span>
                  </span>
                  {editingAptId && (
                    <button 
                      type="button" 
                      onClick={resetAptForm}
                      className="text-[10px] text-gray-400 hover:text-white underline cursor-pointer"
                    >
                      Cancelar edição
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Título / Assunto</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Ex: Reunião de apresentação de orçamento"
                    value={aptTitle}
                    onChange={(e) => setAptTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Tipo</label>
                    <select 
                      className="input bg-[var(--charcoal)] cursor-pointer"
                      value={aptType}
                      onChange={(e) => setAptType(e.target.value as any)}
                    >
                      <option value="visita">Visita</option>
                      <option value="reuniao">Reunião</option>
                      <option value="ligacao">Ligação</option>
                      <option value="email">E-mail</option>
                      <option value="proposta">Proposta</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Data</label>
                    <input 
                      type="date" 
                      className="input bg-[var(--charcoal)] text-white cursor-pointer"
                      required
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Hora</label>
                    <input 
                      type="time" 
                      className="input bg-[var(--charcoal)] text-white cursor-pointer"
                      required
                      value={aptTime}
                      onChange={(e) => setAptTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Observações (opcional)</label>
                  <textarea 
                    className="input min-h-[60px] resize-none"
                    placeholder="Detalhes adicionais do compromisso..."
                    value={aptNotes}
                    onChange={(e) => setAptNotes(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary text-xs py-2 px-4 font-bold flex items-center justify-center gap-2 uppercase tracking-wider text-[#060606] cursor-pointer mt-1">
                  <Plus size={14} />
                  <span>{editingAptId ? 'Atualizar Compromisso' : 'Salvar no Agendamento'}</span>
                </button>
              </form>

              {/* Lista de compromissos salvos para este negócio */}
              <div className="flex flex-col gap-3">
                <div className="text-xs font-bold text-[var(--white)] uppercase tracking-wider font-mono flex items-center justify-between border-b border-[var(--line)] pb-2">
                  <span>Compromissos Agendados</span>
                  <span className="text-[10px] text-[var(--lime)] bg-lime-500/10 px-2 py-0.5 rounded-full border border-lime-500/20">
                    {appointments.length} agendamentos
                  </span>
                </div>

                {appointments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/20 border border-[var(--line)] text-center text-xs text-[var(--gray2)] font-mono">
                    Nenhum compromisso agendado para este negócio.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {appointments.map(apt => (
                      <div 
                        key={apt.id} 
                        className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all ${
                          apt.status === 'cancelado' 
                            ? 'bg-red-950/10 border-red-500/20 opacity-60' 
                            : 'bg-[var(--card)] border-[var(--line)] hover:border-[var(--lime)]/40'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              apt.type === 'visita' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                              apt.type === 'reuniao' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              apt.type === 'ligacao' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                            }`}>
                              {apt.type}
                            </span>
                            <h4 className="text-xs font-bold text-[var(--white)]">{apt.title}</h4>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              title="Editar compromisso"
                              onClick={() => handleStartEditApt(apt)}
                              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[var(--line)] cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              title="Cancelar agendamento"
                              onClick={() => handleCancelApt(apt.id)}
                              className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--gray2)]">
                          <span className="flex items-center gap-1 text-[var(--lime)] font-bold">
                            <Calendar size={12} />
                            {apt.date.split('-').reverse().join('/')}
                          </span>
                          <span className="flex items-center gap-1 text-[var(--white)] font-bold">
                            <Clock size={12} />
                            {apt.time}
                          </span>
                        </div>

                        {apt.notes && (
                          <p className="text-[11px] text-gray-300 bg-black/30 p-2 rounded-lg border border-[var(--line)]/50 mt-1">
                            {apt.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: HISTÓRICO / TIMELINE */}
          {activeTab === 'historico' && (
            <div className="flex flex-col gap-6">
              
              {/* Registrar nova atividade */}
              <div className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-[var(--white)] flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-[var(--lime)]" />
                    <span>Registrar Nova Atividade</span>
                  </h4>
                  <p className="text-[11px] text-[var(--gray2)] leading-tight">
                    Lance reuniões, ligações, conversas de WhatsApp, e-mails ou anotações nesta oportunidade.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivityModal(true)}
                  className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 font-bold shadow-lg shrink-0 cursor-pointer w-full sm:w-auto justify-center"
                >
                  <CheckCircle size={15} />
                  <span>Registrar Atividade</span>
                </button>
              </div>

              {/* Timeline list */}
              {activities.length === 0 ? (
                <div className="card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
                  Nenhum histórico registrado nesta oportunidade. Clique no botão acima para registrar uma nova atividade.
                </div>
              ) : (
                <div className="relative pl-6 flex flex-col gap-6 border-l border-[var(--line)] ml-3 mt-2">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Circle icon */}
                      <div className="absolute -left-[33px] top-0 w-[22px] h-[22px] rounded-full bg-[var(--card)] border border-[var(--line)] flex items-center justify-center">
                        {getActivityIcon(act.type)}
                      </div>
                      
                      {/* Time */}
                      <div className="font-mono text-[9px] text-[var(--gray2)] mb-1">
                        {act.timestamp}{(act as any).user_name ? ` • Por: ${(act as any).user_name}` : ((act as any).userName ? ` • Por: ${(act as any).userName}` : ((act as any).author ? ` • Por: ${(act as any).author}` : ''))}
                      </div>

                      {/* Content */}
                      <div className="text-xs text-[var(--white)] bg-[var(--card)] border border-[var(--line)] rounded-lg p-3 leading-relaxed space-y-2">
                        <div>{act.content}</div>
                        {(act as any).photoUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-[var(--line)] max-w-xs bg-black">
                            <img 
                              src={(act as any).photoUrl} 
                              alt="Anexo da Atividade" 
                              className="w-full h-auto max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open((act as any).photoUrl, '_blank')}
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

          {/* TAB 3: ORÇAMENTO (BRIEFING & CUSTOS) */}
          {activeTab === 'orcamento' && (
            <div className="flex flex-col gap-5">
              
              {/* Ficha de Briefing Técnico */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Briefing Técnico
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Estrutura do Material</label>
                  <select 
                    className="input" 
                    value={boxType} 
                    onChange={(e) => setBoxType(e.target.value as any)}
                  >
                    <option value="acoplada">Microondulado Acoplado (Resistente)</option>
                    <option value="duplex">Cartão Duplex (Leve)</option>
                    <option value="triplex">Cartão Triplex (Premium)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Comprim. (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Largura (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Altura (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Cores Impressão</label>
                    <select 
                      className="input" 
                      value={colors} 
                      onChange={(e) => setColors(Number(e.target.value) || 1)}
                    >
                      <option value={1}>1 Cor (Mono)</option>
                      <option value={2}>2 Cores (Padrão)</option>
                      <option value={3}>3 Cores</option>
                      <option value={4}>4 Cores (Policromia)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Tiragem (Unidades)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 100)}
                    />
                  </div>
                </div>
              </div>

              {/* Ficha de Custos e Margens */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Custos e Lucratividade
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Ferramental Setup (Faca/Clichê)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs text-gray-500 font-mono">R$</span>
                      <input 
                        type="number" 
                        className="input pl-8" 
                        value={toolingCost}
                        onChange={(e) => setToolingCost(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="label">Margem Comercial</label>
                      <span className="text-xs text-[var(--lime)] font-mono font-bold">{margin}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="70" 
                      className="w-full accent-[var(--lime)] h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-2.5" 
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Resumo Faturamento Sugerido */}
                <div className="bg-[var(--card2)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--gray)]">Custo Total de Produção:</span>
                    <span className="font-mono text-[var(--white)] font-bold">{formatCurrency(productionCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-[var(--line)] pb-2 mb-2">
                    <span className="text-[var(--gray)]">Área de Papelão (Unitária):</span>
                    <span className="font-mono text-[var(--white)] font-bold">{boxAreaM2.toFixed(3)} m²</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--white)] opacity-80">Preço Unitário Sugerido:</span>
                    <span className="font-mono text-sm font-black text-[var(--lime)]">{formatCurrency(unitPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--white)] opacity-80">Valor Total Sugerido:</span>
                    <span className="font-mono text-lg font-black text-[var(--lime)]" style={{ filter: 'drop-shadow(0 0 8px rgba(180,217,50,0.25))' }}>
                      {formatCurrency(totalSuggested)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleApplyBudgetToDeal} 
                  className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle size={15} />
                  <span>Aplicar Valor Sugerido ao Negócio</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer for Saving Changes */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
          {isSavedSuccess ? (
            <div className="flex items-center gap-2 text-xs text-[var(--lime)] font-mono font-bold animate-fade-in">
              <CheckCircle size={15} />
              <span>Alterações salvas com sucesso!</span>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--gray2)] font-mono">
              Salvar para atualizar oportunidade.
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-3 font-bold uppercase tracking-wider"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSaveGeneral}
              className="btn btn-primary text-xs py-2 px-4 font-bold uppercase tracking-wider text-[#060606] flex items-center gap-2"
            >
              <Save size={14} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>

      {showActivityModal && (() => {
        let savedContacts: any[] = []
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
          if (raw) savedContacts = JSON.parse(raw)
        } catch (e) {}

        const dealComp = (deal?.contact?.company || deal?.title || '').trim().toLowerCase()
        const dealName = (deal?.contact?.name || '').trim().toLowerCase()
        const dealContactId = deal?.contact_id || (deal?.contact as any)?.id

        let matchedContact = savedContacts.find(c => 
          (dealContactId && c.id === dealContactId) ||
          (dealComp && (c.company || c.name || '').trim().toLowerCase() === dealComp) ||
          (dealName && (c.name || '').trim().toLowerCase() === dealName)
        )

        if (!matchedContact && deal) {
          matchedContact = {
            id: dealContactId || `cnt_${Date.now()}`,
            name: deal.contact?.name || deal.title,
            company: deal.contact?.company || deal.title,
            phone: deal.contact?.phone || '',
            city: (deal as any).city || '',
            state: (deal as any).uf || ''
          }
          savedContacts = [matchedContact, ...savedContacts]
        }

        const preselectedId = matchedContact ? matchedContact.id : (dealContactId || '')

        return (
          <RegisterActivityModal
            isOpen={showActivityModal}
            onClose={() => setShowActivityModal(false)}
            contactsList={savedContacts}
            preselectedContactId={preselectedId}
            onSuccess={() => {
              setShowActivityModal(false)
            }}
          />
        )
      })()}
    </>
  )
}

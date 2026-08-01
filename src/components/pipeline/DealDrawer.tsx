'use client'

import { useState, useEffect } from 'react'
import { Deal, DealStage, STAGE_CONFIG, Appointment } from '@/types'
import { 
  X, User, Mail, Phone, Building, Calendar, DollarSign, Tag,
  MessageSquare, FileText, Send, PhoneCall, Users, CheckCircle, ArrowRight, Save, Clock, Trash2, Edit2, Plus,
  Copy, Check, MapPin, ExternalLink, Loader2, Lock, Upload, Paperclip
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
  onDeleteDeal?: (dealId: string) => void
  onOpenCalendarModal?: () => void
}

export function DealDrawer({ deal, onClose, onUpdateDeal, onDeleteDeal, onOpenCalendarModal }: DealDrawerProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'agenda' | 'orcamento'>('geral')
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [copiedEmailToast, setCopiedEmailToast] = useState(false)

  // Deal fields (Geral Tab)
  const [title, setTitle] = useState('')
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>(undefined)
  const [estimatedValueInput, setEstimatedValueInput] = useState('')
  const [probability, setProbability] = useState<number>(50)
  const [stage, setStage] = useState<DealStage>('leads')
  const [orderNumber, setOrderNumber] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactPhone2, setContactPhone2] = useState('')
  const [showContactPhone2, setShowContactPhone2] = useState(false)
  const [contactEmail, setContactEmail] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [contactCnpj, setContactCnpj] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [contactComplement, setContactComplement] = useState('')
  const [contactBairro, setContactBairro] = useState('')
  const [contactCep, setContactCep] = useState('')
  const [contactCity, setContactCity] = useState('')
  const [contactState, setContactState] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')

  // Timeline fields (Histórico Tab)
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')

  // Orçamento Tab (Valor Total, Condição de Pagamento e Anexo)
  const [budgetValue, setBudgetValue] = useState<number>(0)
  const [budgetValueInput, setBudgetValueInput] = useState<string>('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [budgetAttachment, setBudgetAttachment] = useState<{ name: string; url: string; type?: string } | null>(null)

  const handleBudgetValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const cleanRaw = raw.replace(/[^\d.,]/g, '')
    setBudgetValueInput(cleanRaw)
    const num = parseCurrencyToNumber(cleanRaw)
    setBudgetValue(num)
    setEstimatedValue(num > 0 ? num : undefined)
    setEstimatedValueInput(formatNumberToCurrencyStr(num))
  }

  const handleBudgetValueBlur = () => {
    if (budgetValue) {
      setBudgetValueInput(formatNumberToCurrencyStr(budgetValue))
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setBudgetAttachment({
          name: file.name,
          type: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          url: evt.target.result as string
        })
      }
    }
    reader.readAsDataURL(file)
  }

  const openAttachment = (att: { name: string; url: string; type?: string }) => {
    if (!att || !att.url) return
    if (att.url.startsWith('data:')) {
      try {
        const arr = att.url.split(',')
        const mimeMatch = arr[0].match(/:(.*?);/)
        const mime = mimeMatch ? mimeMatch[1] : (att.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/png')
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, '_blank')
        return
      } catch (e) {
        console.error('Error opening base64 blob:', e)
      }
    }
    window.open(att.url, '_blank')
  }

  const [representative, setRepresentative] = useState('')
  const [isLoadingContactDetails, setIsLoadingContactDetails] = useState(false)

  // Agenda / Appointments tab states
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [editingAptId, setEditingAptId] = useState<string | null>(null)
  const [aptTitle, setAptTitle] = useState('')
  const [aptType, setAptType] = useState<Appointment['type']>('visita')
  const [aptDate, setAptDate] = useState(() => new Date().toISOString().split('T')[0])
  const [aptTime, setAptTime] = useState('09:00')
  const [aptNotes, setAptNotes] = useState('')

  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false)

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
      const val = (deal.estimated_value && deal.estimated_value > 0) ? deal.estimated_value : (deal.final_value || 0)
      setEstimatedValue(val > 0 ? val : undefined)
      setEstimatedValueInput(formatNumberToCurrencyStr(val))
      setProbability(deal.probability ?? 50)
      setStage(deal.stage)
      setOrderNumber(deal.order_number || '')

      const b = (deal as any).budget || {}
      const bVal = b.totalAmount ?? b.value ?? (deal as any).budget_value ?? val ?? 0
      const pTerms = b.paymentTerms || (deal as any).payment_terms || (deal as any).paymentTerms || ''
      const pAtt = b.attachment || (deal as any).attachment || (deal as any).budget_attachment || null

      setBudgetValue(bVal)
      setBudgetValueInput(formatNumberToCurrencyStr(bVal))
      setPaymentTerms(pTerms)
      setBudgetAttachment(pAtt)

      let initialContactName = deal.contact?.name ?? ''
      let initialContactCompany = deal.contact?.company ?? ''
      if (initialContactCompany === deal.title) initialContactCompany = ''
      if (initialContactName === deal.title) initialContactName = ''

      let phone = deal.contact?.phone ?? ''
      let phone2 = (deal.contact as any)?.phone2 ?? (deal.contact as any)?.secondary_phone ?? ''
      let email = deal.contact?.email ?? ''
      let cnpj = (deal.contact as any)?.cnpj ?? ''
      let address = (deal.contact as any)?.address ?? ''
      let complement = (deal.contact as any)?.complement ?? ''
      let bairro = (deal.contact as any)?.bairro ?? ''
      let cep = (deal.contact as any)?.cep ?? ''
      let city = (deal.contact as any)?.city ?? ''
      let state = (deal.contact as any)?.state ?? ''
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
            return (deal.contact_id && c.id === deal.contact_id) || (searchCompany && cComp === searchCompany) || (searchName && cName === searchName)
          })
          if (match) {
            if (match.company && !initialContactCompany) initialContactCompany = match.company
            if (match.name && !initialContactName) initialContactName = match.name
            if (match.phone && !phone) phone = match.phone
            if (match.phone2 && !phone2) phone2 = match.phone2
            if (match.email && !email) email = match.email
            if (match.cnpj && !cnpj) cnpj = match.cnpj
            if (match.address && !address) address = match.address
            if (match.complement && !complement) complement = match.complement
            if (match.bairro && !bairro) bairro = match.bairro
            if (match.cep && !cep) cep = match.cep
            if (match.city && !city) city = match.city
            if (match.state && !state) state = match.state
            if (match.representative && !rep) rep = match.representative
          }
        }
      } catch (e) {}

      setContactName(initialContactName)
      setContactCompany(initialContactCompany || deal.contact?.company || '')
      setContactPhone(phone)
      setContactPhone2(phone2)
      setShowContactPhone2(!!phone2)
      setContactEmail(email)
      setContactCnpj(cnpj)
      setContactAddress(address)
      setContactComplement(complement)
      setContactBairro(bairro)
      setContactCep(cep)
      setContactCity(city)
      setContactState(state)
      setRepresentative(rep)

      // Async fetch from /api/contacts if details are incomplete
      const isMissingDetails = !phone || !email || !address || !bairro || !cep
      if (isMissingDetails) {
        setIsLoadingContactDetails(true)
        fetch('/api/contacts', { cache: 'no-store' })
          .then(res => res.json())
          .then(json => {
            if (json.success && Array.isArray(json.contacts)) {
              const targetCnpj = (cnpj || '').replace(/\D/g, '')
              const match = json.contacts.find((c: any) => {
                const cComp = (c.company || c.name || '').trim().toLowerCase()
                const cName = (c.name || '').trim().toLowerCase()
                const cCnpj = (c.cnpj || '').replace(/\D/g, '')
                return (deal.contact_id && c.id === deal.contact_id) ||
                  (targetCnpj && cCnpj && targetCnpj === cCnpj) ||
                  (searchCompany && cComp === searchCompany) ||
                  (searchName && cName === searchName)
              })
              if (match) {
                if (match.name) setContactName(match.name)
                if (match.company) setContactCompany(match.company)
                if (match.phone) setContactPhone(match.phone)
                if (match.email) setContactEmail(match.email)
                if (match.cnpj) setContactCnpj(match.cnpj)
                if (match.address) setContactAddress(match.address)
                if (match.bairro) setContactBairro(match.bairro)
                if (match.cep) setContactCep(match.cep)
                if (match.city) setContactCity(match.city)
                if (match.state) setContactState(match.state)
                if (match.representative) setRepresentative(match.representative)
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsLoadingContactDetails(false)
          })
      } else {
        setIsLoadingContactDetails(false)
      }

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

  // Hide Budget tab if stage is before briefing
  useEffect(() => {
    const showBudget = ['briefing', 'aprovacao', 'fechamento', 'pedido', 'pos_venda', 'perdido'].includes(stage)
    if (!showBudget && activeTab === 'orcamento') {
      setActiveTab('geral')
    }
  }, [stage, activeTab])

  if (!deal) return null

  const showBudgetTab = ['briefing', 'aprovacao', 'fechamento', 'pedido', 'pos_venda', 'perdido'].includes(stage)

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
    setIsSaving(true)
    try {
      const upperTitle = title.trim().toUpperCase()

      const budgetObj = {
        totalAmount: budgetValue || estimatedValue || 0,
        paymentTerms: paymentTerms || '',
        attachment: budgetAttachment || null
      }

      const updatedDeal: Deal = {
        ...deal,
        title: upperTitle,
        estimated_value: (budgetValue && budgetValue > 0) ? budgetValue : (estimatedValue || 0),
        probability: probability,
        stage,
        order_number: orderNumber || deal.order_number,
        assigned_to: representative,
        budget: budgetObj as any,
        ...(paymentTerms ? { payment_terms: paymentTerms } as any : {}),
        ...(budgetAttachment ? { attachment: budgetAttachment, budget_attachment: budgetAttachment } as any : {}),
        contact: {
          ...deal.contact,
          id: deal.contact?.id ?? 'c-temp',
          name: contactName,
          phone: contactPhone,
          email: contactEmail,
          company: contactCompany,
          curve: curve,
          representative: representative,
          cnpj: contactCnpj,
          address: contactAddress,
          bairro: contactBairro,
          cep: contactCep,
          city: contactCity,
          state: contactState,
          created_at: deal.contact?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any
      }

      const isClosedStage = stage === 'fechamento' || stage === 'pedido' || stage === 'pos_venda'
      const todayStr = new Date().toISOString().split('T')[0]

      onUpdateDeal(updatedDeal)

      // Sync local storage deals list so budget & attachments persist locally immediately
      if (typeof window !== 'undefined') {
        try {
          const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
          if (rawDeals) {
            const list = JSON.parse(rawDeals)
            const updatedList = list.map((d: any) => d.id === updatedDeal.id ? updatedDeal : d)
            localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(updatedList))
            window.dispatchEvent(new Event('storage-deals-changed'))
          }
        } catch (e) {}
      }

      // Sync closed order log in localStorage crm_contacts with representative snapshot
      if (stage === 'pedido' && (orderNumber || deal.order_number) && typeof window !== 'undefined') {
        try {
          const rawContacts = localStorage.getItem('crm_contacts')
          if (rawContacts) {
            const list = JSON.parse(rawContacts)
            const cleanComp = (contactCompany || title || '').trim().toLowerCase()
            const finalOrdNum = orderNumber || deal.order_number || `PED-${Date.now().toString().slice(-6)}`
            const dealVal = (deal.final_value && deal.final_value > 0) ? deal.final_value : (estimatedValue || deal.estimated_value || 0)

            const updatedContacts = list.map((c: any) => {
              const matchesId = c.id === deal.contact_id || c.id === deal.contact?.id
              const matchesComp = cleanComp && (c.company || c.name || '').trim().toLowerCase() === cleanComp
              if (matchesId || matchesComp) {
                const newOrderObj = {
                  id: `ord_${Date.now()}`,
                  order_number: finalOrdNum,
                  deal_id: deal.id,
                  deal_title: title,
                  value: dealVal,
                  date: todayStr,
                  vendor: representative || c.representative || c.assignedTo || c.assigned_to || 'Vendedor'
                }
                const existingOrders = Array.isArray(c.orders) ? c.orders : []
                const updatedOrders = [newOrderObj, ...existingOrders.filter((o: any) => o.order_number !== finalOrdNum)]
                return { ...c, orders: updatedOrders, lastPurchaseDate: todayStr }
              }
              return c
            })
            localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
            window.dispatchEvent(new Event('storage-contacts-changed'))
          }
        } catch (e) {}
      }

      // Save deal update to Supabase via /api/deals
      try {
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([updatedDeal])
        })
      } catch (e) {}

      // Only update last purchase date on contact if deal is closed
      if (isClosedStage && (deal.contact?.id || contactCompany)) {
        try {
          await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: deal.contact?.id,
              company: contactCompany,
              lastPurchaseDate: todayStr,
              status: 'ativo'
            })
          })
        } catch (err) {}
      }

      setIsSavedSuccess(true)
      setTimeout(() => setIsSavedSuccess(false), 2500)
    } catch (e) {
      console.error('Error saving deal:', e)
    } finally {
      setIsSaving(false)
    }
  }

  const handleApplyBudgetToDeal = () => {
    const roundedValue = Math.round(budgetValue)
    setEstimatedValue(roundedValue)
    setEstimatedValueInput(formatNumberToCurrencyStr(roundedValue))
    const updatedDeal: Deal = {
      ...deal,
      estimated_value: roundedValue,
      budget: {
        totalAmount: roundedValue,
        paymentTerms,
        attachment: budgetAttachment
      } as any
    }
    onUpdateDeal(updatedDeal)
    
    // Log in timeline
    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const budgetLog: Activity = {
      id: String(Date.now()),
      type: 'nota',
      content: `Orçamento comercial aplicado ao negócio no valor total de ${formatCurrency(roundedValue)}.${paymentTerms ? ` Condição de pagamento: ${paymentTerms}` : ''}`,
      timestamp: timestampStr
    }
    setActivities(prev => [budgetLog, ...prev])
    setIsSavedSuccess(true)
    setTimeout(() => setIsSavedSuccess(false), 2500)
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

    // Persist activity to Supabase via /api/contacts
    const searchCompany = (deal.contact?.company || deal.title || '').trim()
    fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: deal.contact_id || deal.contact?.id,
        company: searchCompany,
        activities: [activity]
      })
    }).catch(() => {})
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
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--card)]">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase" style={{
              color: STAGE_CONFIG[stage].color,
              background: STAGE_CONFIG[stage].color + '15',
              border: `1px solid ${STAGE_CONFIG[stage].color}25`
            }}>
              {STAGE_CONFIG[stage].label}
            </span>
            <h2 className="font-display text-base sm:text-lg text-[var(--white)] mt-1 truncate">{title}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(currentUser?.papel === 'admin' || currentUser?.role === 'admin' || currentUser?.email === 'juliano@cartonpack.com.br' || true) && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(true)}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold border-red-500/40 text-red-400 hover:bg-red-500/10 transition-colors shadow-sm cursor-pointer"
                title="Excluir negócio do funil (Apenas Admin)"
              >
                <Trash2 size={14} className="text-red-400" />
                <span className="hidden sm:inline">Excluir</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowActivityModal(true)}
              className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 font-bold border-[var(--lime)]/30 text-[var(--lime)] hover:bg-[var(--lime)]/10 transition-colors shadow-sm cursor-pointer"
              title="Registrar Atividade Comercial"
            >
              <CheckCircle size={14} className="text-[var(--lime)]" />
              <span className="hidden sm:inline">Registrar Atividade</span>
              <span className="sm:hidden">Atividade</span>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-[var(--white)] p-1.5 rounded-md hover:bg-[var(--line)] transition-colors">
              <X size={18} />
            </button>
          </div>
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
          {showBudgetTab && (
            <button 
              className={`drawer-tab-btn ${activeTab === 'orcamento' ? 'active' : ''}`}
              onClick={() => setActiveTab('orcamento')}
            >
              Orçamento
            </button>
          )}
          <button 
            className={`drawer-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
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

                {/* Barra de Probabilidade de Fechamento com Cores Dinâmicas (Idêntica aos Prints 1-4) */}
                {(() => {
                  const getProbColor = (p: number) => {
                    if (p <= 30) return { hex: '#ef4444', textClass: 'text-red-400' }
                    if (p <= 60) return { hex: '#f59e0b', textClass: 'text-amber-400' }
                    if (p <= 80) return { hex: '#b4d932', textClass: 'text-[var(--lime)]' }
                    return { hex: '#10b981', textClass: 'text-emerald-400' }
                  }
                  const probColor = getProbColor(probability)
                  return (
                    <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)]">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                          PROB. FECHAMENTO
                        </label>
                        <span className={`text-sm font-black font-mono ${probColor.textClass}`}>
                          {probability}%
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          step="5"
                          value={probability}
                          onChange={(e) => setProbability(Number(e.target.value))}
                          style={{
                            background: `linear-gradient(to right, ${probColor.hex} 0%, ${probColor.hex} ${probability}%, #18181b ${probability}%, #18181b 100%)`,
                            accentColor: probColor.hex
                          }}
                          className="w-full h-2 rounded-lg appearance-none cursor-pointer border border-[var(--line)]"
                        />
                      </div>
                    </div>
                  )
                })()}

                {(stage === 'pedido' || orderNumber) && (
                  <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[var(--charcoal)] border border-[var(--lime)]/40 animate-fade-in">
                    <label className="text-xs font-mono font-bold text-[var(--lime)] uppercase flex items-center justify-between">
                      <span>Número do Pedido</span>
                      <span className="text-[10px] text-amber-400 font-normal">Obrigatório p/ Pedido Fechado</span>
                    </label>
                    <input
                      type="text"
                      className="input uppercase text-xs font-mono font-bold text-[var(--white)] bg-[var(--card)] border-[var(--line)] focus:border-[var(--lime)]"
                      placeholder="Ex: PED-2026-8910"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    />
                  </div>
                )}
              </div>

              {/* Seção Contato / Cliente */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                    Dados do Cliente
                  </div>
                  {isLoadingContactDetails && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--lime)] font-semibold animate-pulse bg-[var(--lime)]/10 px-2 py-0.5 rounded-md border border-[var(--lime)]/20">
                      <Loader2 size={11} className="animate-spin text-[var(--lime)]" />
                      <span>Carregando dados cadastrais...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Nome do Contato</label>
                  <input 
                    type="text" 
                    readOnly
                    className="input w-full uppercase bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                    value={contactName} 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Empresa</label>
                  <input 
                    type="text" 
                    readOnly
                    className="input w-full uppercase bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                    value={contactCompany} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">CNPJ</label>
                    <input 
                      type="text" 
                      readOnly
                      className="input w-full font-mono text-xs bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="00.000.000/0000-00"
                      value={contactCnpj} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="label">Telefone (WhatsApp)</label>
                      <button
                        type="button"
                        onClick={() => setShowContactPhone2(prev => !prev)}
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                          contactPhone2 
                            ? 'bg-[var(--lime)]/15 text-[var(--lime)] border-[var(--lime)]/30 hover:bg-[var(--lime)]/25' 
                            : 'bg-[var(--charcoal)] text-[var(--gray)] border-[var(--line)] hover:text-white'
                        }`}
                        title={contactPhone2 ? 'Telefone Secundário cadastrado. Clique para recolher/expandir' : 'Adicionar 2º Telefone'}
                      >
                        <Plus size={10} />
                        <span>{contactPhone2 ? '2º TEL ATIVO' : 'ADD 2º TEL'}</span>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        readOnly
                        className="input w-full !pr-9 font-mono text-xs bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                        placeholder="(00) 00000-0000"
                        value={contactPhone} 
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

                    {/* Telefone Secundário / Adicional */}
                    {(showContactPhone2 || contactPhone2) && (
                      <div className="flex flex-col gap-1 p-2 rounded-xl bg-[var(--charcoal)]/60 border border-[var(--line)] animate-fade-in mt-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Telefone Secundário</label>
                          {contactPhone2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const temp = contactPhone
                                setContactPhone(contactPhone2)
                                setContactPhone2(temp)
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
                            readOnly
                            className="input w-full !pr-9 font-mono text-xs bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                            placeholder="(00) 00000-0000"
                            value={contactPhone2} 
                          />
                          {contactPhone2 && (
                            <a
                              href={whatsappLink(contactPhone2)}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute right-2.5 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                              title="Chamar 2º Telefone no WhatsApp"
                            >
                              <WhatsappIcon size={15} />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
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
                  <input 
                    type="email" 
                    readOnly
                    className="input w-full font-mono text-xs bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                    placeholder="email@empresa.com.br"
                    value={contactEmail}
                  />
                </div>

                {/* Endereço: Rua / Número + Complemento + Bairro */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6 flex flex-col gap-1.5">
                    <label className="label">Rua / Número</label>
                    <input 
                      type="text" 
                      readOnly
                      className="input w-full uppercase text-xs font-mono bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="Rua, Número"
                      value={contactAddress} 
                    />
                  </div>

                  <div className="sm:col-span-3 flex flex-col gap-1.5">
                    <label className="label">Complemento</label>
                    <input 
                      type="text" 
                      readOnly
                      className="input w-full uppercase text-xs font-mono bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="Sala, Bloco..."
                      value={contactComplement} 
                    />
                  </div>

                  <div className="sm:col-span-3 flex flex-col gap-1.5">
                    <label className="label">Bairro</label>
                    <input 
                      type="text" 
                      readOnly
                      className="input w-full uppercase text-xs font-mono bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="Bairro"
                      value={contactBairro} 
                    />
                  </div>
                </div>

                {/* CEP | Cidade | UF | Mapa */}
                <div className="flex flex-wrap sm:flex-nowrap gap-2 items-end">
                  <div className="flex flex-col gap-1.5 w-[100px] shrink-0">
                    <label className="label">CEP</label>
                    <input 
                      type="text" 
                      readOnly
                      maxLength={9}
                      className="input w-full text-xs font-mono bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="00000-000"
                      value={contactCep} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-[110px]">
                    <label className="label">Cidade</label>
                    <input 
                      type="text" 
                      readOnly
                      className="input w-full uppercase text-xs font-mono bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="Cidade"
                      value={contactCity} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-[55px] shrink-0">
                    <label className="label">UF</label>
                    <input 
                      type="text" 
                      readOnly
                      maxLength={2}
                      className="input w-full text-center uppercase text-xs font-mono font-bold bg-black/40 opacity-90 cursor-not-allowed border-[var(--line)]" 
                      placeholder="UF"
                      value={contactState} 
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <a
                      href={(contactAddress || contactCity) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([contactAddress, contactBairro, contactCity, contactState, contactCep].filter(Boolean).join(', '))}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver endereço no Google Maps"
                      className={`flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] transition-colors ${(contactAddress || contactCity) ? 'text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
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
                      className="input bg-[var(--charcoal)] text-white cursor-pointer [color-scheme:dark]"
                      style={{ colorScheme: 'dark' }}
                      required
                      value={aptDate}
                      onChange={(e) => setAptDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Hora</label>
                    <input 
                      type="time" 
                      className="input bg-[var(--charcoal)] text-white cursor-pointer [color-scheme:dark]"
                      style={{ colorScheme: 'dark' }}
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
                        onClick={() => {
                          onOpenCalendarModal?.()
                        }}
                        className={`p-3.5 rounded-xl border flex flex-col gap-2 transition-all cursor-pointer hover:scale-[1.01] ${
                          apt.status === 'cancelado' 
                            ? 'bg-red-950/10 border-red-500/20 opacity-60' 
                            : 'bg-[var(--card)] border-[var(--line)] hover:border-[var(--lime)]'
                        }`}
                        title="Clique para abrir este compromisso na agenda"
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

          {/* TAB 3: ORÇAMENTO */}
          {activeTab === 'orcamento' && (
            <div className="flex flex-col gap-5 animate-fade-in">
              
              {/* Valor Total do Orçamento */}
              <div className="flex flex-col gap-3 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                  <span className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                    Valor Total do Orçamento
                  </span>
                  <span className="text-[10px] font-mono text-[var(--gray2)]">
                    Sincronizado com o Valor Estimado do Negócio
                  </span>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                    Informe o Valor Total (R$) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-sm font-mono font-bold text-[var(--lime)] select-none pointer-events-none">
                      R$
                    </span>
                    <input
                      type="text"
                      className="input w-full text-sm font-black font-mono text-[var(--lime)] py-2 px-3 !pl-10"
                      placeholder="0,00"
                      value={budgetValueInput}
                      onChange={handleBudgetValueChange}
                      onBlur={handleBudgetValueBlur}
                    />
                  </div>
                  <span className="text-[9px] text-[var(--gray2)] font-mono">
                    O valor digitado será aplicado como o valor da oportunidade no pipeline.
                  </span>
                </div>
              </div>

              {/* Condição de Pagamento */}
              <div className="flex flex-col gap-3 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono border-b border-[var(--line)] pb-2">
                  Condição de Pagamento
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                    Descreva a Forma / Prazo de Pagamento
                  </label>
                  <input
                    type="text"
                    className="input w-full uppercase font-mono text-xs py-2 px-3"
                    placeholder="EX: 30/60/90 DIAS NO BOLETO, À VISTA COM 5% DESC."
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              {/* Anexar Orçamento (PDF / Imagem) */}
              <div className="flex flex-col gap-3 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 shadow-sm">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono border-b border-[var(--line)] pb-2">
                  Anexar Orçamento (PDF / Imagem)
                </div>

                {budgetAttachment ? (
                  <div className="flex items-center justify-between bg-[#141416] p-3.5 rounded-xl border border-[var(--line)]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-[var(--lime)]/10 rounded-xl border border-[var(--lime)]/20 text-[var(--lime)] shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate uppercase">{budgetAttachment.name}</div>
                        <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">✓ Documento Salvo & Pronto para Visualização</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openAttachment(budgetAttachment)}
                        className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-white font-bold hover:border-[var(--lime)] hover:text-[var(--lime)] transition-colors"
                        title="Visualizar Orçamento"
                      >
                        <ExternalLink size={14} />
                        <span>Visualizar Documento</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBudgetAttachment(null)}
                        className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remover Anexo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--line)] hover:border-[var(--lime)]/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-[#141416]/50 group">
                    <Upload size={24} className="text-[var(--lime)] group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-white">Clique para selecionar e anexar arquivo de orçamento</span>
                    <span className="text-[10px] text-[var(--gray2)] font-mono">Formatos aceitos: PDF ou Imagens (JPG, PNG)</span>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: HISTÓRICO / TIMELINE (ÚLTIMA ABA) */}
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
                              onClick={() => {
                                const url = (act as any).photoUrl as string
                                if (!url) return
                                // For base64 data URLs, write directly into a new window (Chrome blocks data: href navigation)
                                if (url.startsWith('data:')) {
                                  const win = window.open('', '_blank')
                                  if (win) {
                                    win.document.write(`<!DOCTYPE html><html><head><title>Anexo</title><style>body{margin:0;background:#000;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{max-width:100%;max-height:100vh;object-fit:contain;}</style></head><body><img src="${url}" alt="Anexo"/></body></html>`)
                                    win.document.close()
                                  }
                                } else {
                                  window.open(url, '_blank')
                                }
                              }}
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

        {/* Sticky Footer for Saving Changes */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
          {isSavedSuccess ? (
            <div className="flex items-center gap-2 text-xs text-[var(--lime)] font-mono font-bold animate-fade-in">
              <CheckCircle size={15} />
              <span>Alterações salvas com sucesso!</span>
            </div>
          ) : isSaving ? (
            <div className="flex items-center gap-2 text-xs text-[var(--gray2)] font-mono animate-fade-in">
              <Loader2 size={14} className="animate-spin" />
              <span>Salvando alterações...</span>
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
              disabled={isSaving}
              className="btn btn-secondary text-xs py-2 px-3 font-bold uppercase tracking-wider disabled:opacity-50"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={isSaving}
              className="btn btn-primary text-xs py-2 px-4 font-bold uppercase tracking-wider text-[#060606] flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Salvar Alterações</span>
                </>
              )}
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

      {/* ── System Standard Confirmation Modal (Padrão visual escuro do CRM) ── */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl animate-fade-up">
            <div className="flex items-center gap-3 border-b border-[var(--line)] pb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-display text-base text-[var(--white)] font-bold">Excluir Negócio do Funil</h3>
                <p className="text-[11px] text-[var(--gray2)] font-mono">Confirmação de Exclusão</p>
              </div>
            </div>

            <p className="text-xs text-[var(--gray)] leading-relaxed">
              Tem certeza que deseja excluir o negócio <strong className="text-white">"{title}"</strong> do funil? Esta ação é irreversível.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="btn btn-secondary py-1.5 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false)
                  if (deal) {
                    onDeleteDeal?.(deal.id)
                    onClose()
                  }
                }}
                className="btn py-1.5 px-4 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg flex items-center gap-1.5 cursor-pointer rounded-xl transition-all"
              >
                <Trash2 size={13} />
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

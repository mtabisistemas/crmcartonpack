'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Compass, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Target, 
  KanbanSquare, 
  Plus, 
  ChevronRight, 
  Filter, 
  Check, 
  Zap,
  Search,
  X,
  ExternalLink,
  Users,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

import { Contact, Deal, Appointment, UserGoal } from '@/types'
import { getAppointments, updateAppointment } from '@/services/appointment-service'
import { getPipelineDeals } from '@/services/pipeline-service'
import { DealDrawer } from '@/components/pipeline/DealDrawer'
import { PipelineCalendarModal } from '@/components/pipeline/PipelineCalendarModal'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'
import { getUniqueCanonicalRepresentatives, isSameRepresentative } from '@/lib/utils'

// Helper format currency
function formatCurrency(val: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

// Calculate business days in current month and remaining business days
function getBusinessDaysStats() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayDate = now.getDate()

  const totalDays = new Date(year, month + 1, 0).getDate()
  
  let totalBusinessDays = 0
  let elapsedBusinessDays = 0
  let remainingBusinessDays = 0

  for (let d = 1; d <= totalDays; d++) {
    const dayOfWeek = new Date(year, month, d).getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    if (!isWeekend) {
      totalBusinessDays++
      if (d <= todayDate) {
        elapsedBusinessDays++
      } else {
        remainingBusinessDays++
      }
    }
  }

  if (remainingBusinessDays === 0) remainingBusinessDays = 1

  return {
    todayDate,
    totalDays,
    totalBusinessDays,
    elapsedBusinessDays,
    remainingBusinessDays
  }
}

// Flexible Date Parser
function parseFlexibleDate(dateStr?: string | number | null): Date | null {
  if (!dateStr) return null
  if (typeof dateStr === 'number') return new Date(dateStr)
  if (dateStr.includes('T')) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  }
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) {
    const [, day, month, year] = match
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10))
  }
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export default function DiarioDeBordoPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [userFilter, setUserFilter] = useState<string>('all')
  const [usersList, setUsersList] = useState<any[]>([])

  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [goalsMap, setGoalsMap] = useState<Record<string, UserGoal>>({})
  const [loading, setLoading] = useState(true)

  // Modals & Drawers
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [selectedContactForActivity, setSelectedContactForActivity] = useState<Contact | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Popover state for Alertas do Dia cards
  const [activeAlertPopover, setActiveAlertPopover] = useState<'recompra15' | 'recompraAtrasada' | 'riscoInativacao' | null>(null)
  const [alertSearchTerm, setAlertSearchTerm] = useState('')

  // Fetch all data synchronously & from local storage
  const fetchData = async () => {
    setLoading(true)
    try {
      // 1. Current User Session
      let userObj: any = null
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('crm_current_user')
        if (session) {
          try {
            userObj = JSON.parse(session)
            setCurrentUser(userObj)
          } catch (e) {}
        }
      }

      // 2. Fetch Users
      let usersData: any[] = []
      try {
        const resUsers = await fetch('/api/users', { cache: 'no-store' })
        const jsonUsers = await resUsers.json()
        if (jsonUsers.success && Array.isArray(jsonUsers.users)) {
          usersData = jsonUsers.users
        }
      } catch (e) {}
      if (usersData.length === 0 && typeof window !== 'undefined') {
        const rawU = localStorage.getItem('cp_crm_v7_official_users') || localStorage.getItem('crm_users')
        if (rawU) {
          try { usersData = JSON.parse(rawU) } catch (e) {}
        }
      }
      setUsersList(usersData.filter(u => u.status !== 'inativo'))

      // 3. Fetch Pipeline Deals (combining localStorage cp_crm_pipeline_deals & /api/deals)
      let loadedDeals: Deal[] = []
      try {
        const resDeals = await fetch('/api/deals', { cache: 'no-store' })
        if (resDeals.ok) {
          const jsonDeals = await resDeals.json()
          loadedDeals = Array.isArray(jsonDeals) ? jsonDeals : (jsonDeals.data || [])
        }
      } catch (e) {}
      
      const dealsFromService = getPipelineDeals(loadedDeals)
      setDeals(dealsFromService)

      // 4. Fetch Contacts (combining /api/contacts & localStorage crm_contacts)
      let loadedContacts: Contact[] = []
      try {
        const resContacts = await fetch('/api/contacts', { cache: 'no-store' })
        if (resContacts.ok) {
          const jsonContacts = await resContacts.json()
          loadedContacts = Array.isArray(jsonContacts) ? jsonContacts : (jsonContacts.data || [])
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        const rawC = localStorage.getItem('crm_contacts')
        if (rawC) {
          try {
            const localContacts = JSON.parse(rawC)
            if (Array.isArray(localContacts) && localContacts.length > 0) {
              const mapById = new Map<string, any>()
              localContacts.forEach(c => mapById.set(c.id, c))
              loadedContacts.forEach(c => mapById.set(c.id, c))
              loadedContacts = Array.from(mapById.values())
            }
          } catch (e) {}
        }
      }
      setContacts(loadedContacts)

      // 5. Fetch Metas / Goals Map
      let loadedGoalsMap: Record<string, UserGoal> = {}
      try {
        const resMetas = await fetch('/api/metas', { cache: 'no-store' })
        if (resMetas.ok) {
          const jsonMetas = await resMetas.json()
          if (jsonMetas.success && jsonMetas.goalsMap) {
            loadedGoalsMap = jsonMetas.goalsMap
          }
        }
      } catch (e) {}

      if (typeof window !== 'undefined') {
        const rawGoals = localStorage.getItem('cp_crm_user_goals')
        if (rawGoals) {
          try {
            const parsedG = JSON.parse(rawGoals)
            loadedGoalsMap = { ...parsedG, ...loadedGoalsMap }
          } catch (e) {}
        }
      }
      setGoalsMap(loadedGoalsMap)

      // 6. Appointments
      const apts = getAppointments()
      setAppointments(apts)

    } catch (e) {
      console.error('Error loading Diario de Bordo:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    const handleStorageChange = () => fetchData()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage-deals-changed', handleStorageChange)
      window.addEventListener('storage-contacts-changed', handleStorageChange)
      window.addEventListener('storage-appointments-changed', handleStorageChange)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-deals-changed', handleStorageChange)
        window.removeEventListener('storage-contacts-changed', handleStorageChange)
        window.removeEventListener('storage-appointments-changed', handleStorageChange)
      }
    }
  }, [])

  // Today Date & Greeting
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const formattedTodayDate = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }, [])

  const greetingTime = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bom dia'
    if (h < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  // Admin / Gestor check
  const userRoleLower = (currentUser?.role || '').toLowerCase()
  const isAdminOrManager = userRoleLower.includes('admin') || userRoleLower.includes('gestor')

  // Available Representatives list for Filter (Identical to Dashboard - Includes Contacts, Deals and Users/Gestores)
  const availableReps = useMemo(() => {
    const fromContacts = contacts.map(c => c.representative).filter(Boolean) as string[]
    const fromDeals = deals.map(d => d.assigned_to).filter(Boolean) as string[]
    const fromUsers = usersList.map(u => u.name).filter(Boolean) as string[]
    const merged = Array.from(new Set([...fromContacts, ...fromDeals, ...fromUsers]))
    return getUniqueCanonicalRepresentatives(merged)
  }, [contacts, deals, usersList])

  // Filtered contacts based on selected user filter (ou restrito ao próprio vendedor/representante)
  const filteredContacts = useMemo(() => {
    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter
    if (activeFilter === 'all') return contacts

    return contacts.filter(c => 
      isSameRepresentative(c.representative, activeFilter) ||
      isSameRepresentative(c.assigned_to, activeFilter)
    )
  }, [contacts, userFilter, isAdminOrManager, currentUser?.name])

  // Filtered deals based on selected user filter (ou restrito ao próprio vendedor/representante)
  const filteredDeals = useMemo(() => {
    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter
    if (activeFilter === 'all') return deals

    return deals.filter(d => 
      isSameRepresentative(d.assigned_to, activeFilter) ||
      isSameRepresentative(d.contact?.representative, activeFilter)
    )
  }, [deals, userFilter, isAdminOrManager, currentUser?.name])

  // Appointments today (filtrados por usuario se vendedor/rep e ordenados por horario com concluidos no fim)
  const todayAppointments = useMemo(() => {
    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter
    let list = appointments.filter(a => a.date === todayStr)

    if (activeFilter !== 'all') {
      const selUser = usersList.find(u => u.id === activeFilter || u.name === activeFilter)
      const targetName = (selUser?.name || activeFilter || '').toLowerCase().trim()
      list = list.filter(a => 
        (a.user_id && (a.user_id === selUser?.id || a.user_id === activeFilter)) ||
        (a.assigned_to && a.assigned_to.toLowerCase().includes(targetName)) ||
        (a.user_name && a.user_name.toLowerCase().includes(targetName))
      )
    }

    // Ordenacao: Pendentes primeiro (ordenados por horario mais recente/cedo), Concluidos ao FIM
    return list.sort((a, b) => {
      const aDone = a.status === 'concluido' ? 1 : 0
      const bDone = b.status === 'concluido' ? 1 : 0

      if (aDone !== bDone) return aDone - bDone
      return (a.time || '').localeCompare(b.time || '')
    })
  }, [appointments, todayStr, userFilter, usersList, isAdminOrManager, currentUser?.name])

  // Business Days Stats
  const bizStats = useMemo(() => getBusinessDaysStats(), [])

  // Calculate Meta & Sales Goal for selected Month/Year
  // Calculate Meta & Sales Goal for selected Month/Year
  const currentMonthGoal = useMemo(() => {
    const now = new Date()
    const yearStr = String(now.getFullYear())
    const monthStr = String(now.getMonth() + 1).padStart(2, '0')

    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter

    const norm = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const isMauricio = (s: string) => {
      const n = norm(s)
      return n.includes('mauricio') || n.includes('maciel')
    }

    let salesGoalSum = 0
    let visitsGoalSum = 0

    if (activeFilter === 'all') {
      Object.keys(goalsMap).forEach(key => {
        if (isMauricio(key)) return
        const g = goalsMap[key]
        if (isMauricio(g?.userName || '')) return

        if (key.startsWith(`${yearStr}_${monthStr}_`) && !key.startsWith('EQUIPE_')) {
          salesGoalSum += Number(g?.salesGoal || 0)
          visitsGoalSum += Number(g?.visitsGoal || 0)
        }
      })

      if (salesGoalSum === 0) salesGoalSum = 1500000
      if (visitsGoalSum === 0) visitsGoalSum = 40
    } else {
      const selUser = availableReps.find(r => r === activeFilter || isSameRepresentative(r, activeFilter))
      const targetName = selUser || activeFilter

      // Direct key lookup
      const k1 = `${yearStr}_${monthStr}_${targetName}`
      if (goalsMap[k1] && Number(goalsMap[k1].salesGoal) > 0) {
        salesGoalSum = Number(goalsMap[k1].salesGoal)
        visitsGoalSum = Number(goalsMap[k1].visitsGoal || 10)
      } else {
        Object.keys(goalsMap).forEach(key => {
          if (isMauricio(key)) return
          const gObj = goalsMap[key]
          if (isMauricio(gObj?.userName || '')) return

          const parts = key.split('_')
          const gYear = parts[0]
          const gMonth = parts[1]

          if (gYear === yearStr && gMonth === monthStr) {
            const gUserName = gObj?.userName || parts.slice(2).join('_')
            if (isSameRepresentative(gUserName, targetName)) {
              salesGoalSum += Number(gObj?.salesGoal || 0)
              visitsGoalSum += Number(gObj?.visitsGoal || 0)
            }
          }
        })
      }

      if (salesGoalSum === 0) salesGoalSum = 30000
      if (visitsGoalSum === 0) visitsGoalSum = 10
    }

    return {
      salesGoal: salesGoalSum,
      visitsGoal: visitsGoalSum
    }
  }, [goalsMap, userFilter, availableReps, isAdminOrManager, currentUser?.name])

  // 1. Pacing & Goal Calculations (Unified with Dashboard)
  const pacingMetrics = useMemo(() => {
    const now = new Date()
    const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0')
    const currentYearStr = String(now.getFullYear())

    let totalSalesAchieved = 0

    // 1. Accumulate orders in current month from filteredContacts
    filteredContacts.forEach(c => {
      if (c.orders && Array.isArray(c.orders)) {
        c.orders.forEach((o: any) => {
          if (o.date) {
            const dt = new Date(o.date)
            const mStr = String(dt.getMonth() + 1).padStart(2, '0')
            const yStr = String(dt.getFullYear())
            if (mStr === currentMonthStr && yStr === currentYearStr) {
              totalSalesAchieved += (Number(o.value) || 0)
            }
          }
        })
      }
    })

    // 2. Accumulate won deals in current month from filteredDeals
    filteredDeals.forEach(d => {
      if (d.stage === 'fechamento' || d.stage === 'pedido') {
        const closeDate = d.closed_at || d.updated_at || d.stage_entered_at
        if (closeDate) {
          const dt = new Date(closeDate)
          const mStr = String(dt.getMonth() + 1).padStart(2, '0')
          const yStr = String(dt.getFullYear())
          if (mStr === currentMonthStr && yStr === currentYearStr) {
            totalSalesAchieved += (d.final_value || d.estimated_value || 0)
          }
        }
      }
    })

    const salesTarget = currentMonthGoal.salesGoal
    const salesProgressPct = Math.min(100, Math.round((totalSalesAchieved / Math.max(1, salesTarget)) * 100))

    // Pacing calculation
    const expectedSalesPacing = (salesTarget / Math.max(1, bizStats.totalBusinessDays)) * bizStats.elapsedBusinessDays
    const isPacingAhead = totalSalesAchieved >= expectedSalesPacing

    const remainingSalesR$ = Math.max(0, salesTarget - totalSalesAchieved)
    const dailyPaceRequired = remainingSalesR$ / Math.max(1, bizStats.remainingBusinessDays)

    // Visits calculation
    const currentMonthVisits = appointments.filter(a => {
      if (a.type !== 'visita' && a.type !== 'reuniao') return false
      const dt = new Date(a.date)
      return (dt.getMonth() + 1) === (now.getMonth() + 1) && dt.getFullYear() === now.getFullYear()
    }).length

    return {
      totalSalesAchieved,
      salesTarget,
      salesProgressPct,
      expectedSalesPacing,
      isPacingAhead,
      remainingSalesR$,
      dailyPaceRequired,
      currentMonthVisits,
      visitsTarget: currentMonthGoal.visitsGoal
    }
  }, [filteredContacts, filteredDeals, currentMonthGoal, bizStats, appointments])

  // Stagnant Deals (>7 days)
  const dealAlerts = useMemo(() => {
    const now = new Date()
    const stagnantDeals: Array<{ deal: Deal; days: number }> = []

    filteredDeals.forEach(d => {
      if (d.stage === 'fechamento' || d.stage === 'perdido') return
      const refDateStr = d.stage_entered_at || d.updated_at || d.created_at
      if (!refDateStr) return
      const refDate = new Date(refDateStr)
      if (isNaN(refDate.getTime())) return

      const diffDays = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 3600 * 24))
      if (diffDays >= 7) {
        stagnantDeals.push({ deal: d, days: diffDays })
      }
    })

    stagnantDeals.sort((a, b) => b.days - a.days)

    return {
      stagnantDeals
    }
  }, [filteredDeals])

  // Clientes com Recompra Próxima (dentro de 30 dias)
  const upcomingRepurchases = useMemo(() => {
    const list: Array<{
      contact: Contact
      daysToRepurchase: number
      daysSinceLastPurchase: number
      avgIntervalDays: number
      lastPurchaseDate: string
      lastPurchaseValue: number
    }> = []

    filteredContacts.forEach(c => {
      const orders = c.orders && Array.isArray(c.orders) ? c.orders : []
      let lastDateStr = c.lastPurchaseDate || (orders[0]?.date) || ''
      if (!lastDateStr) return

      const lastDt = new Date(lastDateStr)
      if (isNaN(lastDt.getTime())) return

      const now = new Date()
      const daysSinceLast = Math.floor((now.getTime() - lastDt.getTime()) / (1000 * 60 * 60 * 24))
      const avgInterval = c.purchaseFrequencyDays || 60
      const daysToRepurchase = avgInterval - daysSinceLast

      // Clientes próximos da recompra: dentro de 30 dias
      if (daysToRepurchase >= -15 && daysToRepurchase <= 30) {
        const lastVal = orders[0]?.value ? Number(orders[0].value) : 0
        list.push({
          contact: c,
          daysToRepurchase,
          daysSinceLastPurchase: daysSinceLast,
          avgIntervalDays: avgInterval,
          lastPurchaseDate: lastDateStr,
          lastPurchaseValue: lastVal
        })
      }
    })

    return list.sort((a, b) => a.daysToRepurchase - b.daysToRepurchase)
  }, [filteredContacts])

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-5 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-24 select-none overflow-y-auto custom-scrollbar bg-[var(--black)] text-[var(--white)]">
      
      {/* ========================================================
          1. CABEÇALHO DE BOAS-VINDAS
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden shrink-0">
        
        <div className="flex flex-col gap-1 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-[var(--lime)] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={12} />
              Diário de Bordo
            </span>
            <span className="text-xs text-[var(--gray2)] font-mono capitalize">
              {formattedTodayDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-black text-[var(--white)] tracking-tight flex items-center gap-2 mt-0.5">
            <span>{greetingTime}, <strong className="text-[var(--lime)] font-black">{currentUser?.name || 'Vendedor'}</strong>!</span>
            <span className="text-xl">☀️</span>
          </h1>
        </div>

        {/* Right Actions & Filter Selector (APENAS PARA GESTOR E ADMIN) */}
        {isAdminOrManager && (
          <div className="flex items-center gap-2 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl ml-auto shrink-0 max-w-[200px]">
            <Filter size={14} className="text-[var(--lime)] shrink-0" />
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-[var(--white)] cursor-pointer outline-none truncate"
            >
              <option value="all" className="bg-[var(--card)] text-[var(--white)]">Toda a Equipe</option>
              {availableReps
                .filter(rep => {
                  const normR = rep.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                  return !normR.includes('mauricio') && !normR.includes('maciel')
                })
                .map(rep => (
                  <option key={rep} value={rep} className="bg-[var(--card)] text-[var(--white)]">{rep}</option>
                ))}
            </select>
          </div>
        )}
      </div>

      {/* ========================================================
          2. HERO RESULTADO X META DO MÊS (COMPLETAMENTE REVISADO COM DESIGN 3D DO DASHBOARD)
         ======================================================== */}
      {loading ? (
        <div className="w-full card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-4 shadow-lg animate-pulse shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#10b981] shrink-0">
                <Loader2 size={20} className="animate-spin text-[#10b981]" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-48 bg-white/10 rounded-md" />
                <div className="h-3 w-64 bg-white/5 rounded-md" />
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="h-3 w-16 bg-white/10 rounded-md ml-auto" />
              <div className="h-7 w-20 bg-emerald-500/20 rounded-md ml-auto" />
            </div>
          </div>
          <div className="space-y-2.5 my-1">
            <div className="flex justify-between items-center">
              <div className="h-6 w-44 bg-white/10 rounded-md" />
              <div className="h-4 w-36 bg-white/10 rounded-md" />
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-[var(--line)]">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-[var(--charcoal)] p-4 rounded-xl border border-[var(--line)] space-y-2">
                <div className="h-2.5 w-24 bg-white/10 rounded" />
                <div className="h-4 w-28 bg-white/20 rounded font-bold" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col gap-5 shadow-xl relative shrink-0">
          
          {/* Header com Título & Indicador de Status Neon (Estilo Dashboard) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-900/10 border border-emerald-500/40 text-[#10b981] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                <Target size={20} />
              </div>
              <div>
                <h2 className="font-display text-sm sm:text-base font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2.5">
                  <span>Resultado x Meta do Mês</span>
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                    pacingMetrics.isPacingAhead 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                  }`}>
                    <Sparkles size={12} />
                    <span>{pacingMetrics.isPacingAhead ? '▲ NO PACING' : '▼ RITMO ABAIXO DO PACING'}</span>
                  </span>
                </h2>
                <p className="text-xs font-mono text-[var(--gray2)] font-semibold mt-0.5">
                  Dia {bizStats.todayDate} de {bizStats.totalDays} · {bizStats.elapsedBusinessDays} de {bizStats.totalBusinessDays} dias úteis transcorridos
                </p>
              </div>
            </div>

            {/* Total Realizado vs Meta Banner (Direita) */}
            <div className="text-left sm:text-right flex flex-col items-start sm:items-end shrink-0">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)]">
                Realizado: <strong className="text-lg sm:text-xl font-mono font-black text-[var(--white)] ml-1">{formatCurrency(pacingMetrics.totalSalesAchieved)}</strong>
              </span>
              <span className="text-[11px] font-mono text-[var(--gray2)] font-semibold">
                Meta do Mês: <strong className="text-emerald-400 font-bold">{formatCurrency(pacingMetrics.salesTarget)}</strong>
              </span>
            </div>
          </div>

          {/* 4 KPIs NUMÉRICOS COM DESIGN IDÊNTICO AOS CARDS DO DASHBOARD (FAIXAS NEON + MARCA D'ÁGUA 3D) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: ESPERADO HOJE (PACING) */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0284c7] rounded-l-2xl z-20 shadow-[0_0_10px_#0284c7]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <Target size={40} className="absolute right-3 top-3 text-[#0284c7] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-2 z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400 leading-tight">
                  ESPERADO HOJE (PACING)
                </span>
              </div>

              <div className="my-2 z-10">
                <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight">
                  {formatCurrency(pacingMetrics.expectedSalesPacing)}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
                Ritmo planejado até hoje
              </div>
            </div>

            {/* KPI 2: FALTA PARA 100% */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f59e0b] rounded-l-2xl z-20 shadow-[0_0_10px_#f59e0b]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <AlertCircle size={40} className="absolute right-3 top-3 text-[#f59e0b] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-2 z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 leading-tight">
                  FALTA PARA 100%
                </span>
              </div>

              <div className="my-2 z-10">
                <div className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-tight">
                  {formatCurrency(pacingMetrics.remainingSalesR$)}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-amber-400/90 font-bold z-10">
                {pacingMetrics.remainingSalesR$ > 0 ? 'Diferença para atingir a meta' : 'Meta 100% atingida!'}
              </div>
            </div>

            {/* KPI 3: META DIÁRIA NECESSÁRIA */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#06b6d4] rounded-l-2xl z-20 shadow-[0_0_10px_#06b6d4]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <TrendingUp size={40} className="absolute right-3 top-3 text-[#06b6d4] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-2 z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 leading-tight">
                  META DIÁRIA NECESSÁRIA
                </span>
              </div>

              <div className="my-2 z-10">
                <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400 tracking-tight">
                  {formatCurrency(pacingMetrics.dailyPaceRequired)} <span className="text-xs font-normal text-[var(--gray2)]">/ dia</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
                Faltam <strong className="text-[var(--white)]">{bizStats.remainingBusinessDays}</strong> dias úteis
              </div>
            </div>

            {/* KPI 4: VISITAS NO MÊS */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8b5cf6] rounded-l-2xl z-20 shadow-[0_0_10px_#8b5cf6]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <Users size={40} className="absolute right-3 top-3 text-[#8b5cf6] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-2 z-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 leading-tight">
                  VISITAS NO MÊS
                </span>
              </div>

              <div className="my-2 z-10">
                <div className="text-xl sm:text-2xl font-mono font-black text-[#8b5cf6] tracking-tight">
                  {pacingMetrics.currentMonthVisits} <span className="text-xs font-normal text-[var(--gray2)]">/ {pacingMetrics.visitsTarget}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
                Atendimentos realizados
              </div>
            </div>

          </div>

          {/* BARRA DE PROGRESSO NEON 3D COMPLETA COM BANDEIRA % (IDÊNTICA AO DASHBOARD) */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-[var(--white)] flex items-center gap-1.5">
                <span>Progresso Geral de Atingimento:</span>
                <strong className="text-emerald-400 font-mono text-sm">{pacingMetrics.salesProgressPct}%</strong>
              </span>
              <span className="text-[var(--gray2)] font-bold">
                {pacingMetrics.salesProgressPct >= 100 ? '100% Concluído' : `${(100 - pacingMetrics.salesProgressPct).toFixed(0)}% Restantes`}
              </span>
            </div>

            {/* Barra Tridimensional Glowing */}
            <div className="w-full h-4 rounded-full bg-[#090d16] p-0.5 border border-[var(--line)] overflow-hidden relative shadow-inner">
              <div 
                className="bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] h-full rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
                style={{ width: `${Math.min(100, Math.max(2, pacingMetrics.salesProgressPct))}%` }}
              />
            </div>
          </div>

        </div>
      )}

      {/* ========================================================
          3. GRADE INFERIOR EQUILIBRADA (3 COLUNAS)
         ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 flex-1 min-h-[380px]">
        
        {/* COLUNA 1: Agenda Comercial do Dia */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg h-full">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-[var(--gray2)]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider">
                Agenda de Hoje ({todayAppointments.length})
              </h3>
            </div>
            <button
              onClick={() => setCalendarOpen(true)}
              className="text-xs font-mono font-bold text-[var(--gray2)] hover:text-[var(--white)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Agenda</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-12 flex-1 min-h-[260px] text-center flex flex-col items-center justify-center gap-3 bg-[var(--charcoal)] rounded-xl border border-[var(--line)]">
              <CheckCircle2 size={32} className="text-[var(--gray2)]" />
              <p className="text-xs font-mono text-[var(--gray2)]">Nenhum compromisso agendado para hoje.</p>
              <button
                onClick={() => setCalendarOpen(true)}
                className="btn btn-secondary text-xs py-1.5 px-4 font-bold cursor-pointer mt-1"
              >
                <Plus size={14} />
                <span>Agendar Compromisso</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2.5 min-h-[260px] max-h-[500px] overflow-y-auto custom-scrollbar">
              {todayAppointments.map(apt => {
                const now = new Date()
                const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
                const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
                
                const isConcluido = apt.status === 'concluido'
                const isOverdue = !isConcluido && (apt.date < todayStr || (apt.date === todayStr && apt.time < currentTimeStr))

                return (
                  <div
                    key={apt.id}
                    onClick={() => setCalendarOpen(true)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all cursor-pointer group ${
                      isConcluido
                        ? 'bg-[var(--charcoal)] border-[var(--line)] opacity-60'
                        : isOverdue
                        ? 'bg-red-500/10 border-red-500/40 shadow-sm hover:border-red-500'
                        : 'bg-[var(--charcoal)] border-[var(--line)] hover:border-[var(--lime)]/50 hover:bg-[var(--card2)]'
                    }`}
                    title="Clique para abrir a agenda completa"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold ${isOverdue ? 'text-red-400' : 'text-[var(--gray2)]'}`}>
                            {apt.time}
                          </span>
                          <span className={`text-xs font-bold truncate group-hover:text-[var(--lime)] transition-colors ${isConcluido ? 'line-through text-[var(--gray2)]' : 'text-[var(--white)]'}`}>
                            {apt.title}
                          </span>
                        </div>
                        {apt.company_name && (
                          <span className="text-[10px] font-mono text-[var(--gray2)] truncate block mt-0.5">
                            {apt.company_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isConcluido ? (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check size={10} />
                          <span>Concluído</span>
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 animate-pulse">
                          <AlertTriangle size={10} />
                          <span>Atrasado</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--card)] text-[var(--gray2)] border border-[var(--line)]">
                          {apt.type}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* COLUNA 2: Negócios Estagnados (>7 dias) */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg h-full">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <KanbanSquare size={16} className="text-[var(--gray2)]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2">
                <span>Negócios Parados (&gt;7 dias)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--charcoal)] border border-[var(--line)] text-[var(--gray2)]">
                  {dealAlerts.stagnantDeals.length}
                </span>
              </h3>
            </div>
          </div>

          {dealAlerts.stagnantDeals.length === 0 ? (
            <div className="py-12 flex-1 min-h-[260px] text-center flex flex-col items-center justify-center gap-2 bg-[var(--charcoal)] rounded-xl border border-[var(--line)]">
              <CheckCircle2 size={32} className="text-emerald-500 mb-1" />
              <p className="text-xs font-mono text-emerald-500 font-bold">
                ✓ Todas as suas negociações foram atualizadas recentemente!
              </p>
              <p className="text-[11px] font-mono text-[var(--gray2)]">
                Excelente trabalho no acompanhamento do funil de vendas.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2.5 min-h-[260px] max-h-[500px] overflow-y-auto custom-scrollbar">
              {dealAlerts.stagnantDeals.map(({ deal, days }) => (
                <div
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className="p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] hover:border-[var(--lime)]/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[var(--white)] truncate">{deal.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-[var(--gray2)] font-bold uppercase">
                        Etapa: {deal.stage}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--gray2)]">
                        · {formatCurrency(deal.estimated_value || deal.final_value || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-amber-500 block">{days}d sem mover</span>
                    <span className="text-[9px] font-mono text-[var(--gray2)] hover:text-[var(--white)] hover:underline flex items-center justify-end gap-0.5 mt-0.5">
                      <span>Abrir</span>
                      <ChevronRight size={10} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA 3: Recompra Próxima (Até 30 dias) */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg h-full">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 shrink-0">
            <div className="flex items-center gap-2">
              <RefreshCw size={16} className="text-[var(--lime)]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2">
                <span>Recompra Próxima (Até 30 dias)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--charcoal)] border border-[var(--line)] text-[var(--lime)]">
                  {upcomingRepurchases.length}
                </span>
              </h3>
            </div>
          </div>

          {upcomingRepurchases.length === 0 ? (
            <div className="py-12 flex-1 min-h-[260px] text-center flex flex-col items-center justify-center gap-2 bg-[var(--charcoal)] rounded-xl border border-[var(--line)]">
              <CheckCircle2 size={32} className="text-[var(--lime)] mb-1" />
              <p className="text-xs font-mono text-[var(--lime)] font-bold">
                ✓ Nenhum cliente com previsão de recompra nos próximos 30 dias!
              </p>
              <p className="text-[11px] font-mono text-[var(--gray2)]">
                Toda a carteira está com o ciclo em dia.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2.5 min-h-[260px] max-h-[500px] overflow-y-auto custom-scrollbar">
              {upcomingRepurchases.map(({ contact, daysToRepurchase, lastPurchaseValue }) => {
                const isUrgent = daysToRepurchase <= 7
                return (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] hover:border-[var(--lime)]/50 transition-all flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="text-xs font-bold text-[var(--white)] block truncate">{contact.company || contact.name}</strong>
                        <span className="text-[10px] font-mono text-[var(--gray2)] truncate block">{contact.representative || 'Sem rep'}</span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        daysToRepurchase < 0
                          ? 'bg-red-500/15 border-red-500/30 text-red-400'
                          : isUrgent
                          ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      }`}>
                        {daysToRepurchase < 0 
                          ? `Atrasado ${Math.abs(daysToRepurchase)}d`
                          : daysToRepurchase === 0 
                          ? 'Recompra Hoje' 
                          : `Em ${daysToRepurchase} dias`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--gray2)] pt-1 border-t border-[var(--line)]/50">
                      <span>Última Compra: <strong className="text-[var(--white)] font-bold">{formatCurrency(lastPurchaseValue)}</strong></span>
                      <button
                        onClick={() => setSelectedContactForActivity(contact)}
                        className="text-[10px] font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer bg-[var(--lime)]/10 px-2 py-0.5 rounded-md border border-[var(--lime)]/25 hover:bg-[var(--lime)]/20 transition-all"
                        title="Registrar Atividade com este cliente"
                      >
                        <CheckCircle size={12} className="text-[var(--lime)]" />
                        <span>Registrar Atividade</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================
          DRAWERS & MODALS INTEGRATION
         ======================================================== */}
      {selectedDeal && (
        <DealDrawer
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdateDeal={() => {
            fetchData()
            setSelectedDeal(null)
          }}
        />
      )}

      {selectedContactForActivity && (
        <RegisterActivityModal
          isOpen={!!selectedContactForActivity}
          onClose={() => setSelectedContactForActivity(null)}
          onSuccess={fetchData}
          contactsList={contacts.map(c => ({ id: c.id, name: c.name || '', company: c.company || '', representative: c.representative || '' }))}
          preselectedContactId={selectedContactForActivity.id}
        />
      )}

      <PipelineCalendarModal
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
      />

    </div>
  )
}

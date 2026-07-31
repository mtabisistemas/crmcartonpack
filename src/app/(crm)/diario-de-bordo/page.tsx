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
  Users
} from 'lucide-react'
import Link from 'next/link'

import { Contact, Deal, Appointment, UserGoal } from '@/types'
import { getAppointments, updateAppointment } from '@/services/appointment-service'
import { getPipelineDeals } from '@/services/pipeline-service'
import { DealDrawer } from '@/components/pipeline/DealDrawer'
import { PipelineCalendarModal } from '@/components/pipeline/PipelineCalendarModal'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'

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
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor'

  // Filtered contacts based on selected user filter (ou restrito ao próprio vendedor/representante)
  const filteredContacts = useMemo(() => {
    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter
    if (activeFilter === 'all') return contacts
    const selUser = usersList.find(u => u.id === activeFilter || u.name === activeFilter)
    const targetName = (selUser?.name || activeFilter).toLowerCase().trim()

    return contacts.filter(c => 
      (c.representative || '').toLowerCase().includes(targetName) ||
      (c.assigned_to || '').toLowerCase().includes(targetName)
    )
  }, [contacts, userFilter, usersList, isAdminOrManager, currentUser?.name])

  // Filtered deals based on selected user filter (ou restrito ao próprio vendedor/representante)
  const filteredDeals = useMemo(() => {
    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter
    if (activeFilter === 'all') return deals
    const selUser = usersList.find(u => u.id === activeFilter || u.name === activeFilter)
    const targetName = (selUser?.name || activeFilter).toLowerCase().trim()

    return deals.filter(d => 
      (d.assigned_to || '').toLowerCase().includes(targetName) ||
      (d.contact?.representative || '').toLowerCase().includes(targetName)
    )
  }, [deals, userFilter, usersList, isAdminOrManager, currentUser?.name])

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
  const currentMonthGoal = useMemo(() => {
    const now = new Date()
    const yearStr = String(now.getFullYear())
    const monthStr = String(now.getMonth() + 1).padStart(2, '0')

    const activeFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter

    let salesGoalSum = 0
    let visitsGoalSum = 0

    if (activeFilter === 'all') {
      Object.keys(goalsMap).forEach(key => {
        if (key.startsWith(`${yearStr}_${monthStr}_`) || key.startsWith(`EQUIPE_${yearStr}_${monthStr}`)) {
          const g = goalsMap[key]
          salesGoalSum += Number(g?.salesGoal || 0)
          visitsGoalSum += Number(g?.visitsGoal || 0)
        }
      })
      if (salesGoalSum === 0) salesGoalSum = 150000
      if (visitsGoalSum === 0) visitsGoalSum = 40
    } else {
      const selUser = usersList.find(u => u.id === activeFilter || u.name === activeFilter)
      const uId = selUser?.id || activeFilter
      const uName = selUser?.name || activeFilter

      const goalKey1 = `${yearStr}_${monthStr}_${uId}`
      const goalKey2 = `${yearStr}_${monthStr}_${uName}`

      const foundGoal = goalsMap[goalKey1] || goalsMap[goalKey2]
      salesGoalSum = Number(foundGoal?.salesGoal || 50000)
      visitsGoalSum = Number(foundGoal?.visitsGoal || 20)
    }

    return {
      salesGoal: salesGoalSum,
      visitsGoal: visitsGoalSum
    }
  }, [goalsMap, userFilter, usersList, isAdminOrManager, currentUser?.name])

  // 1. Pacing & Goal Calculations
  const pacingMetrics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Won deals in current month
    const wonDeals = filteredDeals.filter(d => {
      if (d.stage !== 'fechamento') return false
      const closeDate = d.closed_at || d.updated_at
      if (!closeDate) return false
      const dt = new Date(closeDate)
      return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear
    })

    const totalSalesAchieved = wonDeals.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
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
      return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear
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
  }, [filteredDeals, currentMonthGoal, bizStats, appointments])

  // Stagnant Deals (>7 days)
  const dealAlerts = useMemo(() => {
    const now = new Date()
    const stagnantDeals: Array<{ deal: Deal; days: number }> = []

    filteredDeals.forEach(d => {
      if (d.stage === 'fechamento' || d.stage === 'perdido') return

      const lastDate = parseFlexibleDate(d.updated_at || d.created_at)
      if (lastDate) {
        const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays >= 7) {
          stagnantDeals.push({ deal: d, days: diffDays })
        }
      }
    })

    stagnantDeals.sort((a, b) => b.days - a.days)

    return {
      stagnantDeals
    }
  }, [filteredDeals])

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
        <div className="flex items-center gap-3 z-10 shrink-0">
          {isAdminOrManager && (
            <div className="flex items-center gap-2 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl">
              <Filter size={14} className="text-[var(--lime)]" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-[var(--white)] cursor-pointer outline-none"
              >
                <option value="all" className="bg-[var(--card)] text-[var(--white)]">Toda a Equipe</option>
                {usersList.map((u: any) => (
                  <option key={u.id || u.name} value={u.id || u.name} className="bg-[var(--card)] text-[var(--white)]">
                    {u.name} ({u.role || 'Usuário'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => setCalendarOpen(true)}
            className="btn btn-secondary text-xs py-2 px-3.5 flex items-center gap-2 font-bold cursor-pointer hover:border-[var(--lime)]"
          >
            <CalendarIcon size={15} className="text-[var(--lime)]" />
            <span>Abrir Agenda</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. HERO RESULTADO X META DO MÊS (ESTICADA 100% LARGURA)
         ======================================================== */}
      <div className="w-full card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-4 shadow-lg hover:border-[var(--lime)]/30 transition-all">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[var(--lime)] shrink-0">
              <Target size={20} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-display font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2.5">
                <span>Resultado x Meta do Mês</span>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  pacingMetrics.isPacingAhead 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                }`}>
                  {pacingMetrics.isPacingAhead ? '▲ No Pacing' : '▼ Ritmo Abaixo do Pacing'}
                </span>
              </h2>
              <span className="text-[11px] font-mono text-[var(--gray2)]">
                Dia {bizStats.todayDate} de {bizStats.totalDays} · {bizStats.elapsedBusinessDays} de {bizStats.totalBusinessDays} dias úteis transcorridos
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono uppercase text-[var(--gray2)] font-bold block">Progresso</span>
            <span className="text-2xl sm:text-3xl font-mono font-black text-[var(--lime)]">{pacingMetrics.salesProgressPct}%</span>
          </div>
        </div>

        {/* Main Progress Value */}
        <div className="flex flex-col gap-2 my-1">
          <div className="flex items-baseline justify-between">
            <span className="text-sm sm:text-base font-mono text-[var(--gray2)]">
              Realizado: <strong className="text-2xl sm:text-3xl font-black text-[var(--white)] ml-1">{formatCurrency(pacingMetrics.totalSalesAchieved)}</strong>
            </span>
            <span className="text-xs sm:text-sm font-mono text-[var(--gray2)]">
              Meta: <strong className="text-[var(--white)] font-bold">{formatCurrency(pacingMetrics.salesTarget)}</strong>
            </span>
          </div>

          <div className="w-full h-3 bg-[var(--charcoal)] border border-[var(--line)] rounded-full overflow-hidden p-0.5">
            <div 
              className="h-full bg-[var(--lime)] rounded-full transition-all duration-500"
              style={{ width: `${pacingMetrics.salesProgressPct}%` }}
            />
          </div>
        </div>

        {/* Footer Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 border-t border-[var(--line)] text-xs font-mono">
          <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
            <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Esperado Hoje (Pacing)</span>
            <span className="font-bold text-sm text-[var(--white)]">{formatCurrency(pacingMetrics.expectedSalesPacing)}</span>
          </div>

          <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
            <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Falta para 100%</span>
            <span className="font-bold text-sm text-[var(--white)]">{formatCurrency(pacingMetrics.remainingSalesR$)}</span>
          </div>

          <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
            <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Meta Diária Necessária</span>
            <span className="font-bold text-sm text-[var(--white)]">{formatCurrency(pacingMetrics.dailyPaceRequired)} / dia</span>
          </div>

          <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
            <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Visitas no Mês</span>
            <span className="font-bold text-sm text-[var(--white)]">{pacingMetrics.currentMonthVisits} / {pacingMetrics.visitsTarget} realizados</span>
          </div>
        </div>

      </div>

      {/* ========================================================
          3. GRADE INFERIOR LIMPA (2 COLUNAS)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 min-h-[380px]">
        
        {/* COLUNA ESQUERDA: Agenda Comercial do Dia */}
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
              <span>Ver Grade Completa</span>
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

        {/* COLUNA DIREITA: Negócios Estagnados (>7 dias) */}
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

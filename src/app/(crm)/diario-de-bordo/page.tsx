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
  Zap
} from 'lucide-react'

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
  const isAdminOrManager = (currentUser?.role || '').toLowerCase().includes('admin') || 
                           (currentUser?.role || '').toLowerCase().includes('gestor')

  // Filtered contacts based on selected user filter
  const filteredContacts = useMemo(() => {
    if (userFilter === 'all') return contacts
    const selUser = usersList.find(u => u.id === userFilter || u.name === userFilter)
    const targetName = (selUser?.name || userFilter).toLowerCase()

    return contacts.filter(c => 
      (c.representative || '').toLowerCase().includes(targetName) ||
      c.assigned_to === userFilter ||
      c.id === userFilter
    )
  }, [contacts, userFilter, usersList])

  // Filtered deals based on selected user filter
  const filteredDeals = useMemo(() => {
    if (userFilter === 'all') return deals
    const selUser = usersList.find(u => u.id === userFilter || u.name === userFilter)
    const targetName = (selUser?.name || userFilter).toLowerCase()

    return deals.filter(d => 
      d.assigned_to === userFilter ||
      (d.contact?.representative || '').toLowerCase().includes(targetName)
    )
  }, [deals, userFilter, usersList])

  // Appointments today
  const todayAppointments = useMemo(() => {
    return appointments.filter(a => a.date === todayStr)
  }, [appointments, todayStr])

  // Business Days Stats
  const bizStats = useMemo(() => getBusinessDaysStats(), [])

  // Calculate Meta & Sales Goal for selected Month/Year (e.g. 2026_07)
  const currentMonthGoal = useMemo(() => {
    const now = new Date()
    const yearStr = String(now.getFullYear())
    const monthStr = String(now.getMonth() + 1).padStart(2, '0')

    let salesGoalSum = 0
    let visitsGoalSum = 0

    if (userFilter === 'all') {
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
      const selUser = usersList.find(u => u.id === userFilter || u.name === userFilter)
      const uId = selUser?.id || userFilter
      const uName = selUser?.name || userFilter

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
  }, [goalsMap, userFilter, usersList])

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

  // 2. Client Status & Repurchase Overdue & Upcoming 15 Days Alerts
  const clientAlerts = useMemo(() => {
    const now = new Date()
    const overdueRepurchaseList: Array<{ contact: Contact; daysOverdue: number }> = []
    const upcoming15DaysRepurchaseList: Array<{ contact: Contact; daysToRepurchase: number }> = []

    filteredContacts.forEach(c => {
      let daysSincePurchase = (c as any).lastPurchaseDays
      if (daysSincePurchase === undefined && c.lastPurchaseDate) {
        const lastP = parseFlexibleDate(c.lastPurchaseDate)
        if (lastP) {
          daysSincePurchase = Math.floor((now.getTime() - lastP.getTime()) / (1000 * 60 * 60 * 24))
        }
      }
      
      const freq = c.purchaseFrequencyDays || 30
      if (daysSincePurchase !== undefined) {
        const daysToRepurchase = freq - daysSincePurchase
        if (daysSincePurchase > freq) {
          overdueRepurchaseList.push({
            contact: c,
            daysOverdue: daysSincePurchase - freq
          })
        } else if (daysToRepurchase >= 0 && daysToRepurchase <= 15) {
          upcoming15DaysRepurchaseList.push({
            contact: c,
            daysToRepurchase
          })
        }
      }
    })

    overdueRepurchaseList.sort((a, b) => b.daysOverdue - a.daysOverdue)

    return {
      overdueRepurchaseList,
      overdueRepurchaseCount: overdueRepurchaseList.length,
      upcoming15DaysRepurchaseCount: upcoming15DaysRepurchaseList.length
    }
  }, [filteredContacts])

  // 3. Stagnant Deals (>7 days)
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

  // Toggle appointment completed
  const handleToggleAptDone = (apt: Appointment) => {
    const newStatus = apt.status === 'concluido' ? 'agendado' : 'concluido'
    updateAppointment({ ...apt, status: newStatus })
    fetchData()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e0f] text-[var(--white)] p-4 sm:p-6 lg:p-8 gap-6 animate-fade-in pb-24 lg:pb-12 max-w-[1600px] mx-auto w-full">
      
      {/* ========================================================
          1. CABEÇALHO DE BOAS-VINDAS (MANTIDO EXACTAMENTE O NOVO)
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
        
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

          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center gap-2">
            <span>{greetingTime}, <strong className="text-[var(--lime)] font-black">{currentUser?.name || 'Vendedor'}</strong>!</span>
            <span className="text-xl">☀️</span>
          </h1>
        </div>

        {/* Right Actions & Filter Selector */}
        <div className="flex items-center gap-3 z-10 shrink-0">
          {isAdminOrManager && (
            <div className="flex items-center gap-2 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl">
              <Filter size={14} className="text-[var(--lime)]" />
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-white cursor-pointer outline-none"
              >
                <option value="all" className="bg-[#181a1d]">Toda a Equipe</option>
                {usersList.map((u: any) => (
                  <option key={u.id || u.name} value={u.id || u.name} className="bg-[#181a1d]">
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
          2. HERO DUPLO: META DO MÊS (ESQUERDA) + ALERTAS DO DIA (DIREITA)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* BLOCO ESQUERDA (7 Colunas): Resultado x Meta do Mês */}
        <div className="lg:col-span-8 card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg hover:border-[var(--lime)]/30 transition-all">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[var(--lime)]">
                <Target size={18} />
              </div>
              <div>
                <h2 className="text-sm font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Resultado x Meta do Mês</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
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
              <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Progresso</span>
              <span className="text-2xl font-mono font-black text-[var(--lime)]">{pacingMetrics.salesProgressPct}%</span>
            </div>
          </div>

          {/* Main Progress Value */}
          <div className="flex flex-col gap-1.5 my-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-mono text-gray-300">
                Realizado: <strong className="text-2xl font-black text-white ml-1">{formatCurrency(pacingMetrics.totalSalesAchieved)}</strong>
              </span>
              <span className="text-xs font-mono text-[var(--gray2)]">
                Meta: <strong className="text-white font-bold">{formatCurrency(pacingMetrics.salesTarget)}</strong>
              </span>
            </div>

            <div className="w-full h-2.5 bg-black/50 border border-[var(--line)] rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-[var(--lime)] rounded-full transition-all duration-500"
                style={{ width: `${pacingMetrics.salesProgressPct}%` }}
              />
            </div>
          </div>

          {/* Footer Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--line)] text-xs font-mono">
            <div>
              <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Esperado Hoje (Pacing)</span>
              <span className="font-bold text-white">{formatCurrency(pacingMetrics.expectedSalesPacing)}</span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Falta para 100%</span>
              <span className="font-bold text-amber-400">{formatCurrency(pacingMetrics.remainingSalesR$)}</span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Meta Diária Necessária</span>
              <span className="font-bold text-[var(--lime)]">{formatCurrency(pacingMetrics.dailyPaceRequired)} / dia</span>
            </div>

            <div>
              <span className="text-[10px] text-[var(--gray2)] uppercase font-bold block">Visitas no Mês</span>
              <span className="font-bold text-sky-400">{pacingMetrics.currentMonthVisits} / {pacingMetrics.visitsTarget} realizados</span>
            </div>
          </div>

        </div>

        {/* BLOCO DIREITA (4 Colunas): Alertas do Dia */}
        <div className="lg:col-span-4 card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-lg hover:border-[var(--lime)]/30 transition-all">
          
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            <h2 className="text-xs font-display font-bold text-white uppercase tracking-wider">
              Alertas do Dia
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[var(--charcoal)] border border-amber-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-amber-400/80 uppercase block">Recompra 15 Dias</span>
              <div className="my-1">
                <span className="text-2xl font-mono font-black text-amber-400">{clientAlerts.upcoming15DaysRepurchaseCount}</span>
              </div>
              <span className="text-[9px] font-mono text-amber-300 font-bold uppercase">clientes</span>
            </div>

            <div className="bg-[var(--charcoal)] border border-red-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-red-400/80 uppercase block">Recompra Atrasada</span>
              <div className="my-1">
                <span className="text-2xl font-mono font-black text-red-400">{clientAlerts.overdueRepurchaseCount}</span>
              </div>
              <span className="text-[9px] font-mono text-red-300 font-bold uppercase">clientes</span>
            </div>

            <div className="bg-[var(--charcoal)] border border-purple-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[9px] font-mono font-bold text-purple-400/80 uppercase block">Parados &gt; 7 Dias</span>
              <div className="my-1">
                <span className="text-2xl font-mono font-black text-purple-400">{dealAlerts.stagnantDeals.length}</span>
              </div>
              <span className="text-[9px] font-mono text-purple-300 font-bold uppercase">negócios</span>
            </div>
          </div>

          <p className="text-[11px] font-mono text-[var(--gray2)]">
            Mantenha contato regular com os clientes para garantir o fluxo de vendas e evitar estagnação de propostas.
          </p>

        </div>

      </div>

      {/* ========================================================
          3. GRADE INFERIOR LIMPA (2 COLUNAS)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* COLUNA ESQUERDA: Agenda Comercial do Dia */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} className="text-[var(--lime)]" />
              <h3 className="font-display text-xs font-bold text-white uppercase tracking-wider">
                Agenda de Hoje ({todayAppointments.length})
              </h3>
            </div>
            <button
              onClick={() => setCalendarOpen(true)}
              className="text-xs font-mono font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Ver Grade Completa</span>
              <ChevronRight size={13} />
            </button>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="py-10 text-center flex flex-col items-center gap-2.5 bg-black/20 rounded-xl border border-[var(--line)]/50">
              <CheckCircle2 size={28} className="text-gray-500" />
              <p className="text-xs font-mono text-gray-400">Nenhum compromisso agendado para hoje.</p>
              <button
                onClick={() => setCalendarOpen(true)}
                className="btn btn-secondary text-xs py-1.5 px-3.5 font-bold cursor-pointer mt-1"
              >
                <Plus size={14} />
                <span>Agendar Compromisso</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar">
              {todayAppointments.map(apt => (
                <div
                  key={apt.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    apt.status === 'concluido'
                      ? 'bg-black/20 border-gray-800 opacity-60'
                      : 'bg-[var(--charcoal)] border-[var(--line)] hover:border-[var(--lime)]/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={() => handleToggleAptDone(apt)}
                      className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                        apt.status === 'concluido'
                          ? 'bg-[var(--lime)] border-[var(--lime)] text-black'
                          : 'border-gray-600 hover:border-[var(--lime)]'
                      }`}
                      title={apt.status === 'concluido' ? 'Marcar como pendente' : 'Concluir compromisso'}
                    >
                      {apt.status === 'concluido' && <Check size={13} strokeWidth={3} />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[var(--lime)]">{apt.time}</span>
                        <span className="text-xs font-bold text-white truncate">{apt.title}</span>
                      </div>
                      {apt.company_name && (
                        <span className="text-[10px] font-mono text-[var(--gray2)] truncate block mt-0.5">
                          {apt.company_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--lime)]/10 text-[var(--lime)] border border-[var(--lime)]/20 shrink-0">
                    {apt.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: Negócios Estagnados (>7 dias) */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl flex flex-col gap-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2">
              <KanbanSquare size={16} className="text-purple-400" />
              <h3 className="font-display text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Negócios Parados (&gt;7 dias)</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  {dealAlerts.stagnantDeals.length}
                </span>
              </h3>
            </div>
          </div>

          {dealAlerts.stagnantDeals.length === 0 ? (
            <div className="py-10 text-center bg-black/20 rounded-xl border border-[var(--line)]/50">
              <p className="text-xs font-mono text-emerald-400">
                ✓ Todas as suas negociações foram atualizadas recentemente!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto custom-scrollbar">
              {dealAlerts.stagnantDeals.map(({ deal, days }) => (
                <div
                  key={deal.id}
                  onClick={() => setSelectedDeal(deal)}
                  className="p-3.5 rounded-xl bg-[var(--charcoal)] border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{deal.title}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-purple-300 font-bold uppercase">
                        Etapa: {deal.stage}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--gray2)]">
                        · {formatCurrency(deal.estimated_value || deal.final_value || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-purple-400 block">{days}d sem mover</span>
                    <span className="text-[9px] font-mono text-[var(--lime)] hover:underline flex items-center justify-end gap-0.5 mt-0.5">
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
          contactsList={contacts.map(c => ({ id: c.id, name: c.name, company: c.name, representative: c.representative }))}
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

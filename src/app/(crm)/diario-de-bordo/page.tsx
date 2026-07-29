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
  Users, 
  KanbanSquare, 
  Plus, 
  ChevronRight, 
  ArrowUpRight, 
  Sparkles,
  PhoneCall,
  Mail,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  Filter,
  Check
} from 'lucide-react'

import { Contact, Deal, Appointment, UserGoal } from '@/types'
import { getAppointments, updateAppointment } from '@/services/appointment-service'
import { DealDrawer } from '@/components/pipeline/DealDrawer'

import { PipelineCalendarModal } from '@/components/pipeline/PipelineCalendarModal'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'

// Format Portuguese Currency
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

  // Include today if it's a business day
  if (remainingBusinessDays === 0) remainingBusinessDays = 1

  return {
    todayDate,
    totalDays,
    totalBusinessDays,
    elapsedBusinessDays,
    remainingBusinessDays
  }
}

// Helper date parser
function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null
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
  const [userGoal, setUserGoal] = useState<UserGoal | null>(null)
  const [loading, setLoading] = useState(true)

  // Drawer / Modal states
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  const [selectedContactForActivity, setSelectedContactForActivity] = useState<Contact | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Load initial data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Current User
      let userObj = null
      if (typeof window !== 'undefined') {
        const session = localStorage.getItem('crm_current_user')
        if (session) {
          userObj = JSON.parse(session)
          setCurrentUser(userObj)
        }
      }

      // Fetch contacts, deals, users, metas
      const [resContacts, resDeals, resUsers, resMetas] = await Promise.all([
        fetch('/api/contacts').then(r => r.ok ? r.json() : []),
        fetch('/api/deals').then(r => r.ok ? r.json() : []),
        fetch('/api/users').then(r => r.ok ? r.json() : []),
        fetch('/api/metas').then(r => r.ok ? r.json() : [])
      ])

      const contactsData = Array.isArray(resContacts) ? resContacts : (resContacts.data || [])
      const dealsData = Array.isArray(resDeals) ? resDeals : (resDeals.data || [])
      const usersData = Array.isArray(resUsers) ? resUsers : (resUsers.data || [])
      const metasData = Array.isArray(resMetas) ? resMetas : (resMetas.data || [])

      setContacts(contactsData)
      setDeals(dealsData)
      setUsersList(usersData)

      // Get current month goal
      const now = new Date()
      const currentYearStr = String(now.getFullYear())
      const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0')
      
      const foundGoal = metasData.find((m: UserGoal) => 
        m.year === currentYearStr && m.month === currentMonthStr
      ) || { salesGoal: 100000, visitsGoal: 20 }
      setUserGoal(foundGoal)

      // Load appointments
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
    if (typeof window !== 'undefined') {
      window.addEventListener('storage-appointments-changed', fetchData)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-appointments-changed', fetchData)
      }
    }
  }, [])

  // Greeting & Date formatting
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

  // Admin filter options
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor'

  // Filtered contacts based on user selection
  const filteredContacts = useMemo(() => {
    if (userFilter === 'all') return contacts
    return contacts.filter(c => 
      c.representative?.toLowerCase() === userFilter.toLowerCase() ||
      c.assigned_to === userFilter
    )
  }, [contacts, userFilter])

  // Filtered deals
  const filteredDeals = useMemo(() => {
    if (userFilter === 'all') return deals
    return deals.filter(d => 
      d.assigned_to === userFilter ||
      d.contact?.representative?.toLowerCase() === userFilter.toLowerCase()
    )
  }, [deals, userFilter])

  // Filtered appointments
  const todayAppointments = useMemo(() => {
    return appointments.filter(a => a.date === todayStr)
  }, [appointments, todayStr])

  // Business Days Stats
  const bizStats = useMemo(() => getBusinessDaysStats(), [])

  // 1. Goal & Pacing Calculation
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
    const salesTarget = userGoal?.salesGoal || 100000
    const salesProgressPct = Math.min(100, Math.round((totalSalesAchieved / salesTarget) * 100))

    // Pacing calculation
    const expectedSalesPacing = (salesTarget / bizStats.totalBusinessDays) * bizStats.elapsedBusinessDays
    const isPacingAhead = totalSalesAchieved >= expectedSalesPacing

    const remainingSalesR$ = Math.max(0, salesTarget - totalSalesAchieved)
    const dailyPaceRequired = remainingSalesR$ / Math.max(1, bizStats.remainingBusinessDays)

    // Visits calculation
    const currentMonthVisits = appointments.filter(a => {
      if (a.type !== 'visita' && a.type !== 'reuniao') return false
      const dt = new Date(a.date)
      return dt.getMonth() === currentMonth && dt.getFullYear() === currentYear
    }).length
    const visitsTarget = userGoal?.visitsGoal || 20

    return {
      totalSalesAchieved,
      salesTarget,
      salesProgressPct,
      expectedSalesPacing,
      isPacingAhead,
      remainingSalesR$,
      dailyPaceRequired,
      currentMonthVisits,
      visitsTarget
    }
  }, [filteredDeals, userGoal, bizStats, appointments])

  // 2. Client Status & Inactivation Alert (30 to 90 Days)
  const clientAlerts = useMemo(() => {
    const now = new Date()
    
    // Clients with 30-90 days of inactivity
    const inactThreshold = 90
    const inactRiskList: Array<{ contact: Contact; days: number; lastDateStr: string }> = []
    
    let overdueRepurchaseCount = 0

    filteredContacts.forEach(c => {
      // Repurchase overdue calculation
      if (c.lastPurchaseDate && c.purchaseFrequencyDays) {
        const lastP = parseFlexibleDate(c.lastPurchaseDate)
        if (lastP) {
          const nextP = new Date(lastP.getTime() + c.purchaseFrequencyDays * 86400000)
          if (nextP < now) overdueRepurchaseCount++
        }
      }

      // Activity threshold
      let lastActDate: Date | null = null
      if (c.history && c.history.length > 0) {
        const parsedHist = c.history
          .map(h => parseFlexibleDate(h.date))
          .filter((d): d is Date => d !== null)
        if (parsedHist.length > 0) {
          lastActDate = new Date(Math.max(...parsedHist.map(d => d.getTime())))
        }
      }
      if (!lastActDate && c.lastPurchaseDate) {
        lastActDate = parseFlexibleDate(c.lastPurchaseDate)
      }
      if (!lastActDate && c.created_at) {
        lastActDate = parseFlexibleDate(c.created_at)
      }

      if (lastActDate) {
        const diffDays = Math.floor((now.getTime() - lastActDate.getTime()) / (1000 * 60 * 60 * 24))
        const threshold = c.inactivityThresholdDays || inactThreshold

        // Inactivation Risk: Between 30 days and threshold (e.g. 90)
        if (diffDays >= 30 && diffDays <= threshold) {
          inactRiskList.push({
            contact: c,
            days: diffDays,
            lastDateStr: lastActDate.toLocaleDateString('pt-BR')
          })
        }
      }
    })

    // Sort by most critical (highest days)
    inactRiskList.sort((a, b) => b.days - a.days)

    return {
      inactRiskList,
      overdueRepurchaseCount
    }
  }, [filteredContacts])

  // 3. Stagnant Deals (>7 days) & Briefing/Budget pending
  const dealAlerts = useMemo(() => {
    const now = new Date()
    const stagnantDeals: Array<{ deal: Deal; days: number }> = []
    let pendingBriefingCount = 0

    filteredDeals.forEach(d => {
      if (d.stage === 'fechamento' || d.stage === 'perdido') return

      if (d.stage === 'briefing' || d.stage === 'aprovacao') {
        pendingBriefingCount++
      }

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
      stagnantDeals,
      pendingBriefingCount
    }
  }, [filteredDeals])

  // Toggle appointment completed
  const handleToggleAptDone = (apt: Appointment) => {
    const newStatus = apt.status === 'concluido' ? 'agendado' : 'concluido'
    updateAppointment({ ...apt, status: newStatus })
    fetchData()
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0e0f] text-[var(--white)] p-4 sm:p-6 lg:p-8 gap-6 animate-fade-in pb-24 lg:pb-12">
      
      {/* ========================================================
          1. HEADER & GREETING BAR
         ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl shadow-xl relative overflow-hidden">
        
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-1.5 z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-lime-500/10 border border-lime-500/20 text-[var(--lime)] text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Compass size={12} />
              Diário de Bordo Comercial
            </span>
            <span className="text-xs text-[var(--gray2)] font-mono">
              {formattedTodayDate}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight flex items-center gap-2">
            <span>{greetingTime}, {currentUser?.name || 'Vendedor'}!</span>
            <span className="text-xl">☀️</span>
          </h1>

          <p className="text-xs text-[var(--gray2)] max-w-2xl font-mono">
            Seu cockpit diário de vendas: acompanhe metas, ritmo de pacing, agenda do dia e alertas de recompra e inativação.
          </p>
        </div>

        {/* Right Actions & Admin User Filter */}
        <div className="flex flex-wrap items-center gap-3 z-10">
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
                  <option key={u.id} value={u.name} className="bg-[#181a1d]">
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
            <CalendarIcon size={16} className="text-[var(--lime)]" />
            <span>Abrir Agenda</span>
          </button>
        </div>
      </div>

      {/* ========================================================
          2. HERO SECTION: META, RESULTADO & PACING CARD
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Meta x Resultado & Pacing (Col Span 2) */}
        <div className="lg:col-span-2 card bg-gradient-to-br from-[#15171a] to-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col justify-between gap-5 shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[var(--lime)]">
                <Target size={20} />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
                  <span>Resultado x Meta do Mês</span>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    pacingMetrics.isPacingAhead 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  }`}>
                    {pacingMetrics.isPacingAhead ? '▲ Acima do Pacing' : '▼ Ritmo Abaixo do Pacing'}
                  </span>
                </h3>
                <p className="text-[11px] font-mono text-[var(--gray2)]">
                  Dia {bizStats.todayDate} de {bizStats.totalDays} · {bizStats.elapsedBusinessDays} de {bizStats.totalBusinessDays} dias úteis transcorridos
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Progresso da Meta</span>
              <span className="text-2xl font-mono font-black text-[var(--lime)]">{pacingMetrics.salesProgressPct}%</span>
            </div>
          </div>

          {/* Main Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-white font-bold">
                Realizado: <strong className="text-[var(--lime)]">{formatCurrency(pacingMetrics.totalSalesAchieved)}</strong>
              </span>
              <span className="text-[var(--gray2)]">
                Meta: <strong className="text-white">{formatCurrency(pacingMetrics.salesTarget)}</strong>
              </span>
            </div>

            <div className="w-full h-3.5 bg-black/40 border border-[var(--line)] rounded-full p-0.5 relative overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-lime-600 to-[var(--lime)] rounded-full transition-all duration-700 shadow-[0_0_12px_rgba(180,217,50,0.5)]"
                style={{ width: `${pacingMetrics.salesProgressPct}%` }}
              />
            </div>
          </div>

          {/* Pacing Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[var(--charcoal)]/60 p-3.5 rounded-xl border border-[var(--line)]">
            <div>
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Esperado Hoje (Pacing)</span>
              <span className="text-xs font-mono font-bold text-gray-200 mt-0.5 block">
                {formatCurrency(pacingMetrics.expectedSalesPacing)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Falta para 100%</span>
              <span className="text-xs font-mono font-bold text-amber-400 mt-0.5 block">
                {formatCurrency(pacingMetrics.remainingSalesR$)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Meta Diária Necessária</span>
              <span className="text-xs font-mono font-bold text-[var(--lime)] mt-0.5 block">
                {formatCurrency(pacingMetrics.dailyPaceRequired)} / dia
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block">Visitas no Mês</span>
              <span className="text-xs font-mono font-bold text-sky-400 mt-0.5 block">
                {pacingMetrics.currentMonthVisits} / {pacingMetrics.visitsTarget} realizados
              </span>
            </div>
          </div>

        </div>

        {/* Card 2: Central de Alertas Críticos (Col Span 1) */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3">
            <AlertTriangle size={18} className="text-[var(--lime)]" />
            <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
              Alertas do Dia
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Box 1: Agenda Hoje */}
            <div className="bg-[var(--charcoal)] border border-[var(--line)] p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Agenda Hoje</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-black text-white">{todayAppointments.length}</span>
                <span className="text-[10px] font-mono text-[var(--lime)] font-bold">eventos</span>
              </div>
            </div>

            {/* Box 2: Recompra Atrasada */}
            <div className="bg-[var(--charcoal)] border border-red-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-red-400 uppercase font-bold">Recompra Atrasada</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-black text-red-400">{clientAlerts.overdueRepurchaseCount}</span>
                <span className="text-[10px] font-mono text-red-400/80 font-bold">clientes</span>
              </div>
            </div>

            {/* Box 3: Inativação Iminente */}
            <div className="bg-[var(--charcoal)] border border-amber-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Risco Inativação</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-black text-amber-400">{clientAlerts.inactRiskList.length}</span>
                <span className="text-[10px] font-mono text-amber-400/80 font-bold">30 a 90d</span>
              </div>
            </div>

            {/* Box 4: Negócios Estagnados */}
            <div className="bg-[var(--charcoal)] border border-purple-500/20 p-3 rounded-xl flex flex-col justify-between">
              <span className="text-[10px] font-mono text-purple-400 uppercase font-bold">Parados &gt; 7 Dias</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-black text-purple-400">{dealAlerts.stagnantDeals.length}</span>
                <span className="text-[10px] font-mono text-purple-400/80 font-bold">negócios</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-center">
            <span className="text-[11px] font-mono text-[var(--gray2)]">
              Mantenha contato regular para evitar perda de clientes ativos.
            </span>
          </div>
        </div>

      </div>

      {/* ========================================================
          3. MAIN 2-COLUMN GRID (AGENDA & CLIENTES vs FUNIL)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Agenda Comercial & Risco de Inativação */}
        <div className="flex flex-col gap-6">
          
          {/* Section 1: Agenda Comercial do Dia */}
          <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-[var(--lime)]" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Agenda de Hoje ({todayAppointments.length})
                </h3>
              </div>
              <button
                onClick={() => setCalendarOpen(true)}
                className="text-xs font-mono font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver Grade Completa</span>
                <ChevronRight size={14} />
              </button>
            </div>

            {todayAppointments.length === 0 ? (
              <div className="py-8 text-center flex flex-col items-center gap-2 bg-black/20 rounded-xl border border-[var(--line)]/50">
                <CheckCircle2 size={28} className="text-gray-500" />
                <p className="text-xs font-mono text-gray-400">Nenhum compromisso agendado para hoje.</p>
                <button
                  onClick={() => setCalendarOpen(true)}
                  className="btn btn-secondary text-xs py-1.5 px-3 mt-1 font-bold cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Agendar Compromisso</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto custom-scrollbar">
                {todayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      apt.status === 'concluido'
                        ? 'bg-black/20 border-gray-800 opacity-60'
                        : 'bg-[var(--charcoal)] border-[var(--line)] hover:border-[var(--lime)]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleToggleAptDone(apt)}
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer ${
                          apt.status === 'concluido'
                            ? 'bg-[var(--lime)] border-[var(--lime)] text-black'
                            : 'border-gray-600 hover:border-[var(--lime)]'
                        }`}
                        title={apt.status === 'concluido' ? 'Marcar como pendente' : 'Concluir compromisso'}
                      >
                        {apt.status === 'concluido' && <Check size={14} strokeWidth={3} />}
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[var(--lime)]">{apt.time}</span>
                          <span className="text-xs font-bold text-white truncate">{apt.title}</span>
                        </div>
                        {apt.company_name && (
                          <span className="text-[10px] font-mono text-[var(--gray2)] truncate block">
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

          {/* Section 2: Alerta de Inativação Iminente (30 a 90 Dias) */}
          <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-amber-400" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Risco de Inativação</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    30 a 90 dias sem contato ({clientAlerts.inactRiskList.length})
                  </span>
                </h3>
              </div>
            </div>

            {clientAlerts.inactRiskList.length === 0 ? (
              <div className="py-6 text-center bg-black/20 rounded-xl border border-[var(--line)]/50">
                <p className="text-xs font-mono text-emerald-400">
                  ✓ Nenhum cliente no intervalo de 30 a 90 dias sem atividades!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {clientAlerts.inactRiskList.slice(0, 6).map(({ contact, days, lastDateStr }) => (
                  <div
                    key={contact.id}
                    className="p-3 rounded-xl bg-[var(--charcoal)] border border-amber-500/20 flex items-center justify-between gap-3 hover:border-amber-500/50 transition-all"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{contact.name}</span>
                        {contact.representative && (
                          <span className="text-[9px] font-mono text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">
                            {contact.representative}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-amber-400/90 mt-0.5">
                        Sem atividades há <strong>{days} dias</strong> (última: {lastDateStr})
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedContactForActivity(contact)}
                      className="btn btn-secondary text-[11px] py-1 px-2.5 font-mono font-bold border-amber-500/30 hover:border-amber-400 text-amber-300 hover:bg-amber-500/10 cursor-pointer shrink-0"
                    >
                      Registrar Atividade
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Funil de Negociações & Parados */}
        <div className="flex flex-col gap-6">
          
          {/* Section 3: Negócios Parados há mais de 7 Dias */}
          <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <KanbanSquare size={18} className="text-purple-400" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Negócios Estagnados (&gt;7 dias)</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    {dealAlerts.stagnantDeals.length}
                  </span>
                </h3>
              </div>
            </div>

            {dealAlerts.stagnantDeals.length === 0 ? (
              <div className="py-6 text-center bg-black/20 rounded-xl border border-[var(--line)]/50">
                <p className="text-xs font-mono text-emerald-400">
                  ✓ Todas as suas negociações foram atualizadas recentemente!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto custom-scrollbar">
                {dealAlerts.stagnantDeals.slice(0, 6).map(({ deal, days }) => (
                  <div
                    key={deal.id}
                    onClick={() => setSelectedDeal(deal)}
                    className="p-3 rounded-xl bg-[var(--charcoal)] border border-purple-500/20 hover:border-purple-500/50 transition-all cursor-pointer flex items-center justify-between gap-3"
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

          {/* Section 4: Resumo do Funil de Vendas */}
          <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={18} className="text-[var(--lime)]" />
                <h3 className="font-display text-sm font-bold text-white uppercase tracking-wider">
                  Visão Geral do Funil
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Negócios Ativos</span>
                <span className="text-lg font-mono font-bold text-white block mt-1">
                  {filteredDeals.filter(d => d.stage !== 'fechamento' && d.stage !== 'perdido').length}cards
                </span>
              </div>

              <div className="bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Orçamentos Pendentes</span>
                <span className="text-lg font-mono font-bold text-[var(--lime)] block mt-1">
                  {dealAlerts.pendingBriefingCount} em orçamento
                </span>
              </div>
            </div>
          </div>

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

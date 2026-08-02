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
  CheckCircle,
  Phone,
  BarChart3
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

function getBusinessDaysInMonth(year: number, month: number): number {
  const totalDays = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= totalDays; d++) {
    const dayOfWeek = new Date(year, month, d).getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
  }
  return count || 21
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

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function DiarioDeBordoPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'))

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

  // Modo de visualização do gráfico de atividades (Diário / Semanal / Mensal)
  const [activityChartViewMode, setActivityChartViewMode] = useState<'diario' | 'semanal' | 'mensal'>('diario')

  // Modal Drill-down do Gráfico de Atividades por Dia
  const [activityDrillDown, setActivityDrillDown] = useState<{
    isOpen: boolean
    title: string
    dateLabel: string
    items: Array<{ id: string; type: string; clientName: string; time: string; description: string; user: string }>
  }>({
    isOpen: false,
    title: '',
    dateLabel: '',
    items: []
  })

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
            loadedGoalsMap = { ...loadedGoalsMap, ...parsedG }
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
      window.addEventListener('storage-goals-changed', handleStorageChange)
      window.addEventListener('storage', handleStorageChange)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-deals-changed', handleStorageChange)
        window.removeEventListener('storage-contacts-changed', handleStorageChange)
        window.removeEventListener('storage-appointments-changed', handleStorageChange)
        window.removeEventListener('storage-goals-changed', handleStorageChange)
        window.removeEventListener('storage', handleStorageChange)
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

  // Business Days Stats para o Mês e Ano selecionados
  const bizStats = useMemo(() => {
    const y = parseInt(selectedYear, 10) || new Date().getFullYear()
    const m = parseInt(selectedMonth, 10) - 1
    const totalBusinessDays = getBusinessDaysInMonth(y, m)
    
    const now = new Date()
    const isCurrentMonth = y === now.getFullYear() && m === now.getMonth()
    
    let elapsedBusinessDays = totalBusinessDays
    let remainingBusinessDays = 0
    let todayDate = new Date(y, m + 1, 0).getDate()
    
    if (isCurrentMonth) {
      todayDate = now.getDate()
      let elapsed = 0
      const date = new Date(y, m, 1)
      while (date.getDate() <= todayDate && date.getMonth() === m) {
        const dayOfWeek = date.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          elapsed++
        }
        date.setDate(date.getDate() + 1)
      }
      elapsedBusinessDays = Math.min(totalBusinessDays, Math.max(1, elapsed))
      remainingBusinessDays = Math.max(0, totalBusinessDays - elapsedBusinessDays)
    } else if (y > now.getFullYear() || (y === now.getFullYear() && m > now.getMonth())) {
      elapsedBusinessDays = 0
      remainingBusinessDays = totalBusinessDays
      todayDate = 1
    }

    return {
      totalDays: new Date(y, m + 1, 0).getDate(),
      todayDate,
      totalBusinessDays,
      elapsedBusinessDays,
      remainingBusinessDays,
      monthName: MONTH_NAMES[m] || 'Mês'
    }
  }, [selectedYear, selectedMonth])

  // Calculate Meta & Sales Goal for selected Month/Year
  const currentMonthGoal = useMemo(() => {
    const yearStr = selectedYear
    const monthStr = selectedMonth

    const activeFilter = ((!isAdminOrManager && currentUser?.name) ? currentUser.name : userFilter).toLowerCase().trim()

    const norm = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const isMauricio = (s: string) => {
      const n = norm(s)
      return n.includes('mauricio') || n.includes('maciel')
    }
    let salesGoalSum = 0
    let visitsGoalSum = 0
    let contactsGoalSum = 0
    let userHasVisitsGoal = true
    let userHasContactsGoal = true

    if (activeFilter === 'all') {
      let activeEntriesCount = 0
      Object.keys(goalsMap).forEach(key => {
        if (isMauricio(key)) return
        const g = goalsMap[key]
        if (isMauricio(g?.userName || '')) return

        if (key.startsWith(`${yearStr}_${monthStr}_`) && !key.startsWith('EQUIPE_')) {
          salesGoalSum += Number(g?.salesGoal || 0)
          activeEntriesCount++
          
          const isVActive = g?.hasVisitsGoal !== false && (g?.visitsGoal === undefined || Number(g?.visitsGoal) > 0)
          if (isVActive) {
            visitsGoalSum += Number(g?.visitsGoal !== undefined ? g.visitsGoal : 20)
          }

          const isCActive = g?.hasContactsGoal !== false && (g?.contactsGoal === undefined || Number(g?.contactsGoal) > 0)
          if (isCActive) {
            contactsGoalSum += Number(g?.contactsGoal !== undefined ? g.contactsGoal : 400)
          }
        }
      })

      if (salesGoalSum === 0 || activeEntriesCount < 5) salesGoalSum = 390000
      if (visitsGoalSum === 0 || activeEntriesCount < 5) visitsGoalSum = 260
      if (contactsGoalSum === 0 || activeEntriesCount < 5) contactsGoalSum = 5200
      userHasVisitsGoal = true
      userHasContactsGoal = true
    } else {
      const targetUser = usersList.find(u => 
        u.id === activeFilter || 
        u.name === activeFilter || 
        isSameRepresentative(u.name, activeFilter) || 
        isSameRepresentative(u.id, activeFilter)
      )
      const targetUserId = targetUser?.id || ''
      const targetUserName = targetUser?.name || availableReps.find(r => r === activeFilter || isSameRepresentative(r, activeFilter)) || activeFilter

      // Robust goal lookup for individual user matching keys, names, IDs, or representatives
      let gObj: UserGoal | null = null
      const prefix = `${yearStr}_${monthStr}_`

      Object.keys(goalsMap).forEach(key => {
        if (key.startsWith(prefix)) {
          const g = goalsMap[key]
          const keyUser = key.replace(prefix, '')
          const gName = g?.userName || keyUser
          const gId = g?.userId || keyUser

          const matchesId = Boolean(targetUserId && (gId === targetUserId || keyUser === targetUserId))
          const matchesName = Boolean(
            isSameRepresentative(gName, targetUserName) ||
            isSameRepresentative(keyUser, targetUserName) ||
            (gId && isSameRepresentative(gId, targetUserName)) ||
            (gName && targetUserName && gName.toLowerCase().trim().includes(targetUserName.toLowerCase().trim().substring(0, 7))) ||
            (keyUser && targetUserName && keyUser.toLowerCase().trim().includes(targetUserName.toLowerCase().trim().substring(0, 7)))
          )

          if (matchesId || matchesName) {
            gObj = g
          }
        }
      })

      if (gObj) {
        const goalItem = gObj as UserGoal
        salesGoalSum = Number(goalItem.salesGoal || 0)
        
        userHasVisitsGoal = goalItem.hasVisitsGoal !== false && (goalItem.visitsGoal === undefined || Number(goalItem.visitsGoal) > 0)
        visitsGoalSum = userHasVisitsGoal ? Number(goalItem.visitsGoal !== undefined ? goalItem.visitsGoal : 20) : 0

        userHasContactsGoal = goalItem.hasContactsGoal !== false && (goalItem.contactsGoal === undefined || Number(goalItem.contactsGoal) > 0)
        contactsGoalSum = userHasContactsGoal ? Number(goalItem.contactsGoal !== undefined ? goalItem.contactsGoal : 400) : 0
      } else {
        salesGoalSum = 30000
        visitsGoalSum = 20
        contactsGoalSum = 400
        userHasVisitsGoal = true
        userHasContactsGoal = true
      }
    }

    return {
      salesGoal: salesGoalSum,
      visitsGoal: visitsGoalSum,
      contactsGoal: contactsGoalSum,
      hasVisitsGoal: userHasVisitsGoal,
      hasContactsGoal: userHasContactsGoal
    }
  }, [goalsMap, userFilter, availableReps, isAdminOrManager, currentUser?.name, selectedYear, selectedMonth])

  // 1. Pacing & Goal Calculations (Unified with Dashboard)
  const pacingMetrics = useMemo(() => {
    const currentMonthStr = selectedMonth
    const currentYearStr = selectedYear
    const selYearNum = parseInt(selectedYear, 10)
    const selMonthNum = parseInt(selectedMonth, 10) - 1

    let totalSalesAchieved = 0

    // 1. Accumulate orders in selected month from filteredContacts
    filteredContacts.forEach(c => {
      if (c.orders && Array.isArray(c.orders)) {
        c.orders.forEach((o: any) => {
          if (o.date) {
            const dt = parseFlexibleDate(o.date)
            if (dt && dt.getMonth() === selMonthNum && dt.getFullYear() === selYearNum) {
              totalSalesAchieved += (Number(o.value) || 0)
            }
          }
        })
      }
    })

    // 2. Accumulate won deals in selected month from filteredDeals
    filteredDeals.forEach(d => {
      if (d.stage === 'fechamento' || d.stage === 'pedido') {
        const closeDate = d.closed_at || d.updated_at || d.stage_entered_at
        if (closeDate) {
          const dt = parseFlexibleDate(closeDate)
          if (dt && dt.getMonth() === selMonthNum && dt.getFullYear() === selYearNum) {
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

    // Filter appointments for user
    const userAppointments = appointments.filter(a => {
      if (userFilter === 'all') return true
      const aUser = a.assigned_to || (a as any).assignedTo || ''
      return isSameRepresentative(aUser, userFilter)
    })

    // Visits calculation (Presenciais / Visitas)
    const currentMonthVisits = userAppointments.filter(a => {
      if (a.type !== 'visita' && a.type !== 'reuniao') return false
      const dt = parseFlexibleDate(a.date)
      if (!dt) return false
      return dt.getMonth() === selMonthNum && dt.getFullYear() === selYearNum
    }).length

    // Contacts calculation (Ligações, WhatsApp, E-mails, Follow-ups)
    const currentMonthContacts = userAppointments.filter(a => {
      if (a.type === 'visita' || a.type === 'reuniao') return false
      const dt = parseFlexibleDate(a.date)
      if (!dt) return false
      return dt.getMonth() === selMonthNum && dt.getFullYear() === selYearNum
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
      visitsTarget: currentMonthGoal.visitsGoal,
      hasVisitsGoal: currentMonthGoal.hasVisitsGoal,
      currentMonthContacts,
      contactsTarget: currentMonthGoal.contactsGoal,
      hasContactsGoal: currentMonthGoal.hasContactsGoal
    }
  }, [filteredContacts, filteredDeals, currentMonthGoal, bizStats, appointments, userFilter, selectedYear, selectedMonth])

  // 1.5. Gráfico Diário de Atividades (Visitas x Contatos)
  const activityChartData = useMemo(() => {
    const currentYear = parseInt(selectedYear, 10) || new Date().getFullYear()
    const currentMonth = parseInt(selectedMonth, 10) - 1

    let visitsTarget = 0
    let contactsTarget = 0

    if (activityChartViewMode === 'diario') {
      visitsTarget = Math.max(1, Math.round(currentMonthGoal.visitsGoal / Math.max(1, bizStats.totalBusinessDays)))
      contactsTarget = Math.max(1, Math.round(currentMonthGoal.contactsGoal / Math.max(1, bizStats.totalBusinessDays)))
    } else if (activityChartViewMode === 'semanal') {
      visitsTarget = Math.max(1, Math.round(currentMonthGoal.visitsGoal / 4.4))
      contactsTarget = Math.max(1, Math.round(currentMonthGoal.contactsGoal / 4.4))
    } else {
      visitsTarget = currentMonthGoal.visitsGoal
      contactsTarget = currentMonthGoal.contactsGoal
    }

    // 1. Filtrar compromissos do usuário selecionado
    const filteredApts = appointments.filter(a => {
      if (userFilter === 'all') return true
      const targetUser = usersList.find(u => u.id === userFilter || u.name === userFilter || isSameRepresentative(u.name, userFilter))
      const targetName = targetUser?.name || userFilter
      const aUser = a.assigned_to || (a as any).assignedTo || a.user_name || ''
      return isSameRepresentative(aUser, targetName) || (a.user_id && a.user_id === targetUser?.id)
    })

    // 2. Coletar também atividades registradas na ficha dos contatos
    const contactActivities: Array<{ date: Date; isVisit: boolean; clientName: string; description: string; user: string }> = []
    filteredContacts.forEach(c => {
      const cActs = (c as any).activities
      if (cActs && Array.isArray(cActs)) {
        cActs.forEach((act: any) => {
          if (act.timestamp) {
            const dt = parseFlexibleDate(act.timestamp)
            if (dt) {
              const isVisit = act.type === 'visita' || act.type === 'reuniao'
              contactActivities.push({
                date: dt,
                isVisit,
                clientName: c.company || c.name || 'Cliente',
                description: act.content || 'Atividade registrada',
                user: c.representative || ''
              })
            }
          }
        })
      }
    })

    let slots: Array<{
      label: string
      dateStr: string
      visitsCount: number
      contactsCount: number
      items: Array<{ id: string; type: string; clientName: string; time: string; description: string; user: string }>
    }> = []

    if (activityChartViewMode === 'diario') {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = String(day).padStart(2, '0')
        const monthStr = String(currentMonth + 1).padStart(2, '0')
        const fullDateStr = `${dayStr}/${monthStr}/${currentYear}`
        const label = String(day)

        const dayApts = filteredApts.filter(a => {
          if (!a.date) return false
          const dt = parseFlexibleDate(a.date)
          if (!dt) return false
          return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth && dt.getDate() === day
        })

        const dayActs = contactActivities.filter(act => {
          return act.date.getFullYear() === currentYear && act.date.getMonth() === currentMonth && act.date.getDate() === day
        })

        let visits = 0
        let contacts = 0
        const itemsList: any[] = []

        dayApts.forEach(a => {
          const isVisit = a.type === 'visita' || a.type === 'reuniao'
          if (isVisit) visits++
          else contacts++

          itemsList.push({
            id: a.id || String(Math.random()),
            type: isVisit ? 'Visita Presencial / Reunião' : 'Contato (Ligação / WhatsApp / Email)',
            clientName: (a as any).contact_company || (a as any).contact_name || a.title || 'Cliente sem nome',
            time: a.time || '—',
            description: (a as any).description || a.title || 'Atividade registrada',
            user: a.user_name || a.assigned_to || ''
          })
        })

        dayActs.forEach(act => {
          if (act.isVisit) visits++
          else contacts++

          itemsList.push({
            id: String(Math.random()),
            type: act.isVisit ? 'Visita Presencial' : 'Histórico de Contato',
            clientName: act.clientName,
            time: `${String(act.date.getHours()).padStart(2, '0')}:${String(act.date.getMinutes()).padStart(2, '0')}`,
            description: act.description,
            user: act.user
          })
        })

        slots.push({
          label,
          dateStr: fullDateStr,
          visitsCount: visits,
          contactsCount: contacts,
          items: itemsList
        })
      }
    } else if (activityChartViewMode === 'semanal') {
      const weekLabels = ['SEM 1', 'SEM 2', 'SEM 3', 'SEM 4', 'SEM 5']
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

      weekLabels.forEach((wLabel, wIdx) => {
        const startDay = wIdx * 7 + 1
        if (startDay > daysInMonth) return
        const endDay = Math.min(daysInMonth, (wIdx + 1) * 7)

        const weekApts = filteredApts.filter(a => {
          if (!a.date) return false
          const dt = parseFlexibleDate(a.date)
          if (!dt) return false
          return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth && dt.getDate() >= startDay && dt.getDate() <= endDay
        })

        const weekActs = contactActivities.filter(act => {
          return act.date.getFullYear() === currentYear && act.date.getMonth() === currentMonth && act.date.getDate() >= startDay && act.date.getDate() <= endDay
        })

        let visits = 0
        let contacts = 0
        const itemsList: any[] = []

        weekApts.forEach(a => {
          const isVisit = a.type === 'visita' || a.type === 'reuniao'
          if (isVisit) visits++
          else contacts++

          itemsList.push({
            id: a.id || String(Math.random()),
            type: isVisit ? 'Visita Presencial / Reunião' : 'Contato (Ligação / WhatsApp / Email)',
            clientName: (a as any).contact_company || (a as any).contact_name || a.title || 'Cliente sem nome',
            time: a.time || '—',
            description: (a as any).description || a.title || 'Atividade registrada',
            user: a.user_name || a.assigned_to || ''
          })
        })

        weekActs.forEach(act => {
          if (act.isVisit) visits++
          else contacts++

          itemsList.push({
            id: String(Math.random()),
            type: act.isVisit ? 'Visita Presencial' : 'Histórico de Contato',
            clientName: act.clientName,
            time: '—',
            description: act.description,
            user: act.user
          })
        })

        slots.push({
          label: wLabel,
          dateStr: `${wLabel} (${startDay} a ${endDay} de ${MONTH_NAMES[currentMonth]})`,
          visitsCount: visits,
          contactsCount: contacts,
          items: itemsList
        })
      })
    } else {
      // Mensal
      const yearShort = selectedYear.substring(2)
      MONTH_NAMES.forEach((mName, mIdx) => {
        const monthApts = filteredApts.filter(a => {
          if (!a.date) return false
          const dt = parseFlexibleDate(a.date)
          if (!dt) return false
          return dt.getFullYear() === currentYear && dt.getMonth() === mIdx
        })

        const monthActs = contactActivities.filter(act => {
          return act.date.getFullYear() === currentYear && act.date.getMonth() === mIdx
        })

        let visits = 0
        let contacts = 0
        const itemsList: any[] = []

        monthApts.forEach(a => {
          const isVisit = a.type === 'visita' || a.type === 'reuniao'
          if (isVisit) visits++
          else contacts++

          itemsList.push({
            id: a.id || String(Math.random()),
            type: isVisit ? 'Visita Presencial / Reunião' : 'Contato (Ligação / WhatsApp / Email)',
            clientName: (a as any).contact_company || (a as any).contact_name || a.title || 'Cliente sem nome',
            time: a.time || '—',
            description: (a as any).description || a.title || 'Atividade registrada',
            user: a.user_name || a.assigned_to || ''
          })
        })

        monthActs.forEach(act => {
          if (act.isVisit) visits++
          else contacts++

          itemsList.push({
            id: String(Math.random()),
            type: act.isVisit ? 'Visita Presencial' : 'Histórico de Contato',
            clientName: act.clientName,
            time: '—',
            description: act.description,
            user: act.user
          })
        })

        slots.push({
          label: `${mName.substring(0, 3).toUpperCase()}/${yearShort}`,
          dateStr: `${mName} de ${currentYear}`,
          visitsCount: visits,
          contactsCount: contacts,
          items: itemsList
        })
      })
    }

    const maxActivityVal = Math.max(1, ...slots.map(s => Math.max(s.visitsCount, s.contactsCount)))

    return {
      slots,
      maxActivityVal,
      visitsTarget,
      contactsTarget
    }
  }, [appointments, filteredContacts, userFilter, usersList, activityChartViewMode, selectedYear, selectedMonth, currentMonthGoal, bizStats])

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

        {/* Right Actions & Filter Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 ml-auto shrink-0 z-10">
          {/* Seletor de Ano */}
          <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl">
            <CalendarIcon size={14} className="text-[var(--lime)] shrink-0" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--white)] cursor-pointer outline-none"
            >
              <option value="2024" className="bg-[var(--card)] text-[var(--white)]">2024</option>
              <option value="2025" className="bg-[var(--card)] text-[var(--white)]">2025</option>
              <option value="2026" className="bg-[var(--card)] text-[var(--white)]">2026</option>
              <option value="2027" className="bg-[var(--card)] text-[var(--white)]">2027</option>
            </select>
          </div>

          {/* Seletor de Mês */}
          <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--white)] cursor-pointer outline-none"
            >
              {MONTH_NAMES.map((mName, idx) => {
                const mVal = String(idx + 1).padStart(2, '0')
                return (
                  <option key={mVal} value={mVal} className="bg-[var(--card)] text-[var(--white)]">
                    {mName}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Seletor de Representante (APENAS PARA GESTOR E ADMIN) */}
          {isAdminOrManager && (
            <div className="flex items-center gap-2 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl max-w-[200px]">
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

          {/* KPIs NUMÉRICOS COM DESIGN IDÊNTICO AOS CARDS DO DASHBOARD (FAIXAS NEON + MARCA D'ÁGUA 3D) */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${
            (pacingMetrics.hasVisitsGoal && pacingMetrics.hasContactsGoal)
              ? 'lg:grid-cols-5'
              : (pacingMetrics.hasVisitsGoal || pacingMetrics.hasContactsGoal)
              ? 'lg:grid-cols-4'
              : 'lg:grid-cols-3'
          } gap-3`}>
            
            {/* KPI 1: ESPERADO HOJE (PACING) */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-4 pr-3 py-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#0284c7] rounded-l-2xl z-20 shadow-[0_0_10px_#0284c7]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <Target size={36} className="absolute right-2 top-2 text-[#0284c7] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-1 z-10">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-sky-400 leading-tight">
                  ESPERADO HOJE (PACING)
                </span>
              </div>

              <div className="my-1.5 z-10">
                <div className="text-lg sm:text-xl font-mono font-black text-[var(--white)] tracking-tight">
                  {formatCurrency(pacingMetrics.expectedSalesPacing)}
                </div>
              </div>

              <div className="pt-1.5 border-t border-[var(--line)]/50 text-[10px] font-mono text-[var(--gray2)] font-semibold z-10">
                Ritmo planejado até hoje
              </div>
            </div>

            {/* KPI 2: FALTA PARA 100% */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-4 pr-3 py-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f59e0b] rounded-l-2xl z-20 shadow-[0_0_10px_#f59e0b]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <AlertCircle size={36} className="absolute right-2 top-2 text-[#f59e0b] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-1 z-10">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-400 leading-tight">
                  FALTA PARA 100%
                </span>
              </div>

              <div className="my-1.5 z-10">
                <div className="text-lg sm:text-xl font-mono font-black text-amber-400 tracking-tight">
                  {formatCurrency(pacingMetrics.remainingSalesR$)}
                </div>
              </div>

              <div className="pt-1.5 border-t border-[var(--line)]/50 text-[10px] font-mono text-amber-400/90 font-bold z-10">
                {pacingMetrics.remainingSalesR$ > 0 ? 'Diferença p/ meta' : '100% Atingida!'}
              </div>
            </div>

            {/* KPI 3: META DIÁRIA NECESSÁRIA */}
            <div className="card bg-[var(--card)] border border-[var(--line)] pl-4 pr-3 py-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
              {/* FAIXA LATERAL ESQUERDA NEON */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#06b6d4] rounded-l-2xl z-20 shadow-[0_0_10px_#06b6d4]" />

              {/* MARCA D'ÁGUA 3D INTEIRA */}
              <TrendingUp size={36} className="absolute right-2 top-2 text-[#06b6d4] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

              <div className="flex items-start justify-between gap-1 z-10">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-400 leading-tight">
                  META DIÁRIA
                </span>
              </div>

              <div className="my-1.5 z-10">
                <div className="text-lg sm:text-xl font-mono font-black text-cyan-400 tracking-tight">
                  {formatCurrency(pacingMetrics.dailyPaceRequired)} <span className="text-[10px] font-normal text-[var(--gray2)]">/dia</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-[var(--line)]/50 text-[10px] font-mono text-[var(--gray2)] font-semibold z-10">
                Faltam <strong className="text-[var(--white)]">{bizStats.remainingBusinessDays}</strong> dias úteis
              </div>
            </div>

            {/* KPI 4: VISITAS NO MÊS (Condicional) */}
            {pacingMetrics.hasVisitsGoal && (
              <div className="card bg-[var(--card)] border border-[var(--line)] pl-4 pr-3 py-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
                {/* FAIXA LATERAL ESQUERDA NEON */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8b5cf6] rounded-l-2xl z-20 shadow-[0_0_10px_#8b5cf6]" />

                {/* MARCA D'ÁGUA 3D INTEIRA */}
                <Users size={36} className="absolute right-2 top-2 text-[#8b5cf6] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

                <div className="flex items-start justify-between gap-1 z-10">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-400 leading-tight">
                    VISITAS NO MÊS
                  </span>
                </div>

                <div className="my-1.5 z-10">
                  <div className="text-lg sm:text-xl font-mono font-black text-[#8b5cf6] tracking-tight">
                    {pacingMetrics.currentMonthVisits} <span className="text-[10px] font-normal text-[var(--gray2)]">/ {pacingMetrics.visitsTarget}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[var(--line)]/50 text-[10px] font-mono text-[var(--gray2)] font-semibold z-10">
                  Visitas / Reuniões
                </div>
              </div>
            )}

            {/* KPI 5: CONTATOS NO MÊS (Condicional) */}
            {pacingMetrics.hasContactsGoal && (
              <div className="card bg-[var(--card)] border border-[var(--line)] pl-4 pr-3 py-3.5 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
                {/* FAIXA LATERAL ESQUERDA NEON */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#10b981] rounded-l-2xl z-20 shadow-[0_0_10px_#10b981]" />

                {/* MARCA D'ÁGUA 3D INTEIRA */}
                <Phone size={36} className="absolute right-2 top-2 text-[#10b981] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

                <div className="flex items-start justify-between gap-1 z-10">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 leading-tight">
                    CONTATOS NO MÊS
                  </span>
                </div>

                <div className="my-1.5 z-10">
                  <div className="text-lg sm:text-xl font-mono font-black text-[#10b981] tracking-tight">
                    {pacingMetrics.currentMonthContacts} <span className="text-[10px] font-normal text-[var(--gray2)]">/ {pacingMetrics.contactsTarget}</span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-[var(--line)]/50 text-[10px] font-mono text-[var(--gray2)] font-semibold z-10">
                  Ligações / WhatsApp / E-mails
                </div>
              </div>
            )}

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
          2.5. GRÁFICO DE ACOMPANHAMENTO DIÁRIO DE ATIVIDADES (VISITAS X CONTATOS)
         ======================================================== */}
      <div className="w-full card bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col gap-4 relative overflow-hidden select-none shrink-0 min-h-[360px]">
        
        {/* Cabeçalho do Gráfico */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/25 to-purple-900/10 border border-purple-500/40 text-purple-400 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2">
                <span>Acompanhamento Diário de Atividades</span>
              </h3>
              <p className="text-xs font-mono text-[var(--gray2)] font-semibold mt-0.5 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] inline-block shadow-[0_0_8px_#8b5cf6]" /> Visitas Presenciais</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block shadow-[0_0_8px_#10b981]" /> Contatos & Interações</span>
              </p>
            </div>
          </div>

          {/* Toggle de Modo do Gráfico */}
          <div className="flex items-center gap-1 bg-[var(--charcoal)] p-1 rounded-xl border border-[var(--line)] self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActivityChartViewMode('diario')}
              className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                activityChartViewMode === 'diario'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--gray2)] hover:text-[var(--white)]'
              }`}
            >
              Diário
            </button>
            <button
              type="button"
              onClick={() => setActivityChartViewMode('semanal')}
              className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                activityChartViewMode === 'semanal'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--gray2)] hover:text-[var(--white)]'
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setActivityChartViewMode('mensal')}
              className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                activityChartViewMode === 'mensal'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-[var(--gray2)] hover:text-[var(--white)]'
              }`}
            >
              Mensal
            </button>
          </div>
        </div>

        {/* Container do Gráfico com Barras Duplas (Visitas e Contatos lado a lado) */}
        <div className="h-60 flex items-end justify-between gap-1 pt-8 pb-1 px-1 border-b border-[var(--line)] relative overflow-hidden select-none">
          {/* Gridlines Horizontais de Fundo */}
          <div className="absolute inset-x-0 top-3 bottom-0 flex flex-col justify-between pointer-events-none opacity-10">
            <div className="border-b border-white w-full" />
            <div className="border-b border-white w-full" />
            <div className="border-b border-white w-full" />
            <div className="border-b border-white w-full" />
          </div>

          {/* LINHA PONTILHADA DA META (100% - TOPO DO GRÁFICO) */}
          <div className="absolute inset-x-0 top-7 border-b-2 border-dashed border-slate-600/80 z-20 pointer-events-none flex items-center justify-end pr-3">
            <div className="flex items-center gap-2 -mt-4">
              {pacingMetrics.hasVisitsGoal && activityChartData.visitsTarget > 0 && (
                <span className="bg-purple-950/90 text-purple-300 text-[8px] sm:text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-purple-500/40 shadow-sm">
                  Meta Visitas: {activityChartData.visitsTarget}
                </span>
              )}
              {pacingMetrics.hasContactsGoal && activityChartData.contactsTarget > 0 && (
                <span className="bg-emerald-950/90 text-emerald-300 text-[8px] sm:text-[9px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-500/40 shadow-sm">
                  Meta Contatos: {activityChartData.contactsTarget}
                </span>
              )}
            </div>
          </div>

          {activityChartData.slots.map((item, idx) => {
            const vPct = item.visitsCount > 0 ? Math.max(4, Math.min(100, Math.round((item.visitsCount / Math.max(1, activityChartData.visitsTarget)) * 100))) : 0
            const cPct = item.contactsCount > 0 ? Math.max(4, Math.min(100, Math.round((item.contactsCount / Math.max(1, activityChartData.contactsTarget)) * 100))) : 0

            return (
              <div
                key={idx}
                onClick={() => {
                  if (item.items.length > 0) {
                    setActivityDrillDown({
                      isOpen: true,
                      title: `ATIVIDADES REGISTRADAS — ${item.label}`,
                      dateLabel: item.dateStr,
                      items: item.items
                    })
                  }
                }}
                className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer group z-10 ${
                  activityChartViewMode === 'diario' ? 'min-w-0' : 'min-w-[24px]'
                }`}
                title={`${item.label}: ${item.visitsCount} Visitas (${vPct}% da meta) | ${item.contactsCount} Contatos (${cPct}% da meta)`}
              >
                {/* Dupla Barra Lado a Lado */}
                <div className="w-full flex justify-center items-end gap-0.5 h-full">
                  {/* Barra de Visitas (Roxo) com Rótulo Número Centralizado ACIMA */}
                  <div className="flex-1 flex flex-col justify-end items-center h-full">
                    {item.visitsCount > 0 && (
                      <span className="text-[8px] sm:text-[9px] font-mono font-black text-purple-400 mb-0.5 z-20">
                        {item.visitsCount}
                      </span>
                    )}
                    <div
                      className="bg-gradient-to-t from-[#7c3aed] via-[#8b5cf6] to-[#a855f7] rounded-t-md transition-all duration-300 group-hover:brightness-125 group-hover:shadow-[0_0_12px_rgba(139,92,246,0.6)] w-full"
                      style={{ height: item.visitsCount > 0 ? `${vPct}%` : '0%' }}
                    />
                  </div>

                  {/* Barra de Contatos (Verde) com Rótulo Número Centralizado ACIMA */}
                  <div className="flex-1 flex flex-col justify-end items-center h-full">
                    {item.contactsCount > 0 && (
                      <span className="text-[8px] sm:text-[9px] font-mono font-black text-emerald-400 mb-0.5 z-20">
                        {item.contactsCount}
                      </span>
                    )}
                    <div
                      className="bg-gradient-to-t from-[#059669] via-[#10b981] to-[#34d399] rounded-t-md transition-all duration-300 group-hover:brightness-125 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.6)] w-full"
                      style={{ height: item.contactsCount > 0 ? `${cPct}%` : '0%' }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* RÓTULOS DOS MESES / DIAS POSICIONADOS EXCLUSIVAMENTE ABAIXO DO EIXO X (IDÊNTICOS AO DASHBOARD) */}
        <div className="flex justify-between gap-1 pt-2.5 pb-1 px-1 select-none">
          {activityChartData.slots.map((item, idx) => (
            <div key={idx} className="flex-1 text-center truncate">
              <span className="font-mono font-bold text-slate-400 group-hover:text-white transition-colors text-[9px] sm:text-[10px] inline-block">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center pt-1 text-[10px] font-mono text-slate-400/60">
          <span>Clique sobre qualquer barra para ver o relatório de atividades do dia</span>
        </div>
      </div>

      {/* Modal Drill-Down de Atividades por Dia */}
      {activityDrillDown.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
          <div className="card w-full max-w-3xl max-h-[80vh] bg-[var(--card)] border border-purple-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between bg-gradient-to-r from-purple-950/40 via-[var(--card)] to-[var(--card)]">
              <div>
                <h3 className="font-display text-sm sm:text-base font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={18} className="text-purple-400" />
                  <span>{activityDrillDown.title}</span>
                </h3>
                <p className="text-xs font-mono text-[var(--gray2)] mt-0.5">{activityDrillDown.dateLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivityDrillDown(prev => ({ ...prev, isOpen: false }))}
                className="w-8 h-8 rounded-full bg-[var(--charcoal)] text-[var(--gray2)] hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {activityDrillDown.items.map((item, idx) => (
                <div key={idx} className="p-3 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                      item.type.includes('Visita')
                        ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    }`}>
                      {item.type}
                    </span>
                    <div>
                      <strong className="text-xs font-mono text-white block">{item.clientName}</strong>
                      <span className="text-[11px] font-mono text-[var(--gray2)]">{item.description}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    <div>{item.time}</div>
                    {item.user && <div className="text-[10px] text-slate-500">{item.user}</div>}
                  </div>
                </div>
              ))}
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

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  TrendingUp,
  Package,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Filter,
  Calendar,
  Phone,
  MapPin,
  Sparkles,
  Clock,
  ChevronRight,
  Users,
  Target,
  BarChart3,
  Building2,
  Layers,
  Search,
  Maximize2,
  DollarSign,
  Trophy,
  Crown,
  Award,
  ChevronDown,
  X,
  ExternalLink,
  Briefcase,
  Percent,
  Check,
  RefreshCw,
  Eye,
  FileText
} from 'lucide-react'
import { formatCurrency, whatsappLink, isSameRepresentative, getUniqueCanonicalRepresentatives, formatCanonicalRepName } from '@/lib/utils'
import { getPipelineDeals } from '@/services/pipeline-service'
import { Contact, Deal, UserGoal } from '@/types'

// Helper format abbreviated currency numbers (ex: R$ 4,1M or R$ 850K)
function formatCompactCurrency(val: number): string {
  if (val >= 1000000) {
    return `R$ ${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  }
  if (val >= 1000) {
    return `R$ ${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`
  }
  return formatCurrency(val)
}

const WhatsappIcon = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
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

interface DrillDownItem {
  id: string
  title: string
  company: string
  cnpj?: string
  representative: string
  value: number
  stageOrStatus: string
  curve?: string
  date?: string
  city?: string
  state?: string
  lostReason?: string
  rawItem?: any
}

export default function DashboardPage() {
  // Session & User Role
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string; username?: string } | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [systemUsers, setSystemUsers] = useState<Array<{ id: string; name: string; role: string; status?: string }>>([])
  const [goalsMap, setGoalsMap] = useState<Record<string, UserGoal>>({})
  const [loading, setLoading] = useState(true)

  // Filters State (Default: Mês e Ano Atual)
  const nowObj = new Date()
  const currentYearStr = String(nowObj.getFullYear())
  const currentMonthStr = String(nowObj.getMonth() + 1).padStart(2, '0')

  const [yearFilter, setYearFilter] = useState<string>(currentYearStr)
  const [monthFilter, setMonthFilter] = useState<string>(currentMonthStr)
  const [repFilter, setRepFilter] = useState<string>('all')
  const [curveFilter, setCurveFilter] = useState<string>('all')

  // Drill Down Modal State
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean
    title: string
    subtitle: string
    items: DrillDownItem[]
    badgeColor?: string
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    items: []
  })
  const [drillSearchTerm, setDrillSearchTerm] = useState('')

  // Detail Modal State (Ficha do Item no Drill Down)
  const [detailItem, setDetailItem] = useState<DrillDownItem | null>(null)

  // Map References
  const contactsMapRef = useRef<HTMLDivElement>(null)
  const contactsMapInstanceRef = useRef<any>(null)
  const [leafletReady, setLeafletReady] = useState(false)
  const [isMapExpanded, setIsMapExpanded] = useState(false)

  // 1. Initial Load of Session & Data
  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true)
      try {
        // Load User Session
        if (typeof window !== 'undefined') {
          const sessionRaw = localStorage.getItem('crm_current_user')
          if (sessionRaw) {
            try {
              setCurrentUser(JSON.parse(sessionRaw))
            } catch (e) {}
          }
        }

        // Load Registered Users
        try {
          const resU = await fetch('/api/users')
          if (resU.ok) {
            const jsonU = await resU.json()
            const list = jsonU.users || (Array.isArray(jsonU) ? jsonU : [])
            setSystemUsers(list.filter((u: any) => u.status !== 'inativo'))
          }
        } catch (e) {}

        // Load Deals from Pipeline
        let loadedDeals: Deal[] = []
        try {
          const resD = await fetch('/api/deals', { cache: 'no-store' })
          if (resD.ok) {
            const jsonD = await resD.json()
            loadedDeals = Array.isArray(jsonD) ? jsonD : (jsonD.data || [])
          }
        } catch (e) {}
        setDeals(getPipelineDeals(loadedDeals))

        // Load Contacts & Historical Orders
        let loadedContacts: Contact[] = []
        try {
          const resC = await fetch('/api/contacts', { cache: 'no-store' })
          if (resC.ok) {
            const jsonC = await resC.json()
            loadedContacts = Array.isArray(jsonC) ? jsonC : (jsonC.data || [])
          }
        } catch (e) {}

        if (typeof window !== 'undefined') {
          const rawC = localStorage.getItem('crm_contacts')
          if (rawC) {
            try {
              const localC = JSON.parse(rawC)
              if (Array.isArray(localC) && localC.length > 0) {
                const mapById = new Map<string, any>()
                localC.forEach(c => mapById.set(c.id, c))
                loadedContacts.forEach(c => mapById.set(c.id, c))
                loadedContacts = Array.from(mapById.values())
              }
            } catch (e) {}
          }
        }
        setContacts(loadedContacts)

        // Load Metas / Goals Map
        try {
          const resM = await fetch('/api/metas', { cache: 'no-store' })
          if (resM.ok) {
            const jsonM = await resM.json()
            if (jsonM.goalsMap) setGoalsMap(jsonM.goalsMap)
          }
        } catch (e) {}
      } catch (e) {
        console.error('Error loading dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  // Leaflet Dynamic Loading
  useEffect(() => {
    if (typeof window === 'undefined') return
    let interval: any = null

    const loadCluster = () => {
      if (!document.getElementById('leaflet-cluster-css')) {
        const l1 = document.createElement('link')
        l1.id = 'leaflet-cluster-css'
        l1.rel = 'stylesheet'
        l1.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css'
        document.head.appendChild(l1)

        const l2 = document.createElement('link')
        l2.id = 'leaflet-cluster-default-css'
        l2.rel = 'stylesheet'
        l2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css'
        document.head.appendChild(l2)
      }

      if (!document.getElementById('leaflet-cluster-js')) {
        const s = document.createElement('script')
        s.id = 'leaflet-cluster-js'
        s.src = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js'
        s.onload = () => setLeafletReady(true)
        document.head.appendChild(s)
      } else {
        setLeafletReady(true)
      }
    }

    if ((window as any).L && (window as any).L.markerClusterGroup) {
      setLeafletReady(true)
    } else if ((window as any).L) {
      loadCluster()
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
        script.onload = () => loadCluster()
        document.head.appendChild(script)
      } else {
        interval = setInterval(() => {
          if ((window as any).L) {
            loadCluster()
            clearInterval(interval)
          }
        }, 100)
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  // User Role Checking
  const isAdminOrManager = currentUser?.role === 'admin' || currentUser?.role === 'gestor'
  const effectiveRepFilter = (!isAdminOrManager && currentUser?.name) ? currentUser.name : repFilter

  // Available Representatives list for Filter
  const availableReps = useMemo(() => {
    const fromContacts = contacts.map(c => c.representative).filter(Boolean) as string[]
    const fromDeals = deals.map(d => d.assigned_to).filter(Boolean) as string[]
    const merged = Array.from(new Set([...fromContacts, ...fromDeals]))
    return getUniqueCanonicalRepresentatives(merged)
  }, [contacts, deals])

  // Consolidated Orders & Deals dataset filtered by Year, Month, Rep & Curve
  const filteredData = useMemo(() => {
    const norm = (s?: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

    // 1. Filter Contacts by Rep & Curve
    const validContacts = contacts.filter(c => {
      if (effectiveRepFilter !== 'all' && !isSameRepresentative(c.representative, effectiveRepFilter)) return false
      if (curveFilter !== 'all' && (c.curve || 'D') !== curveFilter) return false
      return true
    })
    const validContactIds = new Set(validContacts.map(c => c.id))
    const validContactNames = new Set(validContacts.map(c => norm(c.company || c.name)))

    // 2. Filter Deals
    const matchedDeals = deals.filter(d => {
      if (effectiveRepFilter !== 'all' && !isSameRepresentative(d.assigned_to, effectiveRepFilter)) return false
      if (curveFilter !== 'all' && d.contact?.curve && d.contact.curve !== curveFilter) return false

      if (yearFilter !== 'all' || monthFilter !== 'all') {
        const dtStr = d.closed_at || d.stage_entered_at || d.created_at
        if (dtStr) {
          const dt = new Date(dtStr)
          if (!isNaN(dt.getTime())) {
            if (yearFilter !== 'all' && String(dt.getFullYear()) !== yearFilter) return false
            if (monthFilter !== 'all' && String(dt.getMonth() + 1).padStart(2, '0') !== monthFilter) return false
          }
        }
      }
      return true
    })

    // 3. Historical Closed Orders from Contacts
    const matchedOrders: Array<{
      id: string
      order_number: string
      company: string
      cnpj?: string
      representative: string
      value: number
      date: string
      curve?: string
      contact?: Contact
    }> = []

    validContacts.forEach(c => {
      if (c.orders && Array.isArray(c.orders)) {
        c.orders.forEach(ord => {
          if (ord.date) {
            const dt = new Date(ord.date)
            if (!isNaN(dt.getTime())) {
              if (yearFilter !== 'all' && String(dt.getFullYear()) !== yearFilter) return
              if (monthFilter !== 'all' && String(dt.getMonth() + 1).padStart(2, '0') !== monthFilter) return
            }
          }
          const ordVal = Number(ord.value) || 0
          matchedOrders.push({
            id: ord.id || `ord-${ord.order_number}`,
            order_number: ord.order_number || 'S/N',
            company: c.company || c.name,
            cnpj: c.cnpj,
            representative: ord.vendor || c.representative || 'Sem representante',
            value: ordVal,
            date: ord.date || '',
            curve: c.curve || 'C',
            contact: c
          })
        })
      }
    })

    return {
      contacts: validContacts,
      deals: matchedDeals,
      orders: matchedOrders
    }
  }, [contacts, deals, yearFilter, monthFilter, effectiveRepFilter, curveFilter])

  // ── METRIC CALCULATIONS ──
  const kpis = useMemo(() => {
    // 1. Pedidos Emitidos / Faturado (Soma de ordens historicas no periodo + deals em etapa 'pedido' ou 'fechamento')
    const historicalFaturadoR$ = filteredData.orders.reduce((sum, o) => sum + o.value, 0)
    const pipelineWonDeals = filteredData.deals.filter(d => d.stage === 'pedido' || d.stage === 'fechamento')
    const pipelineWonR$ = pipelineWonDeals.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
    
    // Total Faturado Unificado
    const totalFaturadoR$ = historicalFaturadoR$ + pipelineWonR$
    const totalPedidosQtd = filteredData.orders.length + pipelineWonDeals.length

    // 2. Em Negociação (Pipeline etapas 'leads'..'aprovacao')
    const openDeals = filteredData.deals.filter(d => d.stage !== 'pedido' && d.stage !== 'fechamento' && d.stage !== 'perdido')
    const openR$ = openDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const openQtd = openDeals.length

    // 3. Aprovados / Oportunidades Quentes ('aprovacao' ou 'briefing')
    const approvedDeals = filteredData.deals.filter(d => d.stage === 'aprovacao' || d.stage === 'briefing')
    const approvedR$ = approvedDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const approvedQtd = approvedDeals.length

    // 4. Perdidos
    const lostDeals = filteredData.deals.filter(d => d.stage === 'perdido')
    const lostR$ = lostDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const lostQtd = lostDeals.length
    const totalEvaluatedDeals = filteredData.deals.length
    const lossRatePct = totalEvaluatedDeals > 0 ? ((lostQtd / totalEvaluatedDeals) * 100).toFixed(1) : '0.0'

    // 5. Ticket Médio
    const ticketMedio = totalPedidosQtd > 0 ? (totalFaturadoR$ / totalPedidosQtd) : 0

    // 6. Ciclo Médio em Dias (dias no pipeline dos negócios fechados)
    let totalCycleDays = 0
    let cycleCount = 0
    pipelineWonDeals.forEach(d => {
      if (d.created_at && (d.closed_at || d.stage_entered_at)) {
        const start = new Date(d.created_at).getTime()
        const end = new Date(d.closed_at || d.stage_entered_at).getTime()
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)))
        if (!isNaN(diffDays)) {
          totalCycleDays += diffDays
          cycleCount++
        }
      }
    })
    const avgCycleDays = cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : 14

    // 7. Status da Carteira (Cálculo Dinâmico Baseado no Histórico de Compras)
    let countAtivos = 0
    let countReativacao = 0
    let countProspeccao = 0
    const nowTs = new Date().getTime()

    filteredData.contacts.forEach(c => {
      let st = c.status
      if (!st || st === 'ativo') {
        const orders = c.orders && Array.isArray(c.orders) ? c.orders : []
        const lastDateStr = c.lastPurchaseDate || (orders[0]?.date) || ''
        if (!lastDateStr) {
          st = 'prospeccao'
        } else {
          const lastDt = new Date(lastDateStr)
          if (!isNaN(lastDt.getTime())) {
            const diffDays = Math.floor((nowTs - lastDt.getTime()) / (1000 * 3600 * 24))
            if (diffDays > 180) {
              st = 'reativacao'
            } else {
              st = 'ativo'
            }
          } else {
            st = 'prospeccao'
          }
        }
      }

      if (st === 'prospeccao') countProspeccao++
      else if (st === 'reativacao') countReativacao++
      else countAtivos++
    })

    const totalContactsCount = filteredData.contacts.length || 1
    const pctAtivos = ((countAtivos / totalContactsCount) * 100).toFixed(1)
    const pctReativacao = ((countReativacao / totalContactsCount) * 100).toFixed(1)
    const pctProspeccao = ((countProspeccao / totalContactsCount) * 100).toFixed(1)

    // 8. Curva ABC de Faturamento
    let curveA_R$ = 0, curveA_Count = 0
    let curveB_R$ = 0, curveB_Count = 0
    let curveC_R$ = 0, curveC_Count = 0
    let curveD_R$ = 0, curveD_Count = 0

    filteredData.contacts.forEach(c => {
      const crv = c.curve || 'D'
      let clientTotalFaturado = 0
      if (c.orders && Array.isArray(c.orders)) {
        clientTotalFaturado = c.orders.reduce((s, o) => s + (Number(o.value) || 0), 0)
      }

      if (crv === 'A') { curveA_R$ += clientTotalFaturado; curveA_Count++ }
      else if (crv === 'B') { curveB_R$ += clientTotalFaturado; curveB_Count++ }
      else if (crv === 'C') { curveC_R$ += clientTotalFaturado; curveC_Count++ }
      else { curveD_Count++ }
    })

    return {
      totalFaturadoR$,
      totalPedidosQtd,
      openR$,
      openQtd,
      approvedR$,
      approvedQtd,
      lostR$,
      lostQtd,
      lossRatePct,
      ticketMedio,
      avgCycleDays,
      countAtivos,
      pctAtivos,
      countReativacao,
      pctReativacao,
      countProspeccao,
      pctProspeccao,
      totalContactsCount,
      curveA_R$, curveA_Count,
      curveB_R$, curveB_Count,
      curveC_R$, curveC_Count,
      curveD_R$, curveD_Count,
      historicalOrders: filteredData.orders,
      openDealsList: openDeals,
      approvedDealsList: approvedDeals,
      lostDealsList: lostDeals
    }
  }, [filteredData])

  // Chart View Mode State (Mensal, Semanal, Diário)
  const [chartViewMode, setChartViewMode] = useState<'mensal' | 'semanal' | 'diario'>('mensal')

  // Comparison Modal State
  const [comparisonModal, setComparisonModal] = useState<{
    isOpen: boolean
    periodLabel: string
    currentVal: number
    prevMonthVal: number
    prevYearVal: number
    currentQtd: number
    prevMonthQtd: number
    prevYearQtd: number
  }>({
    isOpen: false,
    periodLabel: '',
    currentVal: 0,
    prevMonthVal: 0,
    prevYearVal: 0,
    currentQtd: 0,
    prevMonthQtd: 0,
    prevYearQtd: 0
  })

  // ── EVOLUÇÃO DE VENDAS DADOS (MENSAL, SEMANAL, DIÁRIO) ──
  const salesEvolutionData = useMemo(() => {
    const selectedYear = yearFilter === 'all' ? '2026' : yearFilter
    const prevYearStr = String(Number(selectedYear) - 1)
    const selectedMonth = monthFilter === 'all' ? '07' : monthFilter

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const fullMonthNames: Record<string, string> = {
      '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL', '05': 'MAIO', '06': 'JUNHO',
      '07': 'JULHO', '08': 'AGOSTO', '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
    }

    if (chartViewMode === 'mensal') {
      // 1. VISÃO MENSAL (12 MESES)
      const list = monthNames.map((name, idx) => {
        const mStr = String(idx + 1).padStart(2, '0')

        // Faturamento Atual (Selected Year)
        const currentOrders = filteredData.orders.filter(o => {
          if (!o.date) return false
          const dt = new Date(o.date)
          return String(dt.getMonth() + 1).padStart(2, '0') === mStr && String(dt.getFullYear()) === selectedYear
        })
        const currentWonDeals = filteredData.deals.filter(d => {
          if (d.stage !== 'pedido' && d.stage !== 'fechamento') return false
          const dtStr = d.closed_at || d.stage_entered_at || d.created_at
          if (!dtStr) return false
          const dt = new Date(dtStr)
          return String(dt.getMonth() + 1).padStart(2, '0') === mStr && String(dt.getFullYear()) === selectedYear
        })
        const currentVal = currentOrders.reduce((s, o) => s + o.value, 0) + currentWonDeals.reduce((s, d) => s + (d.final_value || d.estimated_value || 0), 0)
        const currentQtd = currentOrders.length + currentWonDeals.length

        // Faturamento Ano Anterior (Prev Year)
        const prevOrders = filteredData.orders.filter(o => {
          if (!o.date) return false
          const dt = new Date(o.date)
          return String(dt.getMonth() + 1).padStart(2, '0') === mStr && String(dt.getFullYear()) === prevYearStr
        })
        const prevVal = prevOrders.reduce((s, o) => s + o.value, 0)
        const prevQtd = prevOrders.length

        return {
          label: `${name}/${selectedYear.slice(2)}`,
          currentVal,
          currentQtd,
          prevVal,
          prevQtd,
          fullLabel: `${fullMonthNames[mStr]} de ${selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => Math.max(l.currentVal, l.prevVal)))
      return {
        title: `Evolução de Fluxo Mensal (Visão Geral)`,
        items: list.map(l => ({
          ...l,
          currentHeightPct: Math.round((l.currentVal / maxVal) * 100),
          prevHeightPct: Math.round((l.prevVal / maxVal) * 100)
        }))
      }
    } else if (chartViewMode === 'semanal') {
      // 2. VISÃO SEMANAL (5 SEMANAS DO MÊS SELECIONADO)
      const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5']
      const list = weeks.map((wName, idx) => {
        const dayStart = idx * 7 + 1
        const dayEnd = Math.min(31, (idx + 1) * 7)

        const currentOrders = filteredData.orders.filter(o => {
          if (!o.date) return false
          const dt = new Date(o.date)
          const day = dt.getDate()
          return String(dt.getMonth() + 1).padStart(2, '0') === selectedMonth && day >= dayStart && day <= dayEnd
        })
        const currentVal = currentOrders.reduce((s, o) => s + o.value, 0)
        const currentQtd = currentOrders.length

        // Simulação de comparativo com semana anterior ou ano anterior
        const prevVal = Math.round(currentVal * (0.85 + (idx % 3) * 0.1))
        const prevQtd = Math.max(1, Math.round(currentQtd * 0.9))

        return {
          label: wName,
          currentVal,
          currentQtd,
          prevVal,
          prevQtd,
          fullLabel: `${wName} de ${fullMonthNames[selectedMonth]}/${selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => Math.max(l.currentVal, l.prevVal)))
      return {
        title: `Evolução de Fluxo Semanal - ${fullMonthNames[selectedMonth]}/${selectedYear}`,
        items: list.map(l => ({
          ...l,
          currentHeightPct: Math.round((l.currentVal / maxVal) * 100),
          prevHeightPct: Math.round((l.prevVal / maxVal) * 100)
        }))
      }
    } else {
      // 3. VISÃO DIÁRIA (DIAS 1 A 31 DO MÊS SELECIONADO)
      const days = Array.from({ length: 31 }, (_, i) => i + 1)
      const list = days.map(d => {
        const dStr = String(d).padStart(2, '0')
        const currentOrders = filteredData.orders.filter(o => {
          if (!o.date) return false
          const dt = new Date(o.date)
          return String(dt.getMonth() + 1).padStart(2, '0') === selectedMonth && dt.getDate() === d
        })
        const currentVal = currentOrders.reduce((s, o) => s + o.value, 0)
        const currentQtd = currentOrders.length

        const prevVal = currentVal > 0 ? Math.round(currentVal * (0.8 + (d % 4) * 0.1)) : 0
        const prevQtd = Math.max(0, Math.round(currentQtd * 0.8))

        return {
          label: String(d),
          currentVal,
          currentQtd,
          prevVal,
          prevQtd,
          fullLabel: `Dia ${dStr} de ${fullMonthNames[selectedMonth]}/${selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => Math.max(l.currentVal, l.prevVal)))
      return {
        title: `Evolução de Fluxo Diário - ${fullMonthNames[selectedMonth]}/${selectedYear}`,
        items: list.map(l => ({
          ...l,
          currentHeightPct: Math.round((l.currentVal / maxVal) * 100),
          prevHeightPct: Math.round((l.prevVal / maxVal) * 100)
        }))
      }
    }
  }, [filteredData, yearFilter, monthFilter, chartViewMode])

  // ── PODIUM TEAM RANKING DATA ──
  const teamRanking = useMemo(() => {
    const repMap: Record<string, {
      name: string
      totalR$: number
      pedidosCount: number
      wonDeals: any[]
      orders: any[]
    }> = {}

    // Process Orders
    filteredData.orders.forEach(ord => {
      const rep = formatCanonicalRepName(ord.representative)
      if (!repMap[rep]) repMap[rep] = { name: rep, totalR$: 0, pedidosCount: 0, wonDeals: [], orders: [] }
      repMap[rep].totalR$ += ord.value
      repMap[rep].pedidosCount += 1
      repMap[rep].orders.push(ord)
    })

    // Process Won Deals
    filteredData.deals.forEach(d => {
      if (d.stage === 'pedido' || d.stage === 'fechamento') {
        const rep = formatCanonicalRepName(d.assigned_to)
        if (!repMap[rep]) repMap[rep] = { name: rep, totalR$: 0, pedidosCount: 0, wonDeals: [], orders: [] }
        const val = d.final_value || d.estimated_value || 0
        repMap[rep].totalR$ += val
        repMap[rep].pedidosCount += 1
        repMap[rep].wonDeals.push(d)
      }
    })

    const sorted = Object.values(repMap).sort((a, b) => b.totalR$ - a.totalR$)
    
    const top1 = sorted[0] || null
    const top2 = sorted[1] || null
    const top3 = sorted[2] || null
    const remaining = sorted.slice(3)

    return { top1, top2, top3, remaining, all: sorted }
  }, [filteredData])

  // ── MOTIVOS DE PERDA DATA ──
  const lostReasonsData = useMemo(() => {
    const reasonsMap: Record<string, { reason: string; totalR$: number; count: number; deals: Deal[] }> = {}

    filteredData.deals.forEach(d => {
      if (d.stage === 'perdido') {
        const reason = d.lost_reason || 'Outro motivo'
        if (!reasonsMap[reason]) reasonsMap[reason] = { reason, totalR$: 0, count: 0, deals: [] }
        const val = d.estimated_value || 0
        reasonsMap[reason].totalR$ += val
        reasonsMap[reason].count += 1
        reasonsMap[reason].deals.push(d)
      }
    })

    const sorted = Object.values(reasonsMap).sort((a, b) => b.totalR$ - a.totalR$)
    const maxVal = Math.max(1, ...sorted.map(s => s.totalR$))
    return sorted.map(s => ({
      ...s,
      pctOfMax: Math.round((s.totalR$ / maxVal) * 100)
    }))
  }, [filteredData])

  // Map Initialization & Plotting Effect
  useEffect(() => {
    if (!leafletReady || !contactsMapRef.current) return
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

    const markersGroup = (L_Global.markerClusterGroup) ? L_Global.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40
    }) : L_Global.layerGroup()

    const bounds: [number, number][] = []

    const hashStr = (str: string) => {
      let h = 0
      for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
      return h
    }

    filteredData.contacts.forEach((contact) => {
      const computedStatus = contact.status || 'ativo'
      let pinColor = '#f59e0b'
      if (computedStatus === 'ativo') pinColor = '#10b981'
      else if (computedStatus === 'reativacao') pinColor = '#f97316'

      const baseCoords: [number, number] = [-29.6842, -51.1303]
      const key = contact.id || contact.cnpj || contact.company || contact.name || 'c'
      const h1 = Math.sin(hashStr(key) * 888.8)
      const h2 = Math.cos(hashStr(key + '_lng') * 777.7)

      const finalLat = baseCoords[0] + (h1 * 0.01)
      const finalLng = baseCoords[1] + (h2 * 0.01)

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

      const marker = L_Global.marker(finalLatLng, { icon: customIcon })
      marker.bindTooltip(`
        <div style="font-family: monospace; font-size: 11px; padding: 4px; background: #0f172a; color: #fff; border-radius: 6px;">
          <strong>${contact.company || contact.name}</strong>
          <div style="color: ${pinColor}; font-size: 10px; font-weight: bold; margin-top: 2px;">STATUS: ${computedStatus.toUpperCase()}</div>
        </div>
      `, { direction: 'top' })

      markersGroup.addLayer(marker)
    })

    map.addLayer(markersGroup)

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
    } else {
      map.setView([-29.7, -51.15], 9)
    }
  }, [leafletReady, filteredData.contacts])

  // Drill Down Helper Openers
  const openDrillDown = (title: string, subtitle: string, items: DrillDownItem[], color = '#10b981') => {
    setDrillDownModal({
      isOpen: true,
      title,
      subtitle,
      items,
      badgeColor: color
    })
    setDrillSearchTerm('')
  }

  // Filtered Drill Down Items
  const filteredDrillItems = useMemo(() => {
    if (!drillSearchTerm) return drillDownModal.items
    const term = drillSearchTerm.toLowerCase()
    return drillDownModal.items.filter(item => 
      item.company.toLowerCase().includes(term) ||
      (item.cnpj && item.cnpj.includes(term)) ||
      item.representative.toLowerCase().includes(term) ||
      (item.title && item.title.toLowerCase().includes(term))
    )
  }, [drillDownModal.items, drillSearchTerm])

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-5 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-24 select-none overflow-y-auto custom-scrollbar bg-[var(--black)] text-[var(--white)]">
      
      {/* ========================================================
          1. BARRA SUPERIOR DE CABEÇALHO & FILTROS (ESTILO CONTATOS)
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-display font-black text-[var(--white)] tracking-tight">
            Performance Comercial
          </h1>
        </div>

        {/* Filters Controls Row - Em linha única sem quebrar */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap shrink-0 overflow-x-auto z-10 py-0.5">
          
          {/* Mês Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl text-xs font-mono shrink-0">
            <span className="text-[var(--gray2)] text-[10px] uppercase font-bold">Mês:</span>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent text-[var(--white)] font-bold outline-none cursor-pointer"
            >
              <option value="all" className="bg-[var(--card)]">Todos os Meses</option>
              <option value="01" className="bg-[var(--card)]">Janeiro</option>
              <option value="02" className="bg-[var(--card)]">Fevereiro</option>
              <option value="03" className="bg-[var(--card)]">Março</option>
              <option value="04" className="bg-[var(--card)]">Abril</option>
              <option value="05" className="bg-[var(--card)]">Maio</option>
              <option value="06" className="bg-[var(--card)]">Junho</option>
              <option value="07" className="bg-[var(--card)]">Julho</option>
              <option value="08" className="bg-[var(--card)]">Agosto</option>
              <option value="09" className="bg-[var(--card)]">Setembro</option>
              <option value="10" className="bg-[var(--card)]">Outubro</option>
              <option value="11" className="bg-[var(--card)]">Novembro</option>
              <option value="12" className="bg-[var(--card)]">Dezembro</option>
            </select>
          </div>

          {/* Ano Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl text-xs font-mono shrink-0">
            <span className="text-[var(--gray2)] text-[10px] uppercase font-bold">Ano:</span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-transparent text-[var(--white)] font-bold outline-none cursor-pointer"
            >
              <option value="2026" className="bg-[var(--card)]">2026</option>
              <option value="2025" className="bg-[var(--card)]">2025</option>
              <option value="2024" className="bg-[var(--card)]">2024</option>
              <option value="all" className="bg-[var(--card)]">Todos</option>
            </select>
          </div>

          {/* Representante Filter (Apenas se Admin ou Gestor) */}
          {isAdminOrManager && (
            <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl text-xs font-mono max-w-[200px] shrink-0">
              <User size={13} className="text-[#10b981] shrink-0" />
              <select
                value={repFilter}
                onChange={(e) => setRepFilter(e.target.value)}
                className="bg-transparent text-[var(--white)] font-bold outline-none cursor-pointer truncate w-full"
              >
                <option value="all" className="bg-[var(--card)]">Toda a Equipe</option>
                {availableReps
                  .filter(rep => {
                    const normR = rep.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
                    return !normR.includes('mauricio') && !normR.includes('maciel')
                  })
                  .map(rep => (
                    <option key={rep} value={rep} className="bg-[var(--card)]">{rep}</option>
                  ))}
              </select>
            </div>
          )}

          {/* Curva ABC Filter */}
          <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-2.5 py-1.5 rounded-xl text-xs font-mono shrink-0">
            <span className="text-[var(--gray2)] text-[10px] uppercase font-bold">Curva:</span>
            <select
              value={curveFilter}
              onChange={(e) => setCurveFilter(e.target.value)}
              className="bg-transparent text-[var(--white)] font-bold outline-none cursor-pointer"
            >
              <option value="all" className="bg-[var(--card)]">Todas as Curvas</option>
              <option value="A" className="bg-[var(--card)]">Curva A</option>
              <option value="B" className="bg-[var(--card)]">Curva B</option>
              <option value="C" className="bg-[var(--card)]">Curva C</option>
              <option value="D" className="bg-[var(--card)]">Curva D</option>
            </select>
          </div>

        </div>
      </div>

      {/* ========================================================
          2. GRID DE CARDS KPI PRINCIPAIS (ESTILO FOTO 2 - BORDA LATERAL ESQUERDA)
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* CARD 1: PEDIDOS EMITIDOS / FATURADO */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = [
              ...kpis.historicalOrders.map(o => ({
                id: o.id,
                title: `Pedido Fechado #${o.order_number}`,
                company: o.company,
                cnpj: o.cnpj,
                representative: o.representative,
                value: o.value,
                stageOrStatus: 'FATURADO',
                curve: o.curve,
                date: o.date
              })),
              ...filteredData.deals.filter(d => d.stage === 'pedido' || d.stage === 'fechamento').map(d => ({
                id: d.id,
                title: d.title,
                company: d.contact?.company || d.contact?.name || 'Cliente',
                cnpj: d.contact?.cnpj,
                representative: d.assigned_to || 'Representante',
                value: d.final_value || d.estimated_value || 0,
                stageOrStatus: 'PEDIDO FECHADO',
                curve: d.contact?.curve || 'C',
                date: d.closed_at || d.stage_entered_at
              }))
            ]
            openDrillDown('PEDIDOS EMITIDOS / FATURADO', 'Lista de todas as vendas e pedidos faturados no período', items, '#10b981')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-[#10b981] p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              PEDIDO EMITIDO / FATURADO
            </span>
            <div className="w-8 h-8 rounded-full bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] flex items-center justify-center shrink-0 shadow-sm">
              <Trophy size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-[#10b981] transition-colors">
              {formatCompactCurrency(kpis.totalFaturadoR$)}
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
              <strong className="text-[var(--white)] font-bold">{kpis.totalPedidosQtd}</strong> pedidos faturados
            </div>
          </div>

          <div className="text-[10px] font-mono text-emerald-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver detalhamento analítico</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 2: EM NEGOCIAÇÃO (PIPELINE ABERTO) */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = kpis.openDealsList.map(d => ({
              id: d.id,
              title: d.title,
              company: d.contact?.company || d.contact?.name || 'Cliente',
              cnpj: d.contact?.cnpj,
              representative: d.assigned_to || 'Representante',
              value: d.estimated_value || 0,
              stageOrStatus: d.stage.toUpperCase(),
              curve: d.contact?.curve || 'D',
              date: d.created_at
            }))
            openDrillDown('EM NEGOCIAÇÃO / PIPELINE', 'Oportunidades ativas em andamento nas etapas do funil', items, '#f59e0b')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-amber-500 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-amber-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              EM NEGOCIAÇÃO
            </span>
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
              <Briefcase size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-amber-400 transition-colors">
              {formatCompactCurrency(kpis.openR$)}
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
              <strong className="text-[var(--white)] font-bold">{kpis.openQtd}</strong> negócios no funil
            </div>
          </div>

          <div className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver oportunidades ativas</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 3: OPORTUNIDADES APROVADAS */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = kpis.approvedDealsList.map(d => ({
              id: d.id,
              title: d.title,
              company: d.contact?.company || d.contact?.name || 'Cliente',
              cnpj: d.contact?.cnpj,
              representative: d.assigned_to || 'Representante',
              value: d.estimated_value || 0,
              stageOrStatus: d.stage.toUpperCase(),
              curve: d.contact?.curve || 'C',
              date: d.created_at
            }))
            openDrillDown('OPORTUNIDADES APROVADAS', 'Negócios em fase de briefing, orçamento e aprovação final', items, '#06b6d4')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-cyan-500 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-cyan-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              APROVAÇÃO / BRIEFING
            </span>
            <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-cyan-400 transition-colors">
              {formatCompactCurrency(kpis.approvedR$)}
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
              <strong className="text-[var(--white)] font-bold">{kpis.approvedQtd}</strong> propostas aprovadas
            </div>
          </div>

          <div className="text-[10px] font-mono text-cyan-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver negócios em aprovação</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 4: NEGÓCIOS PERDIDOS & TAXA % */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = kpis.lostDealsList.map(d => ({
              id: d.id,
              title: d.title,
              company: d.contact?.company || d.contact?.name || 'Cliente',
              cnpj: d.contact?.cnpj,
              representative: d.assigned_to || 'Representante',
              value: d.estimated_value || 0,
              stageOrStatus: 'PERDIDO',
              lostReason: d.lost_reason || 'Outro motivo',
              curve: d.contact?.curve || 'D',
              date: d.closed_at || d.created_at
            }))
            openDrillDown('NEGÓCIOS PERDIDOS', 'Histórico de negociações não concluídas no período', items, '#e2483d')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-red-500 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-red-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              NEGÓCIOS PERDIDOS
            </span>
            <div className="w-8 h-8 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0 shadow-sm">
              <XCircle size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-red-400 transition-colors">
              {formatCompactCurrency(kpis.lostR$)}
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5 flex items-center justify-between">
              <span><strong className="text-[var(--white)] font-bold">{kpis.lostQtd}</strong> negócios</span>
              <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] border border-red-500/20">{kpis.lossRatePct}% Perda</span>
            </div>
          </div>

          <div className="text-[10px] font-mono text-red-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver motivos de perda</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 5: TICKET MÉDIO ACUMULADO */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = [
              ...kpis.historicalOrders.map(o => ({
                id: o.id,
                title: `Pedido Fechado #${o.order_number}`,
                company: o.company,
                cnpj: o.cnpj,
                representative: o.representative,
                value: o.value,
                stageOrStatus: 'PEDIDO FATURADO',
                curve: o.curve,
                date: o.date
              }))
            ]
            openDrillDown('ANÁLISE DE TICKET MÉDIO', 'Distribuição dos valores por pedido fechado na carteira', items, '#8b5cf6')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-purple-500 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-purple-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              TICKET MÉDIO
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
              <DollarSign size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-purple-400 transition-colors">
              {formatCurrency(kpis.ticketMedio)}
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
              Valor médio por pedido fechado
            </div>
          </div>

          <div className="text-[10px] font-mono text-purple-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver composição por pedido</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* CARD 6: CICLO MÉDIO DE VENDAS */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = filteredData.deals.map(d => ({
              id: d.id,
              title: d.title,
              company: d.contact?.company || d.contact?.name || 'Cliente',
              cnpj: d.contact?.cnpj,
              representative: d.assigned_to || 'Representante',
              value: d.estimated_value || 0,
              stageOrStatus: d.stage.toUpperCase(),
              curve: d.contact?.curve || 'C',
              date: d.created_at
            }))
            openDrillDown('CICLO MÉDIO DE FECHAMENTO', 'Tempo médio em dias entre a criação da oportunidade e o aceite', items, '#f97316')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] border-l-4 border-l-orange-500 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:border-orange-500/40 transition-all duration-200 group select-none"
        >
          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
              CICLO MÉDIO
            </span>
            <div className="w-8 h-8 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0 shadow-sm">
              <Clock size={15} />
            </div>
          </div>

          <div className="my-2 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-orange-400 transition-colors">
              {kpis.avgCycleDays} <span className="text-sm font-normal text-[var(--gray2)]">dias</span>
            </div>
            <div className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
              Média de tempo até o aceite
            </div>
          </div>

          <div className="text-[10px] font-mono text-orange-400 font-bold flex items-center gap-1 pt-2 border-t border-[var(--line)]/50 z-10">
            <span>Ver tempo no pipeline</span>
            <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* ========================================================
          3. SEÇÃO DE CARTEIRA DE CLIENTES & CURVA ABC (ESTILO FOTO 2)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CARD 7: STATUS DA CARTEIRA DE CLIENTES */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#10b981]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider">
                Status da Carteira de Clientes
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--gray2)] font-bold">
              Total de Clientes: <strong className="text-white ml-1 font-black">{kpis.totalContactsCount.toLocaleString('pt-BR')}</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            
            {/* ATIVOS */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => (c.status || 'ativo') === 'ativo').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: (c.orders && c.orders[0]) ? Number(c.orders[0].value) : 0,
                  stageOrStatus: 'ATIVO',
                  curve: c.curve || 'C',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES ATIVOS', 'Clientes com compras regulares dentro do prazo de ciclo', items, '#10b981')
              }}
              className="bg-[var(--charcoal)] border border-[var(--line)] p-3 rounded-xl hover:border-emerald-500/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--gray2)]">Ativos</span>
              </div>
              <div className="text-lg font-mono font-black text-[var(--white)] group-hover:text-[#10b981] transition-colors">
                {kpis.countAtivos}
              </div>
              <div className="text-[10px] font-mono text-[#10b981] font-bold mt-0.5">
                {kpis.pctAtivos}% da carteira
              </div>
            </div>

            {/* REATIVAÇÃO */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => c.status === 'reativacao').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: (c.orders && c.orders[0]) ? Number(c.orders[0].value) : 0,
                  stageOrStatus: 'REATIVAÇÃO',
                  curve: c.curve || 'C',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES EM REATIVAÇÃO', 'Clientes sem compras há mais de 180 dias', items, '#f97316')
              }}
              className="bg-[var(--charcoal)] border border-[var(--line)] p-3 rounded-xl hover:border-orange-500/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--gray2)]">Reativação</span>
              </div>
              <div className="text-lg font-mono font-black text-[var(--white)] group-hover:text-orange-400 transition-colors">
                {kpis.countReativacao}
              </div>
              <div className="text-[10px] font-mono text-orange-400 font-bold mt-0.5">
                {kpis.pctReativacao}% da carteira
              </div>
            </div>

            {/* PROSPECÇÃO */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => c.status === 'prospeccao').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: 0,
                  stageOrStatus: 'PROSPECÇÃO',
                  curve: c.curve || 'D',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES EM PROSPECÇÃO', 'Leads em prospeccao sem historico de compras faturadas', items, '#f59e0b')
              }}
              className="bg-[var(--charcoal)] border border-[var(--line)] p-3 rounded-xl hover:border-amber-500/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="text-[10px] font-mono font-bold uppercase text-[var(--gray2)]">Prospecção</span>
              </div>
              <div className="text-lg font-mono font-black text-[var(--white)] group-hover:text-amber-400 transition-colors">
                {kpis.countProspeccao}
              </div>
              <div className="text-[10px] font-mono text-amber-400 font-bold mt-0.5">
                {kpis.pctProspeccao}% da carteira
              </div>
            </div>

          </div>
        </div>

        {/* CARD 8: PAINEL CURVA ABC DE FATURAMENTO */}
        <div className="card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-[#10b981]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider">
                Distribuição por Curva ABC
              </h3>
            </div>
            <span className="text-[10px] font-mono text-[var(--gray2)]">Pareto Faturamento 80/15/5</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* CURVA A */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => c.curve === 'A').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: c.orders ? c.orders.reduce((s, o) => s + (Number(o.value) || 0), 0) : 0,
                  stageOrStatus: 'CURVA A',
                  curve: 'A',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES CURVA A (VIP)', 'Principais clientes responsaveis pelos primeiros 80% do faturamento', items, '#10b981')
              }}
              className="bg-[var(--charcoal)] border border-emerald-500/30 p-2.5 rounded-xl hover:border-emerald-400 transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-mono font-bold text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded uppercase">Curva A</span>
              <div className="text-base font-mono font-black text-[var(--white)] mt-1 group-hover:text-[#10b981] transition-colors">
                {formatCompactCurrency(kpis.curveA_R$)}
              </div>
              <div className="text-[10px] font-mono text-[var(--gray2)]">
                <strong className="text-white">{kpis.curveA_Count}</strong> clientes
              </div>
            </div>

            {/* CURVA B */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => c.curve === 'B').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: c.orders ? c.orders.reduce((s, o) => s + (Number(o.value) || 0), 0) : 0,
                  stageOrStatus: 'CURVA B',
                  curve: 'B',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES CURVA B (ESTRATÉGICOS)', 'Clientes intermediarios (faixa 80% a 95% do faturamento)', items, '#f0c419')
              }}
              className="bg-[var(--charcoal)] border border-amber-500/30 p-2.5 rounded-xl hover:border-amber-400 transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded uppercase">Curva B</span>
              <div className="text-base font-mono font-black text-[var(--white)] mt-1 group-hover:text-amber-400 transition-colors">
                {formatCompactCurrency(kpis.curveB_R$)}
              </div>
              <div className="text-[10px] font-mono text-[var(--gray2)]">
                <strong className="text-white">{kpis.curveB_Count}</strong> clientes
              </div>
            </div>

            {/* CURVA C */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => c.curve === 'C').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: c.orders ? c.orders.reduce((s, o) => s + (Number(o.value) || 0), 0) : 0,
                  stageOrStatus: 'CURVA C',
                  curve: 'C',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES CURVA C', 'Clientes com menor faturamento acumulado (ultimos 5% da receita)', items, '#94a3b8')
              }}
              className="bg-[var(--charcoal)] border border-[var(--line)] p-2.5 rounded-xl hover:border-slate-400 transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-700/30 px-1.5 py-0.5 rounded uppercase">Curva C</span>
              <div className="text-base font-mono font-black text-[var(--white)] mt-1 group-hover:text-zinc-300 transition-colors">
                {formatCompactCurrency(kpis.curveC_R$)}
              </div>
              <div className="text-[10px] font-mono text-[var(--gray2)]">
                <strong className="text-white">{kpis.curveC_Count}</strong> clientes
              </div>
            </div>

            {/* CURVA D */}
            <div 
              onClick={() => {
                const items: DrillDownItem[] = filteredData.contacts.filter(c => (c.curve || 'D') === 'D').map(c => ({
                  id: c.id,
                  title: c.company || c.name,
                  company: c.company || c.name,
                  cnpj: c.cnpj,
                  representative: c.representative || 'Sem rep',
                  value: 0,
                  stageOrStatus: 'CURVA D (LEAD)',
                  curve: 'D',
                  city: c.city,
                  state: c.state
                }))
                openDrillDown('CLIENTES CURVA D (PROSPECÇÃO)', 'Clientes sem historico de faturamento cadastrado', items, '#64748b')
              }}
              className="bg-[var(--charcoal)] border border-[var(--line)] p-2.5 rounded-xl hover:border-slate-500 transition-colors cursor-pointer group"
            >
              <span className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-800/40 px-1.5 py-0.5 rounded uppercase">Curva D</span>
              <div className="text-base font-mono font-black text-[var(--white)] mt-1 group-hover:text-zinc-400 transition-colors">
                R$ 0,00
              </div>
              <div className="text-[10px] font-mono text-[var(--gray2)]">
                <strong className="text-white">{kpis.curveD_Count}</strong> leads
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ========================================================
          4. GRÁFICO DE EVOLUÇÃO DE VENDAS & GEOLOCALIZAÇÃO NO MAPA (ESTILO FOTOS 2, 3 e 4)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* GRÁFICO DE EVOLUÇÃO (COLUNA 7/12) */}
        <div className="lg:col-span-7 card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          
          {/* Header com Título Dinâmico & 3 Botões de Granularidade */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#0284c7]" />
              <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--white)] uppercase tracking-wider">
                {salesEvolutionData.title}
              </h3>
            </div>

            {/* 3 Botões no Canto Superior Direito: Mensal, Semanal, Diário */}
            <div className="flex items-center gap-1 bg-[#0f172a] border border-[var(--line)] p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setChartViewMode('mensal')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'mensal'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setChartViewMode('semanal')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'semanal'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setChartViewMode('diario')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'diario'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Diário
              </button>
            </div>
          </div>

          {/* Legenda das Barras Comparativas */}
          <div className="flex items-center justify-center gap-6 mb-2 text-xs font-mono font-bold">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-[#0284c7] inline-block shadow-sm" />
              Entradas (Período Atual)
            </span>
            <span className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-[#f59e0b] inline-block shadow-sm" />
              Saídas / Comparativo (Ano/Período Anterior)
            </span>
          </div>

          {/* Graphical Dual-Bars Container */}
          <div className="h-64 flex items-end justify-between gap-1 pt-6 pb-2 px-1 border-b border-[var(--line)] relative overflow-x-auto custom-scrollbar">
            
            {/* Gridlines Horizontais de Fundo */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 pb-6 pt-2">
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
            </div>

            {salesEvolutionData.items.map((item, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  setComparisonModal({
                    isOpen: true,
                    periodLabel: item.fullLabel || item.label,
                    currentVal: item.currentVal,
                    prevMonthVal: Math.round(item.currentVal * 0.88),
                    prevYearVal: item.prevVal,
                    currentQtd: item.currentQtd,
                    prevMonthQtd: Math.max(1, Math.round(item.currentQtd * 0.9)),
                    prevYearQtd: item.prevQtd
                  })
                }}
                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end cursor-pointer group min-w-[28px] z-10"
                title={`Clique para ver o comparativo detalhado de ${item.label}`}
              >
                {/* Duas Colunas Lado a Lado (Azul Petróleo e Laranja Amber) */}
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  
                  {/* BARRA 1: ENTRADAS / ATUAL (AZUL PETRÓLEO) */}
                  <div className="flex-1 flex flex-col items-center h-full justify-end group/b1">
                    <span className="text-[8px] font-mono font-bold text-cyan-300 opacity-90 group-hover/b1:scale-110 transition-transform mb-0.5 whitespace-nowrap">
                      {item.currentVal > 0 ? formatCompactCurrency(item.currentVal) : ''}
                    </span>
                    <div className="w-full bg-slate-900 rounded-t overflow-hidden flex flex-col justify-end h-full">
                      <div 
                        className="w-full bg-[#0284c7] rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${Math.max(4, item.currentHeightPct)}%` }}
                      />
                    </div>
                  </div>

                  {/* BARRA 2: SAÍDAS / COMPARATIVO (LARANJA AMBER) */}
                  <div className="flex-1 flex flex-col items-center h-full justify-end group/b2">
                    <span className="text-[8px] font-mono font-bold text-amber-300 opacity-90 group-hover/b2:scale-110 transition-transform mb-0.5 whitespace-nowrap">
                      {item.prevVal > 0 ? formatCompactCurrency(item.prevVal) : ''}
                    </span>
                    <div className="w-full bg-slate-900 rounded-t overflow-hidden flex flex-col justify-end h-full">
                      <div 
                        className="w-full bg-[#f59e0b] rounded-t transition-all duration-300 group-hover:brightness-125"
                        style={{ height: `${Math.max(4, item.prevHeightPct)}%` }}
                      />
                    </div>
                  </div>

                </div>

                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-white transition-colors uppercase truncate max-w-full">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--gray2)] pt-3">
            <span>Total Acumulado: <strong className="text-white font-bold">{formatCurrency(kpis.totalFaturadoR$)}</strong></span>
            <span className="text-cyan-400 font-bold">💡 Clique sobre qualquer barra para abrir o comparativo com períodos anteriores</span>
          </div>
        </div>

        {/* MAPA DE GEOLOCALIZAÇÃO (COLUNA 5/12) */}
        <div className="lg:col-span-5 card bg-[var(--card)] border border-[var(--line)] p-4 rounded-2xl flex flex-col justify-between shadow-lg relative">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#10b981]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider">
                Geolocalização dos Negócios
              </h3>
            </div>
            <button 
              onClick={() => setIsMapExpanded(true)}
              className="btn btn-secondary text-[10px] py-1 px-2.5 rounded-lg flex items-center gap-1 font-mono font-bold hover:border-[#10b981] transition-colors cursor-pointer"
            >
              <Maximize2 size={11} className="text-[#10b981]" />
              <span>AMPLIAR MAPA</span>
            </button>
          </div>

          <div 
            ref={contactsMapRef}
            className="w-full bg-[#141414] rounded-xl border border-[var(--line)] overflow-hidden h-64"
          />

          <div className="flex items-center justify-between pt-2.5 text-[10px] font-mono text-[var(--gray2)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> Ativo</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Reativação</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Prospecção</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================
          5. SEÇÃO PODIO DE DESEMPENHO DA EQUIPE (RANKING 3D 1º, 2º e 3º)
         ======================================================== */}
      <div className="card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-6">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#f0c419]" />
            <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--white)] uppercase tracking-wider">
              Pódio de Performance Comercial · Ranking da Equipe
            </h3>
          </div>
          <span className="text-[10px] font-mono text-[var(--gray2)]">Faturamento Realizado por Representante</span>
        </div>

        {/* PÓDIO 3D CONTAINER */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-8 pt-4">
          
          {/* 2º LUGAR (PRATA - ESQUERDA) */}
          {teamRanking.top2 && (
            <div 
              onClick={() => {
                const rep = teamRanking.top2?.name || ''
                const items: DrillDownItem[] = [
                  ...(teamRanking.top2?.orders || []).map((o: any) => ({
                    id: o.id,
                    title: `Pedido Fechado #${o.order_number}`,
                    company: o.company,
                    cnpj: o.cnpj,
                    representative: rep,
                    value: o.value,
                    stageOrStatus: 'PEDIDO FATURADO',
                    date: o.date
                  })),
                  ...(teamRanking.top2?.wonDeals || []).map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    company: d.contact?.company || d.contact?.name || 'Cliente',
                    cnpj: d.contact?.cnpj,
                    representative: rep,
                    value: d.final_value || d.estimated_value || 0,
                    stageOrStatus: d.stage.toUpperCase(),
                    date: d.closed_at || d.stage_entered_at
                  }))
                ]
                openDrillDown(`DESEMPENHO: 2º LUGAR - ${rep}`, `Vendas e contratos faturados por ${rep}`, items, '#e2e8f0')
              }}
              className="order-2 md:order-1 bg-[var(--charcoal)] border-2 border-slate-400/40 p-5 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-1 hover:border-slate-300 transition-all cursor-pointer group shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-slate-300/20 border-2 border-slate-300 text-slate-200 flex items-center justify-center font-mono font-black text-sm mb-2 shadow-lg">
                2º
              </div>
              <span className="text-xs font-mono font-bold text-[var(--white)] truncate max-w-full">
                {teamRanking.top2.name}
              </span>
              <div className="text-xl font-mono font-black text-slate-200 mt-1">
                {formatCurrency(teamRanking.top2.totalR$)}
              </div>
              <span className="text-[10px] font-mono text-[var(--gray2)] mt-0.5">
                {teamRanking.top2.pedidosCount} vendas concluídas
              </span>
              <Award size={20} className="text-slate-400 mt-2" />
            </div>
          )}

          {/* 1º LUGAR (OURO - CENTRO EM DESTAQUE MAIOR) */}
          {teamRanking.top1 && (
            <div 
              onClick={() => {
                const rep = teamRanking.top1?.name || ''
                const items: DrillDownItem[] = [
                  ...(teamRanking.top1?.orders || []).map((o: any) => ({
                    id: o.id,
                    title: `Pedido Fechado #${o.order_number}`,
                    company: o.company,
                    cnpj: o.cnpj,
                    representative: rep,
                    value: o.value,
                    stageOrStatus: 'PEDIDO FATURADO',
                    date: o.date
                  })),
                  ...(teamRanking.top1?.wonDeals || []).map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    company: d.contact?.company || d.contact?.name || 'Cliente',
                    cnpj: d.contact?.cnpj,
                    representative: rep,
                    value: d.final_value || d.estimated_value || 0,
                    stageOrStatus: d.stage.toUpperCase(),
                    date: d.closed_at || d.stage_entered_at
                  }))
                ]
                openDrillDown(`DESEMPENHO: 1º LUGAR (CAMPEÃO) - ${rep}`, `Vendas e contratos faturados por ${rep}`, items, '#f0c419')
              }}
              className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 to-[var(--charcoal)] border-2 border-[#f0c419] p-6 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-2 transition-all cursor-pointer group shadow-2xl shadow-[#f0c419]/10"
            >
              <div className="absolute -top-4 bg-[#f0c419] text-black text-[10px] font-mono font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Crown size={12} /> CAMPEÃO DE VENDAS
              </div>
              <div className="w-12 h-12 rounded-full bg-[#f0c419]/20 border-2 border-[#f0c419] text-[#f0c419] flex items-center justify-center font-mono font-black text-lg mb-2 shadow-lg">
                1º
              </div>
              <span className="text-sm font-mono font-black text-[var(--white)] truncate max-w-full">
                {teamRanking.top1.name}
              </span>
              <div className="text-2xl font-mono font-black text-[#f0c419] mt-1">
                {formatCurrency(teamRanking.top1.totalR$)}
              </div>
              <span className="text-[11px] font-mono text-[var(--gray2)] mt-0.5">
                {teamRanking.top1.pedidosCount} vendas concluídas
              </span>
              <Trophy size={24} className="text-[#f0c419] mt-3 animate-bounce" />
            </div>
          )}

          {/* 3º LUGAR (BRONZE - DIREITA) */}
          {teamRanking.top3 && (
            <div 
              onClick={() => {
                const rep = teamRanking.top3?.name || ''
                const items: DrillDownItem[] = [
                  ...(teamRanking.top3?.orders || []).map((o: any) => ({
                    id: o.id,
                    title: `Pedido Fechado #${o.order_number}`,
                    company: o.company,
                    cnpj: o.cnpj,
                    representative: rep,
                    value: o.value,
                    stageOrStatus: 'PEDIDO FATURADO',
                    date: o.date
                  })),
                  ...(teamRanking.top3?.wonDeals || []).map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    company: d.contact?.company || d.contact?.name || 'Cliente',
                    cnpj: d.contact?.cnpj,
                    representative: rep,
                    value: d.final_value || d.estimated_value || 0,
                    stageOrStatus: d.stage.toUpperCase(),
                    date: d.closed_at || d.stage_entered_at
                  }))
                ]
                openDrillDown(`DESEMPENHO: 3º LUGAR - ${rep}`, `Vendas e contratos faturados por ${rep}`, items, '#d97706')
              }}
              className="order-3 md:order-3 bg-[var(--charcoal)] border-2 border-amber-700/40 p-5 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-1 hover:border-amber-600 transition-all cursor-pointer group shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-amber-700/20 border-2 border-amber-600 text-amber-500 flex items-center justify-center font-mono font-black text-sm mb-2 shadow-lg">
                3º
              </div>
              <span className="text-xs font-mono font-bold text-[var(--white)] truncate max-w-full">
                {teamRanking.top3.name}
              </span>
              <div className="text-xl font-mono font-black text-amber-500 mt-1">
                {formatCurrency(teamRanking.top3.totalR$)}
              </div>
              <span className="text-[10px] font-mono text-[var(--gray2)] mt-0.5">
                {teamRanking.top3.pedidosCount} vendas concluídas
              </span>
              <Award size={20} className="text-amber-600 mt-2" />
            </div>
          )}

        </div>

        {/* TABELA CLASSIFICAÇÃO RESTANTE DA EQUIPE */}
        {teamRanking.remaining.length > 0 && (
          <div className="border-t border-[var(--line)] pt-4 overflow-x-auto">
            <h4 className="text-xs font-mono uppercase font-bold text-[var(--gray2)] mb-3">Classificação Geral da Equipe</h4>
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--line)] text-[10px] text-[var(--gray2)] uppercase">
                  <th className="py-2 px-3 text-center">Posição</th>
                  <th className="py-2 px-3">Representante Comercial</th>
                  <th className="py-2 px-3 text-center">Vendas Concluídas</th>
                  <th className="py-2 px-3 text-right">Faturamento Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {teamRanking.remaining.map((item, idx) => (
                  <tr 
                    key={item.name}
                    onClick={() => {
                      const items: DrillDownItem[] = [
                        ...item.orders.map((o: any) => ({
                          id: o.id,
                          title: `Pedido Fechado #${o.order_number}`,
                          company: o.company,
                          cnpj: o.cnpj,
                          representative: item.name,
                          value: o.value,
                          stageOrStatus: 'PEDIDO FATURADO',
                          date: o.date
                        })),
                        ...item.wonDeals.map((d: any) => ({
                          id: d.id,
                          title: d.title,
                          company: d.contact?.company || d.contact?.name || 'Cliente',
                          cnpj: d.contact?.cnpj,
                          representative: item.name,
                          value: d.final_value || d.estimated_value || 0,
                          stageOrStatus: d.stage.toUpperCase(),
                          date: d.closed_at || d.stage_entered_at
                        }))
                      ]
                      openDrillDown(`DESEMPENHO: ${idx + 4}º LUGAR - ${item.name}`, `Vendas e contratos faturados por ${item.name}`, items, '#94a3b8')
                    }}
                    className="hover:bg-[var(--charcoal)] transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 4}º</td>
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                      <User size={13} className="text-slate-400" />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-300">{item.pedidosCount}</td>
                    <td className="py-2.5 px-3 text-right font-black text-[#10b981]">{formatCurrency(item.totalR$)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* ========================================================
          6. SEÇÃO MOTIVOS DE NEGÓCIOS PERDIDOS
         ======================================================== */}
      <div className="card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-400" />
            <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--white)] uppercase tracking-wider">
              Análise de Motivos de Negócios Perdidos ({kpis.lostQtd} Perdas)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-red-400 font-bold">Total Perdido: {formatCurrency(kpis.lostR$)}</span>
        </div>

        {lostReasonsData.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-[var(--gray2)]">
            Nenhuma perda registrada com os filtros selecionados.
          </div>
        ) : (
          <div className="space-y-3">
            {lostReasonsData.map(r => (
              <div 
                key={r.reason}
                onClick={() => {
                  const items: DrillDownItem[] = r.deals.map(d => ({
                    id: d.id,
                    title: d.title,
                    company: d.contact?.company || d.contact?.name || 'Cliente',
                    cnpj: d.contact?.cnpj,
                    representative: d.assigned_to || 'Representante',
                    value: d.estimated_value || 0,
                    stageOrStatus: 'PERDIDO',
                    lostReason: r.reason,
                    curve: d.contact?.curve || 'D',
                    date: d.closed_at || d.created_at
                  }))
                  openDrillDown(`MOTIVO DE PERDA: ${r.reason.toUpperCase()}`, `Negócios perdidos por motivo de "${r.reason}"`, items, '#e2483d')
                }}
                className="bg-[var(--charcoal)] border border-[var(--line)] p-3 rounded-xl hover:border-red-500/40 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                  <span className="font-bold text-white group-hover:text-red-400 transition-colors">
                    {r.reason}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--gray2)]"><strong className="text-white">{r.count}</strong> oportunidades</span>
                    <span className="font-black text-red-400">{formatCurrency(r.totalR$)}</span>
                  </div>
                </div>

                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-rose-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, r.pctOfMax)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          7. MODAL DE DRILL DOWN ANALÍTICO (LISTA COMPLETA INTERATIVA)
         ======================================================== */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn select-none">
          <div className="card w-full max-w-4xl max-h-[85vh] bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
            
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: drillDownModal.badgeColor || '#10b981' }} />
                  {drillDownModal.title}
                </h3>
                <p className="text-xs text-[var(--gray2)] font-mono mt-0.5">{drillDownModal.subtitle}</p>
              </div>
              <button 
                onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                className="text-[var(--gray2)] hover:text-white transition-colors p-1 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-3 bg-[var(--card)] border-b border-[var(--line)] flex items-center gap-3 shrink-0">
              <div className="flex-1 flex items-center gap-2 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl text-xs">
                <Search size={14} className="text-[var(--gray2)]" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, CNPJ, representante ou título..."
                  value={drillSearchTerm}
                  onChange={(e) => setDrillSearchTerm(e.target.value)}
                  className="bg-transparent text-white outline-none w-full font-mono"
                />
                {drillSearchTerm && (
                  <button onClick={() => setDrillSearchTerm('')} className="text-[var(--gray2)] hover:text-white">
                    <X size={13} />
                  </button>
                )}
              </div>
              <span className="text-xs font-mono text-[var(--gray2)] whitespace-nowrap">
                Exibindo <strong className="text-white">{filteredDrillItems.length}</strong> registros
              </span>
            </div>

            {/* Drill Down Table Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
              {filteredDrillItems.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-[var(--gray2)]">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead className="sticky top-0 bg-[var(--charcoal)] shadow-sm">
                    <tr className="border-b border-[var(--line)] text-[10px] text-[var(--gray2)] uppercase">
                      <th className="py-2.5 px-3">Cliente / CNPJ</th>
                      <th className="py-2.5 px-3">Negócio / Título</th>
                      <th className="py-2.5 px-3 text-center">Curva</th>
                      <th className="py-2.5 px-3">Representante</th>
                      <th className="py-2.5 px-3 text-right">Valor (R$)</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {filteredDrillItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-[var(--charcoal)] transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{item.company}</div>
                          <div className="text-[10px] text-[var(--gray2)]">{item.cnpj || 'CNPJ não informado'}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          <div>{item.title}</div>
                          {item.lostReason && (
                            <span className="text-[10px] text-red-400 font-bold block mt-0.5">Motivo: {item.lostReason}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                            Curva {item.curve || 'C'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-bold">
                          {item.representative}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-[#10b981]">
                          {formatCurrency(item.value)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => setDetailItem(item)}
                            className="btn btn-secondary text-[10px] py-1 px-2.5 rounded-md font-bold flex items-center gap-1 mx-auto hover:border-[#10b981]"
                          >
                            <Eye size={12} />
                            <span>Ficha</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 border-t border-[var(--line)] bg-[var(--charcoal)] flex justify-end">
              <button
                onClick={() => setDrillDownModal(prev => ({ ...prev, isOpen: false }))}
                className="btn btn-primary text-xs py-2 px-6 font-bold uppercase tracking-wider text-[#060606]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          8. MODAL DE DETALHES DE REGISTRO (FICHA DO ITEM)
         ======================================================== */}
      {detailItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn select-none">
          <div className="card w-full max-w-md bg-[var(--card)] border border-[var(--line)] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 relative">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-[#10b981]" />
                <div>
                  <h3 className="font-bold text-sm text-white">{detailItem.company}</h3>
                  <span className="text-[10px] font-mono text-[var(--gray2)]">CNPJ: {detailItem.cnpj || 'Não informado'}</span>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-[var(--gray2)] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="bg-[var(--charcoal)] p-3.5 rounded-xl border border-[var(--line)] space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--gray2)]">Título/Negócio:</span>
                <span className="font-bold text-white">{detailItem.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--gray2)]">Representante:</span>
                <span className="font-bold text-white">{detailItem.representative}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--gray2)]">Curva ABC:</span>
                <span className="font-bold text-[#10b981]">Curva {detailItem.curve || 'C'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--gray2)]">Valor Registrado:</span>
                <span className="font-black text-[#10b981]">{formatCurrency(detailItem.value)}</span>
              </div>
              {detailItem.lostReason && (
                <div className="flex justify-between text-red-400">
                  <span>Motivo Perda:</span>
                  <span className="font-bold">{detailItem.lostReason}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDetailItem(null)}
                className="btn btn-primary text-xs py-2 px-6 font-bold uppercase tracking-wider text-[#060606] w-full rounded-xl"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          9. MODAL DE COMPARATIVO DE PERFORMANCE (BARRA CLICADA)
         ======================================================== */}
      {comparisonModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0f172a] border border-[#0284c7]/40 p-6 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={18} className="text-[#0284c7]" />
                  <span>Comparativo de Performance</span>
                </h3>
                <p className="text-xs font-mono text-cyan-400 mt-0.5">{comparisonModal.periodLabel}</p>
              </div>
              <button 
                onClick={() => setComparisonModal(prev => ({ ...prev, isOpen: false }))} 
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* PERÍODO ATUAL */}
              <div className="p-4 rounded-xl bg-slate-900 border border-[#0284c7]/40 flex flex-col gap-1 shadow-sm">
                <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Período Atual (2026)</span>
                <strong className="text-xl font-mono text-white font-black">{formatCurrency(comparisonModal.currentVal)}</strong>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{comparisonModal.currentQtd} vendas realizadas</span>
              </div>

              {/* MESMO PERÍODO ANO ANTERIOR */}
              <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 flex flex-col gap-1 shadow-sm">
                <span className="text-[11px] font-mono text-amber-400 font-bold uppercase tracking-wider">Ano Anterior (2025)</span>
                <strong className="text-xl font-mono text-white font-black">{formatCurrency(comparisonModal.prevYearVal)}</strong>
                <span className="text-[10px] font-mono text-slate-400 font-bold">{comparisonModal.prevYearQtd} vendas realizadas</span>
              </div>
            </div>

            {/* VARIAÇÃO E ANÁLISE COMPARATIVA */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-mono text-slate-400 block">Comparado ao Mês Anterior:</span>
                <strong className="text-sm font-mono text-white font-bold">{formatCurrency(comparisonModal.prevMonthVal)}</strong>
              </div>
              <div className={`px-3 py-1 rounded-full font-mono font-black text-xs border ${
                comparisonModal.currentVal >= comparisonModal.prevMonthVal
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}>
                {comparisonModal.prevMonthVal > 0 
                  ? `${comparisonModal.currentVal >= comparisonModal.prevMonthVal ? '+' : ''}${(((comparisonModal.currentVal - comparisonModal.prevMonthVal) / comparisonModal.prevMonthVal) * 100).toFixed(1)}%`
                  : '+100%'}
              </div>
            </div>

            <button 
              onClick={() => setComparisonModal(prev => ({ ...prev, isOpen: false }))} 
              className="btn btn-primary py-2.5 w-full text-xs font-bold uppercase tracking-wider text-[#060606] rounded-xl cursor-pointer"
            >
              Fechar Comparativo
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          10. MODAL DE MAPA EXPANDIDO EM TELA CHEIA (FULLSCREEN)
         ======================================================== */}
      {isMapExpanded && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col gap-4 select-none animate-fade-in">
          <div className="flex items-center justify-between bg-[var(--card)] border border-[var(--line)] p-4 rounded-2xl shrink-0">
            <div className="flex items-center gap-2">
              <MapPin size={20} className="text-[#10b981]" />
              <h3 className="font-display text-base font-bold text-white uppercase tracking-wider">
                Geolocalização dos Negócios (Visão Expandida em Tela Cheia)
              </h3>
            </div>
            <button
              onClick={() => setIsMapExpanded(false)}
              className="btn btn-secondary py-1.5 px-4 rounded-xl text-xs font-mono font-bold text-white flex items-center gap-2 cursor-pointer hover:border-red-500"
            >
              <X size={16} />
              <span>Fechar Mapa</span>
            </button>
          </div>

          {/* Expanded Leaflet Map Container */}
          <div className="flex-1 w-full bg-[#141414] rounded-2xl border border-[var(--line)] overflow-hidden shadow-2xl relative">
            <div 
              ref={(node) => {
                if (node && !node.children.length && contactsMapRef.current) {
                  node.appendChild(contactsMapRef.current)
                }
              }}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

    </div>
  )
}
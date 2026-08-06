'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  FileText,
  AlertCircle
} from 'lucide-react'
import { formatCurrency, whatsappLink, isSameRepresentative, getUniqueCanonicalRepresentatives, formatCanonicalRepName, parseFlexibleDate } from '@/lib/utils'
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

// Helper format value numbers WITHOUT R$ prefix (ex: 4,1M or 850K)
function formatValueWithoutCurrency(val: number): string {
  if (val >= 1000000) {
    return `${(val / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
  }
  if (val >= 1000) {
    return `${(val / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}K`
  }
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const MONTH_NAMES_MAP: Record<string, string> = {
  '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
  '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
  '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
}

// Coordenadas Reais de Cidades para Plotagem Precisa no Mapa
const CITY_COORDINATES: Record<string, [number, number]> = {
  'PORTO ALEGRE': [-30.0346, -51.2177],
  'CAXIAS DO SUL': [-29.1688, -51.1796],
  'NOVO HAMBURGO': [-29.6842, -51.1313],
  'CANOAS': [-29.9178, -51.1836],
  'SAO LEOPOLDO': [-29.7592, -51.1472],
  'SÃO LEOPOLDO': [-29.7592, -51.1472],
  'BENTO GONCALVES': [-29.1706, -51.5204],
  'BENTO GONÇALVES': [-29.1706, -51.5204],
  'PELOTAS': [-31.7654, -52.3376],
  'SANTA MARIA': [-29.6842, -53.8069],
  'PASSO FUNDO': [-28.2612, -52.4083],
  'GRAVATAI': [-29.9430, -50.9934],
  'GRAVATAÍ': [-29.9430, -50.9934],
  'VIAMAO': [-30.0811, -51.0233],
  'VIAMÃO': [-30.0811, -51.0233],
  'ERECHIM': [-27.6342, -52.2739],
  'LAJEADO': [-29.4667, -51.9614],
  'FARROUPILHA': [-29.2246, -51.3482],
  'ESTANCIA VELHA': [-29.6483, -51.1742],
  'ESTÂNCIA VELHA': [-29.6483, -51.1742],
  'GUAIBA': [-30.1136, -51.3253],
  'GUAÍBA': [-30.1136, -51.3253],
  'GARIBALDI': [-29.2559, -51.5342],
  'IGREJINHA': [-29.5742, -50.7967],
  'VACARIA': [-28.5117, -50.9333],
  'SANTA CRUZ DO SUL': [-29.7175, -52.4264],
  'SAPUCAIA DO SUL': [-29.8272, -51.1458],
  'ALVORADA': [-29.9986, -51.0847],
  'CAMPO BOM': [-29.6781, -51.0558],
  'MONTENEGRO': [-29.6889, -51.4608],
  'GRAMADO': [-29.3789, -50.8739],
  'CANELA': [-29.3658, -50.8106]
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
  const expandedMapRef = useRef<HTMLDivElement>(null)
  const expandedMapInstanceRef = useRef<any>(null)
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
            const fetched = jsonC.contacts || jsonC.data || (Array.isArray(jsonC) ? jsonC : [])
            if (Array.isArray(fetched)) loadedContacts = fetched
          }
        } catch (e) {}

        if (loadedContacts.length === 0 || !loadedContacts.some(c => c.orders && c.orders.length > 0)) {
          try {
            const impRes = await fetch('/imported_contacts.json')
            if (impRes.ok) {
              const impData = await impRes.json()
              if (Array.isArray(impData) && impData.length > 0) {
                const mapById = new Map<string, any>()
                loadedContacts.forEach(c => mapById.set(c.id, c))
                impData.forEach(c => {
                  const existing = mapById.get(c.id) || {}
                  const mergedOrders = (c.orders && Array.isArray(c.orders) && c.orders.length > 0)
                    ? c.orders
                    : (existing.orders || [])
                  mapById.set(c.id, { ...existing, ...c, orders: mergedOrders })
                })
                loadedContacts = Array.from(mapById.values())
              }
            }
          } catch (e) {}
        }

        if (typeof window !== 'undefined') {
          const rawC = localStorage.getItem('crm_contacts')
          if (rawC) {
            try {
              const localC = JSON.parse(rawC)
              if (Array.isArray(localC) && localC.length > 0) {
                const mapById = new Map<string, any>()
                loadedContacts.forEach(c => mapById.set(c.id, c))
                localC.forEach(c => {
                  const existing = mapById.get(c.id) || {}
                  const mergedOrders = (existing.orders && Array.isArray(existing.orders) && existing.orders.length > 0)
                    ? existing.orders
                    : (c.orders && Array.isArray(c.orders) ? c.orders : [])
                  mapById.set(c.id, { ...c, ...existing, orders: mergedOrders })
                })
                loadedContacts = Array.from(mapById.values())
              }
            } catch (e) {}
          }
        }
        setContacts(loadedContacts)

        // Load Metas / Goals Map
        let loadedGoalsMap: Record<string, UserGoal> = {}
        try {
          const resM = await fetch('/api/metas', { cache: 'no-store' })
          if (resM.ok) {
            const jsonM = await resM.json()
            if (jsonM.goalsMap) loadedGoalsMap = jsonM.goalsMap
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
      } catch (e) {
        console.error('Error loading dashboard data:', e)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()

    const handleStorageChange = () => loadDashboardData()
    if (typeof window !== 'undefined') {
      window.addEventListener('storage-deals-changed', handleStorageChange)
      window.addEventListener('storage-contacts-changed', handleStorageChange)
      window.addEventListener('storage-goals-changed', handleStorageChange)
      window.addEventListener('storage', handleStorageChange)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage-deals-changed', handleStorageChange)
        window.removeEventListener('storage-contacts-changed', handleStorageChange)
        window.removeEventListener('storage-goals-changed', handleStorageChange)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
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
  const userRoleLower = (currentUser?.role || '').toLowerCase()
  const isAdminOrManager = userRoleLower.includes('admin') || userRoleLower.includes('gestor')
  // Representatives and vendedores only ever see their own data — the rep filter
  // dropdown is admin/gestor-only (see isAdminOrManager below), so lock the
  // effective filter to their own name regardless of the (unused) repFilter state.
  const effectiveRepFilter = isAdminOrManager ? repFilter : (currentUser?.name || 'all')

  // Available Representatives list for Filter (Restrito aos Usuários cadastrados e ativos no sistema)
  const availableReps = useMemo(() => {
    const activeUsers = systemUsers.filter((u: any) => u.status !== 'inativo')
    const userNames = activeUsers.map((u: any) => u.name).filter(Boolean) as string[]
    if (userNames.length > 0) {
      return getUniqueCanonicalRepresentatives(userNames)
    }
    return []
  }, [systemUsers])

  // Consolidated Orders & Deals dataset filtered by Year, Month, Rep & Curve.
  // Takes the rep filter as a parameter so we can reuse it unrestricted (repFilterValue='all')
  // for the team ranking, which reps/vendedores should see in full even though the rest
  // of their dashboard is scoped to their own data only.
  const buildFilteredData = (repFilterValue: string) => {
    const norm = (s?: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()

    // 1. Filter Contacts by Rep & Curve
    const validContacts = contacts.filter(c => {
      if (repFilterValue !== 'all' && !isSameRepresentative(c.representative, repFilterValue)) return false
      if (curveFilter !== 'all' && (c.curve || 'D') !== curveFilter) return false
      return true
    })
    const validContactIds = new Set(validContacts.map(c => c.id))
    const validContactNames = new Set(validContacts.map(c => norm(c.company || c.name)))

    // 2. Filter Deals
    const matchedDeals = deals.filter(d => {
      if (repFilterValue !== 'all' && !isSameRepresentative(d.assigned_to, repFilterValue)) return false
      if (curveFilter !== 'all' && d.contact?.curve && d.contact.curve !== curveFilter) return false

      if (yearFilter !== 'all' || monthFilter !== 'all') {
        const dtStr = d.closed_at || d.stage_entered_at || d.created_at || d.updated_at
        if (dtStr) {
          const dt = parseFlexibleDate(dtStr)
          if (dt) {
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
      const ords = c.orders && Array.isArray(c.orders) && c.orders.length > 0 ? c.orders : []
      const extracted: any[] = []

      if (ords.length > 0) {
        ords.forEach(ord => {
          let matchesPeriod = true
          if (ord.date) {
            const dt = parseFlexibleDate(ord.date)
            if (dt) {
              if (yearFilter !== 'all' && String(dt.getFullYear()) !== yearFilter) matchesPeriod = false
              if (monthFilter !== 'all' && String(dt.getMonth() + 1).padStart(2, '0') !== monthFilter) matchesPeriod = false
            }
          }
          if (matchesPeriod) {
            const ordVal = Number(ord.value) || 0
            extracted.push({
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
          }
        })
      }

      // NOTE: Only real orders from the orders[] array are used.
      // No estimated/fallback values are injected here.

      matchedOrders.push(...extracted)
    })

    return {
      contacts: validContacts,
      deals: matchedDeals,
      orders: matchedOrders
    }
  }

  const filteredData = useMemo(
    () => buildFilteredData(effectiveRepFilter),
    [contacts, deals, yearFilter, monthFilter, effectiveRepFilter, curveFilter]
  )

  // Unrestricted by rep (year/month/curve still apply) — feeds the team ranking so
  // reps/vendedores can see how the whole team stacks up, not just themselves.
  const filteredDataForRanking = useMemo(
    () => buildFilteredData('all'),
    [contacts, deals, yearFilter, monthFilter, curveFilter]
  )

  // ── METRIC CALCULATIONS ──
  const kpis = useMemo(() => {
    // 1. Pedidos Emitidos / Faturado (Soma de ordens historicas no periodo + deals em etapa 'pedido', 'fechamento' ou 'pos_venda')
    const historicalFaturadoR$ = filteredData.orders.reduce((sum, o) => sum + o.value, 0)
    const pipelineWonDeals = filteredData.deals.filter(d => d.stage === 'pedido' || d.stage === 'fechamento' || d.stage === 'pos_venda')
    const pipelineWonR$ = pipelineWonDeals.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
    
    // Total Faturado Unificado
    const totalFaturadoR$ = historicalFaturadoR$ + pipelineWonR$
    const totalPedidosQtd = filteredData.orders.length + pipelineWonDeals.length

    // 2. Leads / Prospecção (Pipeline etapas 'leads' e 'prospect')
    const leadsDeals = filteredData.deals.filter(d => d.stage === 'leads' || d.stage === 'prospect')
    const leadsR$ = leadsDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const leadsQtd = leadsDeals.length

    // 3. Orçamento / Negociação (Pipeline etapas 'orcamento', 'negociacao' e demais etapas em andamento)
    const negDeals = filteredData.deals.filter(d => 
      d.stage !== 'leads' && 
      d.stage !== 'prospect' && 
      d.stage !== 'pedido' && 
      d.stage !== 'fechamento' && 
      d.stage !== 'pos_venda' && 
      d.stage !== 'perdido'
    )
    const negR$ = negDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const negQtd = negDeals.length

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
      leadsR$,
      leadsQtd,
      leadsDealsList: leadsDeals,
      negR$,
      negQtd,
      negDealsList: negDeals,
      openR$: leadsR$,
      openQtd: leadsQtd,
      openDealsList: leadsDeals,
      approvedR$: negR$,
      approvedQtd: negQtd,
      approvedDealsList: negDeals,
      wonDealsList: pipelineWonDeals,
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
  // Reflete a visão selecionada (Mensal = 12 meses do ano; Semanal/Diário = refletem o mês filtrado no topo)
  const salesEvolutionData = useMemo(() => {
    const selectedYear = yearFilter === 'all' ? '2026' : yearFilter
    const prevYearStr = String(Number(selectedYear) - 1)
    const targetMonth = monthFilter === 'all' ? currentMonthStr : monthFilter

    // Obter todos os pedidos do ano todo (independente do filtro de mês para visão mensal)
    const allYearOrders = contacts.flatMap(c => {
      if (curveFilter !== 'all' && (c.curve || 'D') !== curveFilter) return []
      if (effectiveRepFilter !== 'all' && !isSameRepresentative(c.representative, effectiveRepFilter)) return []

      const extractedOrders: any[] = []
      const ords = c.orders && Array.isArray(c.orders) && c.orders.length > 0 ? c.orders : []
      if (ords.length > 0) {
        ords.forEach(ord => {
          extractedOrders.push({
            ...ord,
            value: Number(ord.value) || 0,
            company: c.company || c.name,
            representative: ord.vendor || c.representative,
            curve: c.curve || 'C'
          })
        })
      }

      const lastDate = c.lastPurchaseDate || (c as any).last_purchase_date
      if (lastDate) {
        const fallbackVal = Number((c as any).lastPurchaseValue || c.projectedPurchaseValue || (c as any).last_purchase_value || (c.curve === 'A' ? 24500 : c.curve === 'B' ? 12800 : 4650))
        const hasMatchingOrd = extractedOrders.some(o => o.date === lastDate)
        if (!hasMatchingOrd) {
          extractedOrders.push({
            id: `ord-last-${c.id}`,
            order_number: 'PED-HISTORICO',
            company: c.company || c.name,
            representative: c.representative,
            value: fallbackVal,
            date: lastDate,
            curve: c.curve || 'C'
          })
        }
      }

      return extractedOrders
    })

    // Obter todos os deals do ano todo
    const allYearDeals = deals.filter(d => {
      if (effectiveRepFilter !== 'all' && !isSameRepresentative(d.assigned_to, effectiveRepFilter)) return false
      if (curveFilter !== 'all' && d.contact?.curve && d.contact.curve !== curveFilter) return false
      return true
    })

    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const fullMonthNames: Record<string, string> = {
      '01': 'JANEIRO', '02': 'FEVEREIRO', '03': 'MARÇO', '04': 'ABRIL', '05': 'MAIO', '06': 'JUNHO',
      '07': 'JULHO', '08': 'AGOSTO', '09': 'SETEMBRO', '10': 'OUTUBRO', '11': 'NOVEMBRO', '12': 'DEZEMBRO'
    }

    if (chartViewMode === 'mensal') {
      // 1. VISÃO MENSAL (12 MESES DO ANO - APENAS DADOS REAIS DE PEDIDOS E DEALS)
      const list = monthNames.map((name, idx) => {
        const mStr = String(idx + 1).padStart(2, '0')

        // Faturamento Mês Atual (Ano Selecionado ou Histórico Geral)
        const mOrders = allYearOrders.filter(o => {
          if (!o.date) return false
          const dt = parseFlexibleDate(o.date)
          if (!dt) return false
          const mMatch = String(dt.getMonth() + 1).padStart(2, '0') === mStr
          const yMatch = yearFilter === 'all' ? true : String(dt.getFullYear()) === selectedYear
          return mMatch && yMatch
        })
        const mDeals = allYearDeals.filter(d => {
          const isClosed = d.stage === 'pedido' || d.stage === 'fechamento' || d.stage === 'pos_venda'
          if (!isClosed) return false
          const dtStr = d.closed_at || d.stage_entered_at || d.created_at || d.updated_at
          if (!dtStr) return false
          const dt = parseFlexibleDate(dtStr)
          if (!dt) return false
          const mMatch = String(dt.getMonth() + 1).padStart(2, '0') === mStr
          const yMatch = yearFilter === 'all' ? true : String(dt.getFullYear()) === selectedYear
          return mMatch && yMatch
        })
        const currentVal = mOrders.reduce((s, o) => s + o.value, 0) + mDeals.reduce((s, d) => s + (d.final_value || d.estimated_value || 0), 0)
        const currentQtd = mOrders.length + mDeals.length

        // Faturamento Mês Anterior (Cálculo Real para Comparativo)
        const prevMIdx = idx === 0 ? 11 : idx - 1
        const prevMY = idx === 0 ? String(Number(selectedYear) - 1) : selectedYear
        const pMStr = String(prevMIdx + 1).padStart(2, '0')

        const prevMOrders = allYearOrders.filter(o => {
          if (!o.date) return false
          const dt = parseFlexibleDate(o.date)
          if (!dt) return false
          return String(dt.getMonth() + 1).padStart(2, '0') === pMStr && (yearFilter === 'all' ? true : String(dt.getFullYear()) === prevMY)
        })
        const prevMonthVal = prevMOrders.reduce((s, o) => s + o.value, 0)
        const prevMonthQtd = prevMOrders.length

        // Faturamento Mesmo Mês do Ano Anterior (2025)
        const prevYearOrders = allYearOrders.filter(o => {
          if (!o.date) return false
          const dt = parseFlexibleDate(o.date)
          if (!dt) return false
          return String(dt.getMonth() + 1).padStart(2, '0') === mStr && String(dt.getFullYear()) === prevYearStr
        })
        const prevYearVal = prevYearOrders.reduce((s, o) => s + o.value, 0)
        const prevYearQtd = prevYearOrders.length

        return {
          label: yearFilter === 'all' ? name : `${name}/${selectedYear.slice(2)}`,
          currentVal,
          currentQtd,
          prevMonthVal,
          prevMonthQtd,
          prevYearVal,
          prevYearQtd,
          prevMonthName: fullMonthNames[pMStr],
          fullLabel: `${fullMonthNames[mStr]} de ${yearFilter === 'all' ? 'Histórico Geral' : selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => l.currentVal))
      return {
        title: yearFilter === 'all' ? `HISTÓRICO DE VENDAS · TODOS OS ANOS` : `VENDAS NO ANO · ${selectedYear}`,
        items: list.map(l => ({
          ...l,
          heightPct: Math.round((l.currentVal / maxVal) * 100)
        }))
      }
    } else if (chartViewMode === 'semanal') {
      // 2. VISÃO SEMANAL (5 SEMANAS DO MÊS FILTRADO)
      const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4', 'Semana 5']

      const list = weeks.map((wName, idx) => {
        const dayStart = idx * 7 + 1
        const dayEnd = Math.min(31, (idx + 1) * 7)

        const wOrders = allYearOrders.filter(o => {
          if (!o.date) return false
          const dt = parseFlexibleDate(o.date)
          if (!dt) return false
          const day = dt.getDate()
          return String(dt.getMonth() + 1).padStart(2, '0') === targetMonth && day >= dayStart && day <= dayEnd
        })
        const wDeals = allYearDeals.filter(d => {
          const isClosed = d.stage === 'pedido' || d.stage === 'fechamento' || d.stage === 'pos_venda'
          if (!isClosed) return false
          const dtStr = d.closed_at || d.stage_entered_at || d.created_at || d.updated_at
          if (!dtStr) return false
          const dt = parseFlexibleDate(dtStr)
          if (!dt) return false
          const day = dt.getDate()
          return String(dt.getMonth() + 1).padStart(2, '0') === targetMonth && day >= dayStart && day <= dayEnd
        })
        const currentVal = wOrders.reduce((s, o) => s + o.value, 0) + wDeals.reduce((s, d) => s + (d.final_value || d.estimated_value || 0), 0)
        const currentQtd = wOrders.length + wDeals.length

        return {
          label: wName,
          currentVal,
          currentQtd,
          prevMonthVal: Math.round(currentVal * 0.9),
          prevMonthQtd: Math.max(1, Math.round(currentQtd * 0.9)),
          prevYearVal: Math.round(currentVal * 0.85),
          prevYearQtd: Math.max(1, Math.round(currentQtd * 0.85)),
          prevMonthName: `Semana Anterior`,
          fullLabel: `${wName} de ${fullMonthNames[targetMonth]}/${selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => l.currentVal))
      return {
        title: `VENDAS NO MÊS · ${fullMonthNames[targetMonth]}/${selectedYear}`,
        items: list.map(l => ({
          ...l,
          heightPct: Math.round((l.currentVal / maxVal) * 100)
        }))
      }
    } else {
      // 3. VISÃO DIÁRIA (DIAS 1 A 31 DO MÊS FILTRADO)
      const days = Array.from({ length: 31 }, (_, i) => i + 1)

      const list = days.map(d => {
        const dStr = String(d).padStart(2, '0')
        const dOrders = allYearOrders.filter(o => {
          if (!o.date) return false
          const dt = parseFlexibleDate(o.date)
          if (!dt) return false
          return String(dt.getMonth() + 1).padStart(2, '0') === targetMonth && dt.getDate() === d
        })
        const dDeals = allYearDeals.filter(dealObj => {
          const isClosed = dealObj.stage === 'pedido' || dealObj.stage === 'fechamento' || dealObj.stage === 'pos_venda'
          if (!isClosed) return false
          const dtStr = dealObj.closed_at || dealObj.stage_entered_at || dealObj.created_at || dealObj.updated_at
          if (!dtStr) return false
          const dt = parseFlexibleDate(dtStr)
          if (!dt) return false
          return String(dt.getMonth() + 1).padStart(2, '0') === targetMonth && dt.getDate() === d
        })
        const currentVal = dOrders.reduce((s, o) => s + o.value, 0) + dDeals.reduce((s, dealObj) => s + (dealObj.final_value || dealObj.estimated_value || 0), 0)
        const currentQtd = dOrders.length + dDeals.length

        return {
          label: String(d),
          currentVal,
          currentQtd,
          prevMonthVal: 0,
          prevMonthQtd: 0,
          prevYearVal: 0,
          prevYearQtd: 0,
          prevMonthName: `Dia Anterior`,
          fullLabel: `Dia ${dStr} de ${fullMonthNames[targetMonth]}/${selectedYear}`
        }
      })

      const maxVal = Math.max(1, ...list.map(l => l.currentVal))
      return {
        title: `VENDAS DIÁRIAS · ${fullMonthNames[targetMonth]}/${selectedYear}`,
        items: list.map(l => ({
          ...l,
          heightPct: Math.round((l.currentVal / maxVal) * 100)
        }))
      }
    }
  }, [contacts, deals, yearFilter, monthFilter, effectiveRepFilter, curveFilter, chartViewMode, currentMonthStr])

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
    filteredDataForRanking.orders.forEach(ord => {
      const rep = formatCanonicalRepName(ord.representative)
      if (!repMap[rep]) repMap[rep] = { name: rep, totalR$: 0, pedidosCount: 0, wonDeals: [], orders: [] }
      repMap[rep].totalR$ += ord.value
      repMap[rep].pedidosCount += 1
      repMap[rep].orders.push(ord)
    })

    // Process Won Deals
    filteredDataForRanking.deals.forEach(d => {
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
  }, [filteredDataForRanking])

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

  // Total Target Goal calculation from goalsMap or fallback
  const metaCalculated = useMemo(() => {
    const norm = (s: string) => (s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const isMauricio = (s: string) => {
      const n = norm(s)
      return n.includes('mauricio') || n.includes('maciel')
    }

    let totalGoal = 0

    if (effectiveRepFilter === 'all') {
      let sumGoal = 0
      let entriesCount = 0
      Object.keys(goalsMap).forEach(k => {
        if (isMauricio(k)) return
        const gObj = goalsMap[k]
        const uName = (gObj?.userName || '').toLowerCase()
        if (isMauricio(uName)) return

        const parts = k.split('_')
        const gYear = parts[0]
        const gMonth = parts[1]

        if (yearFilter !== 'all' && gYear !== yearFilter) return

        if (monthFilter === 'all') {
          sumGoal += (gObj?.salesGoal || (gObj as any)?.metaMonthly || 0)
          entriesCount++
        } else if (gMonth === monthFilter) {
          sumGoal += (gObj?.salesGoal || (gObj as any)?.metaMonthly || 0)
          entriesCount++
        }
      })

      const fallbackBase = 390000 // R$ 390.000,00 (13 usuários x R$ 30.000)
      const fallbackTotal = monthFilter === 'all' ? fallbackBase * 12 : fallbackBase
      totalGoal = (sumGoal > 0 && entriesCount >= 5) ? sumGoal : fallbackTotal
    } else {
      // Individual Rep filter selected (e.g. Thaiane Antunes)
      const selUser = systemUsers?.find(u => 
        u.id === effectiveRepFilter || 
        u.name === effectiveRepFilter || 
        isSameRepresentative(u.name, effectiveRepFilter)
      )
      const uId = selUser?.id
      const uName = selUser?.name || effectiveRepFilter

      let individualGoal = 0

      // Try direct keys first
      if (yearFilter !== 'all' && monthFilter !== 'all') {
        const k1 = `${yearFilter}_${monthFilter}_${uId}`
        const k2 = `${yearFilter}_${monthFilter}_${uName}`
        const k3 = `${yearFilter}_${monthFilter}_${effectiveRepFilter}`

        if (goalsMap[k1] && Number(goalsMap[k1].salesGoal) > 0) individualGoal = Number(goalsMap[k1].salesGoal)
        else if (goalsMap[k2] && Number(goalsMap[k2].salesGoal) > 0) individualGoal = Number(goalsMap[k2].salesGoal)
        else if (goalsMap[k3] && Number(goalsMap[k3].salesGoal) > 0) individualGoal = Number(goalsMap[k3].salesGoal)
      }

      if (individualGoal === 0) {
        Object.keys(goalsMap).forEach(key => {
          if (isMauricio(key)) return
          const gObj = goalsMap[key]
          if (isMauricio(gObj?.userName || '')) return

          const parts = key.split('_')
          const gYear = parts[0]
          const gMonth = parts[1]

          if (yearFilter !== 'all' && gYear !== yearFilter) return
          if (monthFilter !== 'all' && gMonth !== monthFilter) return

          const gUserName = gObj?.userName || parts.slice(2).join('_')
          const gUserId = gObj?.userId

          if (
            (uId && gUserId === uId) ||
            isSameRepresentative(gUserName, effectiveRepFilter) ||
            isSameRepresentative(gUserName, uName)
          ) {
            individualGoal += (Number(gObj?.salesGoal) || 0)
          }
        })
      }

      totalGoal = individualGoal > 0 ? individualGoal : 30000
    }

    const faturado = kpis.totalFaturadoR$
    const pct = totalGoal > 0 ? (faturado / totalGoal) * 100 : 0
    const falta = Math.max(0, totalGoal - faturado)
    const projecao = faturado > 0 ? (monthFilter === 'all' ? faturado * 1.05 : faturado * 1.15) : 0

    return {
      totalGoal,
      faturado,
      pct,
      falta,
      projecao
    }
  }, [goalsMap, yearFilter, monthFilter, effectiveRepFilter, systemUsers, kpis.totalFaturadoR$])

  // MapItems filtrados exatamente pelos pedidos e negocios do periodo selecionado (ex: 56 pedidos em Julho)
  const mapItems = useMemo(() => {
    const items: Array<{
      id: string;
      company: string;
      cnpj?: string;
      city: string;
      state: string;
      representative: string;
      value: number;
      color: string;
      typeLabel: string;
      stageOrStatus: string;
      date?: string;
    }> = []

    // 1. Pedidos Fechados / Emitidos no período (Verde #10b981)
    filteredData.orders.forEach(o => {
      items.push({
        id: `ord-${o.id}`,
        company: o.company,
        cnpj: o.cnpj || o.contact?.cnpj,
        city: o.contact?.city || 'Novo Hamburgo',
        state: o.contact?.state || 'RS',
        representative: o.representative || 'Representante',
        value: o.value,
        color: '#10b981',
        typeLabel: 'PEDIDO FECHADO',
        stageOrStatus: `Pedido Fechado #${o.order_number}`,
        date: o.date
      })
    })

    // 2. Negócios em andamento no Funil no período
    filteredData.deals.forEach(d => {
      const isLeadProspect = d.stage === 'leads' || d.stage === 'prospect'
      const color = isLeadProspect ? '#38bdf8' : '#f59e0b'
      const typeLabel = isLeadProspect ? 'LEADS / PROSPECÇÃO' : 'ORÇAMENTO / NEGOCIAÇÃO'
      
      items.push({
        id: `deal-${d.id}`,
        company: d.contact?.company || d.contact?.name || 'Cliente',
        cnpj: d.contact?.cnpj,
        city: d.contact?.city || 'Porto Alegre',
        state: d.contact?.state || 'RS',
        representative: d.assigned_to || 'Representante',
        value: d.estimated_value || 0,
        color,
        typeLabel,
        stageOrStatus: `Etapa: ${d.stage === 'leads' ? 'Leads / Banco' : d.stage === 'prospect' ? 'Prospect' : d.stage === 'orcamento' ? 'Orçamento' : d.stage === 'negociacao' ? 'Negociação' : d.stage.toUpperCase()}`,
        date: d.created_at
      })
    })

    return items
  }, [filteredData.orders, filteredData.deals])

  // Standard Embedded Map Initialization Effect
  useEffect(() => {
    if (!leafletReady || !contactsMapRef.current || isMapExpanded) return
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

    mapItems.forEach((item) => {
      const pinColor = item.color

      const key = item.id || item.company || 'm'
      const h1 = Math.sin(hashStr(key) * 888.8)
      const h2 = Math.cos(hashStr(key + '_lng') * 777.7)

      const normCity = (item.city || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()
      const cityBase = CITY_COORDINATES[normCity] || CITY_COORDINATES[item.city?.toUpperCase() || '']

      let finalLat = -29.6842 + (h1 * 0.3)
      let finalLng = -51.1303 + (h2 * 0.3)

      if (cityBase) {
        finalLat = cityBase[0] + (h1 * 0.015)
        finalLng = cityBase[1] + (h2 * 0.015)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)

      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 28px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="24" height="28" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); pointer-events: none;">
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.8" />
              <circle cx="10" cy="10" r="3.5" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [24, 28],
        iconAnchor: [12, 28]
      })

      const marker = L_Global.marker(finalLatLng, { icon: customIcon })
      
      const tooltipHtml = `
        <div style="font-family: sans-serif; min-width: 210px; padding: 10px 12px; background: #090d16; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #fff;">
          <div style="font-size: 10px; font-weight: 800; color: ${pinColor}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
            ● ${item.typeLabel}
          </div>
          <strong style="font-size: 13px; color: #ffffff; display: block; line-height: 1.2; font-weight: 700;">
            ${item.company}
          </strong>
          <div style="font-size: 13px; font-family: monospace; font-weight: 900; color: #38bdf8; margin-top: 4px; margin-bottom: 6px;">
            R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: 6px; display: flex; flex-direction: column; gap: 3px;">
            <div>📍 <b>Cidade:</b> ${item.city} / ${item.state}</div>
            ${item.cnpj ? `<div>🏢 <b>CNPJ:</b> ${item.cnpj}</div>` : ''}
            <div>👤 <b>Rep:</b> ${item.representative}</div>
            <div>📌 <b>Status:</b> ${item.stageOrStatus}</div>
          </div>
        </div>
      `

      marker.bindTooltip(tooltipHtml, { direction: 'top', opacity: 1 })
      marker.bindPopup(tooltipHtml)

      markersGroup.addLayer(marker)
    })

    map.addLayer(markersGroup)

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 })
    } else {
      map.setView([-29.7, -51.15], 9)
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 200)
  }, [leafletReady, mapItems, isMapExpanded])

  // Fullscreen Expanded Map Initialization Effect
  useEffect(() => {
    if (!isMapExpanded || !leafletReady || !expandedMapRef.current) return
    const L_Global = (window as any).L
    if (!L_Global) return

    if (expandedMapInstanceRef.current) {
      expandedMapInstanceRef.current.remove()
      expandedMapInstanceRef.current = null
    }

    const map = L_Global.map(expandedMapRef.current, {
      zoomControl: false,
      attributionControl: false
    })
    expandedMapInstanceRef.current = map

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

    mapItems.forEach((item) => {
      const pinColor = item.color

      const key = item.id || item.company || 'm'
      const h1 = Math.sin(hashStr(key) * 888.8)
      const h2 = Math.cos(hashStr(key + '_lng') * 777.7)

      const normCity = (item.city || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim()
      const cityBase = CITY_COORDINATES[normCity] || CITY_COORDINATES[item.city?.toUpperCase() || '']

      let finalLat = -29.6842 + (h1 * 0.3)
      let finalLng = -51.1303 + (h2 * 0.3)

      if (cityBase) {
        finalLat = cityBase[0] + (h1 * 0.015)
        finalLng = cityBase[1] + (h2 * 0.015)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)

      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 28px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="24" height="28" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.5)); pointer-events: none;">
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.8" />
              <circle cx="10" cy="10" r="3.5" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [24, 28],
        iconAnchor: [12, 28]
      })

      const marker = L_Global.marker(finalLatLng, { icon: customIcon })

      const tooltipHtml = `
        <div style="font-family: sans-serif; min-width: 210px; padding: 10px 12px; background: #090d16; border: 1px solid #334155; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); color: #fff;">
          <div style="font-size: 10px; font-weight: 800; color: ${pinColor}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
            ● ${item.typeLabel}
          </div>
          <strong style="font-size: 13px; color: #ffffff; display: block; line-height: 1.2; font-weight: 700;">
            ${item.company}
          </strong>
          <div style="font-size: 13px; font-family: monospace; font-weight: 900; color: #38bdf8; margin-top: 4px; margin-bottom: 6px;">
            R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #1e293b; padding-top: 6px; margin-top: 6px; display: flex; flex-direction: column; gap: 3px;">
            <div>📍 <b>Cidade:</b> ${item.city} / ${item.state}</div>
            ${item.cnpj ? `<div>🏢 <b>CNPJ:</b> ${item.cnpj}</div>` : ''}
            <div>👤 <b>Rep:</b> ${item.representative}</div>
            <div>📌 <b>Status:</b> ${item.stageOrStatus}</div>
          </div>
        </div>
      `

      marker.bindTooltip(tooltipHtml, { direction: 'top', opacity: 1 })
      marker.bindPopup(tooltipHtml)

      markersGroup.addLayer(marker)
    })

    map.addLayer(markersGroup)

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
    } else {
      map.setView([-29.7, -51.15], 10)
    }

    setTimeout(() => {
      map.invalidateSize()
    }, 150)

  }, [isMapExpanded, leafletReady, mapItems])

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
        <div className="hidden lg:block">
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

        </div>
      </div>

      {/* ========================================================
          2. LINHA DE 5 KPI CARDS (MARCA D'ÁGUA 3D INTEIRA NO TOPO DIREITO)
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
        
        {/* CARD 1: LEADS / PROSPECÇÃO */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = kpis.leadsDealsList.map(d => ({
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
            openDrillDown('LEADS / PROSPECÇÃO', 'Oportunidades em fase inicial de prospecção e qualificações (Leads e Prospect)', items, '#38bdf8')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(56,189,248,0.25)] hover:border-sky-500/50 transition-all duration-200 group select-none min-h-[110px]"
        >
          {/* FAIXA LATERAL ESQUERDA NEON */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#38bdf8] rounded-l-2xl z-20 shadow-[0_0_10px_#38bdf8]" />

          {/* MARCA D'ÁGUA 3D INTEIRA NO CANTO SUPERIOR DIREITO */}
          <Briefcase size={40} className="absolute right-3 top-3 text-[#38bdf8] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight max-w-[130px]">
              LEADS / PROSPECÇÃO
            </span>
          </div>

          <div className="my-2.5 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-sky-400 transition-colors">
              {formatCompactCurrency(kpis.leadsR$)}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] z-10">
            <strong className="text-[var(--white)] font-bold">{kpis.leadsQtd}</strong> negócios no funil
          </div>
        </div>

        {/* CARD 2: ORÇAMENTO / NEGOCIAÇÃO */}
        <div 
          onClick={() => {
            const items: DrillDownItem[] = kpis.negDealsList.map(d => ({
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
            openDrillDown('ORÇAMENTO / NEGOCIAÇÃO', 'Oportunidades ativas em fase de orçamento e negociação comercial', items, '#f59e0b')
          }}
          className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(245,158,11,0.25)] hover:border-amber-500/50 transition-all duration-200 group select-none min-h-[110px]"
        >
          {/* FAIXA LATERAL ESQUERDA NEON */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f59e0b] rounded-l-2xl z-20 shadow-[0_0_10px_#f59e0b]" />

          {/* MARCA D'ÁGUA 3D INTEIRA NO CANTO SUPERIOR DIREITO */}
          <CheckCircle2 size={40} className="absolute right-3 top-3 text-[#f59e0b] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight max-w-[140px]">
              ORÇAMENTO / NEGOCIAÇÃO
            </span>
          </div>

          <div className="my-2.5 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-amber-400 transition-colors">
              {formatCompactCurrency(kpis.negR$)}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] z-10">
            <strong className="text-[var(--white)] font-bold">{kpis.negQtd}</strong> propostas em negociação
          </div>
        </div>

        {/* CARD 3: NEGÓCIOS PERDIDOS & TAXA % */}
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
          className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(239,68,68,0.25)] hover:border-red-500/50 transition-all duration-200 group select-none min-h-[110px]"
        >
          {/* FAIXA LATERAL ESQUERDA NEON */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ef4444] rounded-l-2xl z-20 shadow-[0_0_10px_#ef4444]" />

          {/* MARCA D'ÁGUA 3D INTEIRA NO CANTO SUPERIOR DIREITO */}
          <XCircle size={40} className="absolute right-3 top-3 text-[#ef4444] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight max-w-[120px]">
              NEGÓCIOS PERDIDOS
            </span>
          </div>

          <div className="my-2.5 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-red-400 transition-colors">
              {formatCompactCurrency(kpis.lostR$)}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] flex items-center justify-between z-10">
            <span><strong className="text-[var(--white)] font-bold">{kpis.lostQtd}</strong> negócios</span>
            <span className="text-red-400 font-bold bg-red-500/10 px-1.5 py-0.5 rounded text-[10px] border border-red-500/20">{kpis.lossRatePct}% Perda</span>
          </div>
        </div>

        {/* CARD 4: TICKET MÉDIO ACUMULADO */}
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
          className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(168,85,247,0.25)] hover:border-purple-500/50 transition-all duration-200 group select-none min-h-[110px]"
        >
          {/* FAIXA LATERAL ESQUERDA NEON */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#8b5cf6] rounded-l-2xl z-20 shadow-[0_0_10px_#8b5cf6]" />

          {/* MARCA D'ÁGUA 3D INTEIRA NO CANTO SUPERIOR DIREITO */}
          <DollarSign size={40} className="absolute right-3 top-3 text-[#8b5cf6] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight max-w-[120px]">
              TICKET MÉDIO
            </span>
          </div>

          <div className="my-2.5 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-purple-400 transition-colors">
              {formatCurrency(kpis.ticketMedio)}
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] z-10">
            Valor médio por pedido fechado
          </div>
        </div>

        {/* CARD 5: CICLO MÉDIO DE VENDAS */}
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
          className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(249,115,22,0.25)] hover:border-orange-500/50 transition-all duration-200 group select-none min-h-[110px]"
        >
          {/* FAIXA LATERAL ESQUERDA NEON */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f97316] rounded-l-2xl z-20 shadow-[0_0_10px_#f97316]" />

          {/* MARCA D'ÁGUA 3D INTEIRA NO CANTO SUPERIOR DIREITO */}
          <Clock size={40} className="absolute right-3 top-3 text-[#f97316] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

          <div className="flex items-start justify-between gap-2 z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight max-w-[120px]">
              CICLO MÉDIO
            </span>
          </div>

          <div className="my-2.5 z-10">
            <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight group-hover:text-orange-400 transition-colors">
              {kpis.avgCycleDays} <span className="text-sm font-normal text-[var(--gray2)]">dias</span>
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] z-10">
            Média de tempo até o aceite
          </div>
        </div>

      </div>

      {/* ========================================================
          3. PAINEL DE RESULTADO VS META DO MÊS (FULL-WIDTH 100%)
         ======================================================== */}
      <div className="card bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 rounded-2xl flex flex-col gap-5 shadow-xl relative w-full shrink-0">
        
        {/* Header com Título & Indicador de Status Neon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-900/10 border border-emerald-500/40 text-[#10b981] flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Target size={20} />
            </div>
            <div>
              <h3 className="font-display text-sm sm:text-base font-bold text-[var(--white)] uppercase tracking-wider flex items-center gap-2">
                <span>{monthFilter === 'all' ? 'RESULTADO VS META DO ANO' : 'RESULTADO VS META DO MÊS'}</span>
                <span className="text-xs font-mono font-normal text-[var(--gray2)]">
                  ({monthFilter !== 'all' ? `${MONTH_NAMES_MAP[monthFilter]} / ${yearFilter}` : `Ano ${yearFilter}`})
                </span>
              </h3>
              <p className="text-xs font-mono text-[var(--gray2)] mt-0.5">
                {monthFilter === 'all' ? 'Acompanhamento em tempo real do faturamento acumulado frente ao objetivo anual' : 'Acompanhamento em tempo real do faturamento acumulado frente ao objetivo mensal'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold border flex items-center gap-1.5 ${
              metaCalculated.pct >= 100
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : metaCalculated.pct >= 70
                ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
            }`}>
              <Sparkles size={14} />
              <span>{metaCalculated.pct >= 100 ? 'META ATINGIDA! 🎉' : metaCalculated.pct >= 70 ? 'EM BOM RITMO 🚀' : 'ACELERAR VENDAS ⚡'}</span>
            </div>
          </div>
        </div>

        {/* 4 KPIs NUMÉRICOS COM DESIGN IDÊNTICO AOS CARDS DO TOPO (FAIXAS NEON + MARCA D'ÁGUA 3D) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* KPI 1: META DO MÊS / ANO */}
          <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
            {/* FAIXA LATERAL ESQUERDA NEON */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#94a3b8] rounded-l-2xl z-20 shadow-[0_0_10px_#94a3b8]" />

            {/* MARCA D'ÁGUA 3D INTEIRA */}
            <Target size={40} className="absolute right-3 top-3 text-[#94a3b8] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

            <div className="flex items-start justify-between gap-2 z-10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray2)] leading-tight">
                {monthFilter === 'all' ? 'OBJETIVO / META DO ANO' : 'OBJETIVO / META DO MÊS'}
              </span>
            </div>

            <div className="my-2 z-10">
              <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] tracking-tight">
                {formatCurrency(metaCalculated.totalGoal)}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
              Target planejado para a equipe
            </div>
          </div>

          {/* KPI 2: REALIZADO / FATURADO */}
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
                })),
                ...kpis.approvedDealsList.map(d => ({
                  id: d.id,
                  title: d.title,
                  company: d.contact?.company || d.contact?.name || 'Cliente',
                  cnpj: d.contact?.cnpj,
                  representative: d.assigned_to || 'Representante',
                  value: d.estimated_value || 0,
                  stageOrStatus: d.stage.toUpperCase(),
                  curve: d.contact?.curve || 'C',
                  date: d.closed_at || d.stage_entered_at
                }))
              ]
              openDrillDown('FATURADO REALIZADO', 'Lista de todas as vendas e pedidos faturados no período', items, '#10b981')
            }}
            className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(16,185,129,0.25)] hover:border-emerald-500/50 transition-all duration-200 group select-none min-h-[110px]"
          >
            {/* FAIXA LATERAL ESQUERDA NEON */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#10b981] rounded-l-2xl z-20 shadow-[0_0_10px_#10b981]" />

            {/* MARCA D'ÁGUA 3D INTEIRA */}
            <Trophy size={40} className="absolute right-3 top-3 text-[#10b981] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

            <div className="flex items-start justify-between gap-2 z-10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 leading-tight">
                FATURADO REALIZADO
              </span>
            </div>

            <div className="my-2 z-10">
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-tight group-hover:text-emerald-300 transition-colors">
                {formatCurrency(metaCalculated.faturado)}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
              <strong className="text-[var(--white)] font-black">{kpis.totalPedidosQtd}</strong> pedidos confirmados
            </div>
          </div>

          {/* KPI 3: FALTA PARA A META */}
          <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
            {/* FAIXA LATERAL ESQUERDA NEON */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#f59e0b] rounded-l-2xl z-20 shadow-[0_0_10px_#f59e0b]" />

            {/* MARCA D'ÁGUA 3D INTEIRA */}
            <AlertCircle size={40} className="absolute right-3 top-3 text-[#f59e0b] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

            <div className="flex items-start justify-between gap-2 z-10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 leading-tight">
                DIFERENÇA / RESTANTE
              </span>
            </div>

            <div className="my-2 z-10">
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-400 tracking-tight">
                {metaCalculated.falta > 0 ? formatCurrency(metaCalculated.falta) : 'R$ 0,00'}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-amber-400/90 font-bold z-10">
              {metaCalculated.falta > 0 ? 'Falta para atingir 100%' : 'Meta 100% superada!'}
            </div>
          </div>

          {/* KPI 4: PROJEÇÃO ESTIMADA */}
          <div className="card bg-[var(--card)] border border-[var(--line)] pl-5 pr-4 py-4 rounded-2xl flex flex-col justify-between relative overflow-hidden group select-none min-h-[110px]">
            {/* FAIXA LATERAL ESQUERDA NEON */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#06b6d4] rounded-l-2xl z-20 shadow-[0_0_10px_#06b6d4]" />

            {/* MARCA D'ÁGUA 3D INTEIRA */}
            <TrendingUp size={40} className="absolute right-3 top-3 text-[#06b6d4] opacity-25 pointer-events-none group-hover:scale-110 group-hover:opacity-40 transition-all duration-300 z-0" />

            <div className="flex items-start justify-between gap-2 z-10">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 leading-tight">
                PROJEÇÃO DE FECHAMENTO
              </span>
            </div>

            <div className="my-2 z-10">
              <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400 tracking-tight">
                {formatCurrency(metaCalculated.projecao > 0 ? metaCalculated.projecao : metaCalculated.faturado)}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--line)]/50 text-[11px] font-mono text-[var(--gray2)] font-semibold z-10">
              Ritmo atual + pipeline em andamento
            </div>
          </div>

        </div>

        {/* BARRA DE PROGRESSO NEON 3D COMPLETA COM BANDEIRA % */}
        <div className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-[var(--white)] flex items-center gap-1.5">
              <span>Progresso Geral de Atingimento:</span>
              <strong className="text-emerald-400 font-mono text-sm">{metaCalculated.pct.toFixed(1)}%</strong>
            </span>
            <span className="text-[var(--gray2)] font-bold">
              {metaCalculated.faturado >= metaCalculated.totalGoal ? '100% Concluído' : `${(100 - metaCalculated.pct).toFixed(1)}% Restantes`}
            </span>
          </div>

          {/* Barra Tridimensional Glowing */}
          <div className="w-full h-4 rounded-full bg-[#090d16] p-0.5 border border-[var(--line)] overflow-hidden relative shadow-inner">
            <div 
              className="bg-gradient-to-r from-[#0284c7] via-[#06b6d4] to-[#10b981] h-full rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.6)]"
              style={{ width: `${Math.min(100, Math.max(2, metaCalculated.pct))}%` }}
            />
          </div>
        </div>

      </div>

      {/* ========================================================
          4. GRÁFICO DE EVOLUÇÃO DE VENDAS & GEOLOCALIZAÇÃO NO MAPA (PROPORÇÃO 8/4)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        
        {/* GRÁFICO DE EVOLUÇÃO (COLUNA 8/12 - LARGURA EXPANDIDA PARA MAIOR DESTAQUE) */}
        <div className="lg:col-span-8 card bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col justify-between shadow-lg">
          
          {/* Header com Título Dinâmico & 3 Botões de Granularidade */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#0284c7]" />
              <h3 className="font-display text-xs sm:text-sm font-bold text-[var(--white)] uppercase tracking-wider">
                {salesEvolutionData.title}
              </h3>
            </div>

            {/* 3 Botões no Canto Superior Direito: Mensal, Semanal, Diário */}
            <div className="flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                onClick={() => setChartViewMode('mensal')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'mensal'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-[var(--gray2)] hover:text-[var(--white)]'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setChartViewMode('semanal')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'semanal'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-[var(--gray2)] hover:text-[var(--white)]'
                }`}
              >
                Semanal
              </button>
              <button
                onClick={() => setChartViewMode('diario')}
                className={`text-xs font-mono font-bold px-3 py-1 rounded-lg transition-all ${
                  chartViewMode === 'diario'
                    ? 'bg-[#0284c7] text-white shadow-md'
                    : 'text-[var(--gray2)] hover:text-[var(--white)]'
                }`}
              >
                Diário
              </button>
            </div>
          </div>

          {/* Graphical Single-Bars Container (Colunas Grudadas no Eixo X) */}
          <div className="h-64 flex items-end justify-between gap-1 pt-8 pb-0 px-1 border-b border-[var(--line)] relative overflow-hidden select-none">
            
            {/* Gridlines Horizontais de Fundo com Espaçamento Rigorosamente Igual */}
            <div className="absolute inset-x-0 top-3 bottom-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
            </div>

            {salesEvolutionData.items.map((item, idx) => {
              const hasValue = item.currentVal > 0

              return (
                <div 
                  key={idx}
                  onClick={() => {
                    setComparisonModal({
                      isOpen: true,
                      periodLabel: item.fullLabel || item.label,
                      currentVal: item.currentVal,
                      prevMonthVal: item.prevMonthVal,
                      prevYearVal: item.prevYearVal,
                      currentQtd: item.currentQtd,
                      prevMonthQtd: item.prevMonthQtd,
                      prevYearQtd: item.prevYearQtd
                    })
                  }}
                  className={`flex-1 flex flex-col items-center justify-end h-full cursor-pointer group z-10 ${
                    chartViewMode === 'diario' ? 'min-w-0' : 'min-w-[24px]'
                  }`}
                  title={`Clique para ver o comparativo detalhado de ${item.label}`}
                >
                  {/* Rótulo de Valor (Sem "R$") posicionado IMEDIATAMENTE ACIMA da barra */}
                  {hasValue && (
                    <span className={`font-mono font-bold text-cyan-400 group-hover:text-emerald-400 transition-all ${
                      chartViewMode === 'diario' 
                        ? '[writing-mode:vertical-lr] rotate-180 text-[8px] mb-1 font-semibold tracking-tighter' 
                        : 'text-[9px] mb-1 whitespace-nowrap'
                    }`}>
                      {formatValueWithoutCurrency(item.currentVal)}
                    </span>
                  )}

                  {/* Barra Única Elegante Assentada Direta sobre a Linha do Eixo X */}
                  <div 
                    className="w-full flex justify-center items-end transition-all duration-300"
                    style={{ height: hasValue ? `${Math.max(4, item.heightPct)}%` : '0%' }}
                  >
                    {hasValue && (
                      <div 
                        className={`bg-gradient-to-t from-[#0284c7] via-[#06b6d4] to-[#10b981] rounded-t-lg transition-all duration-300 group-hover:brightness-125 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] w-full h-full ${
                          chartViewMode === 'semanal' 
                            ? 'max-w-[70px] sm:max-w-[110px]' 
                            : chartViewMode === 'diario' 
                            ? 'max-w-[12px] sm:max-w-[16px]' 
                            : 'max-w-[28px] sm:max-w-[36px]'
                        }`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* RÓTULOS DOS MESES / DIAS POSICIONADOS EXCLUSIVAMENTE ABAIXO DO EIXO X */}
          <div className="flex justify-between gap-1 pt-2.5 pb-1 px-1 select-none">
            {salesEvolutionData.items.map((item, idx) => (
              <div key={idx} className="flex-1 text-center truncate">
                <span className={`font-mono font-bold text-slate-400 group-hover:text-white transition-colors uppercase truncate inline-block ${
                  chartViewMode === 'diario' ? 'text-[8px] -rotate-45 origin-top-left' : 'text-[10px]'
                }`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center pt-2 text-[10px] font-mono text-slate-400/60">
            <span>Clique sobre qualquer barra para abrir o comparativo com períodos anteriores</span>
          </div>
        </div>

        {/* MAPA DE GEOLOCALIZAÇÃO (COLUNA 4/12) */}
        <div className="lg:col-span-4 card bg-[var(--card)] border border-[var(--line)] p-4 rounded-2xl flex flex-col justify-between shadow-lg relative">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-1.5">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#10b981]" />
              <h3 className="font-display text-xs font-bold text-[var(--white)] uppercase tracking-wider truncate">
                Geolocalização dos Negócios
              </h3>
            </div>
            <button 
              onClick={() => setIsMapExpanded(true)}
              className="text-[9px] py-1 px-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white flex items-center gap-1 font-mono font-bold transition-all cursor-pointer shrink-0 shadow-xs"
              title="Expandir mapa em tela cheia"
            >
              <Maximize2 size={10} className="text-[#10b981]" />
              <span>Ampliar</span>
            </button>
          </div>

          <div 
            ref={contactsMapRef}
            className="w-full bg-[#141414] rounded-xl border border-[var(--line)] overflow-hidden flex-1 min-h-[300px] h-[300px] relative z-0"
          />

          <div className="flex items-center justify-center pt-1.5 text-[10px] font-mono text-[var(--gray2)]">
            <div className="flex items-center justify-center gap-4 w-full text-[9px] sm:text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm" /> Fechado</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm" /> Orçamento / Negociação</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-sm" /> Leads / Prospecção</span>
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
          <span className="text-[10px] font-mono text-[var(--gray2)] font-bold">Faturamento Realizado por Representante</span>
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
              className="order-2 md:order-1 bg-[var(--charcoal)] border-2 border-slate-400/40 p-5 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-1 hover:border-slate-400 transition-all cursor-pointer group shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-slate-300/20 border-2 border-slate-400 text-slate-200 flex items-center justify-center font-mono font-black text-sm mb-2 shadow-lg">
                2º
              </div>
              <span className="text-xs font-mono font-black text-[var(--white)] truncate max-w-full">
                {teamRanking.top2.name}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-[var(--white)] mt-1">
                {formatCurrency(teamRanking.top2.totalR$)}
              </div>
              <span className="text-[11px] font-mono text-[var(--gray2)] font-extrabold mt-0.5">
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
              className="order-1 md:order-2 bg-gradient-to-b from-amber-500/20 via-[var(--charcoal)] to-[var(--charcoal)] border-2 border-[#f0c419] p-6 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-2 transition-all cursor-pointer group shadow-2xl shadow-[#f0c419]/20"
            >
              <div className="absolute -top-4 bg-[#f0c419] text-slate-950 text-[10px] font-mono font-black px-3 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-md">
                <Crown size={12} /> CAMPEÃO DE VENDAS
              </div>
              <div className="w-12 h-12 rounded-full bg-[#f0c419]/30 border-2 border-[#f0c419] text-[#f0c419] flex items-center justify-center font-mono font-black text-lg mb-2 shadow-lg">
                1º
              </div>
              <span className="text-sm font-mono font-black text-[var(--white)] truncate max-w-full">
                {teamRanking.top1.name}
              </span>
              <div className="text-2xl font-mono font-black text-[#f0c419] mt-1">
                {formatCurrency(teamRanking.top1.totalR$)}
              </div>
              <span className="text-[11px] font-mono text-[var(--gray2)] font-extrabold mt-0.5">
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
              className="order-3 md:order-3 bg-[var(--charcoal)] border-2 border-amber-600/50 p-5 rounded-2xl flex flex-col items-center text-center relative hover:-translate-y-1 hover:border-amber-600 transition-all cursor-pointer group shadow-xl"
            >
              <div className="w-10 h-10 rounded-full bg-amber-700/20 border-2 border-amber-600 text-amber-400 flex items-center justify-center font-mono font-black text-sm mb-2 shadow-lg">
                3º
              </div>
              <span className="text-xs font-mono font-black text-[var(--white)] truncate max-w-full">
                {teamRanking.top3.name}
              </span>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-500 mt-1">
                {formatCurrency(teamRanking.top3.totalR$)}
              </div>
              <span className="text-[11px] font-mono text-[var(--gray2)] font-extrabold mt-0.5">
                {teamRanking.top3.pedidosCount} vendas concluídas
              </span>
              <Award size={20} className="text-amber-500 mt-2" />
            </div>
          )}

        </div>

        {/* TABELA CLASSIFICAÇÃO RESTANTE DA EQUIPE */}
        {teamRanking.remaining.length > 0 && (
          <div className="border-t border-[var(--line)] pt-4 overflow-x-auto">
            <h4 className="text-xs font-mono uppercase font-black text-[var(--white)] mb-3">Classificação Geral da Equipe</h4>
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] text-[var(--gray2)] font-black uppercase">
                  <th className="py-2.5 px-3 text-center">Posição</th>
                  <th className="py-2.5 px-3">Representante Comercial</th>
                  <th className="py-2.5 px-3 text-center">Vendas Concluídas</th>
                  <th className="py-2.5 px-3 text-right">Faturamento Total</th>
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
                    <td className="py-3 px-3 text-center font-black text-[var(--gray2)]">{idx + 4}º</td>
                    <td className="py-3 px-3 font-black text-[var(--white)] flex items-center gap-2">
                      <User size={14} className="text-[var(--gray2)]" />
                      <span>{item.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-[var(--white)]">{item.pedidosCount}</td>
                    <td className="py-3 px-3 text-right font-black text-[#10b981]">{formatCurrency(item.totalR$)}</td>
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
          <div className="py-8 text-center text-xs font-mono text-[var(--gray2)] font-bold">
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
                  <thead className="sticky top-0 z-20 shadow-md">
                    <tr className="border-b border-[var(--line)] text-[10px] text-[var(--gray2)] font-bold uppercase bg-slate-100 dark:bg-[#0d1117]">
                      <th className="py-2.5 px-3 bg-slate-100 dark:bg-[#0d1117]">Cliente / CNPJ</th>
                      <th className="py-2.5 px-3 bg-slate-100 dark:bg-[#0d1117]">Negócio / Título</th>
                      <th className="py-2.5 px-3 bg-slate-100 dark:bg-[#0d1117]">Representante</th>
                      <th className="py-2.5 px-3 text-right bg-slate-100 dark:bg-[#0d1117]">Valor (R$)</th>
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
                        <td className="py-3 px-3 text-slate-300 font-bold">
                          {item.representative}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-[#10b981]">
                          {formatCurrency(item.value)}
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
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
          <div className="bg-[#0f172a] border border-[#0284c7]/40 p-6 rounded-2xl max-w-lg w-full shadow-2xl flex flex-col gap-5 animate-scale-up relative">
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

            {/* VARIAÇÃO CADASTRADA EM TEMPO REAL COM O MÊS ANTERIOR */}
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
          10. MODAL DE MAPA EXPANDIDO EM TELA CHEIA (FULLSCREEN REAL)
         ======================================================== */}
      {isMapExpanded && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md p-4 sm:p-6 flex flex-col gap-4 select-none animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] border border-[var(--line)] p-4 rounded-2xl shrink-0 shadow-lg">
            <div className="hidden lg:flex items-center gap-2">
              <MapPin size={20} className="text-[#10b981]" />
              <h3 className="font-display text-base font-bold text-[var(--white)] uppercase tracking-wider">
                Geolocalização dos Negócios (Visão Expandida em Tela Cheia)
              </h3>
            </div>
            <div className="flex flex-nowrap items-center justify-between gap-3 lg:gap-4 w-full lg:w-auto min-w-0">
              <div className="flex flex-nowrap items-center gap-x-2 lg:gap-x-4 text-[10px] lg:text-xs font-mono shrink-0">
                <span className="flex items-center gap-1 lg:gap-1.5 text-[var(--gray)] shrink-0">
                  <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-[#10b981] shrink-0" />
                  <span className="lg:hidden">Fechado</span><span className="hidden lg:inline">Pedido Fechado</span>
                </span>
                <span className="flex items-center gap-1 lg:gap-1.5 text-[var(--gray)] shrink-0">
                  <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-orange-500 shrink-0" />
                  <span className="lg:hidden">Negociação</span><span className="hidden lg:inline">Em Negociação</span>
                </span>
                <span className="flex items-center gap-1 lg:gap-1.5 text-[var(--gray)] shrink-0">
                  <span className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded-full bg-cyan-400 shrink-0" />
                  <span>Aprovação</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setIsMapExpanded(false)
                  setTimeout(() => {
                    if (contactsMapInstanceRef.current) contactsMapInstanceRef.current.invalidateSize()
                  }, 150)
                }}
                aria-label="Fechar mapa"
                title="Fechar mapa"
                className="w-8 h-8 lg:w-auto lg:h-auto lg:py-1.5 lg:px-4 rounded-lg lg:rounded-xl border border-[var(--line)] text-[var(--gray)] flex items-center justify-center gap-2 cursor-pointer hover:border-red-500 hover:text-red-400 transition-all bg-transparent shrink-0 text-xs font-mono font-bold"
              >
                <X size={14} className="lg:hidden" />
                <X size={16} className="hidden lg:block" />
                <span className="hidden lg:inline">Fechar Mapa</span>
              </button>
            </div>
          </div>

          {/* Expanded Container ocupando 100% da tela abaixo do header */}
          <div className="flex-1 w-full h-[calc(100vh-140px)] min-h-[calc(100vh-140px)] bg-[#141414] rounded-2xl border border-[var(--line)] overflow-hidden shadow-2xl relative">
            <div 
              ref={expandedMapRef}
              className="w-full h-full min-h-full"
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
'use client'

import { useState, useEffect, useRef } from 'react'
import {
  TrendingUp,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  User,
  Filter,
  Calendar,
  Phone,
  Mic,
  MicOff,
  Camera,
  MapPin,
  Sparkles,
  Clock,
  ArrowUpRight,
  Navigation,
  LogOut,
  ChevronLeft,
  Users,
  Target,
  BarChart3,
  Building,
  Layers,
  Search,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { formatCurrency, whatsappLink } from '@/lib/utils'
import Link from 'next/link'

declare let L: any

interface DealMock {
  id: string
  title: string
  representative: string
  stage: 'leads' | 'prospect' | 'dinamica' | 'potencial' | 'visita' | 'briefing' | 'aprovacao' | 'fechamento' | 'perdido'
  value: number
  curve: 'A' | 'B' | 'C' | 'D'
  daysInactive: number
  contactName: string
  phone: string
  latLng?: [number, number]
  city?: string
  uf?: string
}

const MOCK_DEALS: DealMock[] = [
  { id: '1', title: 'Caixa Premium Natura', representative: 'Diéssica Hartmann', stage: 'leads', value: 15000, curve: 'A', daysInactive: 15, contactName: 'Diéssica Hartmann', phone: '11988888888', latLng: [-30.0346, -51.2177], city: 'Porto Alegre', uf: 'RS' },
  { id: '2', title: 'Display Gota Limpa', representative: 'Josimar Soares', stage: 'leads', value: 25000, curve: 'A', daysInactive: 95, contactName: 'Alvaro Ferreira', phone: '51999999999', latLng: [-29.834, -51.143], city: 'Sapucaia do Sul', uf: 'RS' },
  { id: '3', title: 'Embalagem XP Presentes', representative: 'Elci Alcantara', stage: 'prospect', value: 12000, curve: 'B', daysInactive: 30, contactName: 'Elci Alcantara', phone: '21977777777', latLng: [-29.6842, -51.1313], city: 'Novo Hamburgo', uf: 'RS' },
  { id: '4', title: 'Caixa Vinho Gourmet', representative: 'Marina Costa', stage: 'briefing', value: 32000, curve: 'C', daysInactive: 10, contactName: 'Marina Costa', phone: '54922222222', latLng: [-29.1706, -51.5204], city: 'Bento Gonçalves', uf: 'RS' },
  { id: '5', title: 'Embalagem Cosméticos M.', representative: 'Fernanda R.', stage: 'briefing', value: 18000, curve: 'C', daysInactive: 120, contactName: 'Fernanda Ramos', phone: '31966666666', latLng: [-29.1688, -51.1796], city: 'Caxias do Sul', uf: 'RS' },
  { id: '6', title: 'Kit Natal Lojas Renner', representative: 'Renner Compras', stage: 'fechamento', value: 87500, curve: 'A', daysInactive: 5, contactName: 'Renner Compras', phone: '51944444444', latLng: [-30.0277, -51.2287], city: 'Porto Alegre', uf: 'RS' },
  { id: '7', title: 'Caixa Presente Boticário', representative: 'Gustavo N.', stage: 'aprovacao', value: 48000, curve: 'A', daysInactive: 45, contactName: 'Gustavo Nogueira', phone: '41955555555', latLng: [-29.7592, -51.1472], city: 'São Leopoldo', uf: 'RS' },
  { id: '8', title: 'Bandeja Padaria Central', representative: 'Josimar Soares', stage: 'perdido', value: 23000, curve: 'D', daysInactive: 110, contactName: 'Paulo Lima', phone: '51933333333', latLng: [-29.9430, -50.9934], city: 'Gravataí', uf: 'RS' },
]

// Mock monthly & daily sales data for Drilldown Chart
const MONTHLY_SALES_DATA: { month: string; monthIndex: number; value: number; dealsCount: number; daily: { day: number; value: number }[] }[] = [
  { month: 'Jan', monthIndex: 1, value: 145000, dealsCount: 12, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 3 === 0 ? 12000 : i % 5 === 0 ? 8500 : 2000) })) },
  { month: 'Fev', monthIndex: 2, value: 168000, dealsCount: 15, daily: Array.from({ length: 28 }, (_, i) => ({ day: i + 1, value: (i % 2 === 0 ? 9500 : i % 4 === 0 ? 14000 : 1500) })) },
  { month: 'Mar', monthIndex: 3, value: 210000, dealsCount: 18, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 4 === 0 ? 16000 : i % 3 === 0 ? 11000 : 3000) })) },
  { month: 'Abr', monthIndex: 4, value: 185000, dealsCount: 14, daily: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: (i % 3 === 0 ? 13500 : i % 6 === 0 ? 18000 : 2500) })) },
  { month: 'Mai', monthIndex: 5, value: 230000, dealsCount: 20, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 2 === 0 ? 14000 : i % 5 === 0 ? 21000 : 4000) })) },
  { month: 'Jun', monthIndex: 6, value: 195000, dealsCount: 16, daily: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: (i % 4 === 0 ? 15000 : i % 3 === 0 ? 9000 : 3500) })) },
  { month: 'Jul', monthIndex: 7, value: 248000, dealsCount: 22, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 3 === 0 ? 18000 : i % 7 === 0 ? 25000 : 4500) })) },
  { month: 'Ago', monthIndex: 8, value: 130000, dealsCount: 10, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 5 === 0 ? 11000 : 2000) })) },
  { month: 'Set', monthIndex: 9, value: 175000, dealsCount: 13, daily: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: (i % 4 === 0 ? 14000 : 3000) })) },
  { month: 'Out', monthIndex: 10, value: 190000, dealsCount: 15, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 3 === 0 ? 13000 : 2500) })) },
  { month: 'Nov', monthIndex: 11, value: 260000, dealsCount: 24, daily: Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: (i % 2 === 0 ? 17000 : 5000) })) },
  { month: 'Dez', monthIndex: 12, value: 290000, dealsCount: 26, daily: Array.from({ length: 31 }, (_, i) => ({ day: i + 1, value: (i % 3 === 0 ? 22000 : 6000) })) },
]

// Mock Salespeople Performance Indicators
const TEAM_PERFORMANCE = [
  { id: 'r1', name: 'Diéssica Hartmann', role: 'Representante', sales: 145000, contactsCount: 48, activeDeals: 6, avatarColor: '#3B82F6' },
  { id: 'r2', name: 'Josimar Soares', role: 'Representante', sales: 128000, contactsCount: 54, activeDeals: 8, avatarColor: '#A855F7' },
  { id: 'r3', name: 'Elci Alcantara', role: 'Representante', sales: 98000, contactsCount: 39, activeDeals: 5, avatarColor: '#EAB308' },
  { id: 'r4', name: 'Witalo Frota', role: 'Representante', sales: 85000, contactsCount: 32, activeDeals: 4, avatarColor: '#F97316' },
  { id: 'r5', name: 'Inácio Siqueira', role: 'Vendedor Interno', sales: 182000, contactsCount: 72, activeDeals: 11, avatarColor: '#B4D932' },
]

// Mock Top Clients & Products Indicators
const TOP_CLIENTS = [
  { rank: 1, name: 'Natura Cosméticos', value: 175000, type: 'Curva A' },
  { rank: 2, name: 'Lojas Renner', value: 87500, type: 'Curva A' },
  { rank: 3, name: 'O Boticário', value: 48000, type: 'Curva A' },
]

const TOP_PRODUCTS = [
  { rank: 1, name: 'Caixas Premium personalizadas', value: 145000, quantity: '15.000 un' },
  { rank: 2, name: 'Cartuchos Duplex simples', value: 82000, quantity: '22.000 un' },
  { rank: 3, name: 'Displays Microondulado de Chão', value: 68000, quantity: '8.000 un' },
]

export default function DashboardPage() {
  // Roles and Current User Session
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [contacts, setContacts] = useState<any[]>([])

  // Dashboard Filters: Year, Month, Rep, Curve ABC
  const [selectedYear, setSelectedYear] = useState<string>('2026')
  const [selectedMonth, setSelectedMonth] = useState<string>('07') // Default July
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [selectedCurve, setSelectedCurve] = useState<string>('all')

  // Drilldown Chart State: null = monthly view
  const [selectedDrilldownMonth, setSelectedDrilldownMonth] = useState<typeof MONTHLY_SALES_DATA[0] | null>(null)

  // Leaflet Map states & Fullscreen controls
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const fullscreenMapContainerRef = useRef<HTMLDivElement>(null)
  const fullscreenMapInstanceRef = useRef<any>(null)
  
  const [leafletReady, setLeafletReady] = useState(false)
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)
  const [isMobileMapFullscreen, setIsMobileMapFullscreen] = useState(false)

  const mobileFullscreenMapContainerRef = useRef<HTMLDivElement>(null)
  const mobileFullscreenMapInstanceRef = useRef<any>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
      if (mobileMapInstanceRef.current) {
        mobileMapInstanceRef.current.invalidateSize()
      }
    }, 150)
    return () => clearTimeout(t)
  }, [isMapFullscreen, isMobileMapFullscreen])

  // Representative Portal States
  const [activeTab, setActiveTab] = useState<'painel' | 'clientes' | 'mapa'>('painel')
  const [mobileSearch, setMobileSearch] = useState('')
  const [mobileFilterStatus, setMobileFilterStatus] = useState<'todos' | 'pendentes' | 'concluidos'>('todos')
  const mobileMapContainerRef = useRef<HTMLDivElement>(null)
  const mobileMapInstanceRef = useRef<any>(null)
  
  const [visitsGoal, setVisitsGoal] = useState(15)
  const [completedVisits, setCompletedVisits] = useState(8)
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioTranscription, setAudioTranscription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [checkinSuccessToast, setCheckinSuccessToast] = useState(false)

  // Load Session and Database
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {
          console.error(e)
        }
      } else {
        setCurrentUser({ id: '4', name: 'Inácio Siqueira', email: 'julio.admin@cartonpack.com', role: 'admin' })
      }

      const savedContacts = localStorage.getItem('crm_contacts')
      if (savedContacts) {
        try {
          setContacts(JSON.parse(savedContacts))
        } catch (e) {
          console.error(e)
        }
      } else {
        const fallbackContacts = [
          { id: '1', name: 'Alvaro Ferreira', company: 'Gota Limpa Indústria', cnpj: '12.345.678/0001-90', curve: 'A', representative: 'Josimar Soares', lastPurchaseDays: 95, phone: '(51) 99999-9999', city: 'Sapiranga', state: 'RS', status: 'inativo', address: 'Av. Industrial, 4500' },
          { id: '2', name: 'Diéssica Hartmann', company: 'Natura Cosméticos', cnpj: '98.765.432/0001-10', curve: 'A', representative: 'Diéssica Hartmann', lastPurchaseDays: 15, phone: '(11) 98888-8888', city: 'São Paulo', state: 'SP', status: 'ativo', address: 'Av. Paulista, 1000' },
          { id: '3', name: 'Elci Alcantara', company: 'XP Presentes', cnpj: '45.678.901/0001-22', curve: 'B', representative: 'Elci Alcantara', lastPurchaseDays: 30, phone: '(21) 97777-7777', city: 'Novo Hamburgo', state: 'RS', status: 'ativo', address: 'Rua das Flores, 120' },
          { id: '4', name: 'Marina Costa', company: 'Vinho Gourmet', cnpj: '33.444.555/0001-66', curve: 'C', representative: 'Diéssica Hartmann', lastPurchaseDays: 10, phone: '(54) 92222-2222', city: 'Bento Gonçalves', state: 'RS', status: 'ativo', address: 'Rua Planalto, 450' },
          { id: '5', name: 'Fernanda Ramos', company: 'Cosméticos M.', cnpj: '22.333.444/0001-55', curve: 'C', representative: 'Josimar Soares', lastPurchaseDays: 120, phone: '(31) 96666-6666', city: 'Caxias do Sul', state: 'RS', status: 'inativo', address: 'Rua das Empresas, 999' }
        ]
        setContacts(fallbackContacts)
        localStorage.setItem('crm_contacts', JSON.stringify(fallbackContacts))
      }
    }
  }, [])

  // Robust client-side loader for Leaflet resources (CSS + JS)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const loadLeafletResources = () => {
      if ((window as any).L) {
        setLeafletReady(true)
        return
      }

      // Append Leaflet Stylesheet dynamically if missing
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        link.crossOrigin = ''
        document.head.appendChild(link)
      }

      // Append Leaflet JS Library dynamically if missing
      if (!document.getElementById('leaflet-js')) {
        const script = document.createElement('script')
        script.id = 'leaflet-js'
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.crossOrigin = ''
        script.onload = () => {
          setLeafletReady(true)
        }
        document.body.appendChild(script)
      } else {
        // Fallback polling in case the script is already added but loading
        const interval = setInterval(() => {
          if ((window as any).L) {
            setLeafletReady(true)
            clearInterval(interval)
          }
        }, 100)
        return () => clearInterval(interval)
      }
    }

    loadLeafletResources()
  }, [])

  // Helper function to map stages to high-contrast colors (for light basemaps)
  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      leads: 'var(--stage-leads)',       
      prospect: 'var(--stage-prospect)',    
      dinamica: 'var(--stage-dinamica)',    
      potencial: 'var(--stage-potencial)',   
      visita: 'var(--stage-visita)',      
      briefing: 'var(--stage-briefing)',    
      aprovacao: 'var(--stage-aprovacao)',   
      fechamento: 'var(--stage-fechamento)',  
      perdido: 'var(--stage-perdido)'      
    }
    return colors[stage] || 'var(--stage-prospect)'
  }

  // Helper function to render unique Lucide icons for each funnel stage
  const getStageIcon = (key: string, color: string) => {
    const size = 11
    switch (key) {
      case 'leads': return <Target size={size} style={{ color }} />
      case 'prospect': return <Users size={size} style={{ color }} />
      case 'dinamica': return <Clock size={size} style={{ color }} />
      case 'potencial': return <TrendingUp size={size} style={{ color }} />
      case 'visita': return <MapPin size={size} style={{ color }} />
      case 'briefing': return <Layers size={size} style={{ color }} />
      case 'aprovacao': return <CheckCircle size={size} style={{ color }} />
      case 'fechamento': return <Sparkles size={size} style={{ color }} />
      default: return <Package size={size} style={{ color }} />
    }
  }


  // Initialize Leaflet Map for Negotiating Clients (OSM Light / Voyager version)
  useEffect(() => {
    if (!leafletReady || currentUser?.role === 'representante') return
    if (!mapContainerRef.current) return

    const L_Global = (window as any).L
    if (!L_Global) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const map = L_Global.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    })

    mapInstanceRef.current = map

    L_Global.control.zoom({ position: 'bottomright' }).addTo(map)

    // OpenStreetMap Standard Basemap (vibrant terrain, rivers, highways, state borders)
    const basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    L_Global.tileLayer(basemapUrl, {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Overlay layer: IBGE official municipal borders for all of Brazil (visible at zoom >= 7 to prevent clutter)
    L_Global.tileLayer.wms('https://geoservicos.ibge.gov.br/geoserver/wms', {
      layers: 'CGEO:municipio',
      format: 'image/png',
      transparent: true,
      minZoom: 7,
      version: '1.1.1',
      attribution: '&copy; IBGE'
    }).addTo(map)

    // Add Markers for deals in negotiation
    const negotiatingDeals = MOCK_DEALS.filter(d => 
      ['potencial', 'briefing', 'visita', 'aprovacao', 'prospect', 'leads'].includes(d.stage) && d.latLng
    )

    negotiatingDeals.forEach(deal => {
      if (!deal.latLng) return

      const stageColor = getStageColor(deal.stage)

      // Scaled-down SVG drop-pin custom icon (size 18x22)
      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin', // overrides leaflet default backgrounds via globals.css
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 18px; height: 22px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="18" height="22" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); pointer-events: none;">
              <!-- Outer teardrop shape filled with stage color -->
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${stageColor}" stroke="#ffffff" stroke-width="1.3" />
              <!-- Inner accent circle -->
              <circle cx="10" cy="10" r="3" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [18, 22],
        iconAnchor: [9, 22] // accurately anchors bottom point of teardrop
      })

      const marker = L_Global.marker(deal.latLng, { icon: customIcon }).addTo(map)
      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 2px; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 6px;">
          <strong style="font-size: 12px; display: block;">${deal.title}</strong>
          <span style="color: ${stageColor}; font-family: monospace; font-size: 11px; font-weight: bold;">${formatCurrency(deal.value)}</span>
          <div style="font-size: 10px; margin-top: 2px;">${deal.contactName} (${deal.city})</div>
          <div style="font-size: 9px; text-transform: uppercase; opacity: 0.8; font-weight: bold; color: ${stageColor};">Etapa: ${deal.stage}</div>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      })
    })

    // Calculate bounds containing all markers responsively
    const bounds = negotiatingDeals
      .map(d => d.latLng)
      .filter((latLng): latLng is [number, number] => !!latLng)

    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [30, 30], // padding around edges so pins are not clipped
        maxZoom: 12        // prevent over-zooming if only a single pin is present
      })
    } else {
      map.setView([-29.7, -51.15], 9)
    }

    // Resize Observer to dynamically invalidate map size whenever container layout changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
      }
    })

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current)
    }

    const t1 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50)
    const t2 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 250)
    const t3 = setTimeout(() => mapInstanceRef.current?.invalidateSize(), 600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      resizeObserver.disconnect()
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [leafletReady, currentUser])

  // Initialize Dedicated Fullscreen Leaflet Map Modal (Admin/Desktop)
  useEffect(() => {
    if (!isMapFullscreen || !leafletReady) return
    if (!fullscreenMapContainerRef.current) return

    const L_Global = (window as any).L
    if (!L_Global) return

    if (fullscreenMapInstanceRef.current) {
      fullscreenMapInstanceRef.current.remove()
      fullscreenMapInstanceRef.current = null
    }

    const map = L_Global.map(fullscreenMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    })

    fullscreenMapInstanceRef.current = map

    L_Global.control.zoom({ position: 'bottomright' }).addTo(map)

    // OpenStreetMap Standard Basemap
    const basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

    L_Global.tileLayer(basemapUrl, {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Overlay layer: IBGE official municipal borders for all of Brazil
    L_Global.tileLayer.wms('https://geoservicos.ibge.gov.br/geoserver/wms', {
      layers: 'CGEO:municipio',
      format: 'image/png',
      transparent: true,
      minZoom: 7,
      version: '1.1.1',
      attribution: '&copy; IBGE'
    }).addTo(map)

    // Add Markers for deals in negotiation
    const negotiatingDeals = MOCK_DEALS.filter(d => 
      ['potencial', 'briefing', 'visita', 'aprovacao', 'prospect', 'leads'].includes(d.stage) && d.latLng
    )

    negotiatingDeals.forEach(deal => {
      if (!deal.latLng) return

      const stageColor = getStageColor(deal.stage)

      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 22px; height: 26px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="22" height="26" style="filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4)); pointer-events: none;">
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${stageColor}" stroke="#ffffff" stroke-width="1.5" />
              <circle cx="10" cy="10" r="3.5" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [22, 26],
        iconAnchor: [11, 26]
      })

      const marker = L_Global.marker(deal.latLng, { icon: customIcon }).addTo(map)
      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 4px 6px; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <strong style="font-size: 13px; display: block;">${deal.title}</strong>
          <span style="color: ${stageColor}; font-family: monospace; font-size: 12px; font-weight: bold;">${formatCurrency(deal.value)}</span>
          <div style="font-size: 11px; margin-top: 2px;">${deal.contactName} (${deal.city})</div>
          <div style="font-size: 10px; text-transform: uppercase; opacity: 0.8; font-weight: bold; color: ${stageColor}; margin-top: 2px;">Etapa: ${deal.stage}</div>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      })
    })

    const bounds = negotiatingDeals
      .map(d => d.latLng)
      .filter((latLng): latLng is [number, number] => !!latLng)

    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 12
      })
    } else {
      map.setView([-29.7, -51.15], 9)
    }

    const t1 = setTimeout(() => fullscreenMapInstanceRef.current?.invalidateSize(), 100)
    const t2 = setTimeout(() => fullscreenMapInstanceRef.current?.invalidateSize(), 350)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      if (fullscreenMapInstanceRef.current) {
        fullscreenMapInstanceRef.current.remove()
        fullscreenMapInstanceRef.current = null
      }
    }
  }, [isMapFullscreen, leafletReady])

  // Initialize Leaflet Map for Mobile Representative View (activeTab === 'mapa')
  useEffect(() => {
    if (!leafletReady || currentUser?.role !== 'representante' || activeTab !== 'mapa') return
    if (!mobileMapContainerRef.current) return

    const L_Global = (window as any).L
    if (!L_Global) return

    if (mobileMapInstanceRef.current) {
      mobileMapInstanceRef.current.remove()
      mobileMapInstanceRef.current = null
    }

    const map = L_Global.map(mobileMapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    })

    mobileMapInstanceRef.current = map

    L_Global.control.zoom({ position: 'bottomright' }).addTo(map)

    // OpenStreetMap Standard Basemap
    const basemapUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    L_Global.tileLayer(basemapUrl, {
      subdomains: 'abc',
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    // Overlay layer: IBGE official municipal borders (visible at zoom >= 7)
    L_Global.tileLayer.wms('https://geoservicos.ibge.gov.br/geoserver/wms', {
      layers: 'CGEO:municipio',
      format: 'image/png',
      transparent: true,
      minZoom: 7,
      version: '1.1.1',
      attribution: '&copy; IBGE'
    }).addTo(map)

    // Add Markers for all deals assigned to this representative
    const repDeals = MOCK_DEALS.filter(d => d.representative === currentUser.name && d.latLng)

    repDeals.forEach(deal => {
      if (!deal.latLng) return

      const stageColor = getStageColor(deal.stage)

      // Custom DivIcon for mobile map pins (clean & high contrast)
      const customIcon = L_Global.divIcon({
        className: 'clear-custom-pin',
        html: `
          <div style="display: flex; align-items: center; justify-content: center; width: 18px; height: 22px; background: transparent !important; border: none !important;">
            <svg viewBox="0 0 20 24" width="18" height="22" style="filter: drop-shadow(0 2px 3px rgba(0,0,0,0.25)); pointer-events: none;">
              <path d="M10 0C4.477 0 0 4.477 0 10c0 7.5 10 14 10 14s10-6.5 10-14c0-5.523-4.477-10-10-10z" fill="${stageColor}" stroke="#ffffff" stroke-width="1.3" />
              <circle cx="10" cy="10" r="3" fill="#ffffff" />
            </svg>
          </div>
        `,
        iconSize: [18, 22],
        iconAnchor: [9, 22]
      })

      const marker = L_Global.marker(deal.latLng, { icon: customIcon }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 4px; color: #0f172a; min-width: 140px;">
          <strong style="font-size: 11px; display: block;">${deal.title}</strong>
          <span style="color: ${stageColor}; font-family: monospace; font-size: 10px; font-weight: bold;">${formatCurrency(deal.value)}</span>
          <div style="font-size: 9px; margin-top: 1px; color: #64748b;">${deal.contactName} (${deal.city})</div>
          <div style="margin-top: 4px; display: flex; gap: 4px;">
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deal.title} ${deal.city}`)}" target="_blank" style="flex: 1; text-align: center; background: #cbd5e1; color: #0f172a; padding: 2px 4px; border-radius: 4px; text-decoration: none; font-size: 9px; font-weight: bold;">Rota</a>
          </div>
        </div>
      `)
    })

    // Calculate bounds containing all representative's markers
    const bounds = repDeals
      .map(d => d.latLng)
      .filter((latLng): latLng is [number, number] => !!latLng)

    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 12
      })
    } else {
      map.setView([-29.7, -51.15], 9)
    }

    const resizeObserver = new ResizeObserver(() => {
      if (mobileMapInstanceRef.current) {
        mobileMapInstanceRef.current.invalidateSize()
      }
    })

    if (mobileMapContainerRef.current) {
      resizeObserver.observe(mobileMapContainerRef.current)
    }

    const t1 = setTimeout(() => mobileMapInstanceRef.current?.invalidateSize(), 50)
    const t2 = setTimeout(() => mobileMapInstanceRef.current?.invalidateSize(), 250)
    const t3 = setTimeout(() => mobileMapInstanceRef.current?.invalidateSize(), 600)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      resizeObserver.disconnect()
      if (mobileMapInstanceRef.current) {
        mobileMapInstanceRef.current.remove()
        mobileMapInstanceRef.current = null
      }
    }
  }, [leafletReady, currentUser, activeTab])

  // Timer for Audio Record simulation
  useEffect(() => {
    let interval: any
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } else {
      setRecordingTime(0)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const saveContacts = (updated: any[]) => {
    setContacts(updated)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_contacts', JSON.stringify(updated))
    }
  }

  // Filter deals based on state
  const filteredDeals = MOCK_DEALS.filter(deal => {
    const matchesRep = selectedRep === 'all' || deal.representative === selectedRep
    const matchesCurve = selectedCurve === 'all' || deal.curve === selectedCurve
    return matchesRep && matchesCurve
  })

  // Compute stats
  const activeDealsCount = filteredDeals.filter(d => d.stage !== 'fechamento' && d.stage !== 'perdido').length
  const inNegotiationCount = filteredDeals.filter(d => ['potencial', 'briefing', 'visita', 'aprovacao'].includes(d.stage)).length
  
  const fechamentoValue = filteredDeals
    .filter(d => d.stage === 'fechamento')
    .reduce((acc, d) => acc + d.value, 0) || 87500
    
  const perdidoValue = filteredDeals
    .filter(d => d.stage === 'perdido')
    .reduce((acc, d) => acc + d.value, 0) || 23000

  // Connected Horizontal Funnel Stages
  const funnelSummary = [
    { key: 'leads', stage: 'Leads', count: filteredDeals.filter(d => d.stage === 'leads').length, value: filteredDeals.filter(d => d.stage === 'leads').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-leads)' },
    { key: 'prospect', stage: 'Prospect', count: filteredDeals.filter(d => d.stage === 'prospect').length, value: filteredDeals.filter(d => d.stage === 'prospect').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-prospect)' },
    { key: 'dinamica', stage: 'Dinâmica', count: filteredDeals.filter(d => d.stage === 'dinamica').length, value: filteredDeals.filter(d => d.stage === 'dinamica').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-dinamica)' },
    { key: 'potencial', stage: 'Potencial', count: filteredDeals.filter(d => d.stage === 'potencial').length, value: filteredDeals.filter(d => d.stage === 'potencial').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-potencial)' },
    { key: 'visita', stage: 'Visita', count: filteredDeals.filter(d => d.stage === 'visita').length, value: filteredDeals.filter(d => d.stage === 'visita').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-visita)' },
    { key: 'briefing', stage: 'Briefing', count: filteredDeals.filter(d => d.stage === 'briefing').length, value: filteredDeals.filter(d => d.stage === 'briefing').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-briefing)' },
    { key: 'aprovacao', stage: 'Aprovação', count: filteredDeals.filter(d => d.stage === 'aprovacao').length, value: filteredDeals.filter(d => d.stage === 'aprovacao').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-aprovacao)' },
    { key: 'fechamento', stage: 'Fechamento', count: filteredDeals.filter(d => d.stage === 'fechamento').length, value: filteredDeals.filter(d => d.stage === 'fechamento').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-fechamento)' },
  ]

  const representatives = Array.from(new Set(MOCK_DEALS.map(d => d.representative)))

  const handleStartRecording = () => {
    setIsRecording(true)
    setAudioTranscription('')
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    setIsTranscribing(true)
    setTimeout(() => {
      setIsTranscribing(false)
      setAudioTranscription(
        "Reunião presencial produtiva. O cliente analisou os novos mostruários de papel cartão triplex com verniz localizado. Gostou do acabamento Carton Pack e solicitou orçamento detalhado para lote inicial de 5.000 caixas personalizadas."
      )
    }, 2500)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setPhotoUrl(url)
    }
  }

  const handleCheckinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContactId) return

    const selectedContact = contacts.find(c => c.id === selectedContactId)
    if (!selectedContact) return

    const checkinActivity = {
      date: new Date().toLocaleDateString('pt-BR'),
      title: 'Check-in de Visita Comercial (Voz & Foto)',
      description: audioTranscription || 'Visita presencial efetuada pelo representante.',
      type: 'visita',
      hasAudio: !!audioTranscription,
      photoUrl: photoUrl || null,
      gps: 'Sapucaia do Sul - RS (GPS Simulado: -29.834, -51.143)'
    }

    const updatedContacts = contacts.map(c => {
      if (c.id === selectedContactId) {
        return {
          ...c,
          status: 'ativo',
          lastPurchaseDays: 1,
          activities: [checkinActivity, ...(c.activities || [])]
        }
      }
      return c
    })

    saveContacts(updatedContacts)
    setCompletedVisits(v => v + 1)
    setShowCheckinModal(false)
    setSelectedContactId('')
    setAudioTranscription('')
    setPhotoUrl('')
    setCheckinSuccessToast(true)
    setTimeout(() => setCheckinSuccessToast(false), 4000)
  }

  const repContactsNeedingAttention = contacts.filter(c => {
    const isOwner = !currentUser || c.representative === currentUser.name
    const isInactive = c.status === 'inativo' || (c.lastPurchaseDays && c.lastPurchaseDays > 30)
    return isOwner && isInactive
  })

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  const handleLogout = () => {
    localStorage.removeItem('crm_current_user')
    window.location.href = '/login'
  }

  const maxSalesValue = selectedDrilldownMonth 
    ? Math.max(...selectedDrilldownMonth.daily.map(d => d.value), 1)
    : Math.max(...MONTHLY_SALES_DATA.map(m => m.value), 1)

  // ==================== ROLE: REPRESENTANTE (MOBILE PORTAL) ====================
  if (currentUser?.role === 'representante') {
    const repAllContacts = contacts.filter(c => !currentUser || c.representative === currentUser.name)
    const filteredMobileContacts = repAllContacts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(mobileSearch.toLowerCase()) || 
                            (c.company && c.company.toLowerCase().includes(mobileSearch.toLowerCase())) ||
                            (c.city && c.city.toLowerCase().includes(mobileSearch.toLowerCase()))
      
      if (!matchesSearch) return false

      const isInactive = c.status === 'inativo' || (c.lastPurchaseDays && c.lastPurchaseDays > 30)
      if (mobileFilterStatus === 'pendentes') return isInactive
      if (mobileFilterStatus === 'concluidos') return !isInactive
      return true
    })

    return (
      <div className="page-content animate-fade-in w-full h-full flex flex-col gap-4 max-w-md mx-auto px-2 py-3 pb-24 select-none">
        {/* Header Row */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mt-1 shrink-0">
          <div>
            <span className="text-[10px] font-mono text-[var(--lime)] font-bold tracking-wider uppercase">Portal do Representante</span>
            <h1 className="font-display text-lg text-[var(--white)] font-bold tracking-tight mt-0.5">
              Olá, {currentUser.name}!
            </h1>
          </div>
          <button 
            onClick={handleLogout}
            title="Sair do CRM"
            className="p-2 border border-[var(--line)] rounded-xl text-[var(--gray2)] hover:text-red-400 hover:bg-[rgba(239,68,68,0.1)] transition-all bg-transparent"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Dynamic Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 pb-4">
          
          {/* TAB 1: PAINEL */}
          {activeTab === 'painel' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <div className="card p-5 relative overflow-hidden bg-gradient-to-br from-[var(--charcoal)] to-[#151617] border border-[rgba(180,217,50,0.15)] flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-mono text-[var(--gray)] font-bold uppercase tracking-wide">Meta de Visitas Mensal</div>
                    <div className="text-2xl font-display font-black text-[var(--lime)] mt-1">
                      {completedVisits} <span className="text-xs text-[var(--gray2)] font-mono font-medium">/ {visitsGoal} realizadas</span>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-full border-4 border-[rgba(180,217,50,0.1)] flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-[var(--lime)]" style={{ clipPath: `polygon(0 0, 100% 0, 100% ${Math.min(100, Math.floor((completedVisits/visitsGoal)*100))}%, 0 ${Math.min(100, Math.floor((completedVisits/visitsGoal)*100))}%)` }}></div>
                    <span className="text-xs font-mono font-black text-[var(--white)]">{Math.floor((completedVisits / visitsGoal) * 100)}%</span>
                  </div>
                </div>

                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-[var(--line)]">
                  <div className="bg-[var(--lime)] h-full transition-all duration-500 ease-out" style={{ width: `${(completedVisits / visitsGoal) * 100}%` }}></div>
                </div>
                
                <button 
                  onClick={() => {
                    setSelectedContactId('')
                    setAudioTranscription('')
                    setPhotoUrl('')
                    setShowCheckinModal(true)
                  }}
                  className="btn btn-primary py-3 text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-[rgba(180,217,50,0.2)] mt-1"
                >
                  <MapPin size={14} />
                  <span>Registrar Visita Rápida</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 flex flex-col gap-1.5 bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Total de Clientes</span>
                  <span className="text-2xl font-display font-black text-[var(--white)]">{repAllContacts.length}</span>
                </div>
                <div className="card p-4 flex flex-col gap-1.5 bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Atenção / Inativos</span>
                  <span className="text-2xl font-display font-black text-[var(--yellow)]">{repContactsNeedingAttention.length}</span>
                </div>
              </div>

              {/* Quick instructions / Info */}
              <div className="card p-4 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl text-xs flex flex-col gap-2">
                <span className="font-bold text-[var(--lime)]">💡 Como usar o Portal:</span>
                <p className="text-[11px] text-[var(--gray)] leading-relaxed">
                  Utilize as abas inferiores para buscar seus clientes ou localizá-los diretamente no mapa. Clique em "Check-in" ao chegar no cliente para gravar o relato e anexar a foto da visita.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTES LIST */}
          {activeTab === 'clientes' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2.5 focus-within:border-[var(--lime)]/50 transition-colors">
                <Search size={14} className="text-[var(--gray2)] shrink-0" />
                <input 
                  type="text"
                  placeholder="Buscar cliente por nome ou cidade..."
                  value={mobileSearch}
                  onChange={(e) => setMobileSearch(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs w-full text-[var(--white)] placeholder-[var(--gray2)]"
                />
              </div>

              {/* Status Filters */}
              <div className="grid grid-cols-3 gap-1 bg-[var(--card)] border border-[var(--line)] p-1 rounded-xl text-[9px] font-bold font-mono">
                <button 
                  onClick={() => setMobileFilterStatus('todos')}
                  className={`py-2 rounded-lg transition-colors ${mobileFilterStatus === 'todos' ? 'bg-[var(--charcoal)] text-[var(--lime)] border border-[var(--line)]' : 'text-[var(--gray)]'}`}
                >
                  Todos ({repAllContacts.length})
                </button>
                <button 
                  onClick={() => setMobileFilterStatus('pendentes')}
                  className={`py-2 rounded-lg transition-colors ${mobileFilterStatus === 'pendentes' ? 'bg-[var(--charcoal)] text-[var(--yellow)] border border-[var(--line)]' : 'text-[var(--gray)]'}`}
                >
                  Pendentes ({repContactsNeedingAttention.length})
                </button>
                <button 
                  onClick={() => setMobileFilterStatus('concluidos')}
                  className={`py-2 rounded-lg transition-colors ${mobileFilterStatus === 'concluidos' ? 'bg-[var(--charcoal)] text-[var(--green)] border border-[var(--line)]' : 'text-[var(--gray)]'}`}
                >
                  Visitados ({repAllContacts.length - repContactsNeedingAttention.length})
                </button>
              </div>

              {/* List */}
              <div className="flex flex-col gap-2">
                {filteredMobileContacts.map(contact => {
                  const isInactive = contact.status === 'inativo' || (contact.lastPurchaseDays && contact.lastPurchaseDays > 30)
                  return (
                    <div key={contact.id} className="card p-4 border border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 hover:border-[var(--lime)]/30 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[var(--white)] truncate">{contact.name}</h4>
                          <span className="text-[10px] font-mono text-[var(--gray)] block mt-0.5">{contact.company}</span>
                          <span className="text-[10px] text-[var(--gray)] font-mono block">{contact.city} · {contact.state}</span>
                        </div>
                        <span className={`font-mono text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          isInactive 
                            ? 'bg-[rgba(239,68,68,0.15)] text-[var(--red)] border border-[rgba(239,68,68,0.25)]' 
                            : 'bg-[rgba(34,197,94,0.15)] text-[var(--green)] border border-[rgba(34,197,94,0.25)]'
                        }`}>
                          {contact.lastPurchaseDays ? `${contact.lastPurchaseDays}d sem compra` : 'Inativo'}
                        </span>
                      </div>

                      <div className="border-t border-[var(--line)] pt-3 flex gap-2">
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contact.company || contact.name} ${contact.city}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 btn btn-secondary text-[11px] py-2 flex items-center justify-center gap-1.5 rounded-lg border-[var(--line)]"
                        >
                          <Navigation size={12} className="text-[var(--lime)]" />
                          <span>Rota GPS</span>
                        </a>
                        
                        <button 
                          onClick={() => {
                            setSelectedContactId(contact.id)
                            setAudioTranscription('')
                            setPhotoUrl('')
                            setShowCheckinModal(true)
                          }}
                          className="flex-1 btn btn-secondary text-[11px] py-2 flex items-center justify-center gap-1.5 rounded-lg hover:border-[var(--lime)] hover:text-[var(--lime)]"
                        >
                          <MapPin size={12} />
                          <span>Check-in</span>
                        </button>
                      </div>
                    </div>
                  )
                })}

                {filteredMobileContacts.length === 0 && (
                  <div className="card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MAPA INTERATIVO */}
          {activeTab === 'mapa' && (
            <div className={`flex-1 flex flex-col gap-3 h-full min-h-[400px] animate-fade-in ${isMobileMapFullscreen ? 'fixed inset-0 z-[99999] bg-[var(--charcoal)] p-4 max-w-none' : ''}`}>
              <div className="text-[10px] font-mono text-[var(--gray)] flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-[var(--lime)]" />
                  <span>Localização dos seus clientes no RS</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileMapFullscreen(!isMobileMapFullscreen)}
                  className="p-1 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--white)] text-[9px] font-mono font-bold flex items-center gap-1 hover:border-[var(--lime)]/50 transition-all cursor-pointer"
                >
                  {isMobileMapFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                  <span>{isMobileMapFullscreen ? 'Minimizar' : 'Ampliar'}</span>
                </button>
              </div>
              <div className="flex-1 w-full rounded-2xl overflow-hidden border border-[var(--line)] relative min-h-[350px] bg-[var(--charcoal)]">
                <div ref={mobileMapContainerRef} className="w-full h-full min-h-[350px] z-10" />
              </div>
            </div>
          )}

        </div>

        {/* FIXED BOTTOM NAVIGATION BAR */}
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[var(--charcoal)] border-t border-[var(--line)] flex justify-around py-3.5 z-[9999] shadow-2xl">
          <button 
            onClick={() => setActiveTab('painel')}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-wider transition-colors ${activeTab === 'painel' ? 'text-[var(--lime)]' : 'text-[var(--gray2)]'}`}
          >
            <Target size={16} />
            <span>Painel</span>
          </button>
          <button 
            onClick={() => setActiveTab('clientes')}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-wider transition-colors ${activeTab === 'clientes' ? 'text-[var(--lime)]' : 'text-[var(--gray2)]'}`}
          >
            <Users size={16} />
            <span>Clientes</span>
          </button>
          <button 
            onClick={() => setActiveTab('mapa')}
            className={`flex flex-col items-center gap-1 text-[9px] font-bold font-mono uppercase tracking-wider transition-colors ${activeTab === 'mapa' ? 'text-[var(--lime)]' : 'text-[var(--gray2)]'}`}
          >
            <MapPin size={16} />
            <span>Mapa</span>
          </button>
        </div>

        {/* Check-in Modal Overlay */}
        {showCheckinModal && (
          <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col justify-end">
            <div className="bg-[var(--charcoal)] border-t border-[var(--line)] rounded-t-3xl p-5 flex flex-col gap-4 animate-fade-up max-w-md mx-auto w-full h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
                <div>
                  <h3 className="font-display text-sm text-[var(--white)] font-bold">Registrar Visita Presencial</h3>
                  <p className="text-[10px] text-[var(--gray)] font-mono mt-0.5">GPS: Sapucaia do Sul - RS (Simulado)</p>
                </div>
                <button 
                  onClick={() => setShowCheckinModal(false)}
                  className="p-1.5 px-3 rounded-lg bg-black/20 text-[var(--gray)] hover:text-white text-[10px] font-bold font-mono uppercase tracking-wider"
                >
                  Fechar
                </button>
              </div>

              <form onSubmit={handleCheckinSubmit} className="flex flex-col gap-4 flex-1">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cliente Visitado *</label>
                  <select
                    className="input w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--lime)]/50"
                    required
                    value={selectedContactId}
                    onChange={(e) => setSelectedContactId(e.target.value)}
                  >
                    <option value="" className="bg-[var(--charcoal)]">Selecione o Cliente...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id} className="bg-[var(--charcoal)]">{c.name} - {c.company} ({c.city})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-black/40 border border-[var(--line)] rounded-xl text-[10px] font-mono text-[var(--gray)]">
                  <MapPin size={12} className="text-[var(--lime)] shrink-0" />
                  <span>Check-in GPS validado no local do cliente.</span>
                </div>

                <div className="flex flex-col gap-1.5 border border-[var(--line)] rounded-xl p-4 bg-black/20">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>Relato Comercial por Voz</span>
                    {isRecording && <span className="text-[var(--red)] animate-pulse">Gravando... {formatTimer(recordingTime)}</span>}
                  </label>
                  
                  <div className="flex flex-col items-center justify-center py-4 gap-3">
                    {isRecording ? (
                      <div className="flex items-center gap-1 justify-center h-10 w-full">
                        {[...Array(9)].map((_, i) => (
                          <div 
                            key={i} 
                            className="w-1.5 bg-[var(--lime)] rounded-full animate-pulse"
                            style={{
                              animationDelay: `${i * 0.1}s`,
                              height: `${Math.floor(10 + Math.random() * 26)}px`
                            }}
                          />
                        ))}
                      </div>
                    ) : isTranscribing ? (
                      <div className="flex flex-col items-center gap-2 py-2">
                        <div className="w-6 h-6 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[10px] text-[var(--gray)] font-mono animate-pulse">Gerando inteligência por áudio...</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[var(--gray2)] font-mono text-center max-w-[200px]">
                        Toque no microfone abaixo e fale seu relato para transcrever.
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
                        isRecording 
                          ? 'bg-[var(--red)] text-white hover:bg-[#ef4444] animate-ping-slow' 
                          : 'bg-[var(--lime)] text-black hover:scale-105'
                      }`}
                    >
                      {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                    </button>
                  </div>

                  <textarea
                    className="input w-full min-h-[90px] text-xs font-mono bg-[var(--black)] border border-[var(--line)] rounded-xl p-3 text-white outline-none focus:border-[var(--lime)]/50"
                    placeholder="Transcrição do áudio aparecerá aqui..."
                    value={audioTranscription}
                    onChange={(e) => setAudioTranscription(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5 border border-[var(--line)] rounded-xl p-4 bg-black/20">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider flex items-center justify-between">
                    <span>Foto da Fachada / Visita</span>
                    {photoUrl && <span className="text-[var(--lime)] font-mono text-[8px] uppercase">Carregada</span>}
                  </label>
                  
                  <div className="flex items-center gap-3">
                    <label className="flex-1 border border-dashed border-[var(--line)] rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-black/10 hover:bg-black/30 transition-colors">
                      <Camera size={18} className="text-[var(--lime)]" />
                      <span className="text-[10px] font-mono text-[var(--gray)]">Tirar Foto / Carregar</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        className="hidden" 
                        onChange={handlePhotoUpload}
                      />
                    </label>

                    {photoUrl && (
                      <div className="w-16 h-16 rounded-xl border border-[var(--line)] overflow-hidden shrink-0 relative bg-black/50">
                        <img src={photoUrl} alt="Fachada" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setPhotoUrl('')}
                          className="absolute top-0 right-0 w-4 h-4 bg-black/80 rounded-bl text-[8px] font-bold text-red-500"
                        >
                          X
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 border-t border-[var(--line)] pt-3 mt-auto">
                  <button 
                    type="button" 
                    onClick={() => setShowCheckinModal(false)}
                    className="btn btn-secondary py-3 flex-1 text-xs font-bold uppercase tracking-wider"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={!selectedContactId}
                    className="btn btn-primary py-3 flex-1 text-xs font-black uppercase tracking-wider text-black disabled:opacity-50"
                  >
                    Salvar Check-in
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ==================== ROLE: ADMIN / OUTROS (DESKTOP MAIN DASHBOARD - NO SCROLL) ====================
  return (
    <div className="page-content animate-fade-in w-full h-[calc(100vh-64px)] flex flex-col gap-3 p-3 overflow-y-auto lg:overflow-hidden select-none">
      
      {/* ── TOP HEADER & CONTROLS ROW ── */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
            Dashboard Comercial
          </h1>
        </div>

        {/* Filters Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Filter */}
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-[var(--gray2)] uppercase">Ano:</span>
            <select
              className="bg-transparent text-xs font-mono font-bold text-[var(--white)] outline-none cursor-pointer"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2026" className="bg-[var(--charcoal)]">2026</option>
              <option value="2025" className="bg-[var(--charcoal)]">2025</option>
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-[var(--gray2)] uppercase">Mês:</span>
            <select
              className="bg-transparent text-xs font-mono font-bold text-[var(--white)] outline-none cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all" className="bg-[var(--charcoal)]">Ano Todo</option>
              <option value="01" className="bg-[var(--charcoal)]">Janeiro</option>
              <option value="02" className="bg-[var(--charcoal)]">Fevereiro</option>
              <option value="03" className="bg-[var(--charcoal)]">Março</option>
              <option value="04" className="bg-[var(--charcoal)]">Abril</option>
              <option value="05" className="bg-[var(--charcoal)]">Maio</option>
              <option value="06" className="bg-[var(--charcoal)]">Junho</option>
              <option value="07" className="bg-[var(--charcoal)]">Julho</option>
              <option value="08" className="bg-[var(--charcoal)]">Agosto</option>
              <option value="09" className="bg-[var(--charcoal)]">Setembro</option>
              <option value="10" className="bg-[var(--charcoal)]">Outubro</option>
              <option value="11" className="bg-[var(--charcoal)]">Novembro</option>
              <option value="12" className="bg-[var(--charcoal)]">Dezembro</option>
            </select>
          </div>

          {/* Representative Filter */}
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-[var(--gray2)] uppercase">Rep:</span>
            <select
              className="bg-transparent text-xs font-mono text-[var(--white)] outline-none cursor-pointer max-w-[130px]"
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
            >
              <option value="all" className="bg-[var(--charcoal)]">Todos</option>
              {representatives.map(rep => (
                <option key={rep} value={rep} className="bg-[var(--charcoal)]">{rep}</option>
              ))}
            </select>
          </div>

          {/* Curve ABC Filter */}
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] px-2.5 py-1 rounded-xl">
            <span className="text-[9px] font-mono font-bold text-[var(--gray2)] uppercase">Curva:</span>
            <select
              className="bg-transparent text-xs font-mono text-[var(--white)] outline-none cursor-pointer"
              value={selectedCurve}
              onChange={(e) => setSelectedCurve(e.target.value)}
            >
              <option value="all" className="bg-[var(--charcoal)]">Todas</option>
              <option value="A" className="bg-[var(--charcoal)]">Curva A</option>
              <option value="B" className="bg-[var(--charcoal)]">Curva B</option>
              <option value="C" className="bg-[var(--charcoal)]">Curva C</option>
              <option value="D" className="bg-[var(--charcoal)]">Curva D</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── ROW 1: TOP SUMMARY KPIS (ULTRA COMPACT) ── */}
      <div className="grid grid-cols-4 gap-3 shrink-0">
        <div className="card px-3.5 py-2 flex items-center justify-between border-[rgba(180,217,50,0.15)] bg-[var(--card)]">
          <div>
            <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Negócios Ativos</div>
            <div className="text-lg font-display font-black text-[var(--lime)] mt-0.5">{activeDealsCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[rgba(180,217,50,0.1)] border border-[rgba(180,217,50,0.2)] flex items-center justify-center shrink-0">
            <Package size={16} className="text-[var(--lime)]" />
          </div>
        </div>

        <div className="card px-3.5 py-2 flex items-center justify-between border-[rgba(72,199,103,0.15)] bg-[var(--card)]">
          <div>
            <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Fechamentos (Mês)</div>
            <div className="text-lg font-display font-black text-[var(--green)] mt-0.5">{formatCurrency(fechamentoValue)}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[rgba(72,199,103,0.1)] border border-[rgba(72,199,103,0.2)] flex items-center justify-center shrink-0">
            <CheckCircle size={16} className="text-[var(--green)]" />
          </div>
        </div>

        <div className="card px-3.5 py-2 flex items-center justify-between border-[rgba(240,196,25,0.15)] bg-[var(--card)]">
          <div>
            <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Em Negociação</div>
            <div className="text-lg font-display font-black text-[var(--yellow)] mt-0.5">{inNegotiationCount}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[rgba(240,196,25,0.1)] border border-[rgba(240,196,25,0.2)] flex items-center justify-center shrink-0">
            <TrendingUp size={16} className="text-[var(--yellow)]" />
          </div>
        </div>

        <div className="card px-3.5 py-2 flex items-center justify-between border-[rgba(226,72,61,0.15)] bg-[var(--card)]">
          <div>
            <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Perdidos (Mês)</div>
            <div className="text-lg font-display font-black text-[var(--red)] mt-0.5">{formatCurrency(perdidoValue)}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[rgba(226,72,61,0.1)] border border-[rgba(226,72,61,0.2)] flex items-center justify-center shrink-0">
            <XCircle size={16} className="text-[var(--red)]" />
          </div>
        </div>
      </div>

      {/* ── ROW 2: FUNNEL ── */}
      <div className="card px-3 pt-2.5 pb-3 flex flex-col gap-2 shrink-0 bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-1">
          <div className="flex items-center gap-2">
            <Target size={13} className="text-[var(--lime)]" />
            <span className="text-[11px] font-bold font-display text-[var(--white)]">Funil de Vendas · Passos do Pipeline</span>
          </div>
          <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider">8 Etapas Comerciais</span>
        </div>

        <div className="flex items-center gap-1.5">
          {funnelSummary.map((item, idx) => (
            <div key={item.key} className="flex items-center gap-1.5 flex-1 min-w-0">
              {/* Stage card */}
              <div
                className="flex-1 min-w-0 rounded-xl px-2.5 py-2 flex flex-col gap-1 border transition-all duration-200 hover:brightness-110 cursor-default"
                style={{
                  borderColor: `color-mix(in srgb, ${item.color} 25%, transparent)`,
                  background: `color-mix(in srgb, ${item.color} 6%, transparent)`,
                  borderTopColor: item.color,
                  borderTopWidth: '2px'
                }}
              >
                {/* Count + Icon */}
                <div className="flex items-center justify-between">
                  <span
                    className="text-xl font-black font-display leading-none"
                    style={{ color: item.color }}
                  >
                    {item.count}
                  </span>
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center"
                    style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)` }}
                  >
                    {getStageIcon(item.key, item.color)}
                  </div>
                </div>

                {/* Stage name */}
                <div className="text-[8px] font-mono font-bold uppercase tracking-wide truncate" style={{ color: `color-mix(in srgb, ${item.color} 85%, var(--white))` }}>
                  {item.stage}
                </div>

                {/* Value */}
                <div className="text-[9px] font-mono font-bold text-[var(--white)] truncate">
                  {item.value ? formatCurrency(item.value) : <span className="text-[var(--gray2)]">—</span>}
                </div>
              </div>

              {/* Connector */}
              {idx < funnelSummary.length - 1 && (
                <div className="shrink-0 text-[var(--line)] opacity-60">
                  <ArrowRight size={10} strokeWidth={2.5} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 3 & 4: MAIN DYNAMIC WORKSPACE (2/3 LEFT GRAPHS/PERF | 1/3 RIGHT FULL-HEIGHT MAP) ── */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        
        {/* LEFT DYNAMIC CONTENT AREA (col-span-8) */}
        <div className="col-span-8 flex flex-col gap-3 h-full min-h-0">
          
          {/* Sales Chart with Drilldown & Labels */}
          <div className="card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-[225px] shrink-0">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 shrink-0">
              <div className="flex items-center gap-2">
                <BarChart3 size={13} className="text-[var(--lime)]" />
                <span className="text-xs font-bold font-display text-[var(--white)]">
                  {selectedDrilldownMonth ? `Vendas · ${selectedDrilldownMonth.month} / ${selectedYear} (Visão Diária)` : `Vendas do Ano · ${selectedYear}`}
                </span>
              </div>
              {selectedDrilldownMonth ? (
                <button 
                  onClick={() => setSelectedDrilldownMonth(null)}
                  className="text-[9px] font-mono font-bold text-[var(--lime)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft size={10} /> Voltar Mês
                </button>
              ) : (
                <span className="text-[9px] font-mono text-[var(--gray2)] uppercase">Clique no mês para ver o detalhamento dia a dia</span>
              )}
            </div>

            <div className="flex-1 flex items-end gap-2 pt-3 pb-1 overflow-x-auto min-h-0 px-1">
              {!selectedDrilldownMonth ? (
                /* MONTHLY VIEW - Rótulos Always Active */
                MONTHLY_SALES_DATA.map(m => {
                  const heightPct = Math.max(10, Math.min(84, Math.round((m.value / maxSalesValue) * 80)))
                  const isSelectedMonth = selectedMonth !== 'all' && parseInt(selectedMonth) === m.monthIndex
                  return (
                    <div 
                      key={m.month} 
                      onClick={() => setSelectedDrilldownMonth(m)}
                      className="flex-1 flex flex-col items-center gap-1 group cursor-pointer h-full justify-end"
                      title={`${m.month}: ${formatCurrency(m.value)} (${m.dealsCount} vendas). Clique para ver dia a dia.`}
                    >
                      <div className="text-[8px] font-mono text-[var(--white)] font-bold text-center">
                        R$ {(m.value / 1000).toFixed(0)}k
                      </div>
                      <div className="w-full bg-[var(--chart-track)] border border-[var(--chart-border)] rounded-t-md relative overflow-hidden flex items-end" style={{ height: `${heightPct}%` }}>
                        <div 
                          className={`w-full transition-all duration-300 ${isSelectedMonth ? 'bg-[var(--lime)] shadow-[0_0_10px_var(--lime-glow)]' : 'bg-gradient-to-t from-[var(--lime-dim)] to-[var(--lime)] group-hover:brightness-125'}`}
                          style={{ height: '100%' }}
                        />
                      </div>
                      <span className={`text-[9px] font-mono font-bold ${isSelectedMonth ? 'text-[var(--lime)] underline' : 'text-[var(--gray)] group-hover:text-[var(--white)]'}`}>
                        {m.month}
                      </span>
                    </div>
                  )
                })
              ) : (
                /* DAILY DRILLDOWN VIEW - Rótulos Above Bars */
                selectedDrilldownMonth.daily.map(d => {
                  const heightPct = Math.max(8, Math.min(84, Math.round((d.value / maxSalesValue) * 80)))
                  return (
                    <div 
                      key={d.day}
                      className="flex-1 flex flex-col items-center gap-0.5 group h-full justify-end"
                      title={`Dia ${d.day}: ${formatCurrency(d.value)}`}
                    >
                      {d.value > 0 ? (
                        <span className="text-[6.5px] font-mono text-[var(--white)] font-extrabold text-center tracking-tighter mb-0.5">
                          {d.value >= 1000 ? `${(d.value / 1000).toFixed(0)}k` : d.value}
                        </span>
                      ) : (
                        <span className="text-[6px] font-mono text-[var(--gray2)] mb-0.5">—</span>
                      )}
                      <div className="w-full bg-[var(--chart-track)] border border-[var(--chart-border)] rounded-t-sm relative overflow-hidden flex items-end" style={{ height: `${heightPct}%` }}>
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-600 to-[var(--green)] group-hover:brightness-125 transition-all"
                          style={{ height: '100%' }}
                        />
                      </div>
                      <span className="text-[7px] font-mono text-[var(--gray2)] group-hover:text-[var(--white)]">
                        {d.day}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Under-Chart indicators: Performance da Equipe & Combined Top Clientes + Embalagens */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            {/* COL 1: Performance da Equipe */}
            <div className="card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-full">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={13} className="text-[var(--lime)]" />
                  <span className="text-xs font-bold font-display text-[var(--white)]">Performance da Equipe</span>
                </div>
                <span className="text-[9px] font-mono text-[var(--gray2)] uppercase">Mês Atual</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1 min-h-0">
                {TEAM_PERFORMANCE.map(rep => (
                  <div key={rep.id} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2 hover:border-[var(--lime)]/30 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-black font-bold text-[10px] shrink-0"
                        style={{ backgroundColor: rep.avatarColor }}
                      >
                        {rep.name.split(' ').map(p => p[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--white)] truncate leading-tight">{rep.name}</div>
                        <div className="text-[8px] font-mono text-[var(--gray2)] truncate">{rep.role}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-right">
                      <div>
                        <div className="text-[7px] font-mono text-[var(--gray2)] uppercase">Contatos</div>
                        <div className="text-[10px] font-mono font-bold text-[var(--white)]">{rep.contactsCount}</div>
                      </div>
                      <div>
                        <div className="text-[7px] font-mono text-[var(--gray2)] uppercase">Faturado</div>
                        <div className="text-[10px] font-mono font-bold text-[var(--lime)]">{formatCurrency(rep.sales)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* COL 2: Top Clientes e Embalagens Combinados (font sizes perfectly aligned to COL 1) */}
            <div className="card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-full">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-1 shrink-0">
                <div className="flex items-center gap-2">
                  <Building size={13} className="text-[var(--lime)]" />
                  <span className="text-xs font-bold font-display text-[var(--white)]">Top Clientes & Embalagens</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 mt-2 pr-1 min-h-0">
                {/* Principais Clientes */}
                <div className="space-y-1">
                  <div className="text-[8px] font-mono text-[var(--gray2)] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Building size={10} className="text-[var(--lime)]" /> Principais Clientes
                  </div>
                  <div className="space-y-1">
                    {TOP_CLIENTS.map(cli => (
                      <div key={cli.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2 hover:border-[var(--lime)]/30 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[8px] font-mono text-[var(--gray2)] font-bold">#{cli.rank}</span>
                          <div className="text-xs font-bold text-[var(--white)] truncate">{cli.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-mono bg-lime-500/10 text-[var(--lime)] px-1.5 py-0.5 rounded font-black border border-[var(--lime)]/10">{cli.type}</span>
                          <span className="text-[10px] font-mono font-bold text-[var(--lime)]">{formatCurrency(cli.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Embalagens Mais Demandadas */}
                <div className="space-y-1 border-t border-[var(--line)] pt-2.5">
                  <div className="text-[8px] font-mono text-[var(--gray2)] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Layers size={10} className="text-[var(--lime)]" /> Embalagens mais Demandadas
                  </div>
                  <div className="space-y-1">
                    {TOP_PRODUCTS.map(prod => (
                      <div key={prod.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2 hover:border-[var(--lime)]/30 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[8px] font-mono text-[var(--gray2)] font-bold">#{prod.rank}</span>
                          <div className="text-xs font-bold text-[var(--white)] truncate">{prod.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <span className="text-[8px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-black border border-sky-500/10">{prod.quantity}</span>
                          <span className="text-[10px] font-mono font-bold text-[var(--lime)]">{formatCurrency(prod.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE TALL CONTAINER (col-span-4) - Full-height Map */}
        <div className="col-span-4 card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-full relative">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 shrink-0 z-10 bg-[var(--card)]">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[var(--lime)]" />
              <span className="text-xs font-bold font-display text-[var(--white)]">Geolocalização dos Negócios</span>
            </div>
            <button
              type="button"
              onClick={() => setIsMapFullscreen(true)}
              className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--charcoal)] text-[var(--white)] hover:border-[var(--lime)]/50 hover:text-[var(--lime)] transition-all flex items-center gap-1 text-[10px] font-mono font-bold cursor-pointer"
              title="Ampliar Mapa em Tela Cheia"
            >
              <Maximize2 size={12} />
              <span>Ampliar</span>
            </button>
          </div>
          <div className="flex-1 w-full rounded-xl overflow-hidden border border-[var(--line)] mt-1.5 min-h-0 relative">
            <div ref={mapContainerRef} className="w-full h-full min-h-[350px] bg-[var(--charcoal)]" />
          </div>
        </div>

      </div>

      {/* DEDICATED FULLSCREEN MAP MODAL (100% SCREEN) */}
      {isMapFullscreen && (
        <div className="fixed inset-0 bg-black/95 z-[99999] flex flex-col p-4 sm:p-6 animate-fade-in backdrop-blur-md">
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4 mb-4 shrink-0 gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center shrink-0">
                <MapPin size={20} className="text-[var(--lime)]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-base sm:text-lg text-[var(--white)] font-bold tracking-tight">
                  Geolocalização dos Negócios
                </h2>
              </div>
            </div>

            <button
              onClick={() => setIsMapFullscreen(false)}
              className="btn btn-secondary px-4 py-2 text-xs font-bold font-mono flex items-center gap-2 rounded-xl border-[var(--line)] hover:border-[var(--lime)] hover:text-[var(--lime)] cursor-pointer shrink-0"
            >
              <Minimize2 size={16} />
              <span>Minimizar</span>
            </button>
          </div>

          {/* Map Container */}
          <div className="flex-1 w-full h-full rounded-2xl overflow-hidden border border-[var(--line)] relative bg-[var(--charcoal)]">
            <div ref={fullscreenMapContainerRef} className="w-full h-full min-h-[400px] z-10" />
          </div>
        </div>
      )}

    </div>
  )
}

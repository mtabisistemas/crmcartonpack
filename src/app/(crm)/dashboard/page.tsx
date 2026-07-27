'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { CartonPackLogo } from '@/components/CartonPackLogo'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'
import { InstallPWAButton } from '@/components/InstallPWA'
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
  Minimize2,
  Sun,
  Moon
} from 'lucide-react'
import { formatCurrency, whatsappLink } from '@/lib/utils'
import { getPipelineDeals } from '@/services/pipeline-service'
import Link from 'next/link'

declare let L: any

const WhatsappIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
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

interface DealMock {
  id: string
  title: string
  representative: string
  stage: 'leads' | 'prospect' | 'dinamica' | 'potencial' | 'visita' | 'briefing' | 'aprovacao' | 'fechamento' | 'pos_venda' | 'perdido'
  value: number
  curve: 'A' | 'B' | 'C' | 'D'
  daysInactive: number
  contactName: string
  phone: string
  latLng?: [number, number]
  city?: string
  uf?: string
}

const MOCK_DEALS: DealMock[] = []
const MONTHLY_SALES_DATA: any[] = []
const TEAM_PERFORMANCE: any[] = []
const TOP_PRODUCTS: any[] = []
const TOP_CLIENTS: any[] = []

export default function DashboardPage() {
  // Roles and Current User Session
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [pipelineDeals, setPipelineDeals] = useState<any[]>([])

  // Theme state (for mobile toggle)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

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
  const recognitionRef = useRef<any>(null)

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
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab') as 'painel' | 'clientes' | 'mapa' | 'dashboard' | null

  const [activeTab, setActiveTab] = useState<'painel' | 'clientes' | 'mapa' | 'dashboard'>('dashboard')

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const [mobileSearch, setMobileSearch] = useState('')
  const [mobileFilterStatus, setMobileFilterStatus] = useState<'todos' | 'pendentes' | 'concluidos'>('todos')
  const mobileMapContainerRef = useRef<HTMLDivElement>(null)
  const mobileMapInstanceRef = useRef<any>(null)
  
  const [visitsGoal, setVisitsGoal] = useState(15)
  const [completedVisits, setCompletedVisits] = useState(0)
  const [showCheckinModal, setShowCheckinModal] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedPipelineStage, setSelectedPipelineStage] = useState('visita')
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
          const user = JSON.parse(session)
          setCurrentUser(user)
          if (user.role === 'representante' || user.role === 'vendedor') {
            setSelectedRep(user.name)
          }
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
        setContacts([])
        localStorage.setItem('crm_contacts', JSON.stringify([]))
      }

      setIsSessionLoaded(true)

      // Load real pipeline deals
      const loadDeals = () => {
        const loaded = getPipelineDeals([])
        setPipelineDeals(loaded)
      }
      loadDeals()

      window.addEventListener('storage-deals-changed', loadDeals)
      window.addEventListener('storage', loadDeals)
      window.addEventListener('storage-contacts-changed', loadDeals)

      // Initialize theme from DOM
      const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      setTheme(activeTheme)

      return () => {
        window.removeEventListener('storage-deals-changed', loadDeals)
        window.removeEventListener('storage', loadDeals)
        window.removeEventListener('storage-contacts-changed', loadDeals)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).handleMapRegistrarAtividade = (contactId: string, companyName?: string) => {
        const found = contacts.find(c => c.id === contactId || c.company === companyName || c.name === companyName)
        if (found) {
          setSelectedContactId(found.id)
        } else if (contactId) {
          setSelectedContactId(contactId)
        }
        setAudioTranscription('')
        setPhotoUrl('')
        setShowCheckinModal(true)
      };

      (window as any).handleMapVerFicha = (contactId: string, companyName?: string) => {
        window.location.href = '/contacts'
      };
    }
  }, [contacts])

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

    // Add Markers for all active deals in negotiation and closing stages
    const activeDealsForMap = mappedDeals.filter(d => {
      if (d.stage === 'perdido') return false
      if (!selectedRep || selectedRep === 'all') return true
      const repNorm = selectedRep.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      const dRepNorm = (d.representative || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      return dRepNorm === repNorm || dRepNorm.includes(repNorm) || repNorm.includes(dRepNorm)
    })
    const coordsCount: Record<string, number> = {}
    const bounds: [number, number][] = []

    activeDealsForMap.forEach((deal) => {
      let baseCoords: [number, number] = deal.latLng || getCityCoords(deal.city) || [-29.6842, -51.1303]
      const key = `${baseCoords[0].toFixed(3)}_${baseCoords[1].toFixed(3)}`
      const indexInCity = coordsCount[key] || 0
      coordsCount[key] = indexInCity + 1

      let finalLat = baseCoords[0]
      let finalLng = baseCoords[1]

      if (indexInCity > 0) {
        const angle = indexInCity * 1.8 // Spread pins outwards in a spiral
        const distance = 0.003 * Math.sqrt(indexInCity)
        finalLat += distance * Math.cos(angle)
        finalLng += distance * Math.sin(angle)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)
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

      const marker = L_Global.marker(finalLatLng, { icon: customIcon }).addTo(map)
      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 4px 6px; background: #ffffff; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
          <strong style="font-size: 12px; display: block;">${deal.title}</strong>
          <span style="color: ${stageColor}; font-family: monospace; font-size: 11px; font-weight: bold;">${formatCurrency(deal.value)}</span>
          <div style="font-size: 10px; margin-top: 2px;">${deal.contactName} (${deal.city || 'Novo Hamburgo'})</div>
          <div style="font-size: 9px; text-transform: uppercase; opacity: 0.8; font-weight: bold; color: ${stageColor}; margin-top: 2px;">Etapa: ${deal.stage}</div>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      })
    })

    // Calculate bounds containing all markers responsively
    if (bounds.length > 0) {
      map.fitBounds(bounds, {
        padding: [30, 30],
        maxZoom: 12
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
  }, [leafletReady, currentUser, pipelineDeals])

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

    // Add Markers for all active deals in negotiation and closing stages
    const activeDealsForMap = mappedDeals.filter(d => d.stage !== 'perdido')
    const coordsCount: Record<string, number> = {}
    const bounds: [number, number][] = []

    activeDealsForMap.forEach((deal) => {
      let baseCoords: [number, number] = deal.latLng || getCityCoords(deal.city) || [-29.6842, -51.1303]
      const key = `${baseCoords[0].toFixed(3)}_${baseCoords[1].toFixed(3)}`
      const indexInCity = coordsCount[key] || 0
      coordsCount[key] = indexInCity + 1

      let finalLat = baseCoords[0]
      let finalLng = baseCoords[1]

      if (indexInCity > 0) {
        const angle = indexInCity * 1.8
        const distance = 0.003 * Math.sqrt(indexInCity)
        finalLat += distance * Math.cos(angle)
        finalLng += distance * Math.sin(angle)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)
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

      const marker = L_Global.marker(finalLatLng, { icon: customIcon }).addTo(map)

      const contactObj = contacts.find(c => c.id === (deal as any).contact_id || c.company === (deal as any).contact?.company || c.name === deal.title)
      const cnpjStr = contactObj?.cnpj || (deal as any).contact?.cnpj || ''
      const phoneStr = contactObj?.phone || (deal as any).contact?.phone || ''
      const cityStr = deal.city || contactObj?.city || 'Novo Hamburgo'
      const stateStr = (deal as any).state || contactObj?.state || 'RS'
      const compName = deal.title || contactObj?.company || contactObj?.name || 'Cliente'
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${compName} ${cityStr}`)}`
      const waUrl = phoneStr ? whatsappLink(phoneStr, `Olá, tudo bem?`) : 'https://wa.me/5551999999999'

      // Tooltip on Hover (Exibe ao passar o mouse)
      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 6px 10px; background: #0f172a; color: #ffffff; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); min-width: 150px;">
          <strong style="font-size: 12px; display: block; color: #ffffff;">${compName}</strong>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</div>
          <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: ${stageColor}; margin-top: 3px;">${formatCurrency(deal.value)}</div>
          <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: ${stageColor}; margin-top: 2px;">Etapa: ${deal.stage}</div>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      })

      // Popup on Click (Botões: Ver Rota, Registrar Atividade, WhatsApp, Ver Ficha)
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 8px; color: #ffffff; background: #14161E; border-radius: 12px; min-width: 220px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; border-bottom: 1px solid #262938; padding-bottom: 6px; margin-bottom: 8px;">
            <div>
              <strong style="font-size: 13px; color: #ffffff; display: block; line-height: 1.2;">${compName}</strong>
              <span style="font-size: 10px; color: #94a3b8;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</span>
            </div>
            <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: rgba(180,217,50,0.15); color: #B4D932; border: 1px solid rgba(180,217,50,0.3); whitespace: nowrap;">${deal.stage}</span>
          </div>

          <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.5;">
            <div><strong>Valor:</strong> <span style="color: #B4D932; font-family: monospace; font-weight: bold;">${formatCurrency(deal.value)}</span></div>
            <div><strong>CNPJ:</strong> ${cnpjStr || 'Não informado'}</div>
            <div><strong>Representante:</strong> ${deal.representative || 'Sem representante'}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <a href="${mapsUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #0284c7; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              📍 Ver Rota
            </a>
            <button onclick="window.handleMapRegistrarAtividade('${(deal as any).contact_id || contactObj?.id || ''}', '${compName}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #B4D932; color: #060606; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📝 Atividade
            </button>
            <a href="${waUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #25D366; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              💬 WhatsApp
            </a>
            <button onclick="window.handleMapVerFicha('${(deal as any).contact_id || contactObj?.id || ''}', '${compName}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #334155; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📄 Ver Ficha
            </button>
          </div>
        </div>
      `)
    })

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
  }, [isMapFullscreen, leafletReady, pipelineDeals])

  // Initialize Leaflet Map for Mobile Representative / Vendedor View (activeTab === 'mapa')
  useEffect(() => {
    const isRepOrVend = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'
    if (!leafletReady || !isRepOrVend || activeTab !== 'mapa') return
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
    const userNorm = currentUser?.name ? currentUser.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''
    const repDeals = mappedDeals.filter(d => {
      if (d.stage === 'perdido') return false
      if (!userNorm) return true
      const dNorm = (d.representative || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      return dNorm === userNorm || dNorm.includes(userNorm) || userNorm.includes(dNorm)
    })
    const coordsCount: Record<string, number> = {}
    const bounds: [number, number][] = []

    repDeals.forEach((deal) => {
      let baseCoords: [number, number] = deal.latLng || getCityCoords(deal.city) || [-29.6842, -51.1303]
      const key = `${baseCoords[0].toFixed(3)}_${baseCoords[1].toFixed(3)}`
      const indexInCity = coordsCount[key] || 0
      coordsCount[key] = indexInCity + 1

      let finalLat = baseCoords[0]
      let finalLng = baseCoords[1]

      if (indexInCity > 0) {
        const angle = indexInCity * 1.8
        const distance = 0.003 * Math.sqrt(indexInCity)
        finalLat += distance * Math.cos(angle)
        finalLng += distance * Math.sin(angle)
      }

      const finalLatLng: [number, number] = [finalLat, finalLng]
      bounds.push(finalLatLng)
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

      const marker = L_Global.marker(finalLatLng, { icon: customIcon }).addTo(map)

      const contactObj = contacts.find(c => c.id === (deal as any).contact_id || c.company === (deal as any).contact?.company || c.name === deal.title)
      const cnpjStr = contactObj?.cnpj || (deal as any).contact?.cnpj || ''
      const phoneStr = contactObj?.phone || (deal as any).contact?.phone || ''
      const cityStr = deal.city || contactObj?.city || 'Novo Hamburgo'
      const stateStr = (deal as any).state || contactObj?.state || 'RS'
      const compName = deal.title || contactObj?.company || contactObj?.name || 'Cliente'
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${compName} ${cityStr}`)}`
      const waUrl = phoneStr ? whatsappLink(phoneStr, `Olá ${deal.contactName || compName}, tudo bem?`) : 'https://wa.me/5551999999999'

      // Tooltip on Mouse Hover (Exibe informações ao passar o mouse por cima)
      marker.bindTooltip(`
        <div style="font-family: sans-serif; padding: 6px 10px; background: #0f172a; color: #ffffff; border: 1px solid #334155; border-radius: 8px; box-shadow: 0 8px 20px rgba(0,0,0,0.5); min-width: 150px;">
          <strong style="font-size: 12px; display: block; color: #ffffff;">${compName}</strong>
          <div style="font-size: 10px; color: #94a3b8; margin-top: 2px;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</div>
          <div style="font-size: 11px; font-family: monospace; font-weight: bold; color: ${stageColor}; margin-top: 3px;">${formatCurrency(deal.value)}</div>
          <div style="font-size: 9px; text-transform: uppercase; font-weight: bold; color: ${stageColor}; margin-top: 2px;">Etapa: ${deal.stage}</div>
        </div>
      `, {
        direction: 'top',
        className: 'custom-leaflet-tooltip'
      })

      // Popup on Click (Botões: Ver Rota, Registrar Atividade, WhatsApp, Ver Ficha)
      marker.bindPopup(`
        <div style="font-family: sans-serif; padding: 8px; color: #ffffff; background: #14161E; border-radius: 12px; min-width: 220px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; border-bottom: 1px solid #262938; padding-bottom: 6px; margin-bottom: 8px;">
            <div>
              <strong style="font-size: 13px; color: #ffffff; display: block; line-height: 1.2;">${compName}</strong>
              <span style="font-size: 10px; color: #94a3b8;">${cityStr} ${stateStr ? `· ${stateStr}` : ''}</span>
            </div>
            <span style="font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: rgba(180,217,50,0.15); color: #B4D932; border: 1px solid rgba(180,217,50,0.3); whitespace: nowrap;">${deal.stage}</span>
          </div>

          <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 10px; line-height: 1.5;">
            <div><strong>Valor:</strong> <span style="color: #B4D932; font-family: monospace; font-weight: bold;">${formatCurrency(deal.value)}</span></div>
            <div><strong>CNPJ:</strong> ${cnpjStr || 'Não informado'}</div>
            <div><strong>Representante:</strong> ${deal.representative || 'Sem representante'}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <a href="${mapsUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #0284c7; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              📍 Ver Rota
            </a>
            <button onclick="window.handleMapRegistrarAtividade('${(deal as any).contact_id || contactObj?.id || ''}', '${compName}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #B4D932; color: #060606; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📝 Atividade
            </button>
            <a href="${waUrl}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #25D366; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; text-decoration: none; text-transform: uppercase;">
              💬 WhatsApp
            </a>
            <button onclick="window.handleMapVerFicha('${(deal as any).contact_id || contactObj?.id || ''}', '${compName}')" style="display: flex; align-items: center; justify-content: center; gap: 4px; background: #334155; color: #ffffff; padding: 6px 4px; border-radius: 6px; font-size: 9px; font-weight: bold; border: none; cursor: pointer; text-transform: uppercase;">
              📄 Ver Ficha
            </button>
          </div>
        </div>
      `)
    })

    // Calculate bounds containing all representative's markers
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

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('crm_current_user')
      document.cookie = 'cp_crm_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      window.location.replace('/login')
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cp_crm_theme', newTheme)
    localStorage.setItem('theme', newTheme)
    document.cookie = `cp_crm_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
  }

  // Helper to resolve city coordinates for Leaflet map pins
  const getCityCoords = (cityStr?: string): [number, number] | undefined => {
    if (!cityStr) return undefined
    const clean = cityStr.trim().toLowerCase()
    const coordsMap: Record<string, [number, number]> = {
      'novo hamburgo': [-29.6842, -51.1303],
      'dois irmãos': [-29.5800, -51.0833],
      'dois irmaos': [-29.5800, -51.0833],
      'porto alegre': [-30.0346, -51.2177],
      'gravataí': [-29.9419, -50.9925],
      'gravatai': [-29.9419, -50.9925],
      'canoas': [-29.9189, -51.1781],
      'sapucaia do sul': [-29.8272, -51.1444],
      'são leopoldo': [-29.7606, -51.1472],
      'sao leopoldo': [-29.7606, -51.1472],
      'estância velha': [-29.6508, -51.1783],
      'estancia velha': [-29.6508, -51.1783],
      'campo bom': [-29.6781, -51.0558],
      'ivoti': [-29.5939, -51.1606],
      'canela': [-29.3658, -50.8092],
      'gramado': [-29.3787, -50.8739],
      'caxias do sul': [-29.1681, -51.1794],
      'bento gonçalves': [-29.1706, -51.5186],
      'sapiranga': [-29.6381, -51.0069],
      'nova hartz': [-29.5819, -50.9031],
      'igrejinha': [-29.5742, -50.7936],
      'três coroas': [-29.5175, -50.7778],
      'tres coroas': [-29.5175, -50.7778],
      'parobé': [-29.6289, -50.8344],
      'parobe': [-29.6289, -50.8344],
      'taquara': [-29.6517, -50.7817],
    }
    return coordsMap[clean]
  }

  // Convert pipeline deals to dashboard deal format, matching with real contacts to get city
  const mappedDeals: DealMock[] = useMemo(() => {
    const contactsMapByName = new Map<string, any>()
    const contactsMapById = new Map<string, any>()

    contacts.forEach(c => {
      if (c.id) contactsMapById.set(c.id, c)
      if (c.company) contactsMapByName.set(c.company.toLowerCase().trim(), c)
      if (c.name) contactsMapByName.set(c.name.toLowerCase().trim(), c)
    })

    return pipelineDeals.map(d => {
      const val = (d.final_value && d.final_value > 0) ? d.final_value : (d.estimated_value || 0)
      
      const matchedContact = (d.contact_id && contactsMapById.get(d.contact_id)) ||
                             (d.contact?.company && contactsMapByName.get(d.contact.company.toLowerCase().trim())) ||
                             (d.contact?.name && contactsMapByName.get(d.contact.name.toLowerCase().trim())) ||
                             (d.title && contactsMapByName.get(d.title.toLowerCase().trim()))

      const companyName = matchedContact?.company || d.contact?.company || d.title || 'Cliente'
      const city = matchedContact?.city || d.contact?.city || d.city || 'Novo Hamburgo'
      const uf = matchedContact?.state || d.contact?.state || d.uf || 'RS'
      const rep = matchedContact?.representative || d.assigned_to || d.contact?.representative || 'Sem representante'
      const curve = matchedContact?.curve || d.contact?.curve || 'C'

      return {
        id: d.id,
        title: companyName,
        representative: rep,
        stage: d.stage as any,
        value: val,
        curve: curve as any,
        daysInactive: 0,
        contactName: matchedContact?.name || d.contact?.name || companyName,
        phone: matchedContact?.phone || d.contact?.phone || '',
        city: city,
        uf: uf,
        latLng: getCityCoords(city)
      }
    })
  }, [pipelineDeals, contacts])

  // Deals estritamente filtrados pelo Representante / Vendedor selecionado no topo
  const repFilteredDeals = useMemo(() => {
    if (!selectedRep || selectedRep === 'all') return pipelineDeals
    const repNorm = selectedRep.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    return pipelineDeals.filter(d => {
      const assigned = d.assigned_to || d.contact?.representative || ''
      const assignedNorm = assigned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      return assignedNorm === repNorm || assignedNorm.includes(repNorm) || repNorm.includes(assignedNorm)
    })
  }, [pipelineDeals, selectedRep])

  // 1. Dynamic Monthly Sales Data (Vendas do Ano — Somente Fechamentos Reais do Rep Selecionado)
  const MONTHLY_SALES_DATA = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return months.map((mName, mIdx) => {
      const mStr = String(mIdx + 1).padStart(2, '0')
      
      const dealsInMonth = repFilteredDeals.filter(d => {
        if (d.stage !== 'fechamento' && d.stage !== 'pos_venda') return false
        const dDate = new Date(d.created_at || d.stage_entered_at || Date.now())
        const y = dDate.getFullYear().toString()
        const m = String(dDate.getMonth() + 1).padStart(2, '0')
        if (selectedYear !== 'all' && y !== selectedYear) return false
        return m === mStr
      })

      const totalVal = dealsInMonth.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
      
      const dailyMap: Record<number, number> = {}
      for (let day = 1; day <= 31; day++) dailyMap[day] = 0

      dealsInMonth.forEach(d => {
        const dayNum = new Date(d.created_at || d.stage_entered_at || Date.now()).getDate()
        if (dailyMap[dayNum] !== undefined) {
          dailyMap[dayNum] += (d.final_value || d.estimated_value || 0)
        }
      })

      const daily = Object.keys(dailyMap).map(day => ({
        day: parseInt(day),
        value: dailyMap[parseInt(day)]
      }))

      return {
        month: mName,
        monthIndex: mIdx + 1,
        value: totalVal,
        dealsCount: dealsInMonth.length,
        daily
      }
    })
  }, [repFilteredDeals, selectedYear])

  // 2. Dynamic Team Performance (Performance dos Usuários do Sistema — Somente Fechamentos Reais)
  const TEAM_PERFORMANCE = useMemo(() => {
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''

    const repMap: Record<string, { name: string; role: string; closedCount: number; sales: number; avatarColor: string }> = {}
    
    // Lista inicial de Usuários Oficiais do Sistema (SEM incluir nomes de contatos/clientes)
    const baseSystemUsers = [
      { name: 'Maurício Maciel', role: 'Administrador', avatarColor: '#B4D932' },
      { name: 'Representante Teste', role: 'Representante Comercial', avatarColor: '#38bdf8' }
    ]

    baseSystemUsers.forEach(u => {
      const key = normalize(u.name)
      repMap[key] = { ...u, closedCount: 0, sales: 0 }
    })

    // Carrega usuários cadastrados na tela de Usuários (/users)
    if (typeof window !== 'undefined') {
      const keysToSearch = ['cp_crm_v7_official_users', 'crm_users']
      keysToSearch.forEach(key => {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            const list = JSON.parse(raw)
            if (Array.isArray(list)) {
              list.forEach((u: any) => {
                if (u.name) {
                  const cleanName = u.name.trim()
                  if (!cleanName.includes('Versapack')) {
                    const mapKey = normalize(cleanName)
                    const formattedRole = 
                      u.role === 'admin' || u.role === 'administrador' ? 'Administrador' :
                      u.role === 'vendedor' ? 'Vendedor Comercial' :
                      u.role === 'representante' ? 'Representante Comercial' : 'Usuário do Sistema'

                    if (!repMap[mapKey]) {
                      repMap[mapKey] = {
                        name: cleanName,
                        role: formattedRole,
                        closedCount: 0,
                        sales: 0,
                        avatarColor: '#B4D932'
                      }
                    } else {
                      repMap[mapKey].role = formattedRole
                    }
                  }
                }
              })
            }
          } catch (e) {}
        }
      })
    }

    // Carrega mapa de contatos para associar o cliente de fechamento ao seu representante correto da carteira
    const contactsMap = new Map<string, string>()
    if (typeof window !== 'undefined') {
      try {
        const rawC = localStorage.getItem('crm_contacts')
        if (rawC) {
          const cList = JSON.parse(rawC)
          cList.forEach((c: any) => {
            if (c.company && c.representative) {
              contactsMap.set(normalize(c.company), c.representative)
            }
            if (c.name && c.representative) {
              contactsMap.set(normalize(c.name), c.representative)
            }
            if (c.id && c.representative) {
              contactsMap.set(c.id, c.representative)
            }
          })
        }
      } catch (e) {}
    }

    // Processa APENAS vendas fechadas e credita unicamente se o responsável for um USUÁRIO DO SISTEMA válido
    pipelineDeals.forEach(d => {
      if (d.stage !== 'fechamento' && d.stage !== 'pos_venda') return

      const compName = normalize(d.contact?.company || d.title || '')
      const contactId = d.contact_id || d.contact?.id || ''

      const repFromCarteira = contactsMap.get(contactId) || contactsMap.get(compName)
      const assignedRepRaw = repFromCarteira || d.assigned_to || d.contact?.representative || ''
      const assignedRepNorm = normalize(assignedRepRaw)

      if (!assignedRepNorm) return

      const matchedUserKey = Object.keys(repMap).find(k => k === assignedRepNorm || assignedRepNorm.includes(k) || k.includes(assignedRepNorm))

      if (matchedUserKey && repMap[matchedUserKey]) {
        repMap[matchedUserKey].closedCount += 1
        repMap[matchedUserKey].sales += (d.final_value || d.estimated_value || 0)
      }
    })

    // Exibe no indicador da equipe apenas os representantes/vendedores comerciais ou usuários com vendas fechadas
    const commercialTeam = Object.values(repMap).filter(r => {
      const isCommercial = r.role !== 'Administrador' && r.role !== 'admin'
      const hasSales = r.closedCount > 0 || r.sales > 0
      return isCommercial || hasSales
    })

    return commercialTeam.map((r, idx) => ({ id: `rep-${idx}`, ...r }))
  }, [pipelineDeals])

  // 3. Dynamic Top Clients (Principais Clientes do Rep Selecionado — Somente Fechamentos Reais)
  const TOP_CLIENTS = useMemo(() => {
    const clientMap: Record<string, { name: string; value: number; type: string }> = {}

    repFilteredDeals.forEach(d => {
      if (d.stage !== 'fechamento' && d.stage !== 'pos_venda') return

      const name = d.contact?.company || d.contact?.name || d.title || 'Cliente'
      const val = d.final_value || d.estimated_value || 0
      const curve = d.contact?.curve ? `Curva ${d.contact.curve}` : 'Ativo'
      if (!clientMap[name]) {
        clientMap[name] = { name, value: 0, type: curve }
      }
      clientMap[name].value += val
    })

    const sorted = Object.values(clientMap).sort((a, b) => b.value - a.value).slice(0, 5)
    return sorted.map((cli, idx) => ({ rank: idx + 1, ...cli }))
  }, [repFilteredDeals])

  // 4. Dynamic Top Embalagens (Products do Rep Selecionado — Somente Fechamentos Reais)
  const TOP_PRODUCTS = useMemo(() => {
    const closedDeals = repFilteredDeals.filter(d => d.stage === 'fechamento' || d.stage === 'pos_venda')

    if (closedDeals.length === 0) {
      return []
    }

    const productMap: Record<string, { name: string; quantityCount: number; value: number }> = {}

    closedDeals.forEach(d => {
      const val = d.final_value || d.estimated_value || 0
      const rawType = (d as any).box_type || (d as any).product_name || ''

      let prodName = 'Caixas Cartão Duplex'
      if (rawType.includes('acoplada')) {
        prodName = 'Caixas Acopladas Micro-ondulado'
      } else if (rawType.includes('triplex')) {
        prodName = 'Caixas Cartão Triplex'
      } else if (rawType.includes('duplex')) {
        prodName = 'Caixas Cartão Duplex'
      } else if (d.title?.toLowerCase().includes('inpel') || d.contact?.company?.toLowerCase().includes('inpel')) {
        prodName = 'Caixas Master Papelão K200'
      } else if (d.title?.toLowerCase().includes('spezia') || d.contact?.company?.toLowerCase().includes('spezia')) {
        prodName = 'Caixas Térmicas EPS (Hortifruti)'
      }

      const qty = (d as any).quantity || Math.round(val / 2.8) || 1000

      if (!productMap[prodName]) {
        productMap[prodName] = { name: prodName, quantityCount: 0, value: 0 }
      }
      productMap[prodName].quantityCount += qty
      productMap[prodName].value += val
    })

    const sorted = Object.values(productMap).sort((a, b) => b.value - a.value)
    return sorted.map((prod, idx) => ({
      rank: idx + 1,
      name: prod.name,
      quantity: `${prod.quantityCount.toLocaleString('pt-BR')} un`,
      value: prod.value
    }))
  }, [repFilteredDeals])

  // Filter deals based on state
  const filteredDeals = mappedDeals.filter(deal => {
    const repNorm = (selectedRep || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const dealRepNorm = (deal.representative || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    const matchesRep = selectedRep === 'all' || dealRepNorm === repNorm || dealRepNorm.includes(repNorm) || repNorm.includes(dealRepNorm)
    const matchesCurve = selectedCurve === 'all' || deal.curve === selectedCurve
    return matchesRep && matchesCurve
  })

  // Compute stats dynamically from real pipeline deals
  const activeDealsCount = filteredDeals.filter(d => d.stage !== 'fechamento' && d.stage !== 'pos_venda' && d.stage !== 'perdido').length
  const inNegotiationCount = filteredDeals.filter(d => ['dinamica', 'potencial', 'visita', 'briefing', 'aprovacao'].includes(d.stage)).length
  
  const fechamentoValue = filteredDeals
    .filter(d => d.stage === 'fechamento' || d.stage === 'pos_venda')
    .reduce((acc, d) => acc + d.value, 0)
    
  const perdidoValue = filteredDeals
    .filter(d => d.stage === 'perdido')
    .reduce((acc, d) => acc + d.value, 0)

  // Connected Horizontal Funnel Stages
  const funnelSummary = [
    { key: 'leads', stage: 'Leads', count: filteredDeals.filter(d => d.stage === 'leads').length, value: filteredDeals.filter(d => d.stage === 'leads').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-leads)' },
    { key: 'prospect', stage: 'Prospect', count: filteredDeals.filter(d => d.stage === 'prospect').length, value: filteredDeals.filter(d => d.stage === 'prospect').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-prospect)' },
    { key: 'dinamica', stage: 'Dinâmica', count: filteredDeals.filter(d => d.stage === 'dinamica').length, value: filteredDeals.filter(d => d.stage === 'dinamica').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-dinamica)' },
    { key: 'potencial', stage: 'Potencial', count: filteredDeals.filter(d => d.stage === 'potencial').length, value: filteredDeals.filter(d => d.stage === 'potencial').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-potencial)' },
    { key: 'visita', stage: 'Visita', count: filteredDeals.filter(d => d.stage === 'visita').length, value: filteredDeals.filter(d => d.stage === 'visita').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-visita)' },
    { key: 'briefing', stage: 'Briefing', count: filteredDeals.filter(d => d.stage === 'briefing').length, value: filteredDeals.filter(d => d.stage === 'briefing').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-briefing)' },
    { key: 'aprovacao', stage: 'Aprovação', count: filteredDeals.filter(d => d.stage === 'aprovacao').length, value: filteredDeals.filter(d => d.stage === 'aprovacao').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-aprovacao)' },
    { key: 'fechamento', stage: 'Fechamento', count: filteredDeals.filter(d => d.stage === 'fechamento' || d.stage === 'pos_venda').length, value: filteredDeals.filter(d => d.stage === 'fechamento' || d.stage === 'pos_venda').reduce((acc, d) => acc + d.value, 0) || null, color: 'var(--stage-fechamento)' },
  ]

  const representatives = Array.from(new Set([
    ...mappedDeals.map(d => d.representative).filter(Boolean),
    ...contacts.map(c => c.representative).filter(Boolean)
  ]))

  const handleStartRecording = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'pt-BR'

        recognition.onresult = (event: any) => {
          let currentTranscript = ''
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript
          }
          setAudioTranscription(currentTranscript)
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          setIsRecording(false)
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsRecording(true)
      } catch (e) {
        console.error('Speech recognition start failed:', e)
        setIsRecording(true)
      }
    } else {
      setIsRecording(true)
    }
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    }
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
      stage: selectedPipelineStage,
      hasAudio: !!audioTranscription,
      photoUrl: photoUrl || null
    }

    const updatedContacts = contacts.map(c => {
      if (c.id === selectedContactId) {
        return {
          ...c,
          status: selectedPipelineStage === 'perdido' ? 'inativo' : 'ativo',
          pipelineStage: selectedPipelineStage,
          lastPurchaseDays: 1,
          activities: [checkinActivity, ...(c.activities || [])]
        }
      }
      return c
    })

    // Also update deal in pipeline if stored in cp_crm_pipeline_deals
    try {
      const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
      if (rawDeals) {
        const deals = JSON.parse(rawDeals)
        let found = false
        const updatedDeals = deals.map((d: any) => {
          if (d.contact_id === selectedContactId || d.company?.toLowerCase() === selectedContact.company?.toLowerCase()) {
            found = true
            return { ...d, stage: selectedPipelineStage, updated_at: new Date().toISOString() }
          }
          return d
        })
        if (!found && selectedContact) {
          updatedDeals.unshift({
            id: 'deal_' + Date.now(),
            title: selectedContact.company || selectedContact.name,
            contact_id: selectedContact.id,
            stage: selectedPipelineStage,
            estimated_value: 0,
            stage_entered_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            contact: {
              id: selectedContact.id,
              name: selectedContact.name,
              company: selectedContact.company,
              phone: selectedContact.phone,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          })
        }
        localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(updatedDeals))
        window.dispatchEvent(new Event('storage-deals-changed'))
      }
    } catch (e) {
      console.error('Error updating pipeline deals on checkin:', e)
    }

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


  const maxSalesValue = selectedDrilldownMonth 
    ? Math.max(...selectedDrilldownMonth.daily.map((d: any) => d.value), 1)
    : Math.max(...MONTHLY_SALES_DATA.map((m: any) => m.value), 1)

  // ==================== ROLE: REPRESENTANTE / VENDEDOR (MOBILE PORTAL) ====================
  if (currentUser?.role === 'representante' || currentUser?.role === 'vendedor') {
    const userRepNorm = currentUser?.name ? currentUser.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : ''
    const repAllContacts = contacts.filter(c => {
      if (!userRepNorm) return true
      const cRepNorm = (c.representative || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      return cRepNorm === userRepNorm || cRepNorm.includes(userRepNorm) || userRepNorm.includes(cRepNorm)
    })
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
      <div className="page-content animate-fade-in w-full h-full flex flex-col gap-4 max-w-[1400px] mx-auto px-3 sm:px-6 py-4 pb-28 md:pb-6 select-none">
        {/* Clean Page Title Header */}
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 shrink-0">
          <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
            {activeTab === 'dashboard' && 'Dashboard Comercial'}
            {activeTab === 'painel' && 'Painel do Representante'}
            {activeTab === 'mapa' && 'Mapa de Clientes'}
            {activeTab === 'clientes' && 'Carteira de Clientes'}
          </h1>
          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedContactId('')
                setAudioTranscription('')
                setPhotoUrl('')
                setShowCheckinModal(true)
              }}
              className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-2 cursor-pointer text-white font-bold shadow-lg"
            >
              <CheckCircle size={14} />
              <span>Registrar Atividade</span>
            </button>

            <InstallPWAButton variant="mobile_header" className="lg:hidden" />
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              className="lg:hidden p-2 rounded-xl text-[var(--gray2)] hover:text-[var(--white)] hover:bg-[var(--charcoal)] transition-all bg-transparent border border-[var(--line)] cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
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
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card p-4 flex flex-col gap-1.5 bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Total de Clientes</span>
                  <span className="text-2xl font-display font-black text-[var(--white)]">{repAllContacts.length}</span>
                </div>
                <div className="card p-4 flex flex-col gap-1.5 bg-[var(--card)] border border-[var(--line)]">
                  <span className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Atenção / Inativos</span>
                  <span className="text-2xl font-display font-black text-[var(--yellow)]">{repContactsNeedingAttention.length}</span>
                </div>
              </div>

              {/* Clientes Sem Contato / Em Risco de Inatividade */}
              <div className="card p-4 bg-[var(--card)] border border-[var(--line)] rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
                  <span className="text-xs font-bold text-[var(--white)] font-display flex items-center gap-2">
                    <AlertTriangle size={15} className="text-[var(--yellow)]" />
                    <span>Clientes Prioritários (Sem Contato &gt; 30 dias)</span>
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[var(--yellow)] bg-[var(--yellow)]/10 px-2 py-0.5 rounded-full border border-[var(--yellow)]/20">
                    {repContactsNeedingAttention.length} clientes
                  </span>
                </div>

                {repContactsNeedingAttention.length === 0 ? (
                  <div className="p-4 rounded-xl bg-black/20 border border-[var(--line)] text-center text-xs text-[var(--gray2)] font-mono">
                    ✓ Todos os clientes da sua carteira estão com compras/contatos em dia.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    {repContactsNeedingAttention.slice(0, 5).map(c => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--charcoal)] border border-[var(--line)]/60 hover:border-[var(--lime)]/30 transition-all">
                        <div className="min-w-0 pr-2">
                          <h4 className="text-xs font-bold text-[var(--white)] truncate">{c.company || c.name}</h4>
                          <p className="text-[10px] text-[var(--gray2)] font-mono mt-0.5">
                            {c.city} · Sem compra há {c.lastPurchaseDays || 30} dias
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedContactId(c.id)
                            setAudioTranscription('')
                            setPhotoUrl('')
                            setShowCheckinModal(true)
                          }}
                          className="btn btn-secondary text-[11px] py-1.5 px-3 shrink-0 flex items-center gap-1.5 cursor-pointer text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)] font-bold"
                        >
                          <CheckCircle size={13} />
                          <span>Registrar</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Últimas Atividades Registradas */}
              <div className="card p-4 bg-[var(--card)] border border-[var(--line)] rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
                  <span className="text-xs font-bold text-[var(--white)] font-display flex items-center gap-2">
                    <Clock size={15} className="text-[var(--lime)]" />
                    <span>Últimas Atividades Registradas</span>
                  </span>
                </div>

                {(() => {
                  const recentActivities = repAllContacts
                    .flatMap(c => (c.activities || []).map((act: any) => ({ ...act, clientCompany: c.company || c.name, clientId: c.id })))
                    .sort((a: any, b: any) => new Date(b.timestamp || Date.now()).getTime() - new Date(a.timestamp || Date.now()).getTime())
                    .slice(0, 5)

                  if (recentActivities.length === 0) {
                    return (
                      <div className="p-4 rounded-xl bg-black/20 border border-[var(--line)] text-center text-xs text-[var(--gray2)] font-mono">
                        Nenhuma atividade registrada recentemente na sua carteira.
                      </div>
                    )
                  }

                  return (
                    <div className="flex flex-col gap-2">
                      {recentActivities.map((act: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-[var(--charcoal)] border border-[var(--line)]/60 flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-[var(--lime)] truncate">{act.clientCompany}</span>
                            <span className="text-[10px] font-mono text-[var(--gray2)]">{act.date}</span>
                          </div>
                          <p className="text-[11px] text-[var(--white)] font-mono font-medium">{act.title}</p>
                          {act.description && (
                            <p className="text-[10px] text-[var(--gray)] font-mono line-clamp-1 italic">
                              "{act.description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          )}

          {/* TAB 2: CLIENTES LIST */}
          {activeTab === 'clientes' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              {/* Search input */}
              <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--line)] rounded-xl px-3.5 py-3 focus-within:border-[var(--lime)]/50 transition-colors">
                <Search size={14} className="text-[var(--gray2)] shrink-0" />
                <input 
                  type="text"
                  placeholder="Buscar cliente por nome, empresa ou cidade..."
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

              {/* List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredMobileContacts.map(contact => {
                  return (
                    <div key={contact.id} className="card p-4 border border-[var(--line)] bg-[var(--card)] flex flex-col justify-between gap-3 hover:border-[var(--lime)]/30 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[var(--white)] truncate">{contact.company || contact.name}</h4>
                          {contact.company && contact.name && (
                            <span className="text-[10px] font-mono text-[var(--gray)] block mt-0.5 truncate">Contato: {contact.name}</span>
                          )}
                          <span className="text-[10px] text-[var(--gray)] font-mono block">{contact.city}{contact.state ? ` · ${contact.state}` : ''}</span>
                        </div>
                        {(() => {
                          const s = contact.status || 'ativo'
                          if (s === 'prospeccao') return (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/15 text-amber-300 border border-amber-400/30 shrink-0">
                              Prospecção
                            </span>
                          )
                          if (s === 'inativo') return (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 shrink-0">
                              Inativo
                            </span>
                          )
                          return (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--lime)]/15 text-[var(--lime)] border border-[var(--lime)]/30 shrink-0">
                              Ativo
                            </span>
                          )
                        })()}
                      </div>

                      <div className="flex items-center justify-between text-[9px] font-mono text-[var(--gray2)] mt-1">
                        <span>Última compra:</span>
                        <span className="font-bold text-[var(--white)]">{contact.lastPurchaseDays ? `${contact.lastPurchaseDays}d sem comprar` : 'Sem compras'}</span>
                      </div>

                      <div className="border-t border-[var(--line)] pt-3 flex items-center justify-around gap-2">
                        {/* Google Maps Navigation */}
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${contact.company || contact.name} ${contact.city || ''}`)}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Navegar / Como chegar"
                          className="btn btn-secondary p-2 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[var(--lime)] text-[var(--lime)] transition-transform hover:scale-105"
                        >
                          <Navigation size={15} />
                        </a>
                        
                        {/* Phone Call */}
                        {contact.phone && (
                          <a 
                            href={`tel:${contact.phone.replace(/\D/g, '')}`}
                            title="Ligar para o Cliente"
                            className="btn btn-secondary p-2 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-sky-500 text-sky-400 transition-transform hover:scale-105"
                          >
                            <Phone size={15} />
                          </a>
                        )}

                        {/* WhatsApp (Original Green #25D366) */}
                        {contact.phone && (
                          <a 
                            href={whatsappLink(contact.phone, `Olá ${contact.name}, tudo bem?`)}
                            target="_blank"
                            rel="noreferrer"
                            title="Chamar no WhatsApp"
                            className="btn btn-secondary p-2 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[#25D366]/50 text-[#25D366] transition-transform hover:scale-105"
                          >
                            <WhatsappIcon size={16} className="text-[#25D366]" />
                          </a>
                        )}

                        {/* Check-in / Registrar Atividade */}
                        <button 
                          onClick={() => {
                            setSelectedContactId(contact.id)
                            setAudioTranscription('')
                            setPhotoUrl('')
                            setShowCheckinModal(true)
                          }}
                          title="Registrar Atividade"
                          className="btn btn-secondary p-2 flex-1 flex items-center justify-center rounded-lg border-[var(--line)] hover:border-[var(--lime)] text-[var(--lime)] transition-transform hover:scale-105"
                        >
                          <CheckCircle size={15} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {filteredMobileContacts.length === 0 && (
                  <div className="col-span-full card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MAPA INTERATIVO */}
          {activeTab === 'mapa' && (
            <div className={`flex-1 flex flex-col gap-3 h-full min-h-[450px] animate-fade-in ${isMobileMapFullscreen ? 'fixed inset-0 z-[99999] bg-[var(--charcoal)] p-4 max-w-none' : ''}`}>
              <div className="text-[10px] font-mono text-[var(--gray)] flex items-center justify-between px-1 shrink-0">
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-[var(--lime)]" />
                  <span>Clientes na sua carteira</span>
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
              <div className="flex-1 w-full rounded-2xl overflow-hidden border border-[var(--line)] relative min-h-[400px] bg-[var(--charcoal)]">
                <div ref={mobileMapContainerRef} className="w-full h-full min-h-[400px] z-10" />
              </div>
            </div>
          )}

          {/* TAB 4: DASHBOARD COMERCIAL EXCLUSIVO DO REPRESENTANTE */}
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-3 animate-fade-in w-full">
              {/* ── ROW 1: SUMMARY KPIS ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                <div className="card px-3.5 py-2.5 flex items-center justify-between border-[rgba(180,217,50,0.15)] bg-[var(--card)]">
                  <div>
                    <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Negócios Ativos</div>
                    <div className="text-xl font-display font-black text-[var(--lime)] mt-0.5">{activeDealsCount}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(180,217,50,0.1)] border border-[rgba(180,217,50,0.2)] flex items-center justify-center shrink-0">
                    <Package size={16} className="text-[var(--lime)]" />
                  </div>
                </div>

                <div className="card px-3.5 py-2.5 flex items-center justify-between border-[rgba(72,199,103,0.15)] bg-[var(--card)]">
                  <div>
                    <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Fechamentos (Mês)</div>
                    <div className="text-xl font-display font-black text-[var(--green)] mt-0.5">{formatCurrency(fechamentoValue)}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(72,199,103,0.1)] border border-[rgba(72,199,103,0.2)] flex items-center justify-center shrink-0">
                    <CheckCircle size={16} className="text-[var(--green)]" />
                  </div>
                </div>

                <div className="card px-3.5 py-2.5 flex items-center justify-between border-[rgba(240,196,25,0.15)] bg-[var(--card)]">
                  <div>
                    <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Em Negociação</div>
                    <div className="text-xl font-display font-black text-[var(--yellow)] mt-0.5">{inNegotiationCount}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(240,196,25,0.1)] border border-[rgba(240,196,25,0.2)] flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-[var(--yellow)]" />
                  </div>
                </div>

                <div className="card px-3.5 py-2.5 flex items-center justify-between border-[rgba(226,72,61,0.15)] bg-[var(--card)]">
                  <div>
                    <div className="text-[9px] font-mono text-[var(--gray2)] uppercase font-bold">Perdidos (Mês)</div>
                    <div className="text-xl font-display font-black text-[var(--red)] mt-0.5">{formatCurrency(perdidoValue)}</div>
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
                    <span className="text-[11px] font-bold font-display text-[var(--white)]">Funil de Vendas · Seus Negócios</span>
                  </div>
                  <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider">8 Etapas</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                  {funnelSummary.map(item => (
                    <div
                      key={item.key}
                      className="rounded-xl px-2.5 py-2 flex flex-col gap-1 border transition-all duration-200"
                      style={{
                        borderColor: `color-mix(in srgb, ${item.color} 25%, transparent)`,
                        background: `color-mix(in srgb, ${item.color} 6%, transparent)`,
                        borderTopColor: item.color,
                        borderTopWidth: '2px'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black font-display leading-none" style={{ color: item.color }}>
                          {item.count}
                        </span>
                        <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)` }}>
                          {getStageIcon(item.key, item.color)}
                        </div>
                      </div>
                      <div className="text-[8px] font-mono font-bold uppercase tracking-wide truncate" style={{ color: `color-mix(in srgb, ${item.color} 85%, var(--white))` }}>
                        {item.stage}
                      </div>
                      <div className="text-[9px] font-mono font-bold text-[var(--white)] truncate">
                        {item.value ? formatCurrency(item.value) : <span className="text-[var(--gray2)]">—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ROW 3: TOP CLIENTES & EMBALAGENS (LARGURA TOTAL) ── */}
              <div className="card p-3 flex flex-col justify-between bg-[var(--card)]">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Building size={13} className="text-[var(--lime)]" />
                    <span className="text-xs font-bold font-display text-[var(--white)]">Top Clientes</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Principais Clientes */}
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono text-[var(--gray2)] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Building size={10} className="text-[var(--lime)]" /> Principais Clientes
                    </div>
                    <div className="space-y-1">
                      {(() => {
                        const closedRepDeals = filteredDeals.filter(d => d.stage === 'fechamento' || d.stage === 'pos_venda')
                        if (closedRepDeals.length > 0) {
                          return closedRepDeals
                            .slice()
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 5)
                            .map((cli, idx) => ({
                              rank: idx + 1,
                              name: cli.title,
                              type: cli.curve ? `Curva ${cli.curve}` : 'Ativo',
                              value: cli.value
                            }))
                        }
                        return TOP_CLIENTS
                      })().map(cli => (
                        <div key={cli.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2">
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
                  <div className="space-y-1.5">
                    <div className="text-[8px] font-mono text-[var(--gray2)] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Layers size={10} className="text-[var(--lime)]" /> Embalagens mais Demandadas
                    </div>
                    <div className="space-y-1">
                      {TOP_PRODUCTS.map(prod => (
                        <div key={prod.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2">
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
          )}

        </div>

        {/* FIXED ELEGANT BOTTOM NAVIGATION BAR (SMALL SCREENS MOBILE ONLY) */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-[#161718]/95 backdrop-blur-xl border-t border-[var(--line)] flex justify-around items-center px-2 py-2 z-[9999] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          <button 
            onClick={() => setActiveTab('painel')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeTab === 'painel' 
                ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
                : 'text-[var(--gray2)] hover:text-white'
            }`}
          >
            <Target size={18} strokeWidth={activeTab === 'painel' ? 2.5 : 2} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Painel</span>
          </button>

          <button 
            onClick={() => setActiveTab('clientes')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeTab === 'clientes' 
                ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
                : 'text-[var(--gray2)] hover:text-white'
            }`}
          >
            <Users size={18} strokeWidth={activeTab === 'clientes' ? 2.5 : 2} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Clientes</span>
          </button>

          <button 
            onClick={() => setActiveTab('mapa')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeTab === 'mapa' 
                ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
                : 'text-[var(--gray2)] hover:text-white'
            }`}
          >
            <MapPin size={18} strokeWidth={activeTab === 'mapa' ? 2.5 : 2} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Mapa</span>
          </button>

          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
                : 'text-[var(--gray2)] hover:text-white'
            }`}
          >
            <BarChart3 size={18} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Dashboard</span>
          </button>

          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 text-[var(--gray2)] hover:text-red-400 cursor-pointer"
          >
            <LogOut size={18} />
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Sair</span>
          </button>
        </div>

        {/* Register Activity Modal */}
        <RegisterActivityModal
          isOpen={showCheckinModal}
          onClose={() => setShowCheckinModal(false)}
          onSuccess={() => setCompletedVisits(v => v + 1)}
          contactsList={contacts}
          preselectedContactId={selectedContactId}
        />
      </div>
    )
  }

  // ==================== ROLE: ADMIN / OUTROS (DESKTOP MAIN DASHBOARD - NO SCROLL) ====================
  if (!isSessionLoaded || !currentUser) {
    return (
      <div className="w-full h-[80vh] flex flex-col items-center justify-center gap-4 bg-[var(--black)]">
        <CartonPackLogo height={48} />
        <div className="flex items-center gap-2 text-[var(--lime)] font-mono text-xs">
          <div className="w-4 h-4 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />
          <span>Carregando Painel Comercial...</span>
        </div>
      </div>
    )
  }

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
            {currentUser?.role === 'representante' || currentUser?.role === 'vendedor' ? (
              <div className="text-xs font-mono text-[var(--lime)] font-bold px-1 select-none flex items-center gap-1">
                <User size={11} />
                <span>{currentUser.name}</span>
              </div>
            ) : (
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
            )}
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
                selectedDrilldownMonth.daily.map((d: any) => {
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
          {currentUser?.role === 'representante' || currentUser?.role === 'vendedor' ? (
            /* Visão Exclusiva de Vendedor/Representante: Separa Top Clientes de Top Embalagens lado a lado */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
              {/* CARD 1: Top Clientes */}
              <div className="card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-full">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Building size={13} className="text-[var(--lime)]" />
                    <span className="text-xs font-bold font-display text-[var(--white)]">Top Clientes</span>
                  </div>
                  <span className="text-[9px] font-mono text-[var(--lime)] font-bold">Fechamentos</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1 min-h-0">
                  {TOP_CLIENTS.length === 0 ? (
                    <div className="text-[10px] font-mono text-[var(--gray2)] py-4 italic text-center">Nenhum cliente com venda fechada no período.</div>
                  ) : (
                    TOP_CLIENTS.map(cli => (
                      <div key={cli.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2 hover:border-[var(--lime)]/30 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono text-[var(--lime)] font-black">#{cli.rank}</span>
                          <div className="text-xs font-bold text-[var(--white)] truncate">{cli.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[8px] font-mono bg-lime-500/10 text-[var(--lime)] px-1.5 py-0.5 rounded font-black border border-[var(--lime)]/10">{cli.type}</span>
                          <span className="text-[10px] font-mono font-bold text-[var(--lime)]">{formatCurrency(cli.value)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* CARD 2: Top Embalagens */}
              <div className="card p-3 flex flex-col justify-between overflow-hidden bg-[var(--card)] h-full">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <Layers size={13} className="text-[var(--lime)]" />
                    <span className="text-xs font-bold font-display text-[var(--white)]">Top Embalagens</span>
                  </div>
                  <span className="text-[9px] font-mono text-sky-400 font-bold">Mais Demandadas</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 mt-2 pr-1 min-h-0">
                  {TOP_PRODUCTS.length === 0 ? (
                    <div className="text-[10px] font-mono text-[var(--gray2)] py-4 italic text-center">Nenhuma embalagem demandada no período.</div>
                  ) : (
                    TOP_PRODUCTS.map(prod => (
                      <div key={prod.rank} className="p-2 rounded-xl border border-[var(--line)] bg-[var(--charcoal)] flex items-center justify-between gap-2 hover:border-[var(--lime)]/30 transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[9px] font-mono text-sky-400 font-black">#{prod.rank}</span>
                          <div className="text-xs font-bold text-[var(--white)] truncate">{prod.name}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <span className="text-[8px] font-mono bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded font-black border border-sky-500/10">{prod.quantity}</span>
                          <span className="text-[10px] font-mono font-bold text-[var(--lime)]">{formatCurrency(prod.value)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Visão Gestor/Admin: Exibe "Performance da Equipe" + "Top Clientes & Embalagens" lado a lado */
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
                          {rep.name.split(' ').map((p: any) => p[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--white)] truncate leading-tight">{rep.name}</div>
                          <div className="text-[8px] font-mono text-[var(--gray2)] truncate">{rep.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-right">
                        <div>
                          <div className="text-[7px] font-mono text-[var(--gray2)] uppercase">Fechamentos</div>
                          <div className="text-[10px] font-mono font-bold text-[var(--white)]">{rep.closedCount}</div>
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

              {/* COL 2: Top Clientes e Embalagens Combinados */}
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
                      {TOP_CLIENTS.length === 0 ? (
                        <div className="text-[10px] font-mono text-[var(--gray2)] py-2 italic text-center">Nenhum cliente com venda fechada no período.</div>
                      ) : (
                        TOP_CLIENTS.map(cli => (
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
                        ))
                      )}
                    </div>
                  </div>

                  {/* Embalagens Mais Demandadas */}
                  <div className="space-y-1 border-t border-[var(--line)] pt-2.5">
                    <div className="text-[8px] font-mono text-[var(--gray2)] uppercase font-bold tracking-wider flex items-center gap-1">
                      <Layers size={10} className="text-[var(--lime)]" /> Embalagens mais Demandadas
                    </div>
                    <div className="space-y-1">
                      {TOP_PRODUCTS.length === 0 ? (
                        <div className="text-[10px] font-mono text-[var(--gray2)] py-2 italic text-center">Nenhuma embalagem com venda fechada no período.</div>
                      ) : (
                        TOP_PRODUCTS.map(prod => (
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
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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
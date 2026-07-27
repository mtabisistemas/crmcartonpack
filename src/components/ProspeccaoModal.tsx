'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Search, Building2, MapPin, Map, CheckSquare, Square, UserPlus,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Sparkles,
  Users, Loader2, Circle, GitFork, Info, Eye, ExternalLink,
  Mail, Phone, Globe, Video, Share2, MessageCircle,
  TrendingUp, Users2, DollarSign, Activity, Award, Camera, Check, Copy, Maximize2, Minimize2
} from 'lucide-react'
import {
  prospectingService, enrichLead, SETORES_CNAE, LISTA_CNAES_OFFICIAL, REGIOES_SUGERIDAS,
  type ProspectLead, type SearchLeadsResponse, type RegiaoOption, type CnaeOfficial, normalizeText
} from '@/services/prospecting-service'
import { formatCnaeCode, formatCnaeFullString } from '@/lib/utils'
import { dbService } from '@/services/supabase-client'
import { toastService } from '@/services/toast-service'
import type { Usuario } from '@/types/crm'
import { createPipelineDeal, saveContactToCarteira } from '@/services/pipeline-service'
interface ProspeccaoModalProps {
  isOpen: boolean
  onClose: () => void
  usuarioLogado: Usuario
  usuariosDisponiveis: Usuario[]
  onLeadsImported?: () => void
}

const PORTES = ['todos', 'MEI', 'Pequena', 'Média', 'Grande']

const CITY_COORDS_MAP: Record<string, [number, number]> = {
  // Mato Grosso (MT)
  'lucas do rio verde-mt': [-13.0610, -55.9108],
  'lucas do rio verde': [-13.0610, -55.9108],
  'cuiaba-mt': [-15.6010, -56.0979],
  'cuiaba': [-15.6010, -56.0979],
  'varzea grande-mt': [-15.6464, -56.1325],
  'sinop-mt': [-11.8608, -55.5094],
  'sinop': [-11.8608, -55.5094],
  'rondonopolis-mt': [-16.4674, -54.6370],
  'sorriso-mt': [-12.5447, -55.7231],
  'primavera do leste-mt': [-15.5583, -54.2981],

  // Paraná (PR)
  'londrina-pr': [-23.3045, -51.1696],
  'londrina': [-23.3045, -51.1696],
  'curitiba-pr': [-25.4284, -49.2733],
  'curitiba': [-25.4284, -49.2733],
  'maringa-pr': [-23.42099, -51.93305],
  'maringa': [-23.42099, -51.93305],
  'cascavel-pr': [-24.9578, -53.4590],
  'ponta grossa-pr': [-25.0950, -50.1619],
  'foz do iguacu-pr': [-25.5163, -54.5854],

  // São Paulo (SP)
  'sao paulo-sp': [-23.5505, -46.6333],
  'campinas-sp': [-22.9099, -47.0626],
  'ribeirao preto-sp': [-21.1704, -47.8103],
  'sao jose dos campos-sp': [-23.1791, -45.8872],
  'sorocaba-sp': [-23.5015, -47.4526],
  'santos-sp': [-23.9608, -46.3331],

  // Santa Catarina (SC)
  'joinville-sc': [-26.3045, -48.8487],
  'florianopolis-sc': [-27.5954, -48.5480],
  'blumenau-sc': [-26.9194, -49.0661],
  'chapecó-sc': [-27.1004, -52.6152],
  'criciuma-sc': [-28.6775, -49.3703],

  // Rio Grande do Sul (RS)
  'porto alegre-rs': [-30.0346, -51.2177],
  'caxias do sul-rs': [-29.1688, -51.1796],
  'canoas-rs': [-29.9178, -51.1841],
  'gravatai-rs': [-29.9430, -50.9934],
  'novo hamburgo-rs': [-29.6842, -51.1313],
  'sao leopoldo-rs': [-29.7592, -51.1472],
  'sapucaia do sul-rs': [-29.8197, -51.1608],
  'esteio-rs': [-29.8622, -51.1578],

  // Minas Gerais (MG)
  'belo horizonte-mg': [-19.9167, -43.9345],
  'uberlandia-mg': [-18.9186, -48.2772],

  // Rio de Janeiro (RJ)
  'rio de janeiro-rj': [-22.9068, -43.1729],

  // Goiás (GO) & DF
  'goiania-go': [-16.6869, -49.2648],
  'brasilia-df': [-15.7975, -47.8919],
}

interface LeafletProspectMapProps {
  leads: ProspectLead[]
  selectedLeadCnpj: string | null
  onSelectLead: (lead: ProspectLead) => void
  onOpenDetails: (lead: ProspectLead) => void
  cidade: string
  estado: string
  isMapExpanded?: boolean
  onToggleExpand?: () => void
}

function LeafletProspectMap({ leads, selectedLeadCnpj, onSelectLead, onOpenDetails, cidade, estado, isMapExpanded, onToggleExpand }: LeafletProspectMapProps) {
  const mapRef = React.useRef<HTMLDivElement>(null)
  const mapInstanceRef = React.useRef<any>(null)
  const markersRef = React.useRef<Record<string, any>>({})

  const getCityCenter = (city?: string, uf?: string): [number, number] => {
    const rawStr = ((city || '') + ' ' + (uf || '')).toLowerCase().trim()
    const cleanStr = rawStr.replace(/[^a-z0-9]/g, '')

    // 1. Check exact match in CITY_COORDS_MAP
    for (const key of Object.keys(CITY_COORDS_MAP)) {
      const cleanKey = key.replace(/[^a-z0-9]/g, '')
      if (cleanStr.includes(cleanKey) || cleanKey.includes(cleanStr)) {
        return CITY_COORDS_MAP[key]
      }
    }

    // 2. Check state fallback
    if (rawStr.includes('mt') || cleanStr.includes('mt')) return [-13.0610, -55.9108] // Mato Grosso (Lucas do Rio Verde / Cuiabá)
    if (rawStr.includes('pr') || cleanStr.includes('pr')) return [-23.3045, -51.1696] // Paraná (Londrina / Curitiba)
    if (rawStr.includes('sp') || cleanStr.includes('sp')) return [-23.5505, -46.6333] // São Paulo
    if (rawStr.includes('sc') || cleanStr.includes('sc')) return [-27.0000, -50.0000] // Santa Catarina
    if (rawStr.includes('mg') || cleanStr.includes('mg')) return [-18.9186, -48.2772] // Minas Gerais
    if (rawStr.includes('go') || cleanStr.includes('go')) return [-16.6869, -49.2648] // Goiás
    if (rawStr.includes('ms') || cleanStr.includes('ms')) return [-20.4428, -54.6464] // Mato Grosso do Sul

    return [-29.8622, -51.1578] // Default RS
  }

  React.useEffect(() => {
    const L = (window as any).L
    if (!L || !mapRef.current) return

    const firstLead = leads[0]
    const center = getCityCenter(cidade || firstLead?.cidade, estado || firstLead?.estado)

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(center, 12)
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: 'abc',
        attribution: '&copy; OpenStreetMap'
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      mapInstanceRef.current = map
    }

    const map = mapInstanceRef.current
    if (map) {
      map.setView(center, 12)
      try { map.invalidateSize() } catch (e) {}
    }
    Object.values(markersRef.current).forEach((m: any) => {
      try { m.remove() } catch {}
    })
    markersRef.current = {}

    if (leads.length === 0) return

    const bounds = L.latLngBounds([])

    leads.forEach((lead, idx) => {
      const latOffset = (Math.sin(idx * 2.3 + lead.cnpj.length) * 0.018)
      const lngOffset = (Math.cos(idx * 1.7 + lead.cnpj.length) * 0.024)
      const lat = center[0] + latOffset
      const lng = center[1] + lngOffset

      const isSelected = selectedLeadCnpj === lead.cnpj

      // PIN LIMPO ESTILO GOOGLE MAPS (SEM TEXTO FIXO, APENAS O MARCADOR)
      const customIcon = L.divIcon({
        className: 'clean-google-pin',
        html: `
          <div style="
            width: 28px;
            height: 28px;
            background-color: ${isSelected ? '#10b981' : '#ea4335'};
            border: 2px solid #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 4px 10px rgba(0,0,0,0.35);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          ">
            <div style="width: 9px; height: 9px; background-color: #ffffff; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      })

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map)

      const displayName = lead.nome_fantasia && lead.nome_fantasia !== 'Não Disponível' ? lead.nome_fantasia : lead.razao_social

      const tooltipContent = `
        <div style="background:#ffffff; color:#0f172a; padding:10px 12px; border-radius:10px; font-family:sans-serif; min-width:210px; box-shadow:0 10px 25px rgba(0,0,0,0.25); border:1px solid #e2e8f0;">
          <h4 style="font-weight:800; color:#0f172a; margin:0 0 3px 0; font-size:13px; line-height:1.2;">${displayName}</h4>
          <div style="font-size:10px; color:#475569; margin:0 0 4px 0; font-weight:600;">${lead.razao_social}</div>
          <p style="font-size:11px; color:#64748b; margin:0 0 6px 0; display:flex; align-items:center; gap:4px;">
            <span>📍</span> <span>${lead.logradouro || ''} - ${lead.cidade}/${lead.estado}</span>
          </p>
          <div style="font-size:10px; color:#94a3b8; font-weight:600; padding-top:4px; border-top:1px solid #f1f5f9;">
            CNAE: ${lead.cnae_codigo} ${lead.cnae_descricao ? `• ${lead.cnae_descricao}` : ''}
          </div>
        </div>
      `

      // EXIBE DADOS APENAS AO PASSAR O MOUSE (HOVER TOOLTIP)
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -26],
        opacity: 1,
        className: 'google-map-tooltip'
      })

      marker.on('mouseover', () => {
        marker.openTooltip()
      })

      marker.on('click', () => {
        onSelectLead(lead)
        onOpenDetails(lead)
      })

      markersRef.current[lead.cnpj] = { marker, lat, lng }
      bounds.extend([lat, lng])
    })

    if (leads.length > 0) {
      map.fitBounds(bounds.pad(0.25))
    }
  }, [leads, selectedLeadCnpj, cidade, estado])

  React.useEffect(() => {
    if (selectedLeadCnpj && markersRef.current[selectedLeadCnpj] && mapInstanceRef.current) {
      const { marker, lat, lng } = markersRef.current[selectedLeadCnpj]
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 })
      marker.openPopup()
    }
  }, [selectedLeadCnpj])

  React.useEffect(() => {
    if (mapInstanceRef.current) {
      const resize = () => {
        try { mapInstanceRef.current.invalidateSize() } catch {}
      }
      resize()
      const t1 = setTimeout(resize, 50)
      const t2 = setTimeout(resize, 200)
      const t3 = setTimeout(resize, 500)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [isMapExpanded])

  return (
    <div
      className={isMapExpanded
        ? 'fixed inset-0 z-[100000] w-screen h-screen bg-[var(--charcoal)] flex flex-col p-0 m-0 border-0 rounded-none overflow-hidden animate-fade-in'
        : 'w-full h-full min-h-[340px] flex-1 rounded-xl overflow-hidden shadow-2xl relative border border-[var(--line)] group'
      }
    >
      {/* Header Superior Flutuante quando Fullscreen */}
      {isMapExpanded && (
        <div className="absolute top-4 left-4 z-[100001] bg-[var(--charcoal)]/90 backdrop-blur-md border border-[var(--line)] px-4 py-2.5 rounded-2xl flex items-center gap-3 shadow-2xl pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-[var(--lime)]/10 border border-[var(--lime)]/30 flex items-center justify-center text-[var(--lime)]">
            <MapPin size={18} />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm font-display leading-none">
              Mapa de Prospecção B2B - {cidade || 'Região'}
            </h3>
            <p className="text-[10px] font-mono text-[var(--lime)] mt-1">
              Exibindo {leads.length} empresas mapeadas em tela cheia
            </p>
          </div>
        </div>
      )}

      {/* Canvas Único e Estável do Leaflet (DOM Element permanece o mesmo) */}
      <div ref={mapRef} className="w-full h-full flex-1 relative" />

      {/* Botão Flutuante (AMPLIAR MAPA / MINIMIZAR) */}
      {onToggleExpand && (
        <div className="absolute top-4 right-4 z-[100001] pointer-events-auto">
          <button
            type="button"
            onClick={onToggleExpand}
            className="px-4 py-2.5 rounded-xl bg-black/90 backdrop-blur-md border border-[var(--lime)]/50 text-white font-mono text-xs font-black flex items-center gap-2 shadow-2xl transition-all hover:scale-105 cursor-pointer uppercase tracking-wider hover:bg-[var(--lime)] hover:text-black group"
            title={isMapExpanded ? 'Voltar para a visão do modal' : 'Ampliar mapa para a tela inteira'}
          >
            {isMapExpanded ? (
              <>
                <Minimize2 size={16} className="text-[var(--lime)] group-hover:text-black shrink-0" />
                <span>MINIMIZAR (VOLTAR AO MODAL)</span>
              </>
            ) : (
              <>
                <Maximize2 size={14} className="text-[var(--lime)] group-hover:text-black shrink-0" />
                <span>AMPLIAR MAPA</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export function ProspeccaoModal({
  isOpen,
  onClose,
  usuarioLogado,
  usuariosDisponiveis,
  onLeadsImported
}: ProspeccaoModalProps) {
  const [setorTexto, setSetorTexto] = useState('')
  const [showSetorDropdown, setShowSetorDropdown] = useState(false)
  const [cnaeMatches, setCnaeMatches] = useState<CnaeOfficial[]>([])
  const [regiaoTexto, setRegiaoTexto] = useState('')
  const [showRegiaoDropdown, setShowRegiaoDropdown] = useState(false)
  const [regiaoSuggestions, setRegiaoSuggestions] = useState<RegiaoOption[]>(REGIOES_SUGERIDAS)
  const [porte, setPorte] = useState('todos')
  const [viewMode, setViewMode] = useState<'split' | 'list'>('split')
  const [activeLeadMapCnpj, setActiveLeadMapCnpj] = useState<string | null>(null)
  // ── Controle de Busca (Sá³ exibe leads apá³s o Usuario clicar em "GERAR LEADS") ──
  const [hasSearched, setHasSearched] = useState(false)
  // ── Resultados ──
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchLeadsResponse | null>(null)
  const [leads, setLeads] = useState<ProspectLead[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  // ── Enriquecimento via Receita Federal ──
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [enrichedData, setEnrichedData] = useState<Record<string, Partial<ProspectLead>>>({})
  // ── Lead Ativo para Ficha Detalhada (Modal de Detalhes) ──
  const [activeLeadDetails, setActiveLeadDetails] = useState<ProspectLead | null>(null)
  const [isMapExpanded, setIsMapExpanded] = useState(false)
  const [isEnrichingActiveLead, setIsEnrichingActiveLead] = useState(false)

  const handleEnrichActiveLead = async (leadToEnrich: ProspectLead) => {
    if (!leadToEnrich || isEnrichingActiveLead) return
    setIsEnrichingActiveLead(true)
    try {
      const res = await fetch('/api/enrichment/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cnpj: leadToEnrich.cnpj,
          companyName: leadToEnrich.razao_social,
          tradeName: leadToEnrich.nome_fantasia,
          email: leadToEnrich.email,
          phone: leadToEnrich.telefone,
          city: leadToEnrich.cidade,
          state: leadToEnrich.estado
        })
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          const { website, instagram, linkedin, facebook, phone, email } = json.data
          const updatedLead = {
            ...leadToEnrich,
            site: website || leadToEnrich.site,
            instagram: instagram || leadToEnrich.instagram,
            linkedin: linkedin || leadToEnrich.linkedin,
            facebook: facebook || leadToEnrich.facebook,
            telefone: phone || leadToEnrich.telefone,
            email: email || leadToEnrich.email
          }
          setActiveLeadDetails(updatedLead)
          setLeads(prev => prev.map(l => l.cnpj === leadToEnrich.cnpj ? updatedLead : l))
        }
      }
    } catch (e) {
      console.warn('Auto enrichment error:', e)
    } finally {
      setIsEnrichingActiveLead(false)
    }
  }

  useEffect(() => {
    if (activeLeadDetails) {
      handleEnrichActiveLead(activeLeadDetails)
    }
  }, [activeLeadDetails?.cnpj])
  // ── Seleá§á£o e Distribuição ──
  const [selectedCnpjs, setSelectedCnpjs] = useState<string[]>([])
  const [vendedorId, setVendedorId] = useState<string>(usuariosDisponiveis[0]?.id || '')
  const [importing, setImporting] = useState(false)
  // Autocomplete de Setores (Seção 1) quando digita
  const query = setorTexto.trim().toLowerCase()
  const qNorm = normalizeText(setorTexto)
  const setorMatches = qNorm
    ? SETORES_CNAE.filter(s =>
        normalizeText(s.label).includes(qNorm) ||
        s.keywords.some(k => normalizeText(k).includes(qNorm))
      )
    : []
  // Autocomplete de CNAEs Oficiais do IBGE (Seção 2 - Busca em TODOS os 1.300+ CNAEs)
  useEffect(() => {
    if (!qNorm) {
      setCnaeMatches([])
      return
    }
    let isMounted = true
    prospectingService.searchCnaes(setorTexto).then(res => {
      if (isMounted) setCnaeMatches(res.slice(0, 15))
    })
    return () => { isMounted = false }
  }, [setorTexto, qNorm])
  const setoresPopulares = SETORES_CNAE
  // Autocomplete de regiões (Pesquisa em TODOS os 5.570 Municípios do IBGE + 27 UFs do Brasil sem acentos)
  useEffect(() => {
    let isMounted = true
    prospectingService.searchRegioes(regiaoTexto).then(res => {
      if (isMounted) setRegiaoSuggestions(res)
    })
    return () => { isMounted = false }
  }, [regiaoTexto])
  const [allLeads, setAllLeads] = useState<ProspectLead[]>([])

  const fetchLeads = useCallback(async (p = 1) => {
    try {
      setLoading(true)
      setHasSearched(true)
      setSelectedCnpjs([])

      // Busca conjunto total de até 50 leads da região para o mapa completo
      const dataAll = await prospectingService.searchLeads({
        setor_texto: setorTexto === 'Todos os setores' ? '' : setorTexto,
        regiao: regiaoTexto === 'Todo Brasil' ? '' : regiaoTexto,
        porte: porte === 'todos' ? '' : porte,
        page: 1,
        limit: 50,
      })
      setAllLeads(dataAll.leads)

      // Paginação visual de 10 em 10 na lista da esquerda
      const startIdx = (p - 1) * 10
      const pageLeads = dataAll.leads.slice(startIdx, startIdx + 10)
      setLeads(pageLeads.length > 0 ? pageLeads : dataAll.leads.slice(0, 10))
      
      setResult(dataAll)
      setCurrentPage(p)

      // Disparar enriquecimento em background
      dataAll.leads
        .filter(l => !l.isDuplicate && !l.enriched)
        .slice(0, 10)
        .forEach(lead => enrichLeadInBackground(lead.cnpj, lead.estado, lead.cidade, lead.cnae_codigo))
    } catch (e) {
      console.error(e)
      toastService.error('Erro ao buscar leads.')
    } finally {
      setLoading(false)
    }
  }, [setorTexto, regiaoTexto, porte])

  const enrichLeadInBackground = useCallback(async (cnpj: string, targetUf?: string, targetCity?: string, targetCnae?: string) => {
    setEnrichingIds(prev => new Set(prev).add(cnpj))
    const data = await enrichLead(cnpj)
    setEnrichingIds(prev => { const s = new Set(prev); s.delete(cnpj); return s })
    if (data && Object.keys(data).length > 0) {
      // Valida estritamente se o retorno da Receita Federal condiz com a região/CNAE do lead
      if (targetUf && data.estado && data.estado.toUpperCase() !== targetUf.toUpperCase()) return
      if (targetCity && data.cidade && !normalizeText(data.cidade).includes(normalizeText(targetCity)) && !normalizeText(targetCity).includes(normalizeText(data.cidade))) return
      
      const targetDigits = (targetCnae || '').replace(/\D/g, '')
      const extraDigits = (data.cnae_codigo || '').replace(/\D/g, '')
      if (targetDigits.length >= 4 && extraDigits.length >= 4 && !extraDigits.startsWith(targetDigits.slice(0, 4)) && !targetDigits.startsWith(extraDigits.slice(0, 4))) return

      setEnrichedData(prev => ({ ...prev, [cnpj]: data }))
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      // RESET COMPLETO AO ABRIR: Nenhuma pesquisa prévia
      setHasSearched(false)
      setResult(null)
      setLeads([])
      setSelectedCnpjs([])
      if (usuariosDisponiveis.length > 0 && !vendedorId) {
        setVendedorId(usuariosDisponiveis[0].id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  if (!isOpen) return null

  // Mesclar dados enriquecidos com trava de segurança de região/CNAE
  const getDisplayLead = (lead: ProspectLead): ProspectLead => {
    const extra = enrichedData[lead.cnpj] || {}
    if (extra.estado && lead.estado && extra.estado.toUpperCase() !== lead.estado.toUpperCase()) return lead
    if (extra.cidade && lead.cidade && !normalizeText(extra.cidade).includes(normalizeText(lead.cidade)) && !normalizeText(lead.cidade).includes(normalizeText(extra.cidade))) return lead
    return { ...lead, ...extra }
  }
  const toggleSelect = (cnpj: string, isDup?: boolean) => {
    if (isDup) return
    setSelectedCnpjs(prev => prev.includes(cnpj) ? prev.filter(c => c !== cnpj) : [...prev, cnpj])
  }
  const toggleSelectAll = () => {
    const valid = leads.filter(l => !l.isDuplicate).map(l => l.cnpj)
    const allSel = valid.every(c => selectedCnpjs.includes(c))
    setSelectedCnpjs(allSel ? [] : valid)
  }
  const handleDistribuir = async () => {
    if (!selectedCnpjs.length) { toastService.warning('Selecione ao menos 1 lead.'); return }
    if (!vendedorId) { toastService.warning('Selecione o responsá¡vel.'); return }
    const targetUser = usuariosDisponiveis.find(u => u.id === vendedorId)
    const targetLabel = targetUser?.nome || 'Responsá¡vel'
    try {
      setImporting(true)
      const toImport = leads
        .filter(l => selectedCnpjs.includes(l.cnpj))
        .map(l => getDisplayLead(l))
      for (const lead of toImport) {
        const novoCliente = await dbService.clientes.save({
          razao_social: lead.razao_social,
          cnpj: lead.cnpj,
          cidade: lead.cidade,
          estado: lead.estado,
          segmento: lead.setor,
          representante_id: targetUser?.papel === 'representante' ? targetUser.id : null,
          vendedor_interno_id: targetUser?.papel === 'vendedor_interno' ? targetUser.id : null,
          intervalo_medio_compras: null,
          classificacao_potencial: lead.porte === 'Grande' ? 'A' : lead.porte === 'Média' ? 'B' : 'C',
          volume_mensal: 0,
          principais_produtos: [lead.setor],
          exigencias_qualidade: `Prospecção B2B Real - CNAE: ${lead.cnae_codigo}`,
        })
        await dbService.orcamentos.save({
          cliente_id: novoCliente.id,
          responsavel_id: vendedorId,
          etapa_atual: 'solicitacao_briefing',
          probabilidade_fechamento: 3,
          valor_aprovado: null,
          data_fechamento: null,
          motivo_perda: null,
          justificativa_livre: `Lead real prospectado (${lead.setor} - ${lead.cidade}/${lead.estado}) e atribuído a ${targetLabel}.`,
        })
      }
      toastService.success(`ðŸš€ ${toImport.length} leads autênticos distribuídos para ${targetLabel}!`)
      if (onLeadsImported) onLeadsImported()
      await fetchLeads(currentPage)
    } catch (e) {
      console.error(e)
      toastService.error('Erro ao distribuir leads.')
    } finally {
      setImporting(false)
    }
  }
  // Estilo com centralizaá§á£o vertical perfeita dos á­cones nos inputs
  const inputContainerCls = "relative flex items-center w-full bg-[var(--black)] border border-[var(--line)] rounded-xl h-11 focus-within:border-[var(--lime)]/60 transition-all overflow-hidden"
  const activeDisplayLead = activeLeadDetails ? getDisplayLead(activeLeadDetails) : null
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[99999] flex flex-col items-center justify-start p-3 sm:p-5 overflow-y-auto animate-fade-in print:hidden">
      <div className="w-full max-w-6xl bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto relative max-h-[92vh]">
        {/* ── HEADER ── */}
        <div className="p-5 border-b border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center text-[var(--lime)] shrink-0">
              <Search size={20} />
            </div>
            <div>
              <h3 className="font-display text-base sm:text-lg text-white font-bold tracking-tight">
                Prospecção de Novos Clientes B2B
              </h3>
              <p className="text-[11px] text-[var(--gray2)] font-mono">
                Busca por setor CNAE  Pesquisa por Região & Cidade
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-[var(--line)] text-[var(--gray)] hover:text-white hover:border-red-500/50 transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>
        {/* ── FILTROS (EXACT ECONODATA STYLE COM áCONES 100% CENTRALIZADOS) ── */}
        <div className="p-5 bg-[var(--black)]/40 border-b border-[var(--line)] shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* 1. Setor, palavra-chave ou CNAE (5 cols) */}
            <div className="md:col-span-5 relative">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Setor, palavra-chave ou CNAE
              </label>
              <div className={inputContainerCls}>
                {/* ácone de Busca Perfeitamente Centralizado á  Esquerda */}
                <div className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none text-[var(--gray2)]">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  name="setor_prospeccao_fill"
                  id="setor_prospeccao_b2b"
                  autoComplete="off"
                  aria-autocomplete="none"
                  value={setorTexto}
                  onChange={e => { setSetorTexto(e.target.value); setShowSetorDropdown(true) }}
                  onFocus={() => setShowSetorDropdown(true)}
                  onBlur={() => setTimeout(() => setShowSetorDropdown(false), 200)}
                  placeholder="Todos os setores"
                  className="w-full bg-transparent border-none outline-none pl-10 pr-8 text-sm text-white placeholder-[var(--gray2)] h-full flex items-center leading-none py-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
                {setorTexto && (
                  <div className="absolute right-3 inset-y-0 flex items-center">
                    <button
                      onClick={() => { setSetorTexto(''); setShowSetorDropdown(false) }}
                      className="text-[var(--gray2)] hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              {/* Dropdown de Autocomplete (3 Seá§áµes Agrupadas: Setor ℹ️, CNAEs ℹ️, Palavras-chave ℹ️) */}
              {showSetorDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--line)] rounded-xl shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto animate-fade-in text-slate-200">
                  {/* QUANDO EM BRANCO: Exibe 'Setores mais buscados' */}
                  {!query ? (
                    <div>
                      <div className="px-4 py-2 text-[11px] font-bold text-slate-400 border-b border-[var(--line)]/50 bg-[var(--black)]/50 flex items-center justify-between">
                        <span>Setores mais buscados</span>
                      </div>
                      {setoresPopulares.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onMouseDown={() => {
                            setSetorTexto(s.label === 'Todos os setores' ? '' : s.label)
                            setShowSetorDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-[var(--lime)]/10 hover:text-white transition-colors border-b border-[var(--line)]/30 last:border-0 flex items-center gap-3 cursor-pointer"
                        >
                          <Circle size={14} className="text-[var(--gray2)] shrink-0" />
                          <span className="font-medium text-sm">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    /* QUANDO DIGITA: 3 SEá‡á•ES FIá‰IS AO ECONODATA (Setor ℹ️, CNAEs ℹ️, Palavras-chave ℹ️) */
                    <div className="divide-y divide-[var(--line)]/40">
                      {/* SEá‡áƒO 1: Setor ℹ️ */}
                      {setorMatches.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 border-b border-[var(--line)]/50 bg-[var(--black)]/50 flex items-center gap-1.5">
                            <span>Setor</span>
                            <Info size={12} className="text-[var(--gray2)]" />
                          </div>
                          {setorMatches.slice(0, 3).map((s, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={() => {
                                setSetorTexto(s.label)
                                setShowSetorDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-[var(--lime)]/10 hover:text-white transition-colors flex items-center gap-3 cursor-pointer"
                            >
                              <Circle size={14} className="text-slate-400 shrink-0" />
                              <span className="font-semibold text-sm">{s.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* SEá‡áƒO 2: CNAEs ℹ️ (Lista Oficial IBGE de Todos os CNAEs do Brasil) */}
                      {cnaeMatches.length > 0 && (
                        <div>
                          <div className="px-4 py-2 text-[11px] font-bold text-slate-400 border-b border-[var(--line)]/50 bg-[var(--black)]/50 flex items-center gap-1.5">
                            <span>CNAEs</span>
                            <Info size={12} className="text-[var(--gray2)]" />
                          </div>
                          {cnaeMatches.map((cnae, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onMouseDown={() => {
                                setSetorTexto(cnae.display)
                                setShowSetorDropdown(false)
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs hover:bg-[var(--lime)]/10 hover:text-white transition-colors flex items-start gap-2.5 cursor-pointer"
                            >
                              <GitFork size={14} className="text-slate-400 shrink-0 mt-0.5" />
                              <div className="leading-tight">
                                <span className="font-mono text-slate-300 font-bold">{cnae.display.split(') ')[0]}) </span>
                                <span className="text-slate-200">{cnae.display.split(') ')[1]}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {/* SEá‡áƒO 3: Palavras-chave ℹ️ */}
                      <div>
                        <div className="px-4 py-2 text-[11px] font-bold text-slate-400 border-b border-[var(--line)]/50 bg-[var(--black)]/50 flex items-center gap-1.5">
                          <span>Palavras-chave</span>
                          <Info size={12} className="text-[var(--gray2)]" />
                        </div>
                        <button
                          type="button"
                          onMouseDown={() => { setShowSetorDropdown(false) }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-[var(--lime)]/10 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer text-[var(--lime)] font-semibold"
                        >
                          <Search size={14} className="text-[var(--lime)] shrink-0" />
                          <span>&quot;{setorTexto}&quot;</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 2. Região (Combobox Estado/Cidade - 3 cols) */}
            <div className="md:col-span-3 relative">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Região
              </label>
              <div className={inputContainerCls}>
                {/* ácone de Mapa/Pin Perfeitamente Centralizado á  Esquerda */}
                <div className="absolute left-3.5 inset-y-0 flex items-center pointer-events-none text-[var(--gray2)]">
                  <MapPin size={16} />
                </div>
                <input
                  type="text"
                  name="regiao_prospeccao_fill"
                  id="regiao_prospeccao_b2b"
                  autoComplete="off"
                  aria-autocomplete="none"
                  value={regiaoTexto}
                  onChange={e => { setRegiaoTexto(e.target.value); setShowRegiaoDropdown(true) }}
                  onFocus={() => setShowRegiaoDropdown(true)}
                  onBlur={() => setTimeout(() => setShowRegiaoDropdown(false), 200)}
                  placeholder="Digite Estado ou Cidade..."
                  className="w-full bg-transparent border-none outline-none pl-10 pr-8 text-sm text-white placeholder-[var(--gray2)] h-full flex items-center leading-none py-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
                {regiaoTexto && regiaoTexto !== 'Todo Brasil' && (
                  <div className="absolute right-3 inset-y-0 flex items-center">
                    <button
                      onClick={() => { setRegiaoTexto('Todo Brasil'); setShowRegiaoDropdown(false) }}
                      className="text-[var(--gray2)] hover:text-white transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              {/* Dropdown de Região (Traz TODOS os 5.570 Municípios do IBGE + 27 Estados sem acentos) */}
              {showRegiaoDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[var(--card)] border border-[var(--line)] rounded-xl shadow-2xl z-50 overflow-hidden max-h-64 overflow-y-auto animate-fade-in">
                  {regiaoSuggestions.length > 0 ? (
                    regiaoSuggestions.map((r, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={() => {
                          setRegiaoTexto(r.label)
                          setShowRegiaoDropdown(false)
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-[var(--lime)]/10 hover:text-white transition-colors border-b border-[var(--line)]/30 last:border-0 flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          {r.tipo === 'Estado' ? (
                            <Map size={14} className="text-slate-400 shrink-0" />
                          ) : (
                            <MapPin size={14} className="text-[var(--lime)] shrink-0" />
                          )}
                          <span className="font-medium text-sm">{r.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--gray2)] bg-[var(--black)]/60 px-2 py-0.5 rounded border border-[var(--line)]">
                          {r.tipo}
                        </span>
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onMouseDown={() => {
                        setShowRegiaoDropdown(false)
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-slate-200 hover:bg-[var(--lime)]/10 hover:text-white transition-colors flex items-center gap-2.5 cursor-pointer text-[var(--lime)]"
                    >
                      <MapPin size={14} className="text-[var(--lime)] shrink-0" />
                      <span>{regiaoTexto}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {/* 3. Porte (2 cols) */}
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 block mb-1.5">
                Porte
              </label>
              <select
                value={porte}
                onChange={e => setPorte(e.target.value)}
                className="w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 h-11 text-sm text-white outline-none focus:border-[var(--lime)]/60 transition-all cursor-pointer"
              >
                {PORTES.map(p => (
                  <option key={p} value={p}>{p === 'todos' ? 'Qualquer Porte' : p}</option>
                ))}
              </select>
            </div>
            {/* 4. Botá£o Gerar Leads (2 cols) */}
            <div className="md:col-span-2">
              <button
                onClick={() => fetchLeads(1)}
                className="w-full h-11 btn btn-primary text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 rounded-xl cursor-pointer shadow-lg shadow-[rgba(180,217,50,0.15)]"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
                <span>{loading ? 'Buscando...' : 'GERAR LEADS'}</span>
              </button>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => { setSetorTexto(''); setRegiaoTexto(''); setPorte('todos'); setHasSearched(false); setResult(null); setLeads([]) }}
              className="text-xs font-mono text-[var(--gray2)] hover:text-white transition-all cursor-pointer underline underline-offset-2"
            >
              Limpar filtros
            </button>
          </div>
        </div>
        {/* ── áREA DE CONTEášDO E RESULTADOS (ROLAGEM COMPLETA HABILITADA SEM CORTES) ── */}
        <div className="p-4 space-y-3 flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* CASO 1: NENHUMA PESQUISA FOI FEITA AINDA (MANDATá“RIO) */}
          {!hasSearched && !loading && (
            <div className="py-16 text-center border border-dashed border-[var(--line)] rounded-2xl bg-[var(--black)]/40 p-8 space-y-3 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center text-[var(--lime)] mx-auto shadow-inner">
                <Search size={28} />
              </div>
              <h4 className="font-bold text-white text-base font-display">Pronto para prospectar novos clientes B2B</h4>
              <p className="text-xs text-[var(--gray2)] max-w-md mx-auto leading-relaxed">
                Preencha os filtros desejados acima (Setor, Região por Estado ou Cidade e Porte) e clique no botá£o <strong className="text-[var(--lime)] font-bold">&quot;GERAR LEADS&quot;</strong> para visualizar as empresas.
              </p>
            </div>
          )}
          {/* Resumo da Paginação & Switcher de Modo de Visualização */}
          {hasSearched && result && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono pb-1 border-b border-[var(--line)]/50">
              <div className="text-[var(--gray2)]">
                Exibindo <span className="text-[var(--lime)] font-bold">{leads.length}</span> de{' '}
                <span className="text-white font-bold">{result.totalFound}</span> empresas encontradas
                {' '} Página {result.currentPage} de {result.totalPages}
              </div>

              {/* Botões do Switcher estilo Google Places */}
              <div className="flex items-center gap-1.5 bg-[var(--black)] border border-[var(--line)] rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-[var(--lime)] text-black shadow-md'
                      : 'text-[var(--gray2)] hover:text-white'
                  }`}
                >
                  <Map size={14} />
                  <span>Mapa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-[var(--lime)] text-black shadow-md'
                      : 'text-[var(--gray2)] hover:text-white'
                  }`}
                >
                  <CheckSquare size={14} />
                  <span>Tabela</span>
                </button>
              </div>
            </div>
          )}
          {/* Conteúdo de Leads (Split View Google Places ou Tabela Simples) */}
          {loading ? (
            <div className="flex items-center justify-center py-14 gap-3 text-xs text-[var(--gray2)] font-mono">
              <Loader2 size={18} className="animate-spin text-[var(--lime)]" />
              <span>Consultando motor B2B e buscando dados reais da Receita Federal...</span>
            </div>
          ) : hasSearched && leads.length > 0 ? (
            viewMode === 'split' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 h-full overflow-hidden">
                {/* Painel da Esquerda (5 cols): Cards em Estilo Google Places */}
                {!isMapExpanded && (
                  <div className="lg:col-span-5 flex flex-col gap-3 overflow-y-auto pr-1.5 custom-scrollbar h-full transition-all duration-300">
                  {leads.map((leadRaw, idx) => {
                    const lead = getDisplayLead(leadRaw)
                    const isSelected = selectedCnpjs.includes(lead.cnpj)
                    const isFocused = activeLeadMapCnpj === lead.cnpj
                    const displayName = lead.nome_fantasia && lead.nome_fantasia !== 'Não Disponível' ? lead.nome_fantasia : lead.razao_social

                    return (
                      <div
                        key={lead.cnpj}
                        onClick={() => setActiveLeadMapCnpj(lead.cnpj)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative shrink-0 min-h-[110px] ${
                          isFocused
                            ? 'bg-[var(--card)] border-[var(--lime)] shadow-lg shadow-[rgba(180,217,50,0.15)] ring-1 ring-[var(--lime)]/50'
                            : isSelected
                            ? 'bg-[var(--lime)]/10 border-[var(--lime)]/40'
                            : 'bg-[var(--black)]/60 border-[var(--line)] hover:border-[var(--lime)]/40 hover:bg-[var(--card)]/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              disabled={!!lead.isDuplicate}
                              onClick={(e) => { e.stopPropagation(); toggleSelect(lead.cnpj, lead.isDuplicate) }}
                              className={`cursor-pointer ${lead.isDuplicate ? 'text-gray-600 cursor-not-allowed' : isSelected ? 'text-[var(--lime)]' : 'text-[var(--gray2)] hover:text-white'}`}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                            
                          </div>
                          <span className="text-[10px] font-mono text-[var(--gray2)]">{lead.cnpj}</span>
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-sm font-display leading-tight hover:text-[var(--lime)] transition-colors">
                            {displayName}
                          </h4>
                          <p className="text-[11px] text-[var(--gray2)] mt-0.5 uppercase font-mono tracking-tight truncate">
                            {lead.razao_social}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-slate-300 mt-2 font-medium">
                            <MapPin size={14} className="text-red-400 shrink-0" />
                            <span className="truncate">{lead.logradouro || `${lead.cidade}, ${lead.estado}`}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <Building2 size={12} className="text-[var(--lime)] shrink-0" />
                            <span className="truncate">{lead.cnae_descricao || lead.setor}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[var(--line)]/50 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {lead.telefone && (
                              <a
                                href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold flex items-center gap-1"
                                title="Chamar no WhatsApp"
                              >
                                <svg className="w-3.5 h-3.5 text-emerald-400 fill-current shrink-0" viewBox="0 0 24 24">
                                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                                </svg>
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveLeadMapCnpj(lead.cnpj)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <MapPin size={12} />
                              <span>Focar Mapa</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveLeadDetails(lead)
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--lime)] text-black font-black text-xs hover:brightness-110 flex items-center gap-1 cursor-pointer shadow-md"
                            >
                              <Eye size={12} />
                              <span>Ver Ficha</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                )}

                {/* Painel da Direita (12 ou 7 cols): Mapa Interativo Leaflet estilo Google Places */}
                <div className={`${isMapExpanded ? 'lg:col-span-12' : 'lg:col-span-7'} h-full min-h-0 flex flex-col overflow-hidden transition-all duration-300`}>
                  <LeafletProspectMap
                    leads={isMapExpanded ? (allLeads.length ? allLeads : (result?.leads || leads)) : leads}
                    selectedLeadCnpj={activeLeadMapCnpj}
                    onSelectLead={(l) => setActiveLeadMapCnpj(l.cnpj)}
                    onOpenDetails={(l) => setActiveLeadDetails(l)}
                    cidade={regiaoTexto}
                    estado=""
                    isMapExpanded={isMapExpanded}
                    onToggleExpand={() => setIsMapExpanded(v => !v)}
                  />
                </div>
              </div>
            ) : (
              /* Tabela Simples */
              <div className="border border-[var(--line)] rounded-xl overflow-x-auto bg-[var(--black)]/60 shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[var(--line)] font-bold text-slate-300 bg-[var(--card)] text-sm">
                      <th className="p-3 w-10 text-center">
                        <button onClick={toggleSelectAll} className="text-[var(--lime)] hover:text-white cursor-pointer" title="Selecionar todos os válidos">
                          <CheckSquare size={16} />
                        </button>
                      </th>
                      <th className="p-3">CNPJ e Nome</th>
                      <th className="p-3">Endereço</th>
                      <th className="p-3">CNAE e Setor</th>
                      <th className="p-3 text-right">Status / Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]/40">
                    {leads.map((leadRaw, idx) => {
                      const lead = getDisplayLead(leadRaw)
                      const isEnriching = enrichingIds.has(lead.cnpj)
                      const isSelected = selectedCnpjs.includes(lead.cnpj)
                      return (
                        <tr
                          key={lead.cnpj}
                          className={`transition-colors ${
                            lead.isDuplicate ? 'bg-amber-950/10 opacity-60' :
                            isSelected ? 'bg-[var(--lime)]/10' :
                            'hover:bg-[var(--card)]/80'
                          }`}
                        >
                          <td className="p-3 text-center">
                            <button
                              disabled={!!lead.isDuplicate}
                              onClick={() => toggleSelect(lead.cnpj, lead.isDuplicate)}
                              className={`cursor-pointer ${lead.isDuplicate ? 'text-gray-600 cursor-not-allowed' : isSelected ? 'text-[var(--lime)]' : 'text-[var(--gray2)] hover:text-white'}`}
                            >
                              {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                            </button>
                          </td>
                          <td className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] flex items-center justify-center font-bold text-xs text-[var(--lime)] shrink-0 mt-0.5 overflow-hidden shadow-inner">
                                {lead.razao_social.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="space-y-0.5">
                                <div className="font-mono text-[11px] text-[var(--gray2)] flex items-center gap-1.5">
                                  <span>{lead.cnpj}</span>
                                  {isEnriching && <Loader2 size={10} className="animate-spin text-sky-400 shrink-0" />}
                                </div>
                                <button
                                  onClick={() => setActiveLeadDetails(lead)}
                                  className="font-bold text-blue-400 hover:text-sky-300 text-sm text-left hover:underline transition-all block leading-tight cursor-pointer"
                                >
                                  {lead.nome_fantasia && lead.nome_fantasia !== 'Não Disponível' ? lead.nome_fantasia : lead.razao_social}
                                </button>
                                <div className="text-[10px] text-[var(--gray2)] uppercase font-mono tracking-tight max-w-xs truncate">
                                  {lead.razao_social}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-[11px] text-slate-300 font-semibold mb-0.5">
                              {lead.cep || '93.804-504'}
                            </div>
                            <div className="text-[11px] text-slate-200 max-w-xs truncate" title={lead.logradouro}>
                              {lead.logradouro || `Rua Nicolau Becker, 515 - ${lead.cidade}`}
                            </div>
                            <div className="text-[10px] text-[var(--gray2)] font-mono font-medium">
                              {lead.cidade}, {lead.estado}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="font-mono text-xs font-bold text-slate-200 mb-0.5">
                              {formatCnaeCode(lead.cnae_codigo)}
                            </div>
                            <div className="text-[11px] text-slate-300 font-medium leading-tight">
                              {lead.setor}
                            </div>
                            {lead.cnae_descricao && (
                              <div className="text-[10px] text-[var(--gray2)] mt-0.5 max-w-[180px] truncate" title={lead.cnae_descricao}>
                                {lead.cnae_descricao}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              {lead.isDuplicate && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold whitespace-nowrap">
                                  <AlertTriangle size={11} /> Já Cadastrado
                                </span>
                              )}
                              <button
                                onClick={() => setActiveLeadDetails(lead)}
                                className="text-[11px] text-blue-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium underline underline-offset-2"
                              >
                                <Eye size={12} /> Ver Ficha Completa
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : hasSearched ? (
            <div className="py-10 text-center space-y-3">
              <Building2 size={36} className="mx-auto text-[var(--gray)] mb-2" />
              <div className="text-sm font-semibold text-slate-300">Nenhuma empresa encontrada</div>
              <div className="text-xs text-[var(--gray2)] max-w-md mx-auto leading-relaxed">
                A busca por <span className="text-white font-bold">{setorTexto || 'este setor'}</span>{regiaoTexto ? <> em <span className="text-white font-bold">{regiaoTexto}</span></> : ''} não retornou empresas reais cadastradas na Receita Federal para esses filtros.
              </div>
              <div className="text-[11px] text-[var(--gray2)] max-w-sm mx-auto space-y-1 pt-1">
                <div>💡 <strong>Dicas para ampliar a busca:</strong></div>
                <div>• Tente buscar por um CNAE mais amplo (ex: só os primeiros 4 dígitos)</div>
                <div>• Selecione o estado inteiro em vez de uma cidade específica</div>
                <div>• Use uma palavra-chave diferente para o setor</div>
              </div>
            </div>
          ) : null}
          {/* Paginaá§á£o */}
          {hasSearched && result && (
            <div className="flex items-center justify-between pt-1">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => fetchLeads(currentPage - 1)}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} /> Anterior
              </button>
              <span className="text-[11px] font-mono text-[var(--gray2)]">
                Página <span className="text-white font-bold">{currentPage}</span> de {result.totalPages}
              </span>
              <button
                disabled={!result.hasMore || loading}
                onClick={() => fetchLeads(currentPage + 1)}
                className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)] font-bold"
              >
                PRÓXIMA (+10 LEADS) <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
        {/* ── BARRA DE DISTRIBUIá‡áƒO DO SUPERVISOR (Exibida somente se houver busca feita) ── */}
        {hasSearched && leads.length > 0 && (
          <div className="p-4 bg-[var(--card)] border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/20 flex items-center justify-center text-[var(--lime)]">
                <Users size={15} />
              </div>
              <div>
                <div className="text-xs font-bold text-white font-display">Distribuição pelo Supervisor Comercial</div>
                <div className="text-[10px] font-mono text-[var(--gray2)]">
                  {selectedCnpjs.length} lead(s) selecionado(s)  1ª etapa do Kanban (&quot;Leads Mapeados&quot;)
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-[var(--gray2)]">Atribuir a:</span>
                <select
                  value={vendedorId}
                  onChange={e => setVendedorId(e.target.value)}
                  className="bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--lime)]/50 cursor-pointer min-w-[240px] max-w-[320px] w-auto"
                >
                  {usuariosDisponiveis.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nome} ({u.papel === 'vendedor_interno' ? 'Vendedor' : u.papel === 'representante' ? 'Representante' : u.papel})
                    </option>
                  ))}
                </select>
              </div>
              <button
                disabled={!selectedCnpjs.length || importing}
                onClick={handleDistribuir}
                className="btn btn-primary py-2 px-5 text-xs font-black uppercase tracking-wider text-black flex items-center gap-2 rounded-xl shadow-lg shadow-[rgba(180,217,50,0.15)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {importing
                  ? <><Loader2 size={13} className="animate-spin" /><span>Distribuição...</span></>
                  : <><UserPlus size={13} /><span>Distribuir {selectedCnpjs.length} Lead(s) para Kanban</span></>
                }
              </button>
            </div>
          </div>
        )}
        {/* ── FICHA DO LEAD — LAYOUT 100% IDáŠNTICO á€ FICHA DO CLIENTE (ContactDrawer) ── */}
        {/* FICHA DETALHADA DO LEAD */}
        {activeDisplayLead && (
          <LeadDetailModal
            lead={activeDisplayLead}
            usuariosDisponiveis={usuariosDisponiveis}
            onClose={() => setActiveLeadDetails(null)}
            onLeadsImported={onLeadsImported}
          />
        )}
      </div>
    </div>
  )
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

interface LeadDetailModalProps {
  lead: ProspectLead
  usuariosDisponiveis: Usuario[]
  onClose: () => void
  onLeadsImported?: () => void
}

function LeadDetailModal({ lead, usuariosDisponiveis, onClose, onLeadsImported }: LeadDetailModalProps) {
  const [encaminharVendedor, setEncaminharVendedor] = useState(usuariosDisponiveis[0]?.id || '')
  const [encaminhando, setEncaminhando] = useState(false)
  const [encaminhadoOk, setEncaminhadoOk] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [showSideActivities, setShowSideActivities] = useState(false)

  // Extrai nome do sócio (QSA) se não houver contato_nome direto
  const responsavelNome = lead.contato_nome && lead.contato_nome !== 'Não Disponível'
    ? lead.contato_nome
    : (lead.qsa && lead.qsa[0] ? lead.qsa[0].nome_socio : 'Não Disponível')

  // WhatsApp link helper
  const whatsappLink = (phoneStr?: string) => {
    const digits = (phoneStr || '').replace(/\D/g, '')
    if (!digits) return '#'
    const full = digits.length <= 11 ? `55${digits}` : digits
    return `https://wa.me/${full}`
  }

  const handleCopyEmail = (emailStr: string) => {
    if (!emailStr) return
    navigator.clipboard.writeText(emailStr)
    setCopiedEmail(true)
    setTimeout(() => setCopiedEmail(false), 2000)
  }

  const handleEncaminhar = async () => {
    if (!encaminharVendedor) return
    setEncaminhando(true)
    try {
      const vendedor = usuariosDisponiveis.find(u => u.id === encaminharVendedor)
      const targetUser = vendedor
      const novoCliente = await dbService.clientes.save({
        razao_social: lead.razao_social,
        cnpj: lead.cnpj,
        cidade: lead.cidade,
        estado: lead.estado,
        segmento: lead.setor,
        representante_id: targetUser?.papel === 'representante' ? targetUser.id : null,
        vendedor_interno_id: targetUser?.papel === 'vendedor_interno' ? targetUser.id : null,
        intervalo_medio_compras: null,
        classificacao_potencial: (lead.porte as string) === 'Grande' ? 'A' : (lead.porte as string) === 'Média' ? 'B' : 'C',
        volume_mensal: 0,
        principais_produtos: [lead.setor],
        exigencias_qualidade: `Prospecção B2B Real - CNAE: ${lead.cnae_codigo}`,
      })
      await dbService.orcamentos.save({
        cliente_id: novoCliente.id,
        responsavel_id: encaminharVendedor,
        etapa_atual: 'solicitacao_briefing',
        probabilidade_fechamento: 3,
        valor_aprovado: null,
        data_fechamento: null,
        motivo_perda: null,
        justificativa_livre: `Lead prospectado (${lead.setor} - ${lead.cidade}/${lead.estado}) encaminhado para ${vendedor?.nome || 'vendedor'}.`,
      })
      setEncaminhadoOk(true)
      toastService.success(`Lead encaminhado para ${vendedor?.nome || 'vendedor'}!`)
      if (onLeadsImported) onLeadsImported()
      setTimeout(() => {
        setEncaminhadoOk(false)
        onClose()
      }, 1800)
    } catch {
      toastService.error('Erro ao encaminhar lead. Tente novamente.')
    } finally {
      setEncaminhando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100010] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl w-full max-w-[95vw] xl:max-w-6xl shadow-2xl flex flex-col gap-2.5 max-h-[96vh] overflow-hidden p-4 sm:p-5 text-[var(--white)] my-auto">

        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--line)] pb-2.5 px-2 shrink-0">
          <div>
            <h3 className="font-display text-sm sm:text-base text-[var(--white)] font-bold">{lead.razao_social}</h3>
            <p className="text-[11px] text-[var(--gray)] font-mono">Ficha Técnica e Cadastral Enriquecida do Lead Prospectado</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 3-Column Harmonious Grid Layout - 100% IDÊNTICO À FICHA DO CLIENTE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(96vh-140px)] pr-1">

          {/* COLUMN 1 & 2 (col-span-2): Dados Cadastrais & Atividades Econômicas */}
          <div className="lg:col-span-2 flex flex-col gap-3">

            {/* Card 1: Dados Cadastrais & Endereço */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais & Endereço</h4>

              {/* Razão Social */}
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa *</label>
                <input
                  type="text"
                  readOnly
                  className="bg-transparent border-b border-dashed border-[var(--line)] font-display text-xs text-[var(--white)] font-bold w-full pb-0.5 outline-none"
                  value={lead.razao_social}
                />
              </div>

              {/* Nome Fantasia + Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5"
                    value={lead.nome_fantasia || 'Não Disponível'}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Responsável (Pessoa Física) *</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-bold border-dashed border-[var(--lime)]"
                    value={responsavelNome || 'Não Disponível'}
                  />
                </div>
              </div>

              {/* CNPJ + Telefone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.cnpj}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      className="input text-xs py-1 px-2.5 pr-8 w-full"
                      value={lead.telefone || 'Não Informado'}
                    />
                    {lead.telefone && (
                      <a
                        href={whatsappLink(lead.telefone)}
                        target="_blank"
                        rel="noreferrer"
                        className="absolute right-2 text-emerald-400 hover:text-emerald-300 transition-transform hover:scale-110 cursor-pointer p-0.5"
                        title="Chamar no WhatsApp"
                      >
                        <WhatsappIcon size={15} />
                      </a>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                    {lead.email && (
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(lead.email || '')}
                        className="text-[9px] font-bold text-[var(--lime)] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                        title="Copiar E-mail"
                      >
                        {copiedEmail ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        <span>{copiedEmail ? 'COPIADO!' : 'COPIAR'}</span>
                      </button>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      readOnly
                      className="input text-xs py-1 px-2.5 w-full"
                      value={lead.email || 'Não Informado'}
                    />
                  </div>
                </div>
              </div>

              {/* Rua / Número + Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5"
                    value={lead.logradouro || 'Não Informado'}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5"
                    value={lead.bairro || '-'}
                  />
                </div>
              </div>

              {/* CEP | Cidade | UF | Mapa */}
              <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-end">
                <div className="flex flex-col gap-0.5 shrink-0 w-[100px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.cep || '-'}
                  />
                </div>

                <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5"
                    value={lead.cidade}
                  />
                </div>

                <div className="flex flex-col gap-0.5 shrink-0 w-[70px]">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-1.5 uppercase text-center font-bold font-mono w-full"
                    value={lead.estado}
                  />
                </div>

                <div className="flex flex-col gap-0.5 shrink-0 pb-0.5">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lead.logradouro, lead.bairro, lead.cidade, lead.estado, lead.cep].filter(Boolean).join(', '))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver endereço no mapa"
                    className="flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer transition-colors"
                  >
                    <MapPin size={16} />
                  </a>
                </div>
              </div>
            </div>

            {/* Card 2: Atividades Econômicas */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                <input
                  type="text"
                  readOnly
                  className="input text-xs py-1 px-2 font-mono"
                  value={lead.cnae_codigo
                    ? `${formatCnaeCode(lead.cnae_codigo)} - ${lead.cnae_descricao || lead.setor}`
                    : lead.setor || 'Não Informado'}
                />
              </div>

              {lead.cnaes_secundarios && lead.cnaes_secundarios.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowSideActivities(v => !v)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider font-mono transition-colors w-fit cursor-pointer"
                    style={{ color: showSideActivities ? 'var(--lime)' : 'var(--gray)' }}
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{ transform: showSideActivities ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >▶</span>
                    {showSideActivities ? 'Ocultar' : 'Ver'} secundárias ({lead.cnaes_secundarios.length})
                  </button>

                  {showSideActivities && (
                    <div className="flex flex-col gap-0 border border-[var(--line)] rounded-lg overflow-y-auto max-h-[120px]">
                      {lead.cnaes_secundarios.map((act, i) => (
                        <div
                          key={i}
                          className="flex gap-1.5 px-2 py-1 text-[11px] font-mono leading-tight"
                          style={{ background: i % 2 === 0 ? 'var(--card2)' : 'transparent' }}
                        >
                          <span className="text-[var(--lime)] font-bold shrink-0">{act.codigo}</span>
                          <span className="text-[var(--gray)] truncate">{act.descricao}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* COLUMN 3: Fiscal & Canais Digitais */}
          <div className="flex flex-col gap-3">

            {/* Card 1: Dados Fiscais & Status */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Dados Fiscais & Status</h4>
                {lead.cnpj && (
                  <a
                    href={`https://cnpja.com/office/${lead.cnpj.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-bold text-[var(--lime)] hover:text-white uppercase tracking-wider font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>CNPJá</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-5 gap-2">
                <div className="col-span-2 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.opcao_simples === 'OPTANTE' ? 'Simples' : (lead.opcao_mei === 'Sim' ? 'MEI' : 'Presumido')}
                  />
                </div>

                <div className="col-span-3 flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-bold w-full"
                    style={{
                      color: (lead.situacao || '').toLowerCase().includes('ativa') ? 'var(--green)' : 'var(--white)'
                    }}
                    value={lead.situacao || 'Ativa na Receita Federal'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Inscrição Estadual (IE)</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2 font-mono"
                    value={'IE'}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Especial</label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2"
                    value={lead.situacao_especial || 'Nenhuma'}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Canais Digitais & Redes */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Canais Digitais & Redes</h4>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <Globe size={11} className="text-[var(--lime)]" />
                    <span>Website</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.site ? `https://${lead.site.replace(/^https?:\/\//, '')}` : 'Não informado'}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#E1306C] fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    <span>Instagram</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.instagram || 'Não informado'}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#0A66C2] fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                    <span>LinkedIn</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.linkedin || 'Não informado'}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center gap-1">
                    <svg className="w-3 h-3 text-[#1877F2] fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    <span>Facebook</span>
                  </label>
                  <input
                    type="text"
                    readOnly
                    className="input text-xs py-1 px-2.5 font-mono"
                    value={lead.facebook || 'Não informado'}
                  />
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--card)] flex justify-between items-center gap-3 shrink-0 rounded-b-2xl">
          <button
            onClick={onClose}
            className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
          >
            FECHAR FICHA
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-[var(--gray2)]">Encaminhar para:</span>
            <select
              className="bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--lime)]/50 cursor-pointer min-w-[200px]"
              value={encaminharVendedor}
              onChange={(e) => setEncaminharVendedor(e.target.value)}
            >
              {usuariosDisponiveis.map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
            <button
              onClick={handleEncaminhar}
              disabled={encaminhando || encaminhadoOk || !encaminharVendedor}
              className="btn btn-primary text-xs py-2 px-5 font-bold uppercase tracking-wider text-black flex items-center gap-2 rounded-xl shadow-lg shadow-[rgba(180,217,50,0.15)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-w-[220px] justify-center"
            >
              {encaminhadoOk ? (
                <>
                  <CheckCircle size={14} />
                  <span>Encaminhado com Sucesso!</span>
                </>
              ) : encaminhando ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Encaminhando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  <span>ENCAMINHAR PARA ATENDIMENTO</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

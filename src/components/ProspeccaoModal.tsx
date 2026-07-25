'use client'
import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Search, Building2, MapPin, Map, CheckSquare, Square, UserPlus,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Sparkles,
  Users, Loader2, Circle, GitFork, Info, Eye, ExternalLink,
  Mail, Phone, Globe, Video, Share2, MessageCircle,
  TrendingUp, Users2, DollarSign, Activity, Award, Camera
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
  const fetchLeads = useCallback(async (p = 1) => {
    try {
      setLoading(true)
      setHasSearched(true)
      setSelectedCnpjs([])
      const data = await prospectingService.searchLeads({
        setor_texto: setorTexto === 'Todos os setores' ? '' : setorTexto,
        regiao: regiaoTexto === 'Todo Brasil' ? '' : regiaoTexto,
        porte: porte === 'todos' ? '' : porte,
        page: p,
        limit: 10,
      })
      setResult(data)
      setLeads(data.leads)
      setCurrentPage(p)
      // Disparar enriquecimento autêntico em background apenas se não estiver enriquecido
      data.leads
        .filter(l => !l.isDuplicate && !l.enriched)
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
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar flex-1">
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
          {/* Resumo da Paginaá§á£o (Quando já¡ buscou) */}
          {hasSearched && result && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="text-[var(--gray2)]">
                Exibindo <span className="text-[var(--lime)] font-bold">{leads.length}</span> de{' '}
                <span className="text-white font-bold">{result.totalFound}</span> empresas encontradas
                {' '} Página {result.currentPage} de {result.totalPages}
              </div>
            </div>
          )}
          {/* Tabela de Leads (Apá³s buscar - Rolagem interna liberada) */}
          {loading ? (
            <div className="flex items-center justify-center py-14 gap-3 text-xs text-[var(--gray2)] font-mono">
              <Loader2 size={18} className="animate-spin text-[var(--lime)]" />
              <span>Consultando motor B2B e buscando dados reais da Receita Federal...</span>
            </div>
          ) : hasSearched && leads.length > 0 ? (
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
                    const isEnriched = !!enrichedData[lead.cnpj]
                    const ranking = (currentPage - 1) * 10 + idx + 1
                    return (
                      <tr
                        key={lead.cnpj}
                        className={`transition-colors ${
                          lead.isDuplicate ? 'bg-amber-950/10 opacity-60' :
                          isSelected ? 'bg-[var(--lime)]/10' :
                          'hover:bg-[var(--card)]/80'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <button
                            disabled={!!lead.isDuplicate}
                            onClick={() => toggleSelect(lead.cnpj, lead.isDuplicate)}
                            className={`cursor-pointer ${lead.isDuplicate ? 'text-gray-600 cursor-not-allowed' : isSelected ? 'text-[var(--lime)]' : 'text-[var(--gray2)] hover:text-white'}`}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        {/* CNPJ e Nome */}
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
                        {/* Endereço */}
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
                        {/* CNAE e Setor */}
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
                        {/* Status / Ação */}
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
          ) : hasSearched ? (
            <div className="py-14 text-center text-xs text-[var(--gray2)] font-mono space-y-2">
              <Building2 size={32} className="mx-auto text-[var(--gray)] mb-3" />
              <div>Nenhuma empresa encontrada para os filtros aplicados.</div>
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-5xl bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[var(--white)] my-auto" style={{ width: '960px', maxWidth: '95vw' }}>

        {/* Header */}
        <div className="p-6 border-b border-[var(--line)] flex justify-between items-start bg-[var(--card)]">
          <div>
            <h2 className="font-display text-lg text-[var(--white)]">{lead.razao_social}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-5 animate-fade-in pb-4">

            {/* Dashboard 2-Column Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

              {/* LEFT COLUMN (2/3): Dados Cadastrais */}
              <div className="lg:col-span-2 flex flex-col gap-4">
                <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 flex-1">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais</h4>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa</label>
                    <input
                      type="text"
                      readOnly
                      className="bg-transparent border-b border-dashed border-[var(--line)] font-display text-sm text-[var(--white)] font-bold w-full pb-1 outline-none"
                      value={lead.razao_social}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={lead.nome_fantasia || 'Não Disponível'}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Responsável (Pessoa Física)</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={lead.contato_nome || 'Não Disponível'}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex flex-col gap-1.5 md:w-[155px] shrink-0">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5 font-mono"
                        value={lead.cnpj}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:w-[135px] shrink-0">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={lead.telefone || 'Não Informado'}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5 tracking-tight"
                        value={lead.email || 'Não Informado'}
                      />
                    </div>
                  </div>

                  {/* Rua + Bairro */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={lead.logradouro || 'Não Informado'}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={'-'}
                      />
                    </div>
                  </div>

                  {/* CEP + Cidade + UF + Mapa */}
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5" style={{ width: '110px', flexShrink: 0 }}>
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5 font-mono"
                        value={lead.cep || '-'}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5"
                        value={lead.cidade}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5" style={{ width: '88px', flexShrink: 0 }}>
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-xs py-1.5 uppercase text-center font-bold font-mono w-full"
                        value={lead.estado}
                      />
                    </div>
                    {/* Map icon */}
                    <div className="flex flex-col gap-1.5" style={{ flexShrink: 0 }}>
                      <label className="text-[9px] font-bold text-transparent uppercase font-mono tracking-wider select-none">·</label>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([lead.logradouro, lead.cidade, lead.estado, lead.cep].filter(Boolean).join(', '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver endereço no mapa"
                        className="flex items-center justify-center py-1.5 px-1 transition-colors text-[var(--lime)] hover:opacity-70 cursor-pointer"
                      >
                        <MapPin size={20} />
                      </a>
                    </div>
                  </div>

                </div>
              </div>

              {/* RIGHT COLUMN (1/3): Inscrições e Status */}
              <div className="flex flex-col gap-4">

                {/* Card: Regime Tributário */}
                <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
                  <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Regime Tributário</h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Opção pelo Simples</label>
                    <input
                      type="text"
                      readOnly
                      className="input text-xs py-1.5"
                      value={lead.opcao_simples || 'NAO OPTANTE'}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Opção MEI</label>
                      <input type="text" readOnly className="input text-xs py-1.5" value={lead.opcao_mei || 'Não'} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Porte</label>
                      <input type="text" readOnly className="input text-xs py-1.5" value={lead.porte || 'Pequena'} />
                    </div>
                  </div>
                </div>

                {/* Card: Inscrições Estaduais e Status */}
                <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 flex-1">
                  <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Inscrições Estaduais e Status</h4>
                    {lead.cnpj && (
                      <a
                        href={`https://cnpja.com/office/${lead.cnpj.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver no CNPJá"
                        className="text-[9px] font-bold text-[var(--gray2)] hover:text-[var(--lime)] transition-colors p-1"
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                    <input
                      type="text"
                      readOnly
                      className="input text-xs py-1.5 font-bold"
                      style={{ color: 'var(--green)' }}
                      value={lead.situacao || 'ATIVA na Receita Federal'}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Capital Social</label>
                    <input
                      type="text"
                      readOnly
                      className="input text-xs py-1.5 font-mono"
                      value={lead.capital_social || 'Não Disponível'}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Data Abertura</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-[10px] py-1.5 font-mono"
                        value={lead.data_abertura || '-'}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Natureza Jurídica</label>
                      <input
                        type="text"
                        readOnly
                        className="input text-[10px] py-1.5 truncate"
                        value={lead.natureza_juridica ? lead.natureza_juridica.replace('Sociedade ', 'Soc. ') : 'Ltda.'}
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Card: Canais Digitais & Redes */}
            <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Canais Digitais & Redes</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Website</label>
                  <input type="text" readOnly className="input text-xs py-1.5" value={lead.site ? `https://${lead.site.replace(/^https?:\/\//, '')}` : 'Não informado'} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Instagram</label>
                  <input type="text" readOnly className="input text-xs py-1.5" value={'Não informado'} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">LinkedIn</label>
                  <input type="text" readOnly className="input text-xs py-1.5" value={'Não informado'} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Facebook</label>
                  <input type="text" readOnly className="input text-xs py-1.5" value={'Não informado'} />
                </div>
              </div>
            </div>

            {/* Card: Atividades Econômicas */}
            <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                <input
                  type="text"
                  readOnly
                  className="input text-xs py-1.5 font-medium"
                  value={lead.cnae_codigo
                    ? `${formatCnaeCode(lead.cnae_codigo)} — ${lead.cnae_descricao || lead.setor}`
                    : lead.setor || 'Não Informado'}
                />
              </div>
              {(lead.faixa_funcionarios || lead.faturamento_estimado) && (
                <div className="grid grid-cols-2 gap-3 mt-1">
                  {lead.faixa_funcionarios && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Funcionários Estimados</label>
                      <input type="text" readOnly className="input text-xs py-1.5" value={lead.faixa_funcionarios} />
                    </div>
                  )}
                  {lead.faturamento_estimado && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Faturamento Estimado</label>
                      <input type="text" readOnly className="input text-xs py-1.5 font-bold font-mono" style={{ color: 'var(--green)' }} value={lead.faturamento_estimado} />
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--card)] flex justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="btn btn-secondary text-xs"
          >
            Fechar Ficha
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
              className="btn btn-primary text-xs flex items-center gap-2 min-w-[200px] justify-center"
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
                  <span>Encaminhar para Atendimento</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

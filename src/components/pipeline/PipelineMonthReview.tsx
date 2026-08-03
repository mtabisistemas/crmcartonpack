'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, TrendingUp, Trophy, XCircle, Clock, Target, BarChart3, ChevronDown } from 'lucide-react'
import { Deal, DealStage, STAGE_CONFIG, ACTIVE_STAGES, normalizeDealStage } from '@/types'
import { formatCurrency, isSameRepresentative } from '@/lib/utils'

interface MonthReviewProps {
  deals: Deal[]
  representativesList: string[]
  onClose: () => void
}

function FrozenDealCard({ deal }: { deal: Deal }) {
  const cfg = STAGE_CONFIG[deal.stage] || STAGE_CONFIG['leads']
  const value = (deal.final_value && deal.final_value > 0)
    ? deal.final_value
    : (deal.estimated_value && deal.estimated_value > 0 ? deal.estimated_value : 0)
  return (
    <div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--card)] shadow-sm flex flex-col gap-1.5 select-none" style={{ borderLeft: `3px solid ${cfg.color}` }}>
      <div className="text-xs font-bold text-[var(--white)] font-display uppercase tracking-tight leading-snug line-clamp-2">{deal.title}</div>
      {deal.assigned_to && <div className="text-[10px] text-[var(--gray2)] font-mono truncate">{deal.assigned_to}</div>}
      {value > 0 && <div className="text-[11px] font-bold text-[var(--lime)] font-mono mt-0.5">{formatCurrency(value)}</div>}
      {deal.order_number && <div className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md w-fit">#{deal.order_number}</div>}
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color = 'var(--lime)' }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="card p-4 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
          {icon}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gray2)]">{label}</span>
      </div>
      <div className="font-display font-black text-xl text-[var(--white)] leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[var(--gray2)] font-mono">{sub}</div>}
    </div>
  )
}

export function PipelineMonthReview({ deals, representativesList, onClose }: MonthReviewProps) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState<string>(String(now.getMonth() + 1).padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState<string>(String(now.getFullYear()))
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [monthMeta, setMonthMeta] = useState<number>(0)

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('cp_crm_metas') : null
      if (!raw) return
      const metas = JSON.parse(raw)
      if (!Array.isArray(metas)) return
      if (selectedRep === 'all') {
        const total = metas
          .filter((m: any) => String(m.year || m.ano || '') === selectedYear && String(m.month || m.mes || '').padStart(2, '0') === selectedMonth)
          .reduce((sum: number, m: any) => sum + Number(m.target || m.meta || m.value || 0), 0)
        setMonthMeta(total)
      } else {
        const match = metas.find((m: any) =>
          String(m.year || m.ano || '') === selectedYear &&
          String(m.month || m.mes || '').padStart(2, '0') === selectedMonth &&
          isSameRepresentative(m.representative || m.representante || '', selectedRep)
        )
        setMonthMeta(match ? Number(match.target || match.meta || match.value || 0) : 0)
      }
    } catch (e) { setMonthMeta(0) }
  }, [selectedMonth, selectedYear, selectedRep])

  const availableYears = useMemo(() => {
    const years = new Set<string>()
    deals.forEach(d => { const y = (d.created_at || d.stage_entered_at || '').slice(0, 4); if (y) years.add(y) })
    const sorted = Array.from(years).sort((a, b) => Number(b) - Number(a))
    if (!sorted.includes(String(now.getFullYear()))) sorted.unshift(String(now.getFullYear()))
    return sorted
  }, [deals])

  const MONTHS = [
    { value: '01', label: 'Janeiro' }, { value: '02', label: 'Fevereiro' }, { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' }, { value: '05', label: 'Maio' }, { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' }, { value: '11', label: 'Novembro' }, { value: '12', label: 'Dezembro' },
  ]
  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || selectedMonth

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      if (selectedRep !== 'all' && !isSameRepresentative(d.assigned_to || '', selectedRep)) return false
      const normalStage = normalizeDealStage(d.stage)
      const createdMatch = (d.created_at || '').startsWith(`${selectedYear}-${selectedMonth}`)
      const concludedInMonth = (normalStage === 'pedido' || normalStage === 'perdido') && (d.stage_entered_at || '').startsWith(`${selectedYear}-${selectedMonth}`)
      return createdMatch || concludedInMonth
    })
  }, [deals, selectedMonth, selectedYear, selectedRep])

  const kpis = useMemo(() => {
    const wonDeals = filteredDeals.filter(d => normalizeDealStage(d.stage) === 'pedido')
    const lostDeals = filteredDeals.filter(d => normalizeDealStage(d.stage) === 'perdido')
    const openDeals = filteredDeals.filter(d => { const s = normalizeDealStage(d.stage); return s !== 'pedido' && s !== 'perdido' })
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
    const lostValue = lostDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const openValue = openDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
    const totalConcluded = wonDeals.length + lostDeals.length
    const conversionRate = totalConcluded > 0 ? Math.round((wonDeals.length / totalConcluded) * 100) : 0
    const metaAchieved = monthMeta > 0 ? Math.round((wonValue / monthMeta) * 100) : null
    return { wonDeals, lostDeals, openDeals, wonValue, lostValue, openValue, conversionRate, metaAchieved }
  }, [filteredDeals, monthMeta])

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    ACTIVE_STAGES.forEach(s => { map[s] = [] })
    filteredDeals.forEach(d => {
      const s = normalizeDealStage(d.stage)
      if (map[s]) map[s].push(d)
      else map[s] = [d]
    })
    return map
  }, [filteredDeals])

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex flex-col overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line)] bg-[var(--charcoal)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--lime)]/15 border border-[var(--lime)]/30 flex items-center justify-center text-[var(--lime)]">
            <BarChart3 size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-[var(--white)]">Revisão de Fechamento — Pipeline</h2>
            <p className="text-[10px] text-[var(--gray2)] font-mono mt-0.5">{monthLabel} / {selectedYear} · Somente Leitura</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="relative">
            <select className="input text-xs py-1.5 pl-3 pr-7 appearance-none cursor-pointer" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}>
              {MONTHS.map(m => <option key={m.value} value={m.value} className="bg-[var(--charcoal)]">{m.label}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
          </div>
          <div className="relative">
            <select className="input text-xs py-1.5 pl-3 pr-7 appearance-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              {availableYears.map(y => <option key={y} value={y} className="bg-[var(--charcoal)]">{y}</option>)}
            </select>
            <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
          </div>
          {representativesList.length > 0 && (
            <div className="relative">
              <select className="input text-xs py-1.5 pl-3 pr-7 appearance-none cursor-pointer max-w-[160px]" value={selectedRep} onChange={e => setSelectedRep(e.target.value)}>
                <option value="all" className="bg-[var(--charcoal)]">Toda a Equipe</option>
                {representativesList.map(r => <option key={r} value={r} className="bg-[var(--charcoal)]">{r}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
            </div>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary p-2 rounded-lg cursor-pointer ml-2" title="Fechar revisão"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={<Trophy size={16} />} label="Ganhos" value={formatCurrency(kpis.wonValue)} sub={`${kpis.wonDeals.length} pedido${kpis.wonDeals.length !== 1 ? 's' : ''}`} color="#10b981" />
          <KpiCard icon={<XCircle size={16} />} label="Perdidos" value={`${kpis.lostDeals.length}`} sub={formatCurrency(kpis.lostValue) + ' em risco'} color="#e2483d" />
          <KpiCard icon={<Clock size={16} />} label="Em Aberto" value={`${kpis.openDeals.length}`} sub={formatCurrency(kpis.openValue) + ' potencial'} color="#f97316" />
          <KpiCard icon={<TrendingUp size={16} />} label="Conversão" value={`${kpis.conversionRate}%`} sub="Ganhos / (Ganhos + Perdidos)" color={kpis.conversionRate >= 50 ? '#10b981' : kpis.conversionRate >= 30 ? '#f97316' : '#e2483d'} />
          {monthMeta > 0 ? (
            <>
              <KpiCard icon={<Target size={16} />} label="Meta do Mês" value={formatCurrency(monthMeta)} sub="Cadastrada em Metas & Parâmetros" color="var(--lime)" />
              <KpiCard icon={<BarChart3 size={16} />} label="Atingimento" value={`${kpis.metaAchieved ?? 0}%`} sub={kpis.metaAchieved != null && kpis.metaAchieved >= 100 ? '🏆 Meta atingida!' : 'Faturado / Meta'} color={kpis.metaAchieved != null && kpis.metaAchieved >= 100 ? '#10b981' : kpis.metaAchieved != null && kpis.metaAchieved >= 70 ? '#f97316' : '#e2483d'} />
            </>
          ) : (
            <div className="col-span-2 card p-4 flex items-center gap-3 opacity-60">
              <Target size={16} className="text-[var(--gray2)] shrink-0" />
              <span className="text-[11px] text-[var(--gray2)] font-mono">Meta não cadastrada para {monthLabel}/{selectedYear}{selectedRep !== 'all' ? ` — ${selectedRep}` : ''}</span>
            </div>
          )}
        </div>

        {filteredDeals.length === 0 && (
          <div className="card p-10 flex flex-col items-center gap-3 text-center">
            <BarChart3 size={36} className="text-[var(--gray2)] opacity-40" />
            <p className="text-sm text-[var(--gray2)] font-mono">Nenhum negócio encontrado para {monthLabel}/{selectedYear}{selectedRep !== 'all' ? ` — ${selectedRep}` : ''}.</p>
          </div>
        )}

        {filteredDeals.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gray2)]">Kanban do período · {filteredDeals.length} negócio{filteredDeals.length !== 1 ? 's' : ''} · Somente leitura</span>
              <div className="h-px flex-1 bg-[var(--line)]" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-start">
              {ACTIVE_STAGES.map(stage => {
                const cfg = STAGE_CONFIG[stage]
                const stageDeals = dealsByStage[stage] || []
                const stageTotal = stageDeals.reduce((sum, d) => sum + (d.final_value || d.estimated_value || 0), 0)
                return (
                  <div key={stage} className="flex flex-col gap-2">
                    <div className="px-3 py-2 rounded-lg border flex flex-col gap-0.5" style={{ borderColor: `${cfg.color}30`, background: `color-mix(in srgb, ${cfg.color} 8%, var(--card))` }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md" style={{ background: `${cfg.color}20`, color: cfg.color }}>{stageDeals.length}</span>
                      </div>
                      {stageTotal > 0 && <div className="text-[10px] font-mono text-[var(--gray2)]">{formatCurrency(stageTotal)}</div>}
                    </div>
                    <div className="flex flex-col gap-2">
                      {stageDeals.length === 0
                        ? <div className="p-3 rounded-xl border border-dashed border-[var(--line)] text-center"><span className="text-[10px] text-[var(--gray2)] font-mono">Vazio</span></div>
                        : stageDeals.map(deal => <FrozenDealCard key={deal.id} deal={deal} />)
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

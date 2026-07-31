'use client'

import { useState, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Deal, DealStage, STAGE_CONFIG, FOLLOW_UP_LOST_REASONS } from '@/types'
import { formatCurrency, daysSince, isSameRepresentative, getUniqueCanonicalRepresentatives } from '@/lib/utils'
import { Plus, Clock, Trophy, XCircle, Search, Filter, Building2, Calendar } from 'lucide-react'
import { DealDrawer } from './DealDrawer'
import { PipelineCalendarModal } from './PipelineCalendarModal'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'
import { getPipelineDeals, savePipelineDeals, DEFAULT_PIPELINE_DEALS } from '@/services/pipeline-service'
import { supabase } from '@/services/supabase-client'

const isUUID = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// ─── Mock data ────────────────────────────────────────────────
const MOCK_DEALS: Deal[] = DEFAULT_PIPELINE_DEALS
// ─── Deal Card ────────────────────────────────────────────────
function DealCard({ deal, overlay = false, onCardClick }: { deal: Deal; overlay?: boolean; onCardClick?: (deal: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const cfg = STAGE_CONFIG[deal.stage]
  const days = daysSince(deal.stage_entered_at)
  const value = (deal.final_value && deal.final_value > 0) 
    ? deal.final_value 
    : (deal.estimated_value && deal.estimated_value > 0 ? deal.estimated_value : 0)

  const prob = deal.probability ?? 50

  const getProbBadgeStyle = (p: number) => {
    if (p <= 30) return 'border-red-500/40 text-red-400 bg-red-500/10'
    if (p <= 60) return 'border-amber-500/40 text-amber-400 bg-amber-500/10'
    if (p <= 80) return 'border-[var(--lime)]/40 text-[var(--lime)] bg-[var(--lime)]/10'
    return 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
  }

  // Buscar compromisso ativo da agenda para este negócio/cliente
  let agendaApt: any = null
  try {
    const rawApts = typeof window !== 'undefined' ? localStorage.getItem('cp_crm_appointments') : null
    if (rawApts) {
      const parsed = JSON.parse(rawApts)
      if (Array.isArray(parsed)) {
        const cleanTitle = (deal.title || '').trim().toLowerCase()
        agendaApt = parsed.find((a: any) => 
          a.status !== 'cancelado' && (
            (a.deal_id && a.deal_id === deal.id) ||
            (a.company_name && a.company_name.trim().toLowerCase() === cleanTitle) ||
            (a.deal_title && a.deal_title.trim().toLowerCase() === cleanTitle)
          )
        )
      }
    }
  } catch (e) {}

  const style = {
    ...(overlay ? {} : {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
    }),
    '--card-color': cfg.color,
  } as React.CSSProperties

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onCardClick?.(deal)}
      className="card p-3 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--lime)]/50 transition-all cursor-pointer shadow-sm animate-fade-in select-none group flex flex-col gap-1.5"
    >
      {/* Top Row: Client Name + Dynamic Colored Probability Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-bold text-[var(--white)] font-display uppercase tracking-tight leading-snug line-clamp-2 flex-1 group-hover:text-[var(--lime)] transition-colors">
          {deal.title}
        </div>

        <div className={`px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold shrink-0 ${getProbBadgeStyle(prob)}`}>
          {prob}%
        </div>
      </div>

      {/* Middle Row: Somente Compromisso da Agenda (com ícone de agenda + tipo, data e horário, sem título) */}
      {agendaApt && (
        <div className="text-[11px] text-[var(--gray)] font-mono truncate flex items-center gap-1.5 mt-0.5">
          <Calendar size={12} className="text-[var(--lime)] shrink-0" />
          <span className="truncate text-white/90 font-medium uppercase">
            {(agendaApt.type || 'VISITA').toUpperCase()} - {agendaApt.date.split('-').reverse().join('/')} às {agendaApt.time}
          </span>
        </div>
      )}

      {/* Thin Horizontal Line Divider */}
      <div className="border-t border-[var(--line)]/60 my-1.5" />

      {/* Bottom Row: Value (Menor) + Days */}
      <div className="flex items-center justify-between font-mono text-[11px]">
        <div className="font-bold text-white/90">
          {formatCurrency(value || 0)}
        </div>

        <div className="text-[10px] text-[var(--gray2)] font-mono">
          {days > 0 ? `Há ${days} dia${days > 1 ? 's' : ''}` : 'Hoje'}
        </div>
      </div>
    </div>
  )
}

// ─── Kanban Column ─────────────────────────────────────────────
function KanbanColumn({ 
  stage, 
  deals, 
  onCardClick, 
  onAddDeal 
}: { 
  stage: DealStage
  deals: Deal[]
  onCardClick: (deal: Deal) => void
  onAddDeal: (stage: DealStage) => void
}) {
  const cfg = STAGE_CONFIG[stage]
  const { setNodeRef } = useDroppable({ id: stage })
  const totalValue = deals.reduce((s, d) => s + (d.final_value ?? d.estimated_value ?? 0), 0)

  const style = {
    '--col-color': cfg.color,
  } as React.CSSProperties

  return (
    <div className="kanban-col" style={style}>
      <div className="kanban-col-header">
        <span className="kanban-col-icon">
          <cfg.icon size={14} />
        </span>
        <div className="kanban-col-info">
          <div className="kanban-col-title">
            {cfg.label}
          </div>
          {cfg.showValue && totalValue > 0 && (
            <div className="kanban-col-value">
              {formatCurrency(totalValue)}
            </div>
          )}
        </div>
        <div className="kanban-col-count" style={{ color: cfg.color, background: cfg.color + '15' }}>
          {deals.length}
        </div>
      </div>

      <div className="kanban-cards" ref={setNodeRef}>
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => (
            <DealCard key={deal.id} deal={deal} onCardClick={onCardClick} />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="kanban-empty">
            Nenhum negócio aqui
          </div>
        )}

        {/* Add button */}
        <button onClick={() => onAddDeal(stage)} className="kanban-add-btn">
          <Plus size={14} />
          <span>Adicionar</span>
        </button>
      </div>
    </div>
  )
}

// ─── Bottom Drop Zones (Won / Lost) ───────────────────────────
function BottomDropZones({ activeId }: { activeId: string | null }) {
  const { setNodeRef: setWonRef, isOver: isOverWon } = useDroppable({ id: 'drop-zone-pedido' })
  const { setNodeRef: setLostRef, isOver: isOverLost } = useDroppable({ id: 'drop-zone-perdido' })

  return (
    <div className={`fixed bottom-0 left-0 right-0 h-24 bg-neutral-900/90 border-t border-[var(--line)] backdrop-blur flex items-center justify-center gap-6 p-4 z-40 transition-transform duration-300 ${activeId ? 'translate-y-0' : 'translate-y-full'}`}>
      <div 
        ref={setWonRef} 
        className={`flex-1 max-w-sm h-full rounded-xl border flex items-center justify-center gap-2 font-display text-xs font-bold uppercase transition-all duration-200 ${
          isOverWon 
            ? 'bg-emerald-950/80 border-emerald-500 text-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20' 
            : 'bg-neutral-800/40 border-neutral-700/80 text-gray-400'
        }`}
      >
        <Trophy size={16} />
        <span>Ganho - Pedido</span>
      </div>

      <div 
        ref={setLostRef} 
        className={`flex-1 max-w-sm h-full rounded-xl border flex items-center justify-center gap-2 font-display text-xs font-bold uppercase transition-all duration-200 ${
          isOverLost 
            ? 'bg-rose-950/80 border-rose-500 text-rose-400 scale-[1.02] shadow-lg shadow-rose-500/20' 
            : 'bg-neutral-800/40 border-neutral-700/80 text-gray-400'
        }`}
      >
        <XCircle size={16} />
        <span>Perdido - Arquivar</span>
      </div>
    </div>
  )
}

// ─── Confirmation Modal Before Moving Stage ─────────────────────
function ConfirmMoveModal({
  deal,
  targetStage,
  onConfirm,
  onCancel
}: {
  deal: Deal
  targetStage: DealStage
  onConfirm: (orderNumber?: string) => void
  onCancel: () => void
}) {
  const currentStageConfig = STAGE_CONFIG[deal.stage]
  const targetStageConfig = STAGE_CONFIG[targetStage]
  const [orderNumber, setOrderNumber] = useState(deal.order_number || '')

  const isPedido = targetStage === 'pedido'
  const canConfirm = !isPedido || orderNumber.trim().length > 0

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[var(--charcoal)] border border-[var(--lime)]/30 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[var(--lime)]/10 border border-[var(--lime)]/30 flex items-center justify-center text-[var(--lime)] font-bold text-lg">
            {isPedido ? '📦' : '❓'}
          </div>
          <div>
            <h3 className="font-display text-base text-[var(--white)] font-bold">
              {isPedido ? 'Confirmar Fechamento do Pedido' : 'Confirmar Mudança de Etapa'}
            </h3>
            <p className="text-xs text-[var(--gray)] mt-0.5">
              {isPedido ? 'Informe o número oficial do pedido para registrar a venda.' : 'Confirma a movimentação deste negócio no pipeline?'}
            </p>
          </div>
        </div>

        <div className="p-3 bg-[var(--card)] border border-[var(--line)] rounded-xl text-xs space-y-2">
          <div>
            <span className="text-[var(--gray2)] font-mono uppercase text-[10px] block">Oportunidade:</span>
            <strong className="text-white text-sm font-bold uppercase">{deal.title}</strong>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--line)]">
            <div className="flex flex-col">
              <span className="text-[10px] text-[var(--gray2)] font-mono uppercase">Etapa Atual</span>
              <span className="font-bold text-xs" style={{ color: currentStageConfig?.color }}>{currentStageConfig?.label}</span>
            </div>

            <span className="text-[var(--lime)] font-bold text-sm">➔</span>

            <div className="flex flex-col text-right">
              <span className="text-[10px] text-[var(--gray2)] font-mono uppercase">Nova Etapa</span>
              <span className="font-bold text-xs" style={{ color: targetStageConfig?.color }}>{targetStageConfig?.label}</span>
            </div>
          </div>
        </div>

        {isPedido && (
          <div className="flex flex-col gap-1.5 bg-[var(--card)] p-3 rounded-xl border border-[var(--lime)]/40 animate-fade-in">
            <label className="text-xs font-mono font-bold text-[var(--lime)] uppercase flex items-center justify-between">
              <span>Número do Pedido *</span>
              <span className="text-[10px] text-amber-400 font-normal">Obrigatório</span>
            </label>
            <input
              type="text"
              autoFocus
              className="input uppercase text-sm font-mono font-bold text-[var(--white)] bg-[var(--charcoal)] border-[var(--line)] focus:border-[var(--lime)]"
              placeholder="Ex: PED-2026-8910"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2.5 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm(orderNumber.trim())}
            className={`btn py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-[#060606] transition-all ${
              canConfirm ? 'btn-primary cursor-pointer' : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
            }`}
          >
            Confirmar Mudança
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Order Celebration Modal (Visual WOW for Pedido Fechado) ───
function OrderCelebrationModal({
  deal,
  onClose
}: {
  deal: Deal
  onClose: () => void
}) {
  const val = (deal.final_value && deal.final_value > 0) ? deal.final_value : (deal.estimated_value || 0)

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-fade-in">
      {/* Floating Confetti Particles Layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(45)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-sm animate-confetti-fall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              width: `${Math.random() * 10 + 6}px`,
              height: `${Math.random() * 14 + 8}px`,
              backgroundColor: ['#B4D932', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'][i % 6],
              animationDuration: `${Math.random() * 3 + 2.5}s`,
              animationDelay: `${Math.random() * 1.5}s`,
              transform: `rotate(${Math.random() * 360}deg)`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 bg-[var(--charcoal)] border-2 border-[var(--lime)] rounded-3xl p-8 max-w-lg w-full text-center shadow-[0_0_80px_rgba(180,217,50,0.35)] flex flex-col items-center gap-5 animate-bounce-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--lime)] to-emerald-400 flex items-center justify-center text-[#060606] shadow-xl animate-pulse">
            <Trophy size={54} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-2 -right-2 bg-amber-400 text-black font-black text-xs px-2.5 py-1 rounded-full border border-amber-300 shadow-md">
            🎉 NOVO!
          </div>
        </div>

        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-[var(--lime)] uppercase bg-[var(--lime)]/10 px-3.5 py-1.5 rounded-full border border-[var(--lime)]/30">
            PEDIDO FECHADO COM SUCESSO!
          </span>
          <h2 className="font-display text-2xl md:text-3xl text-white font-extrabold mt-3 uppercase tracking-tight">
            {deal.title}
          </h2>
          {deal.contact?.company && (
            <p className="text-xs text-[var(--gray2)] mt-1 font-mono uppercase">
              {deal.contact.company}
            </p>
          )}
        </div>

        <div className="w-full bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex flex-col gap-2">
          {deal.order_number && (
            <div className="text-xs font-mono font-bold text-[var(--lime)] bg-[var(--charcoal)] px-3 py-1.5 rounded-xl border border-[var(--lime)]/30 w-fit mx-auto">
              Nº DO PEDIDO: <strong className="text-white ml-1 font-mono">{deal.order_number}</strong>
            </div>
          )}

          <span className="text-[10px] font-mono text-[var(--gray2)] uppercase">Valor do Pedido Fechado</span>
          <span className="font-display text-3xl font-black text-[var(--lime)] font-mono">
            {formatCurrency(val)}
          </span>
          {deal.assigned_to && (
            <span className="text-xs text-white font-bold mt-1 uppercase">
              Vendedor Responsável: {deal.assigned_to}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-primary w-full py-3.5 text-sm font-bold uppercase tracking-wider text-[#060606] shadow-xl cursor-pointer hover:scale-105 transition-transform"
        >
          Excelente! Continuar 🚀
        </button>
      </div>
    </div>
  )
}

// ─── Lost Reason Modal ─────────────────────────────────────────
function LostReasonModal({ 
  deal, 
  onConfirm, 
  onCancel 
}: { 
  deal: Deal 
  onConfirm: (reason: string, notes: string) => void 
  onCancel: () => void 
}) {
  const [availableReasons, setAvailableReasons] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    let list: string[] = []
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem('cp_crm_loss_reasons')
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            list = parsed.filter((r: any) => r.active !== false).map((r: any) => r.label)
          }
        } catch (e) {}
      }
    }
    if (list.length === 0) {
      list = [
        'Preço alto / Orçamento excedido',
        'Prazo de entrega não atende',
        'Concorrência ganhou o pedido',
        'Cliente desistiu / Sem demanda',
        'Especificação técnica incompatível',
        'Sem orçamento/verba',
        'Outro motivo'
      ]
    }
    setAvailableReasons(list)
    setReason(list[0] || 'Outro motivo')
  }, [])

  const handleSave = () => {
    const finalReason = (reason.includes('Outro') || reason === 'Outro motivo') && customReason.trim() ? customReason.trim() : reason
    onConfirm(finalReason, notes)
  }

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-[var(--charcoal)] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
            <XCircle size={22} />
          </div>
          <div>
            <h3 className="font-display text-base text-[var(--white)] font-bold">Informe o Motivo da Perda</h3>
            <p className="text-xs text-[var(--gray)] mt-0.5">Obrigatório para mover para <strong>Perdidos</strong>.</p>
          </div>
        </div>

        <div className="p-3 bg-[var(--card)] border border-[var(--line)] rounded-xl text-xs">
          <span className="text-[var(--gray2)] font-mono uppercase text-[10px]">Oportunidade:</span>
          <div className="text-white font-bold uppercase">{deal.title}</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label text-rose-400 font-bold">Motivo Principal da Perda *</label>
          <select 
            className="input text-xs font-bold" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
          >
            {availableReasons.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {reason === 'Outro motivo' && (
          <div className="flex flex-col gap-1.5 animate-fade-in">
            <label className="label">Especifique o Motivo *</label>
            <input 
              type="text" 
              className="input uppercase text-xs" 
              placeholder="Digite o motivo..."
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value.toUpperCase())}
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="label">Observações / Detalhes Comerciais (Opcional)</label>
          <textarea 
            className="input min-h-[70px] py-2 text-xs resize-none"
            placeholder="Detalhes adicionais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            className="btn btn-danger py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Confirmar Perda
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── New Deal Modal ────────────────────────────────────────────
function NewDealModal({
  initialStage = 'leads',
  onConfirm,
  onCancel
}: {
  initialStage?: DealStage
  onConfirm: (data: { title: string; contactName: string; company: string; value: number; stage: DealStage; contactId?: string; representative?: string }) => void
  onCancel: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [contactName, setContactName] = useState('')
  const [value, setValue] = useState(0)
  const [stage, setStage] = useState<DealStage>(initialStage)

  // Autocomplete contacts list state
  const [contactsList, setContactsList] = useState<{ id: string; company: string; name?: string; cnpj?: string; city?: string; state?: string; representative?: string }[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadContacts() {
      // 1. Supabase (Banco de dados oficial)
      try {
        const { supabase } = await import('@/services/supabase-client')
        if (supabase) {
          const { data, error } = await supabase
            .from('contacts')
            .select('id, company, name, cnpj, city, state, representative')
            .order('created_at', { ascending: false })
            .limit(500)

          if (!error && data && data.length > 0) {
            setContactsList(data)
            localStorage.setItem('crm_contacts', JSON.stringify(data))
            return
          }
        }
      } catch (e) {
        console.warn('Erro ao carregar contatos para autocomplete:', e)
      }

      // 2. Fallback local somente se o banco não retornar nada
      try {
        const raw = localStorage.getItem('crm_contacts')
        if (raw) {
          setContactsList(JSON.parse(raw))
        }
      } catch (e) {}
    }
    loadContacts()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // User role check for data isolation
  const userRaw = typeof window !== 'undefined' ? localStorage.getItem('crm_current_user') : null
  const currentUser = userRaw ? JSON.parse(userRaw) : null
  const isGestaoOuAdmin = !currentUser || currentUser.role === 'admin' || currentUser.role === 'gestor'
  const loggedUserRep = (currentUser?.name || '').trim().toLowerCase()

  // Buscar em tempo real na carteira completa de contatos (1.080 clientes)
  const filteredContacts = contactsList.filter(c => {
    const q = clientName.toLowerCase().trim()
    if (!q) return true
    const comp = (c.company || c.name || '').toLowerCase()
    const cnpj = (c.cnpj || '').replace(/\D/g, '')
    const city = (c.city || '').toLowerCase()
    return comp.includes(q) || cnpj.includes(q) || city.includes(q)
  })

  const [selectedContactObj, setSelectedContactObj] = useState<any>(null)
  const [clientError, setClientError] = useState<string>('')

  const handleSelectContact = (c: any) => {
    setSelectedContactObj(c)
    setClientError('')
    const companyTitle = (c.company || c.name || '').trim().toUpperCase()
    setClientName(companyTitle)

    const personName = (c.name || c.contact_name || c.responsible || c.contactName || '').trim().toUpperCase()
    if (personName) {
      setContactName(personName)
    } else {
      setContactName(companyTitle)
    }
    setShowDropdown(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setClientError('')

    const q = clientName.toLowerCase().trim()
    if (!q) {
      setClientError('Digite ou selecione o nome de um cliente cadastrado.')
      return
    }

    const foundContact = selectedContactObj || contactsList.find(c => {
      const comp = (c.company || c.name || '').toLowerCase().trim()
      const cnpj = (c.cnpj || '').replace(/\D/g, '')
      return comp === q || (cnpj && cnpj === q.replace(/\D/g, ''))
    })

    if (!foundContact) {
      setClientError('Cliente não cadastrado. Selecione obrigatoriamente um cliente já cadastrado da lista.')
      setShowDropdown(true)
      return
    }

    let matchedRep = foundContact.representative || (foundContact as any)?.assignedTo || (foundContact as any)?.assigned_to
    if (!matchedRep && currentUser?.name) {
      matchedRep = currentUser.name
    }

    const upperClient = (foundContact.company || foundContact.name || clientName).trim().toUpperCase()
    const targetContactName = contactName.trim() ? contactName.trim().toUpperCase() : (foundContact.name || upperClient)

    onConfirm({
      title: upperClient,
      contactName: targetContactName,
      company: upperClient,
      value,
      stage,
      contactId: foundContact.id,
      representative: matchedRep
    })
  }

  // Filter out Won/Lost stages from starting stages list
  const activeStages = Object.keys(STAGE_CONFIG).filter(s => s !== 'perdido' && s !== 'pos_venda') as DealStage[]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
        <div>
          <h3 className="font-display text-base text-[var(--white)] font-bold">Novo Negócio</h3>
          <p className="text-xs text-[var(--gray)] mt-1">Selecione um cliente cadastrado para a oportunidade.</p>
        </div>

        {/* Cliente / Empresa — Busca Autocomplete dos Contatos */}
        <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
          <label className="label">Nome do Cliente / Empresa *</label>
          <div className="relative flex items-center">
            <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] z-10 pointer-events-none" />
            <input 
              type="text" 
              required
              style={{ paddingLeft: '2.5rem' }}
              className="input font-bold w-full uppercase" 
              placeholder="Digite para buscar um cliente cadastrado..."
              value={clientName} 
              onChange={(e) => {
                const val = e.target.value.toUpperCase()
                setClientName(val)
                setClientError('')
                setShowDropdown(true)
                const matched = contactsList.find(c => (c.company || c.name || '').trim().toUpperCase() === val.trim())
                if (matched) {
                  setSelectedContactObj(matched)
                  const personName = (matched.name || (matched as any).contact_name || (matched as any).responsible || '').trim().toUpperCase()
                  if (personName) setContactName(personName)
                } else {
                  setSelectedContactObj(null)
                }
              }}
              onFocus={() => setShowDropdown(true)}
            />
          </div>

          {clientError && (
            <span className="text-[11px] font-bold text-red-400 animate-fade-in font-mono mt-0.5">
              ⚠ {clientError}
            </span>
          )}

          {/* Autocomplete Dropdown List */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-52 overflow-y-auto bg-[#141416] border border-[var(--line)] rounded-xl shadow-2xl divide-y divide-[var(--line)] animate-fade-in">
              {filteredContacts.length > 0 ? (
                <>
                  <div className="px-3 py-1.5 text-[10px] font-mono text-[var(--gray2)] uppercase tracking-wider bg-[var(--charcoal)] sticky top-0">
                    Selecione um Cliente Cadastrado ({filteredContacts.length})
                  </div>
                  {filteredContacts.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      onClick={() => handleSelectContact(c)}
                      className="p-3 hover:bg-[var(--lime)]/10 cursor-pointer transition-colors flex items-center justify-between gap-2 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-[var(--lime)] transition-colors truncate uppercase">
                          {c.company || c.name}
                        </div>
                        <div className="text-[10px] text-[var(--gray)] font-mono truncate mt-0.5 uppercase">
                          {c.cnpj ? `${c.cnpj} ` : ''}{c.city ? `• ${c.city.toUpperCase()}/${c.state ? c.state.toUpperCase() : ''}` : ''}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[var(--lime)] bg-[var(--lime)]/10 px-2 py-0.5 rounded border border-[var(--lime)]/20 shrink-0 opacity-80 group-hover:opacity-100">
                        Selecionar
                      </span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-xs font-mono text-amber-400 bg-[var(--charcoal)] flex flex-col gap-1">
                  <span>Nenhum cliente cadastrado encontrado.</span>
                  <span className="text-[10px] text-[var(--gray2)] font-sans">Cadastre o cliente na página de Contatos para vinculá-lo ao funil.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label">Nome do Contato</label>
            <input 
              type="text" 
              className="input uppercase" 
              placeholder="Ex: ALBERTO SOUZA (opcional)"
              value={contactName} 
              onChange={(e) => setContactName(e.target.value.toUpperCase())}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">Valor Estimado (R$)</label>
            <input 
              type="number" 
              className="input" 
              placeholder="0"
              value={value || ''} 
              onChange={(e) => setValue(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Etapa Inicial</label>
          <select 
            className="input" 
            value={stage} 
            onChange={(e) => setStage(e.target.value as DealStage)}
          >
            {activeStages.map(s => (
              <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2.5 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-[#060606]"
          >
            Criar Negócio
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────
export function PipelineBoard() {
  const [deals, setDeals] = useState<Deal[]>(() => getPipelineDeals(MOCK_DEALS))

  useEffect(() => {
    async function loadSupabaseDeals() {
      try {
        const res = await fetch('/api/deals', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.deals) && json.deals.length > 0) {
          let contacts: any[] = []
          try {
            const raw = localStorage.getItem('crm_contacts')
            if (raw) contacts = JSON.parse(raw)
          } catch (e) {}

          const mappedDeals: Deal[] = json.deals.map((item: any) => {
            const comp = (item.title || '').trim().toLowerCase()
            const matched = contacts.find((c: any) =>
              (item.contact_id && c.id === item.contact_id) ||
              (comp && (c.company || c.name || '').trim().toLowerCase() === comp)
            )

            const normalizedStage = item.stage === 'pos_venda' ? 'pedido' : item.stage

            return {
              id: item.id,
              title: item.title,
              contact_id: item.contact_id || matched?.id || `c_${Date.now()}`,
              stage: normalizedStage as DealStage,
              position: item.position || 0,
              estimated_value: item.estimated_value || 0,
              final_value: item.final_value || 0,
              probability: typeof item.probability === 'number' ? item.probability : (item.probability ? parseInt(item.probability) : 50),
              assigned_to: item.assigned_to || matched?.representative || '',
              stage_entered_at: item.stage_entered_at || item.created_at || new Date().toISOString(),
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || new Date().toISOString(),
              contact: {
                id: item.contact_id || matched?.id || `c_${Date.now()}`,
                name: matched?.name || item.title,
                company: matched?.company || item.title,
                phone: matched?.phone || '',
                email: matched?.email || '',
                cnpj: matched?.cnpj || '',
                address: matched?.address || '',
                bairro: matched?.bairro || '',
                cep: matched?.cep || '',
                city: matched?.city || '',
                state: matched?.state || '',
                curve: matched?.curve || 'C',
                representative: item.assigned_to || matched?.representative || ''
              } as any
            }
          })
          setDeals(mappedDeals)
          if (typeof window !== 'undefined') {
            localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(mappedDeals))
          }
        } else {
          // Populate defaults if API has 0 deals
          const initialDeals = getPipelineDeals(MOCK_DEALS)
          setDeals(initialDeals)
          fetch('/api/deals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialDeals)
          }).catch(e => console.error('Error seeding initial deals:', e))
        }
      } catch (e) {
        console.error('Error fetching deals from API:', e)
      }
    }

    loadSupabaseDeals()

    const syncDeals = () => {
      const latestDeals = getPipelineDeals(MOCK_DEALS)
      setDeals(latestDeals)
    }
    window.addEventListener('storage-deals-changed', syncDeals)
    window.addEventListener('storage', syncDeals)
    return () => {
      window.removeEventListener('storage-deals-changed', syncDeals)
      window.removeEventListener('storage', syncDeals)
    }
  }, [])

  const updateAndSaveDeals = (updater: Deal[] | ((prev: Deal[]) => Deal[])) => {
    setDeals(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      savePipelineDeals(next)
      fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      }).catch(err => console.error('API deal save error:', err))
      return next
    })
  }
  const [activeId, setActiveId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  // @dnd-kit uses a global counter for aria-describedby IDs that differs between
  // SSR and client, causing a hydration mismatch. Rendering the DndContext only
  // after mount eliminates the discrepancy entirely.
  useEffect(() => { setMounted(true) }, [])
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  // Modals state
  const [pendingMove, setPendingMove] = useState<{ deal: Deal; targetStage: DealStage } | null>(null)
  const [lostModalDeal, setLostModalDeal] = useState<Deal | null>(null)
  const [celebrationDeal, setCelebrationDeal] = useState<Deal | null>(null)
  const [showNewDealModal, setShowNewDealModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [activityPreselectedClient, setActivityPreselectedClient] = useState('')
  const [contactsList, setContactsList] = useState<any[]>([])
  const [newDealStage, setNewDealStage] = useState<DealStage>('leads')

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedMonth, setSelectedMonth] = useState<string>('all')
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [selectedCurve, setSelectedCurve] = useState<string>('all')
  const [representativesList, setRepresentativesList] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          const user = JSON.parse(session)
          setCurrentUser(user)
          const role = (user?.role || '').toLowerCase()
          if (user?.name && (role === 'representante' || role === 'vendedor')) {
            setSelectedRep(user.name)
          }
        } catch (e) {}
      }
    }
  }, [])

  const roleLower = (currentUser?.role || '').toLowerCase()
  const isRep = roleLower === 'representante' || roleLower === 'vendedor'

  useEffect(() => {
    const fetchUsers = async () => {
      let repsFromUsers: string[] = []
      try {
        const res = await fetch('/api/users')
        if (res.ok) {
          const json = await res.json()
          const list = json.users || (Array.isArray(json) ? json : [])
          if (Array.isArray(list) && list.length > 0) {
            repsFromUsers = list
              .filter((u: any) => u.status !== 'inativo')
              .map((u: any) => (u.name || '').trim())
              .filter(Boolean)
          }
        }
      } catch (e) {}

      if (repsFromUsers.length === 0 && typeof window !== 'undefined') {
        const savedUsers = localStorage.getItem('crm_users')
        if (savedUsers) {
          try {
            const parsed = JSON.parse(savedUsers)
            repsFromUsers = parsed
              .filter((u: any) => u.status !== 'inativo')
              .map((u: any) => (u.name || '').trim())
              .filter(Boolean)
          } catch (e) {}
        }
      }

      setRepresentativesList(getUniqueCanonicalRepresentatives(repsFromUsers))
    }

    fetchUsers()
  }, [deals])

  // Filter deals based on search query, year, month, representative, and curve
  const filteredDeals = deals.filter(d => {
    // 1. Search Query
    const search = searchQuery.toLowerCase().trim()
    const matchesSearch = 
      !searchQuery ||
      d.title.toLowerCase().includes(search) ||
      (d.contact?.name && d.contact.name.toLowerCase().includes(search)) ||
      (d.contact?.company && d.contact.company.toLowerCase().includes(search))

    if (!matchesSearch) return false

    // 2. Representative
    const targetRep = isRep && currentUser?.name ? currentUser.name : selectedRep
    const matchesRep = targetRep === 'all' || isSameRepresentative(d.assigned_to || d.contact?.representative, targetRep)
    if (!matchesRep) return false

    // 3. Curve ABC
    const dealCurve = d.contact?.curve || 'C'
    const matchesCurve = selectedCurve === 'all' || dealCurve === selectedCurve
    if (!matchesCurve) return false

    // 4. Year
    const dealDate = d.created_at || d.stage_entered_at || ''
    const dealYear = dealDate ? dealDate.split('-')[0] : ''
    const matchesYear = selectedYear === 'all' || !dealYear || dealYear === selectedYear
    if (!matchesYear) return false

    // 5. Month
    const dealMonth = dealDate ? dealDate.split('-')[1] : ''
    const matchesMonth = selectedMonth === 'all' || !dealMonth || dealMonth === selectedMonth
    if (!matchesMonth) return false

    return true
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Map active stages to Kanban board columns (order: leads -> ... -> fechamento -> pedido -> perdido)
  const activeStages: DealStage[] = [
    'leads',
    'prospect',
    'dinamica',
    'potencial',
    'visita',
    'briefing',
    'aprovacao',
    'fechamento',
    'pedido',
    'perdido'
  ]

  const dealsByStage = (Object.keys(STAGE_CONFIG) as DealStage[]).reduce((acc, stage) => {
    acc[stage] = filteredDeals.filter(d => d.stage === stage).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    return acc
  }, {} as Record<DealStage, Deal[]>)

  const activeDeal = activeId ? deals.find(d => d.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return

    const draggedDeal = deals.find(d => d.id === active.id)
    if (!draggedDeal) return

    // Target stage can be from drop zone or column
    let newStage: DealStage | undefined = undefined
    if (over.id === 'drop-zone-pedido' || over.id === 'drop-zone-pos_venda') {
      newStage = 'pedido'
    } else if (over.id === 'drop-zone-perdido') {
      newStage = 'perdido'
    } else if (activeStages.includes(over.id as DealStage)) {
      newStage = over.id as DealStage
    } else {
      newStage = deals.find(d => d.id === over.id)?.stage
    }

    if (!newStage || newStage === draggedDeal.stage) return

    // 🔍 ALWAYS REQUIRE USER CONFIRMATION BEFORE MOVING CARD!
    setPendingMove({
      deal: draggedDeal,
      targetStage: newStage
    })
  }

  const handleExecuteMove = (reason?: string, notes?: string, orderNumber?: string) => {
    if (!pendingMove && !lostModalDeal) return

    const targetDeal = pendingMove ? pendingMove.deal : lostModalDeal!
    const targetStage = pendingMove ? pendingMove.targetStage : 'perdido'

    // If target is perdido and no reason was provided yet, open LostReasonModal
    if (targetStage === 'perdido' && !reason) {
      setLostModalDeal(targetDeal)
      setPendingMove(null)
      return
    }

    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('crm_current_user') : null
    const currentUser = userRaw ? JSON.parse(userRaw) : null
    const authorName = currentUser?.name || currentUser?.nome || 'Usuário'

    const currentStageLabel = STAGE_CONFIG[targetDeal.stage]?.label || targetDeal.stage
    const targetStageLabel = STAGE_CONFIG[targetStage]?.label || targetStage

    const finalOrderNumber = orderNumber || targetDeal.order_number || (targetStage === 'pedido' ? `PED-${Date.now().toString().slice(-6)}` : undefined)
    const dealVal = (targetDeal.final_value && targetDeal.final_value > 0) ? targetDeal.final_value : (targetDeal.estimated_value || 0)

    let activityText = `Oportunidade movida da etapa [${currentStageLabel}] para [${targetStageLabel}].`
    if (targetStage === 'perdido' && reason) {
      activityText = `Negócio marcado como PERDIDO. Motivo: ${reason}${notes ? ` • Obs: ${notes}` : ''}`
    } else if (targetStage === 'pedido') {
      activityText = `🎉 PEDIDO FECHADO! Pedido Nº ${finalOrderNumber || 'S/N'} • Valor: ${formatCurrency(dealVal)}`
    }

    const stageActivity = {
      id: `act_${Date.now()}`,
      type: targetStage === 'perdido' ? 'nota' : targetStage === 'pedido' ? 'stage_change' : 'stage_change',
      content: activityText,
      title: `Mudança de Etapa: ${targetStageLabel}`,
      description: activityText,
      timestamp: timestampStr,
      user_name: authorName,
      userName: authorName,
      author: authorName
    }

    const updatedDeal: Deal = {
      ...targetDeal,
      stage: targetStage,
      stage_entered_at: new Date().toISOString(),
      ...(finalOrderNumber ? { order_number: finalOrderNumber } : {}),
      ...(targetStage === 'perdido' ? { lost_reason: reason, lost_notes: notes } : {}),
      activities: [stageActivity, ...(targetDeal.activities || [])]
    }

    updateAndSaveDeals(prev => prev.map(d => d.id === targetDeal.id ? updatedDeal : d))

    const isClosedDeal = targetStage === 'fechamento' || targetStage === 'pedido' || targetStage === 'pos_venda'
    const todayStr = new Date().toISOString().split('T')[0]

    // Sync activity, order history log, and last purchase date with contacts in localStorage
    if (typeof window !== 'undefined') {
      try {
        const rawContacts = localStorage.getItem('crm_contacts')
        if (rawContacts) {
          const list = JSON.parse(rawContacts)
          const cleanComp = (targetDeal.contact?.company || targetDeal.title || '').trim().toLowerCase()
          const updatedContacts = list.map((c: any) => {
            const matchesId = c.id === targetDeal.contact_id || c.id === targetDeal.contact?.id
            const matchesComp = cleanComp && (c.company || c.name || '').trim().toLowerCase() === cleanComp
            if (matchesId || matchesComp) {
              // Create closed order snapshot with the assigned vendor at time of sale
              const newOrderObj = targetStage === 'pedido' ? {
                id: `ord_${Date.now()}`,
                order_number: finalOrderNumber || `PED-${Date.now().toString().slice(-6)}`,
                deal_id: targetDeal.id,
                deal_title: targetDeal.title,
                value: dealVal,
                date: todayStr,
                vendor: targetDeal.assigned_to || c.representative || c.assignedTo || c.assigned_to || authorName,
                vendor_id: targetDeal.assigned_profile?.id
              } : null

              const existingOrders = Array.isArray(c.orders) ? c.orders : []
              const updatedOrders = newOrderObj ? [newOrderObj, ...existingOrders.filter((o: any) => o.order_number !== newOrderObj.order_number)] : existingOrders

              return {
                ...c,
                status: targetStage === 'perdido' ? 'inativo' : 'ativo',
                pipelineStage: targetStage,
                orders: updatedOrders,
                ...(isClosedDeal ? { lastPurchaseDate: todayStr, last_purchase_date: todayStr, lastPurchaseDays: 0 } : {}),
                activities: [stageActivity, ...(c.activities || [])]
              }
            }
            return c
          })
          localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
          window.dispatchEvent(new Event('storage-contacts-changed'))
        }
      } catch (e) {}

      // Sync activity & last purchase date to Supabase via /api/contacts
      const comp = targetDeal.contact?.company || targetDeal.title
      fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetDeal.contact_id || targetDeal.contact?.id,
          company: comp,
          status: targetStage === 'perdido' ? 'inativo' : 'ativo',
          pipelineStage: targetStage,
          activities: [stageActivity],
          ...(isClosedDeal ? { lastPurchaseDate: todayStr } : {})
        })
      }).catch(err => console.warn('Erro ao atualizar contato no Supabase:', err))
    }

    setPendingMove(null)
    setLostModalDeal(null)

    // Trigger celebration modal if targetStage === 'pedido'
    if (targetStage === 'pedido') {
      setCelebrationDeal(updatedDeal)
    }
  }

  function handleUpdateDeal(updatedDeal: Deal) {
    // Check if stage changed to trigger confirmation or celebration
    const currentDeal = deals.find(d => d.id === updatedDeal.id)
    if (currentDeal && currentDeal.stage !== updatedDeal.stage) {
      setPendingMove({ deal: currentDeal, targetStage: updatedDeal.stage })
      return
    }
    updateAndSaveDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d))
    setSelectedDeal(updatedDeal)
  }

  const handleOpenAddDeal = (stage: DealStage) => {
    setNewDealStage(stage)
    setShowNewDealModal(true)
  }

  const handleConfirmNewDeal = (data: { title: string; contactName: string; company: string; value: number; stage: DealStage; contactId?: string; representative?: string }) => {
    const userRaw = typeof window !== 'undefined' ? localStorage.getItem('crm_current_user') : null
    const currentUser = userRaw ? JSON.parse(userRaw) : null

    let matchedContact: any = null
    try {
      const rawContacts = localStorage.getItem('crm_contacts')
      if (rawContacts) {
        const contacts = JSON.parse(rawContacts)
        const comp = (data.company || data.title).trim().toLowerCase()
        const name = (data.contactName || '').trim().toLowerCase()
        matchedContact = contacts.find((c: any) => 
          (data.contactId && c.id === data.contactId) ||
          (comp && (c.company || c.name || '').trim().toLowerCase() === comp) ||
          (name && (c.name || '').trim().toLowerCase() === name)
        )
      }
    } catch (e) {}

    let rep = data.representative || matchedContact?.representative
    if (!rep && currentUser?.name) {
      rep = currentUser.name
    }

    const dealUUID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0')}`
    const targetContactId = isUUID(data.contactId) ? data.contactId : (isUUID(matchedContact?.id) ? matchedContact.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, '0')}`))

    const newDeal: Deal = {
      id: dealUUID,
      title: data.title,
      stage: data.stage,
      estimated_value: data.value,
      assigned_to: rep,
      contact_id: targetContactId,
      contact: {
        id: targetContactId,
        name: data.contactName || matchedContact?.name || data.company,
        company: data.company || matchedContact?.company || data.title,
        phone: matchedContact?.phone || '',
        email: matchedContact?.email || '',
        cnpj: matchedContact?.cnpj || '',
        address: matchedContact?.address || '',
        bairro: matchedContact?.bairro || '',
        cep: matchedContact?.cep || '',
        city: matchedContact?.city || '',
        state: matchedContact?.state || '',
        curve: matchedContact?.curve || 'C',
        representative: rep,
        created_at: matchedContact?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any,
      stage_entered_at: new Date().toISOString(),
      position: deals.filter(d => d.stage === data.stage).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    updateAndSaveDeals(prev => [newDeal, ...prev])
    setShowNewDealModal(false)

    // Background hydration from Supabase if local matchedContact was incomplete
    if (!matchedContact || !matchedContact.phone || !matchedContact.address) {
      fetch('/api/contacts', { cache: 'no-store' })
        .then(res => res.json())
        .then(json => {
          if (json.success && Array.isArray(json.contacts)) {
            const comp = (data.company || data.title).trim().toLowerCase()
            const name = (data.contactName || '').trim().toLowerCase()
            const found = json.contacts.find((c: any) =>
              (data.contactId && c.id === data.contactId) ||
              (comp && (c.company || c.name || '').trim().toLowerCase() === comp) ||
              (name && (c.name || '').trim().toLowerCase() === name)
            )
            if (found) {
              const hydratedDeal: Deal = {
                ...newDeal,
                assigned_to: found.representative || rep,
                contact: {
                  ...(newDeal.contact || {}),
                  id: found.id || (newDeal.contact as any)?.id || targetContactId,
                  name: found.name || (newDeal.contact as any)?.name || data.company,
                  company: found.company || (newDeal.contact as any)?.company || data.title,
                  phone: found.phone || '',
                  email: found.email || '',
                  cnpj: found.cnpj || '',
                  address: found.address || '',
                  bairro: found.bairro || '',
                  cep: found.cep || '',
                  city: found.city || '',
                  state: found.state || '',
                  curve: found.curve || 'C',
                  representative: found.representative || rep
                } as any
              }
              updateAndSaveDeals(prev => prev.map(d => d.id === newDeal.id ? hydratedDeal : d))
            }
          }
        })
        .catch(() => {})
    }

    // Trigger celebration if new deal created directly in pedido stage
    if (data.stage === 'pedido') {
      setCelebrationDeal(newDeal)
    }
  }

  const handleDeleteDeal = (dealId: string) => {
    const updated = deals.filter(d => d.id !== dealId)
    setDeals(updated)
    savePipelineDeals(updated)
    if (selectedDeal?.id === dealId) {
      setSelectedDeal(null)
    }

    try {
      fetch(`/api/deals?id=${dealId}`, { method: 'DELETE' })
    } catch (e) {}
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-2.5 overflow-hidden">
      {/* ── HEADER ROW: TÍTULO DA PÁGINA + BOTÕES DE AÇÃO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
          Pipeline de Vendas
        </h1>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            type="button"
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-white font-bold shadow-md"
            onClick={() => setShowCalendarModal(true)}
          >
            <Calendar size={13} className="text-[var(--lime)]" />
            <span>Agenda</span>
          </button>

          <button 
            type="button"
            className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer font-bold text-[#060606]" 
            onClick={() => handleOpenAddDeal('leads')}
          >
            <Plus size={13} />
            <span>Novo Negócio</span>
          </button>
        </div>
      </div>

      {/* ── BARRA DE FILTROS DO PIPELINE (ESTILO IDÊNTICO A CONTATOS) ── */}
      <div className="card p-3 grid grid-cols-1 md:grid-cols-12 gap-3 items-center shrink-0">
        {/* Busca — ocupa 3 colunas */}
        <div className="md:col-span-3 flex items-center gap-2 input w-full py-1.5 px-3">
          <Search size={13} className="text-[var(--gray2)] shrink-0" />
          <input
            type="text"
            className="bg-transparent border-none outline-none w-full text-xs text-[var(--white)] placeholder-[var(--gray2)]"
            placeholder="Buscar negócio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Ano — ocupa 2 colunas */}
        <div className="md:col-span-2">
          <select
            className="input w-full py-1.5 px-3 text-xs cursor-pointer"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="all" className="bg-[var(--charcoal)] text-white">Ano: Todos</option>
            <option value="2026" className="bg-[var(--charcoal)] text-white">Ano: 2026</option>
            <option value="2025" className="bg-[var(--charcoal)] text-white">Ano: 2025</option>
          </select>
        </div>

        {/* Mês — ocupa 2 colunas */}
        <div className="md:col-span-2">
          <select
            className="input w-full py-1.5 px-3 text-xs cursor-pointer"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all" className="bg-[var(--charcoal)] text-white">Mês: Todos</option>
            <option value="01" className="bg-[var(--charcoal)] text-white">Jan (01)</option>
            <option value="02" className="bg-[var(--charcoal)] text-white">Fev (02)</option>
            <option value="03" className="bg-[var(--charcoal)] text-white">Mar (03)</option>
            <option value="04" className="bg-[var(--charcoal)] text-white">Abr (04)</option>
            <option value="05" className="bg-[var(--charcoal)] text-white">Mai (05)</option>
            <option value="06" className="bg-[var(--charcoal)] text-white">Jun (06)</option>
            <option value="07" className="bg-[var(--charcoal)] text-white">Jul (07)</option>
            <option value="08" className="bg-[var(--charcoal)] text-white">Ago (08)</option>
            <option value="09" className="bg-[var(--charcoal)] text-white">Set (09)</option>
            <option value="10" className="bg-[var(--charcoal)] text-white">Out (10)</option>
            <option value="11" className="bg-[var(--charcoal)] text-white">Nov (11)</option>
            <option value="12" className="bg-[var(--charcoal)] text-white">Dez (12)</option>
          </select>
        </div>

        {/* Representantes — Ocupa 3 colunas (EXPANDIDO) */}
        <div className="md:col-span-3">
          <select
            disabled={isRep}
            className={`input w-full py-1.5 px-3 text-xs truncate ${
              isRep 
                ? 'opacity-85 bg-[var(--charcoal)] border-[var(--lime)]/40 text-[var(--lime)] font-bold cursor-not-allowed shadow-inner' 
                : 'cursor-pointer'
            }`}
            value={isRep && currentUser?.name ? currentUser.name : selectedRep}
            onChange={(e) => !isRep && setSelectedRep(e.target.value)}
          >
            {isRep && currentUser?.name ? (
              <option value={currentUser.name} className="bg-[var(--charcoal)] text-[var(--lime)] font-bold">
                🔒 {currentUser.name}
              </option>
            ) : (
              <>
                <option value="all" className="bg-[var(--charcoal)] text-white">Todos os Reps</option>
                {representativesList.map((r, idx) => (
                  <option key={idx} value={r} className="bg-[var(--charcoal)] text-white">{r}</option>
                ))}
              </>
            )}
          </select>
        </div>

        {/* Curva ABC — ocupa 2 colunas */}
        <div className="md:col-span-2">
          <select
            className="input w-full py-1.5 px-3 text-xs cursor-pointer"
            value={selectedCurve}
            onChange={(e) => setSelectedCurve(e.target.value)}
          >
            <option value="all" className="bg-[var(--charcoal)] text-white">Todas as Curvas</option>
            <option value="A" className="bg-[var(--charcoal)] text-white">Curva A</option>
            <option value="B" className="bg-[var(--charcoal)] text-white">Curva B</option>
            <option value="C" className="bg-[var(--charcoal)] text-white">Curva C</option>
            <option value="D" className="bg-[var(--charcoal)] text-white">Curva D</option>
          </select>
        </div>
      </div>

      {/* Board — rendered client-side only to avoid @dnd-kit aria-describedby hydration mismatch */}
      {mounted ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="pipeline-wrap">
            <div className="kanban-board">
              {activeStages.map(stage => (
                <KanbanColumn 
                  key={stage} 
                  stage={stage} 
                  deals={dealsByStage[stage]} 
                  onCardClick={setSelectedDeal}
                  onAddDeal={handleOpenAddDeal}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeDeal && <DealCard deal={activeDeal} overlay />}
          </DragOverlay>

          <BottomDropZones activeId={activeId} />
        </DndContext>
      ) : (
        /* SSR skeleton — DndContext (with icon components) only runs client-side */
        <div className="pipeline-wrap">
          <div className="kanban-board">
            {activeStages.map(stage => {
              const cfg = STAGE_CONFIG[stage]
              const Icon = cfg.icon as React.ElementType
              return (
                <div key={stage} className="kanban-col" style={{ '--col-color': cfg.color } as React.CSSProperties}>
                  <div className="kanban-col-header">
                    <span className="kanban-col-icon"><Icon size={14} /></span>
                    <div className="kanban-col-info">
                      <div className="kanban-col-title">{cfg.label}</div>
                    </div>
                    <div className="kanban-col-count" style={{ color: cfg.color, background: cfg.color + '15' }}>
                      {dealsByStage[stage]?.length ?? 0}
                    </div>
                  </div>
                  <div className="kanban-cards">
                    {dealsByStage[stage]?.map(deal => (
                      <div key={deal.id} className="deal-card">
                        <div className="deal-title">{deal.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Deal Detail Drawer */}
      <DealDrawer
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onUpdateDeal={handleUpdateDeal}
        onDeleteDeal={handleDeleteDeal}
        onOpenCalendarModal={() => setShowCalendarModal(true)}
      />

      {/* Confirm Move Modal */}
      {pendingMove && (
        <ConfirmMoveModal
          deal={pendingMove.deal}
          targetStage={pendingMove.targetStage}
          onConfirm={(orderNumber) => handleExecuteMove(undefined, undefined, orderNumber)}
          onCancel={() => setPendingMove(null)}
        />
      )}

      {/* Lost Reason Modal */}
      {lostModalDeal && (
        <LostReasonModal 
          deal={lostModalDeal}
          onConfirm={(reason, notes) => handleExecuteMove(reason, notes)}
          onCancel={() => setLostModalDeal(null)}
        />
      )}

      {/* Order Celebration Modal (Pedido Fechado) */}
      {celebrationDeal && (
        <OrderCelebrationModal
          deal={celebrationDeal}
          onClose={() => setCelebrationDeal(null)}
        />
      )}

      {/* New Deal Modal */}
      {showNewDealModal && (
        <NewDealModal
          initialStage={newDealStage}
          onConfirm={handleConfirmNewDeal}
          onCancel={() => setShowNewDealModal(false)}
        />
      )}
      {/* Modal de Agendamento em Grade do Pipeline */}
      <PipelineCalendarModal 
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onCompleteAndRegisterActivity={(clientName) => {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
            if (raw) {
              const list = JSON.parse(raw)
              if (Array.isArray(list)) setContactsList(list)
            }
          } catch (e) {}
          setShowCalendarModal(false)
          setActivityPreselectedClient(clientName)
          setShowActivityModal(true)
        }}
      />

      {/* Modal de Registro de Atividade Comercial */}
      {showActivityModal && (
        <RegisterActivityModal
          isOpen={showActivityModal}
          onClose={() => {
            setShowActivityModal(false)
            setActivityPreselectedClient('')
          }}
          contactsList={contactsList}
          preselectedContactId={activityPreselectedClient}
          onSuccess={() => {
            setShowActivityModal(false)
            setActivityPreselectedClient('')
          }}
        />
      )}
    </div>
  )
}
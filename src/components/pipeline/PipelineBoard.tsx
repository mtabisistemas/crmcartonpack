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
import { formatCurrency, daysSince } from '@/lib/utils'
import { Plus, Clock, Trophy, XCircle, Search, Filter, Building2 } from 'lucide-react'
import { DealDrawer } from './DealDrawer'
import { getPipelineDeals, savePipelineDeals } from '@/services/pipeline-service'

// ─── Mock data ────────────────────────────────────────────────
const MOCK_DEALS: Deal[] = []
// ─── Deal Card ────────────────────────────────────────────────
function DealCard({ deal, overlay = false, onCardClick }: { deal: Deal; overlay?: boolean; onCardClick?: (deal: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id })
  const cfg = STAGE_CONFIG[deal.stage]
  const days = daysSince(deal.stage_entered_at)
  const isStale = days >= 5
  const value = deal.final_value ?? deal.estimated_value

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
      className="deal-card animate-fade-in cursor-pointer"
    >
      {/* Title */}
      <div className="deal-title">
        {deal.title}
      </div>

      {/* Contact */}
      {deal.contact && (
        <div className="deal-contact">
          {deal.contact.name && 
           deal.contact.name.trim().toLowerCase() !== deal.title.trim().toLowerCase() && (
            <div className="deal-contact-name">
              {deal.contact.name}
            </div>
          )}
          {deal.contact.company && 
           deal.contact.company.trim().toLowerCase() !== deal.title.trim().toLowerCase() && 
           deal.contact.company.trim().toLowerCase() !== (deal.contact.name || '').trim().toLowerCase() && (
            <div className="deal-contact-company">
              {deal.contact.company}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="deal-footer">
        <div className="deal-value">
          {formatCurrency(value || 0)}
        </div>

        {days > 0 && (
          <div className={`deal-time ${isStale ? 'danger' : 'ok'}`}>
            <Clock size={10} />
            <span>{days}d</span>
          </div>
        )}
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
  const { setNodeRef: setWonRef, isOver: isOverWon } = useDroppable({ id: 'drop-zone-pos_venda' })
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
        <span>Ganho - Pós-Vendas</span>
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
  const [reason, setReason] = useState(FOLLOW_UP_LOST_REASONS[0])
  const [notes, setNotes] = useState('')

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
        <div>
          <h3 className="font-display text-base text-[var(--white)] font-bold">Arquivar Negócio</h3>
          <p className="text-xs text-[var(--gray)] mt-1">Por favor, indique o motivo da perda de <strong>{deal.title}</strong>:</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Motivo da Perda</label>
          <select 
            className="input" 
            value={reason} 
            onChange={(e) => setReason(e.target.value)}
          >
            {FOLLOW_UP_LOST_REASONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="label">Observações</label>
          <textarea 
            className="input min-h-[80px] py-2 resize-none"
            placeholder="Justificativa ou notas comerciais..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={() => onConfirm(reason, notes)}
            className="btn btn-danger py-2 px-4 text-xs font-bold uppercase tracking-wider"
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
  onConfirm: (data: { title: string; contactName: string; company: string; value: number; stage: DealStage }) => void
  onCancel: () => void
}) {
  const [clientName, setClientName] = useState('')
  const [contactName, setContactName] = useState('')
  const [value, setValue] = useState(0)
  const [stage, setStage] = useState<DealStage>(initialStage)

  // Autocomplete contacts list state
  const [contactsList, setContactsList] = useState<{ id: string; company: string; name?: string; cnpj?: string; city?: string; state?: string }[]>([])
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
            .select('id, company, name, cnpj, city, state')
            .order('created_at', { ascending: false })
            .limit(200)

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

  const filteredContacts = contactsList.filter(c => {
    const q = clientName.toLowerCase().trim()
    if (!q) return true
    const comp = (c.company || c.name || '').toLowerCase()
    const cnpj = (c.cnpj || '').replace(/\D/g, '')
    const city = (c.city || '').toLowerCase()
    return comp.includes(q) || cnpj.includes(q) || city.includes(q)
  })

  const handleSelectContact = (c: { company: string; name?: string; cnpj?: string; city?: string }) => {
    const chosenName = c.company || c.name || ''
    setClientName(chosenName)
    if (c.name && c.name !== chosenName) {
      setContactName(c.name)
    }
    setShowDropdown(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientName.trim()) return
    onConfirm({
      title: clientName.trim(),
      contactName: contactName.trim() || clientName.trim(),
      company: clientName.trim(),
      value,
      stage
    })
  }

  // Filter out Won/Lost stages from starting stages list
  const activeStages = Object.keys(STAGE_CONFIG).filter(s => s !== 'perdido' && s !== 'pos_venda') as DealStage[]

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
        <div>
          <h3 className="font-display text-base text-[var(--white)] font-bold">Novo Negócio</h3>
          <p className="text-xs text-[var(--gray)] mt-1">Selecione ou digite o nome do cliente para a oportunidade.</p>
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
              className="input font-bold w-full" 
              placeholder="Digite para buscar um cliente ou criar novo..."
              value={clientName} 
              onChange={(e) => {
                setClientName(e.target.value)
                setShowDropdown(true)
              }}
              onFocus={() => setShowDropdown(true)}
            />
          </div>

          {/* Autocomplete Dropdown List */}
          {showDropdown && filteredContacts.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-52 overflow-y-auto bg-[#141416] border border-[var(--line)] rounded-xl shadow-2xl divide-y divide-[var(--line)] animate-fade-in">
              <div className="px-3 py-1.5 text-[10px] font-mono text-[var(--gray2)] uppercase tracking-wider bg-[var(--charcoal)] sticky top-0">
                Selecione um Cliente Salvo ({filteredContacts.length})
              </div>
              {filteredContacts.map((c, idx) => (
                <div
                  key={c.id || idx}
                  onClick={() => handleSelectContact(c)}
                  className="p-3 hover:bg-[var(--lime)]/10 cursor-pointer transition-colors flex items-center justify-between gap-2 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white group-hover:text-[var(--lime)] transition-colors truncate">
                      {c.company || c.name}
                    </div>
                    <div className="text-[10px] text-[var(--gray)] font-mono truncate mt-0.5">
                      {c.cnpj ? `${c.cnpj} ` : ''}{c.city ? `• ${c.city}/${c.state}` : ''}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--lime)] bg-[var(--lime)]/10 px-2 py-0.5 rounded border border-[var(--lime)]/20 shrink-0 opacity-80 group-hover:opacity-100">
                    Selecionar
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="label">Nome do Contato</label>
            <input 
              type="text" 
              className="input" 
              placeholder="Ex: Alberto Souza (opcional)"
              value={contactName} 
              onChange={(e) => setContactName(e.target.value)}
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
    const syncDeals = () => updateAndSaveDeals(getPipelineDeals(MOCK_DEALS))
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
  const [searchQuery, setSearchQuery] = useState('')
  const [lostModalDeal, setLostModalDeal] = useState<Deal | null>(null)
  const [showNewDealModal, setShowNewDealModal] = useState(false)
  const [newDealStage, setNewDealStage] = useState<DealStage>('leads')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Map only active stages to Kanban board columns
  const activeStages = (Object.keys(STAGE_CONFIG) as DealStage[]).filter(s => s !== 'perdido' && s !== 'pos_venda')
  
  // Filter deals based on search query
  const filteredDeals = deals.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.contact?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.contact?.company?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const dealsByStage = (Object.keys(STAGE_CONFIG) as DealStage[]).reduce((acc, stage) => {
    acc[stage] = filteredDeals.filter(d => d.stage === stage).sort((a, b) => a.position - b.position)
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

    // Drop on Won zone
    if (over.id === 'drop-zone-pos_venda') {
      updateAndSaveDeals(prev => prev.map(d =>
        d.id === draggedDeal.id
          ? { ...d, stage: 'pos_venda', stage_entered_at: new Date().toISOString() }
          : d
      ))
      return
    }

    // Drop on Lost zone
    if (over.id === 'drop-zone-perdido') {
      setLostModalDeal(draggedDeal)
      return
    }

    // Drop on normal columns
    const newStage = (activeStages as string[]).includes(over.id as string)
      ? (over.id as DealStage)
      : deals.find(d => d.id === over.id)?.stage

    if (!newStage || newStage === draggedDeal.stage) return

    updateAndSaveDeals(prev => prev.map(d =>
      d.id === draggedDeal.id
        ? { ...d, stage: newStage, stage_entered_at: new Date().toISOString() }
        : d
    ))
  }

  function handleUpdateDeal(updatedDeal: Deal) {
    updateAndSaveDeals(prev => prev.map(d => d.id === updatedDeal.id ? updatedDeal : d))
    setSelectedDeal(updatedDeal)
  }

  const handleOpenAddDeal = (stage: DealStage) => {
    setNewDealStage(stage)
    setShowNewDealModal(true)
  }

  const handleConfirmNewDeal = (data: { title: string; contactName: string; company: string; value: number; stage: DealStage }) => {
    const newDeal: Deal = {
      id: `d-${Date.now()}`,
      title: data.title,
      stage: data.stage,
      estimated_value: data.value,
      contact_id: `c-${Date.now()}`,
      contact: {
        id: `c-${Date.now()}`,
        name: data.contactName,
        company: data.company,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      stage_entered_at: new Date().toISOString(),
      position: deals.filter(d => d.stage === data.stage).length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    updateAndSaveDeals(prev => [newDeal, ...prev])
    setShowNewDealModal(false)
  }

  const handleConfirmLost = (reason: string, notes: string) => {
    if (!lostModalDeal) return
    updateAndSaveDeals(prev => prev.map(d =>
      d.id === lostModalDeal.id
        ? { 
            ...d, 
            stage: 'perdido', 
            lost_reason: reason, 
            lost_notes: notes,
            stage_entered_at: new Date().toISOString() 
          }
        : d
    ))
    setLostModalDeal(null)
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-4 overflow-hidden">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
          Pipeline de Vendas
        </h1>

        <div className="flex items-center gap-2">
          <div className="search-wrap">
            <Search size={14} />
            <input
              className="search-input"
              placeholder="Buscar negócio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenAddDeal('leads')}>
            <Plus size={13} />
            <span>Novo Negócio</span>
          </button>
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
      />

      {/* Lost Reason Modal */}
      {lostModalDeal && (
        <LostReasonModal 
          deal={lostModalDeal}
          onConfirm={handleConfirmLost}
          onCancel={() => setLostModalDeal(null)}
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
    </div>
  )
}
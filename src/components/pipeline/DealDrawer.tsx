'use client'

import { useState, useEffect } from 'react'
import { Deal, DealStage, STAGE_CONFIG } from '@/types'
import { 
  X, User, Mail, Phone, Building, Calendar, DollarSign, Tag,
  MessageSquare, FileText, Send, PhoneCall, Users, CheckCircle, ArrowRight, Save
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Activity {
  id: string
  type: 'whatsapp' | 'ligacao' | 'email' | 'reuniao' | 'nota'
  content: string
  timestamp: string
}

interface DealDrawerProps {
  deal: Deal | null
  onClose: () => void
  onUpdateDeal: (updatedDeal: Deal) => void
}

export function DealDrawer({ deal, onClose, onUpdateDeal }: DealDrawerProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'historico' | 'orcamento'>('geral')
  const [isOpen, setIsOpen] = useState(false)
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)

  // Deal fields (Geral Tab)
  const [title, setTitle] = useState('')
  const [estimatedValue, setEstimatedValue] = useState<number | undefined>(undefined)
  const [stage, setStage] = useState<DealStage>('leads')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactCompany, setContactCompany] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')

  // Timeline fields (Histórico Tab)
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')

  // Briefing / Costs Calculator (Orçamento Tab)
  const [boxType, setBoxType] = useState<'acoplada' | 'duplex' | 'triplex'>('acoplada')
  const [length, setLength] = useState(300) // mm
  const [width, setWidth] = useState(200)  // mm
  const [height, setHeight] = useState(150) // mm
  const [colors, setColors] = useState(2)    // 1-4 colors
  const [quantity, setQuantity] = useState(1000)
  const [margin, setMargin] = useState(35)   // %
  const [toolingCost, setToolingCost] = useState(1200) // cliché + faca setup cost

  const [representative, setRepresentative] = useState('')

  // Load deal details
  useEffect(() => {
    if (deal) {
      setIsOpen(true)
      setTitle(deal.title)
      setEstimatedValue(deal.final_value ?? deal.estimated_value)
      setStage(deal.stage)
      setContactName(deal.contact?.name ?? '')
      setContactCompany(deal.contact?.company ?? deal.title ?? '')
      setCurve(deal.contact?.curve ?? 'C')

      let phone = deal.contact?.phone ?? ''
      let email = deal.contact?.email ?? ''
      let rep = deal.assigned_to ?? (deal as any).assignedTo ?? (deal as any).assignedToName ?? (deal as any).representative ?? ''

      // Auto-populate Phone, Email, and Representative from saved contacts database
      const searchCompany = (deal.contact?.company || deal.title || '').trim().toLowerCase()
      const searchName = (deal.contact?.name || '').trim().toLowerCase()

      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
        if (raw) {
          const contacts = JSON.parse(raw)
          const match = contacts.find((c: any) => {
            const cComp = (c.company || c.name || '').trim().toLowerCase()
            const cName = (c.name || '').trim().toLowerCase()
            return (searchCompany && cComp === searchCompany) || (searchName && cName === searchName)
          })
          if (match) {
            if (match.phone && !phone) phone = match.phone
            if (match.email && !email) email = match.email
            if (match.representative && !rep) rep = match.representative
          }
        }
      } catch (e) {}

      setContactPhone(phone)
      setContactEmail(email)
      setRepresentative(rep)

      // Activities list (empty by default for real user tests)
      setActivities((deal as any).activities || [])
    } else {
      setIsOpen(false)
    }
  }, [deal])

  // Hide Budget tab if stage is downgraded
  useEffect(() => {
    const showBudget = ['briefing', 'aprovacao', 'fechamento', 'perdido', 'pos_venda'].includes(stage)
    if (!showBudget && activeTab === 'orcamento') {
      setActiveTab('geral')
    }
  }, [stage, activeTab])

  if (!deal) return null

  // Calculate pricing based on briefing dimensions
  const getMaterialCostPerM2 = () => {
    switch (boxType) {
      case 'acoplada': return 6.80 // R$/m2
      case 'duplex':   return 4.50
      case 'triplex':  return 5.50
    }
  }

  // Calculate sheet area (L x W x H) in m2 (simplified box blank layout: (2*L + 2*W + 40mm joiner) * (W + H + 20mm flaps))
  const blankWidthM = (2 * length + 2 * width + 40) / 1000
  const blankHeightM = (width + height + 20) / 1000
  const boxAreaM2 = blankWidthM * blankHeightM

  const materialCost = boxAreaM2 * getMaterialCostPerM2() * quantity
  const printingCost = (colors * 0.15) * quantity
  const productionCost = materialCost + printingCost + toolingCost
  
  // Cost plus margin
  const totalSuggested = productionCost / (1 - margin / 100)
  const unitPrice = totalSuggested / quantity

  const handleSaveGeneral = async () => {
    const updatedDeal: Deal = {
      ...deal,
      title,
      estimated_value: estimatedValue,
      stage,
      assigned_to: representative,
      contact: {
        ...deal.contact,
        id: deal.contact?.id ?? 'c-temp',
        name: contactName,
        phone: contactPhone,
        email: contactEmail,
        company: contactCompany || title,
        curve: curve,
        created_at: deal.contact?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }

    const companyToFind = (contactCompany || title || '').trim()

    if (companyToFind) {
      // 1. Sincroniza cache local em crm_contacts
      try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem('crm_contacts') : null
        if (raw) {
          const contactsList = JSON.parse(raw)
          const updatedContacts = contactsList.map((c: any) => {
            const matchesComp = c.company && c.company.trim().toLowerCase() === companyToFind.toLowerCase()
            const matchesName = c.name && c.name.trim().toLowerCase() === companyToFind.toLowerCase()
            if (matchesComp || matchesName) {
              return {
                ...c,
                representative: representative || c.representative,
                phone: contactPhone || c.phone,
                email: contactEmail || c.email,
                curve: curve || c.curve,
              }
            }
            return c
          })
          localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
          window.dispatchEvent(new Event('storage-contacts-changed'))
        }
      } catch (e) {}

      // 2. Sincroniza diretamente no banco de dados Supabase (tabela 'contacts')
      try {
        const { supabase } = await import('@/services/supabase-client')
        if (supabase) {
          const payload: any = {
            updated_at: new Date().toISOString()
          }
          if (representative) payload.representative = representative
          if (contactPhone) payload.phone = contactPhone
          if (contactEmail) payload.email = contactEmail
          if (curve) payload.curve = curve

          if (deal.contact?.id && !deal.contact.id.startsWith('c-')) {
            await supabase.from('contacts').update(payload).eq('id', deal.contact.id)
          } else if ((deal.contact as any)?.cnpj) {
            await supabase.from('contacts').update(payload).eq('cnpj', (deal.contact as any).cnpj)
          } else {
            await supabase.from('contacts').update(payload).ilike('company', companyToFind)
          }
          console.log('[DealDrawer] Contato sincronizado com sucesso no Supabase!')
        }
      } catch (err) {
        console.error('[DealDrawer] Erro ao atualizar contato no Supabase:', err)
      }
    }

    onUpdateDeal(updatedDeal)
    setIsSavedSuccess(true)
    setTimeout(() => setIsSavedSuccess(false), 2500)
  }

  const handleApplyBudgetToDeal = () => {
    const roundedValue = Math.round(totalSuggested)
    setEstimatedValue(roundedValue)
    const updatedDeal: Deal = {
      ...deal,
      estimated_value: roundedValue,
      contact: {
        ...deal.contact,
        id: deal.contact?.id ?? 'c-temp',
        name: contactName,
        phone: contactPhone,
        email: contactEmail,
        company: contactCompany,
        curve: curve,
        created_at: deal.contact?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
    onUpdateDeal(updatedDeal)
    
    // Log in timeline
    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    const budgetLog: Activity = {
      id: String(Date.now()),
      type: 'nota',
      content: `Ficha técnica atualizada: Caixa ${boxType.toUpperCase()} (${length}x${width}x${height}mm). Orçamento recalculado para ${formatCurrency(roundedValue)} (${quantity} un. a ${formatCurrency(unitPrice)}/un.).`,
      timestamp: timestampStr
    }
    setActivities(prev => [budgetLog, ...prev])
    setActiveTab('historico')
  }

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const activity: Activity = {
      id: String(Date.now()),
      type: activityType,
      content: newNote,
      timestamp: timestampStr
    }

    setActivities(prev => [activity, ...prev])
    setNewNote('')
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare size={12} className="text-[var(--lime)]" />
      case 'ligacao':  return <PhoneCall size={12} className="text-sky-400" />
      case 'email':    return <Mail size={12} className="text-purple-400" />
      case 'reuniao':  return <Users size={12} className="text-yellow-400" />
      case 'nota':     return <FileText size={12} className="text-gray-400" />
    }
  }

  return (
    <>
      {/* Overlay backdrop */}
      <div 
        className={`drawer-overlay transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className={`drawer-container transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--card)]">
          <div>
            <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase" style={{
              color: STAGE_CONFIG[stage].color,
              background: STAGE_CONFIG[stage].color + '15',
              border: `1px solid ${STAGE_CONFIG[stage].color}25`
            }}>
              {STAGE_CONFIG[stage].label}
            </span>
            <h2 className="font-display text-lg text-[var(--white)] mt-1.5">{title}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Geral
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
          {['briefing', 'aprovacao', 'fechamento', 'perdido', 'pos_venda'].includes(stage) && (
            <button 
              className={`drawer-tab-btn ${activeTab === 'orcamento' ? 'active' : ''}`}
              onClick={() => setActiveTab('orcamento')}
            >
              Orçamento
            </button>
          )}
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-5">
              
              {/* Seção Negócio */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Dados do Negócio
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <label className="label">Título da Oportunidade</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Valor Estimado</label>
                    <div className="relative flex items-center">
                      <DollarSign size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                      <input 
                        type="number" 
                        className="input w-full !pl-9" 
                        value={estimatedValue || ''} 
                        onChange={(e) => setEstimatedValue(Number(e.target.value) || undefined)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Etapa Funil</label>
                    <select 
                      className="input" 
                      value={stage}
                      onChange={(e) => setStage(e.target.value as DealStage)}
                    >
                      {Object.keys(STAGE_CONFIG).map((key) => (
                        <option key={key} value={key}>
                          {STAGE_CONFIG[key as DealStage].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Seção Contato / Cliente */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Dados do Cliente
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Nome do Contato</label>
                  <div className="relative flex items-center">
                    <User size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      className="input w-full !pl-9" 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Empresa</label>
                  <div className="relative flex items-center">
                    <Building size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      className="input w-full !pl-9" 
                      value={contactCompany} 
                      onChange={(e) => setContactCompany(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Curva ABC</label>
                    <select 
                      className="input font-bold" 
                      value={curve}
                      onChange={(e) => setCurve(e.target.value as any)}
                      style={{
                        color: curve === 'A' ? 'var(--lime)' : curve === 'B' ? 'var(--yellow)' : 'var(--gray)'
                      }}
                    >
                      <option value="A">Curva A (Alta)</option>
                      <option value="B">Curva B (Média)</option>
                      <option value="C">Curva C (Baixa)</option>
                      <option value="D">Curva D (Prospecção)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Telefone (WhatsApp)</label>
                    <div className="relative flex items-center">
                      <Phone size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                      <input 
                        type="text" 
                        className="input w-full !pl-9" 
                        value={contactPhone} 
                        onChange={(e) => setContactPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Email</label>
                  <div className="relative flex items-center">
                    <Mail size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="email" 
                      className="input w-full !pl-9" 
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Representante / Vendedor</label>
                  <div className="relative flex items-center">
                    <Users size={14} className="absolute left-3 text-gray-500 pointer-events-none" />
                    <input 
                      type="text" 
                      className="input w-full !pl-9" 
                      placeholder="Ex: Representante Responsável"
                      value={representative} 
                      onChange={(e) => setRepresentative(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: HISTÓRICO / TIMELINE */}
          {activeTab === 'historico' && (
            <div className="flex flex-col gap-6">
              
              {/* Inserir nova atividade */}
              <form onSubmit={handleAddActivity} className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-3">
                <textarea 
                  className="input min-h-[70px] resize-none py-2"
                  placeholder="Escreva uma nova anotação ou registro comercial..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                
                <div className="flex items-center justify-between">
                  {/* Activity Type Selection */}
                  <div className="flex gap-1">
                    {(['nota', 'whatsapp', 'ligacao', 'email', 'reuniao'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActivityType(type)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors uppercase ${
                          activityType === type
                            ? 'bg-neutral-800 text-[var(--lime)] border border-[rgba(180,217,50,0.2)]'
                            : 'text-[var(--gray)] hover:text-[var(--white)] bg-transparent'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5">
                    <Send size={11} />
                    <span>Lançar</span>
                  </button>
                </div>
              </form>

              {/* Timeline list */}
              {activities.length === 0 ? (
                <div className="card p-8 text-center text-xs text-[var(--gray2)] font-mono border-dashed">
                  Nenhum histórico registrado nesta oportunidade. Utilize o formulário acima para lançar um registro ou anotação.
                </div>
              ) : (
                <div className="relative pl-6 flex flex-col gap-6 border-l border-[var(--line)] ml-3 mt-2">
                  {activities.map((act) => (
                    <div key={act.id} className="relative">
                      {/* Circle icon */}
                      <div className="absolute -left-[33px] top-0 w-[22px] h-[22px] rounded-full bg-[var(--card)] border border-[var(--line)] flex items-center justify-center">
                        {getActivityIcon(act.type)}
                      </div>
                      
                      {/* Time */}
                      <div className="font-mono text-[9px] text-[var(--gray2)] mb-1">
                        {act.timestamp}
                      </div>

                      {/* Content */}
                      <div className="text-xs text-[var(--white)] bg-[var(--card)] border border-[var(--line)] rounded-lg p-3 leading-relaxed">
                        {act.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORÇAMENTO (BRIEFING & CUSTOS) */}
          {activeTab === 'orcamento' && (
            <div className="flex flex-col gap-5">
              
              {/* Ficha de Briefing Técnico */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Briefing Técnico
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="label">Estrutura do Material</label>
                  <select 
                    className="input" 
                    value={boxType} 
                    onChange={(e) => setBoxType(e.target.value as any)}
                  >
                    <option value="acoplada">Microondulado Acoplado (Resistente)</option>
                    <option value="duplex">Cartão Duplex (Leve)</option>
                    <option value="triplex">Cartão Triplex (Premium)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Comprim. (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={length}
                      onChange={(e) => setLength(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Largura (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={width}
                      onChange={(e) => setWidth(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Altura (mm)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={height}
                      onChange={(e) => setHeight(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Cores Impressão</label>
                    <select 
                      className="input" 
                      value={colors} 
                      onChange={(e) => setColors(Number(e.target.value) || 1)}
                    >
                      <option value={1}>1 Cor (Mono)</option>
                      <option value={2}>2 Cores (Padrão)</option>
                      <option value={3}>3 Cores</option>
                      <option value={4}>4 Cores (Policromia)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="label">Tiragem (Unidades)</label>
                    <input 
                      type="number" 
                      className="input text-center" 
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 100)}
                    />
                  </div>
                </div>
              </div>

              {/* Ficha de Custos e Margens */}
              <div className="flex flex-col gap-4 bg-[var(--card)] border border-[var(--line)] rounded-xl p-4">
                <div className="text-xs font-bold text-[var(--lime)] uppercase tracking-wider font-mono">
                  Custos e Lucratividade
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="label">Ferramental Setup (Faca/Clichê)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs text-gray-500 font-mono">R$</span>
                      <input 
                        type="number" 
                        className="input pl-8" 
                        value={toolingCost}
                        onChange={(e) => setToolingCost(Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label className="label">Margem Comercial</label>
                      <span className="text-xs text-[var(--lime)] font-mono font-bold">{margin}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="70" 
                      className="w-full accent-[var(--lime)] h-1.5 bg-neutral-800 rounded-lg cursor-pointer mt-2.5" 
                      value={margin}
                      onChange={(e) => setMargin(Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Resumo Faturamento Sugerido */}
                <div className="bg-[var(--card2)] border border-[var(--line)] rounded-xl p-4 flex flex-col gap-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--gray)]">Custo Total de Produção:</span>
                    <span className="font-mono text-[var(--white)] font-bold">{formatCurrency(productionCost)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-[var(--line)] pb-2 mb-2">
                    <span className="text-[var(--gray)]">Área de Papelão (Unitária):</span>
                    <span className="font-mono text-[var(--white)] font-bold">{boxAreaM2.toFixed(3)} m²</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--white)] opacity-80">Preço Unitário Sugerido:</span>
                    <span className="font-mono text-sm font-black text-[var(--lime)]">{formatCurrency(unitPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-[var(--white)] opacity-80">Valor Total Sugerido:</span>
                    <span className="font-mono text-lg font-black text-[var(--lime)]" style={{ filter: 'drop-shadow(0 0 8px rgba(180,217,50,0.25))' }}>
                      {formatCurrency(totalSuggested)}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={handleApplyBudgetToDeal} 
                  className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 mt-2"
                >
                  <CheckCircle size={15} />
                  <span>Aplicar Valor Sugerido ao Negócio</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Sticky Footer for Saving Changes */}
        <div className="p-4 border-t border-[var(--line)] bg-[var(--card)] flex items-center justify-between gap-3 shrink-0">
          {isSavedSuccess ? (
            <div className="flex items-center gap-2 text-xs text-[var(--lime)] font-mono font-bold animate-fade-in">
              <CheckCircle size={15} />
              <span>Alterações salvas com sucesso!</span>
            </div>
          ) : (
            <span className="text-[11px] text-[var(--gray2)] font-mono">
              Salvar para atualizar oportunidade.
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary text-xs py-2 px-3 font-bold uppercase tracking-wider"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={handleSaveGeneral}
              className="btn btn-primary text-xs py-2 px-4 font-bold uppercase tracking-wider text-[#060606] flex items-center gap-2"
            >
              <Save size={14} />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

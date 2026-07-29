'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Target,
  Plus,
  Save,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Users,
  Award,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  X
} from 'lucide-react'
import { UserGoal, LossReason, DEFAULT_LOSS_REASONS } from '@/types'

// Função auxiliar para calcular dias úteis em determinado ano/mês (Segunda a Sexta)
function getBusinessDaysInMonth(year: number, monthZeroIndexed: number): number {
  const date = new Date(year, monthZeroIndexed, 1)
  let businessDays = 0
  while (date.getMonth() === monthZeroIndexed) {
    const dayOfWeek = date.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++
    }
    date.setDate(date.getDate() + 1)
  }
  return businessDays || 22
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export default function MetasPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'metas' | 'motivos'>('metas')

  // Ano e Mês selecionados para metas
  const [selectedYear, setSelectedYear] = useState<string>('2026')
  const [selectedMonth, setSelectedMonth] = useState<string>('07') // "07" = Julho
  const [viewMode, setViewMode] = useState<'mensal' | 'semanal' | 'diaria'>('mensal')

  // Lista de Usuários Cadastrados no CRM
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([])

  // Lista de Metas (por usuário, ano, mês)
  const [goalsMap, setGoalsMap] = useState<Record<string, UserGoal>>({})

  // Lista de Motivos de Perda
  const [lossReasons, setLossReasons] = useState<LossReason[]>([])
  
  // Estado do Modal de Motivo de Perda (Adicionar / Editar)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [editingReason, setEditingReason] = useState<LossReason | null>(null)
  const [reasonLabel, setReasonLabel] = useState('')
  const [reasonDesc, setReasonDesc] = useState('')
  const [reasonActive, setReasonActive] = useState(true)
  const [reasonDefinitive, setReasonDefinitive] = useState(true)
  const [draggedReasonIndex, setDraggedReasonIndex] = useState<number | null>(null)

  // Toast e Mensagem de Sucesso
  const [toastMessage, setToastMessage] = useState('')

  // Dias úteis calculados
  const businessDays = useMemo(() => {
    const y = parseInt(selectedYear, 10) || 2026
    const m = (parseInt(selectedMonth, 10) || 7) - 1
    return getBusinessDaysInMonth(y, m)
  }, [selectedYear, selectedMonth])

  // Verificação de Acesso (Somente Admin e Gestor)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          const parsed = JSON.parse(session)
          setCurrentUser(parsed)
          const role = (parsed.role || '').toLowerCase()
          if (role === 'vendedor' || role === 'representante') {
            router.replace('/dashboard')
          }
        } catch (e) {
          router.replace('/login')
        }
      } else {
        router.replace('/login')
      }
    }
  }, [router])

  // Carrega Usuários Cadastrados, Metas e Motivos de Perda
  useEffect(() => {
    async function loadData() {
      // 1. Carrega Usuários
      let users: any[] = []
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.users)) {
          users = json.users
        }
      } catch (e) {}

      if (users.length === 0 && typeof window !== 'undefined') {
        const raw = localStorage.getItem('cp_crm_v7_official_users') || localStorage.getItem('crm_users')
        if (raw) {
          try { users = JSON.parse(raw) } catch (e) {}
        }
      }
      setRegisteredUsers(users.filter(u => u.status !== 'inativo'))

      // 2. Carrega Motivos de Perda
      if (typeof window !== 'undefined') {
        const rawReasons = localStorage.getItem('cp_crm_loss_reasons')
        if (rawReasons) {
          try {
            setLossReasons(JSON.parse(rawReasons))
          } catch (e) {
            setLossReasons(DEFAULT_LOSS_REASONS)
          }
        } else {
          setLossReasons(DEFAULT_LOSS_REASONS)
          localStorage.setItem('cp_crm_loss_reasons', JSON.stringify(DEFAULT_LOSS_REASONS))
        }
      }

      // 3. Carrega Metas Salvas
      if (typeof window !== 'undefined') {
        const rawGoals = localStorage.getItem('cp_crm_user_goals')
        if (rawGoals) {
          try {
            const parsedMap = JSON.parse(rawGoals)
            setGoalsMap(parsedMap)
          } catch (e) {}
        }
      }
    }

    loadData()
  }, [])

  // Inicializa mapa de metas para o Mês/Ano selecionado se não existir
  useEffect(() => {
    if (registeredUsers.length === 0) return

    setGoalsMap(prev => {
      const updated = { ...prev }
      let changed = false

      registeredUsers.forEach(u => {
        const key = `${selectedYear}_${selectedMonth}_${u.id || u.name}`
        if (!updated[key]) {
          changed = true
          updated[key] = {
            id: key,
            userId: u.id,
            userName: u.name,
            year: selectedYear,
            month: selectedMonth,
            salesGoal: 30000,
            visitsGoal: 10,
            newClientsGoal: 2,
            updatedAt: new Date().toISOString()
          }
        }
      })

      return changed ? updated : prev
    })
  }, [registeredUsers, selectedYear, selectedMonth])

  // Atualiza um campo da meta do usuário
  const handleUpdateGoalField = (userKey: string, field: 'salesGoal' | 'visitsGoal' | 'newClientsGoal', rawVal: string) => {
    const num = Math.max(0, parseFloat(rawVal) || 0)
    setGoalsMap(prev => ({
      ...prev,
      [userKey]: {
        ...prev[userKey],
        [field]: num,
        updatedAt: new Date().toISOString()
      }
    }))
  }

  // Salvar Metas no LocalStorage e avisar app
  const handleSaveGoals = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_crm_user_goals', JSON.stringify(goalsMap))
      window.dispatchEvent(new Event('storage-goals-changed'))
      window.dispatchEvent(new Event('storage'))
    }
    showToast('Metas salvas com sucesso!')
  }

  // Salvar Motivos de Perda
  const handleSaveLossReasons = (updatedList: LossReason[]) => {
    setLossReasons(updatedList)
    if (typeof window !== 'undefined') {
      localStorage.setItem('cp_crm_loss_reasons', JSON.stringify(updatedList))
      window.dispatchEvent(new Event('storage-loss-reasons-changed'))
      window.dispatchEvent(new Event('storage'))
    }
  }

  // Adicionar / Editar Motivo de Perda
  const handleSaveReasonModal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!reasonLabel.trim()) return

    if (editingReason) {
      const updated = lossReasons.map(r => 
        r.id === editingReason.id ? { 
          ...r, 
          label: reasonLabel.trim(), 
          description: reasonDesc.trim(),
          active: reasonActive,
          isDefinitive: reasonDefinitive
        } : r
      )
      handleSaveLossReasons(updated)
      showToast('Motivo de perda atualizado!')
    } else {
      const newReason: LossReason = {
        id: Date.now().toString(),
        label: reasonLabel.trim(),
        description: reasonDesc.trim(),
        active: reasonActive,
        isDefinitive: reasonDefinitive,
        order: lossReasons.length + 1
      }
      const updated = [...lossReasons, newReason]
      handleSaveLossReasons(updated)
      showToast('Novo motivo de perda cadastrado!')
    }

    setShowReasonModal(false)
    setEditingReason(null)
    setReasonLabel('')
    setReasonDesc('')
  }

  const handleDeleteReason = (id: string) => {
    const updated = lossReasons.filter(r => r.id !== id)
    handleSaveLossReasons(updated)
    showToast('Motivo de perda excluído!')
  }

  // HTML5 Drag and Drop handlers for reordering reasons
  const handleDragStartReason = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
    setDraggedReasonIndex(index)
  }

  const handleDragOverReason = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDropReason = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedReasonIndex === null || draggedReasonIndex === dropIndex) return
    const updated = [...lossReasons]
    const [moved] = updated.splice(draggedReasonIndex, 1)
    updated.splice(dropIndex, 0, moved)
    updated.forEach((r, i) => { r.order = i + 1 })
    handleSaveLossReasons(updated)
    setDraggedReasonIndex(null)
    showToast('Ordem dos motivos atualizada!')
  }

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Totais da Equipe (Soma das Metas Individuais)
  const teamTotals = useMemo(() => {
    let salesSum = 0
    let visitsSum = 0
    let newClientsSum = 0

    registeredUsers.forEach(u => {
      const key = `${selectedYear}_${selectedMonth}_${u.id || u.name}`
      const g = goalsMap[key]
      if (g) {
        salesSum += g.salesGoal || 0
        visitsSum += g.visitsGoal || 0
        newClientsSum += g.newClientsGoal || 0
      }
    })

    return { sales: salesSum, visits: visitsSum, newClients: newClientsSum }
  }, [registeredUsers, goalsMap, selectedYear, selectedMonth])

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-5 max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-24 select-none">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[99999] bg-[var(--lime)] text-black font-extrabold text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header com Abas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--line)] pb-4 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[rgba(180,217,50,0.15)] border border-[var(--lime)]/30 flex items-center justify-center text-[var(--lime)]">
              <Target size={18} />
            </div>
            <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
              Metas & Parâmetros Comerciais
            </h1>
          </div>
          <p className="text-xs font-mono text-[var(--gray2)] mt-1">
            Planejamento estratégico de metas de vendas, visitas e gestão dos motivos de perdas de negócios.
          </p>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--line)] p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('metas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'metas' 
                ? 'bg-[var(--lime)] text-black shadow-md' 
                : 'text-[var(--gray2)] hover:text-[var(--white)]'
            }`}
          >
            <Target size={14} />
            <span>Metas Comerciais</span>
          </button>
          <button
            onClick={() => setActiveTab('motivos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'motivos' 
                ? 'bg-[var(--lime)] text-black shadow-md' 
                : 'text-[var(--gray2)] hover:text-[var(--white)]'
            }`}
          >
            <XCircle size={14} />
            <span>Motivos de Perda</span>
          </button>
        </div>
      </div>

      {/* ABA 1: METAS COMERCIAIS */}
      {activeTab === 'metas' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          
          {/* Barra de Filtros e Controles de Período */}
          <div className="card p-4 bg-[var(--card)] border border-[var(--line)] flex flex-wrap items-center justify-between gap-4">
            
            <div className="flex items-center gap-3 flex-wrap">
              {/* Ano */}
              <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl">
                <Calendar size={13} className="text-[var(--lime)]" />
                <span className="text-[10px] font-mono font-bold text-[var(--gray2)] uppercase">Ano:</span>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-[var(--white)] outline-none cursor-pointer"
                >
                  <option value="2026" className="bg-[var(--charcoal)]">2026</option>
                  <option value="2025" className="bg-[var(--charcoal)]">2025</option>
                </select>
              </div>

              {/* Mês */}
              <div className="flex items-center gap-1.5 bg-[var(--charcoal)] border border-[var(--line)] px-3 py-1.5 rounded-xl">
                <span className="text-[10px] font-mono font-bold text-[var(--gray2)] uppercase">Mês:</span>
                <select
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-[var(--white)] outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => {
                    const numStr = (idx + 1).toString().padStart(2, '0')
                    return (
                      <option key={numStr} value={numStr} className="bg-[var(--charcoal)]">
                        {m}
                      </option>
                    )
                  })}
                </select>
              </div>

              {/* Info Dias Úteis */}
              <div className="px-3 py-1.5 rounded-xl bg-lime-500/10 border border-[var(--lime)]/20 text-[11px] font-mono text-[var(--lime)] font-bold flex items-center gap-1.5">
                <Calendar size={13} />
                <span>{businessDays} dias úteis no mês</span>
              </div>
            </div>

            {/* Alternador de Visualização (Mensal / Semanal / Diária) */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('mensal')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    viewMode === 'mensal' ? 'bg-[var(--lime)] text-black' : 'text-[var(--gray2)]'
                  }`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setViewMode('semanal')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    viewMode === 'semanal' ? 'bg-[var(--lime)] text-black' : 'text-[var(--gray2)]'
                  }`}
                >
                  Semanal (÷4.4)
                </button>
                <button
                  onClick={() => setViewMode('diaria')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    viewMode === 'diaria' ? 'bg-[var(--lime)] text-black' : 'text-[var(--gray2)]'
                  }`}
                >
                  Diária (÷{businessDays})
                </button>
              </div>

              <button
                onClick={handleSaveGoals}
                className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer font-bold shadow-lg"
              >
                <Save size={14} />
                <span>Salvar Metas</span>
              </button>
            </div>
          </div>

          {/* Cards Resumo Geral da Equipe */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 bg-[var(--card)] border border-[rgba(180,217,50,0.2)] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Meta Faturamento (Equipe)</span>
                <div className="text-xl font-display font-black text-[var(--lime)] mt-1">
                  R$ {(viewMode === 'mensal' ? teamTotals.sales : viewMode === 'semanal' ? teamTotals.sales / 4.4 : teamTotals.sales / businessDays).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  <span className="text-[10px] font-mono text-[var(--gray2)] font-normal ml-1">/{viewMode === 'mensal' ? 'mês' : viewMode === 'semanal' ? 'sem' : 'dia'}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[rgba(180,217,50,0.1)] border border-[var(--lime)]/20 flex items-center justify-center text-[var(--lime)]">
                <DollarSign size={20} />
              </div>
            </div>

            <div className="card p-4 bg-[var(--card)] border border-sky-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Meta Visitas/Contatos</span>
                <div className="text-xl font-display font-black text-sky-400 mt-1">
                  {Math.round(viewMode === 'mensal' ? teamTotals.visits : viewMode === 'semanal' ? teamTotals.visits / 4.4 : teamTotals.visits / businessDays)} visitas
                  <span className="text-[10px] font-mono text-[var(--gray2)] font-normal ml-1">/{viewMode === 'mensal' ? 'mês' : viewMode === 'semanal' ? 'sem' : 'dia'}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                <Users size={20} />
              </div>
            </div>

            <div className="card p-4 bg-[var(--card)] border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Meta Novos Clientes (Pedido Fechado)</span>
                <div className="text-xl font-display font-black text-emerald-400 mt-1">
                  {Math.round(viewMode === 'mensal' ? teamTotals.newClients : viewMode === 'semanal' ? teamTotals.newClients / 4.4 : teamTotals.newClients / businessDays)} clientes
                  <span className="text-[10px] font-mono text-[var(--gray2)] font-normal ml-1">/{viewMode === 'mensal' ? 'mês' : viewMode === 'semanal' ? 'sem' : 'dia'}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Award size={20} />
              </div>
            </div>
          </div>

          {/* Tabela de Definição de Metas por Vendedor / Representante */}
          <div className="card p-5 bg-[var(--card)] border border-[var(--line)] flex flex-col gap-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 className="text-sm font-bold text-[var(--white)] font-display flex items-center gap-2">
                <Users size={16} className="text-[var(--lime)]" />
                <span>Metas Individuais da Equipe Comercial ({registeredUsers.length} Usuários)</span>
              </h3>
              <span className="text-[10px] font-mono text-[var(--gray2)] uppercase">
                {MONTH_NAMES[parseInt(selectedMonth, 10) - 1]} / {selectedYear}
              </span>
            </div>

            {registeredUsers.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-[var(--gray2)] border border-dashed border-[var(--line)] rounded-xl">
                Nenhum usuário comercial ativo encontrado no cadastro.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--line)] text-[10px] font-mono text-[var(--gray2)] uppercase">
                      <th className="py-3 px-3">Vendedor / Representante</th>
                      <th className="py-3 px-3">Função</th>
                      <th className="py-3 px-3 text-right">Meta Vendas (R$) {viewMode !== 'mensal' ? `(${viewMode})` : ''}</th>
                      <th className="py-3 px-3 text-right">Meta Visitas (Qtd) {viewMode !== 'mensal' ? `(${viewMode})` : ''}</th>
                      <th className="py-3 px-3 text-right">Meta Novos Clientes (Qtd) {viewMode !== 'mensal' ? `(${viewMode})` : ''}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]/50 text-xs">
                    {registeredUsers.map(u => {
                      const key = `${selectedYear}_${selectedMonth}_${u.id || u.name}`
                      const g = goalsMap[key] || { salesGoal: 30000, visitsGoal: 10, newClientsGoal: 2 }

                      const salesDisp = viewMode === 'mensal' ? g.salesGoal : viewMode === 'semanal' ? Math.round(g.salesGoal / 4.4) : Math.round(g.salesGoal / businessDays)
                      const visitsDisp = viewMode === 'mensal' ? g.visitsGoal : viewMode === 'semanal' ? Math.round(g.visitsGoal / 4.4) : Math.round(g.visitsGoal / businessDays)
                      const clientsDisp = viewMode === 'mensal' ? g.newClientsGoal : viewMode === 'semanal' ? Math.round(g.newClientsGoal / 4.4) : Math.round(g.newClientsGoal / businessDays)

                      return (
                        <tr key={u.id || u.name} className="hover:bg-[var(--charcoal)]/50 transition-colors">
                          <td className="py-3.5 px-3 font-bold text-[var(--white)]">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[var(--lime)]/10 text-[var(--lime)] font-mono font-bold flex items-center gap-1 justify-center text-xs shrink-0 border border-[var(--lime)]/20">
                                {u.name ? u.name.slice(0, 2).toUpperCase() : 'US'}
                              </div>
                              <span>{u.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 font-mono text-[10px]">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                              u.role === 'admin' || u.role === 'administrador' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              u.role === 'gestor' || u.role === 'gestor comercial' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              u.role === 'vendedor' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Campo Meta Venda R$ */}
                          <td className="py-3.5 px-3 text-right font-mono">
                            <div className="inline-flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-2 py-1 focus-within:border-[var(--lime)]">
                              <span className="text-[10px] text-[var(--gray2)] font-bold">R$</span>
                              <input
                                type="number"
                                value={viewMode === 'mensal' ? (g.salesGoal || 0) : salesDisp}
                                onChange={e => {
                                  let val = parseFloat(e.target.value) || 0
                                  if (viewMode === 'semanal') val = val * 4.4
                                  if (viewMode === 'diaria') val = val * businessDays
                                  handleUpdateGoalField(key, 'salesGoal', val.toString())
                                }}
                                className="bg-transparent border-none outline-none text-xs font-bold text-[var(--lime)] text-right w-24"
                              />
                            </div>
                          </td>

                          {/* Campo Meta Visitas */}
                          <td className="py-3.5 px-3 text-right font-mono">
                            <div className="inline-flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-2 py-1 focus-within:border-sky-400">
                              <input
                                type="number"
                                value={viewMode === 'mensal' ? (g.visitsGoal || 0) : visitsDisp}
                                onChange={e => {
                                  let val = parseFloat(e.target.value) || 0
                                  if (viewMode === 'semanal') val = val * 4.4
                                  if (viewMode === 'diaria') val = val * businessDays
                                  handleUpdateGoalField(key, 'visitsGoal', val.toString())
                                }}
                                className="bg-transparent border-none outline-none text-xs font-bold text-sky-400 text-right w-16"
                              />
                              <span className="text-[10px] text-[var(--gray2)]">visitas</span>
                            </div>
                          </td>

                          {/* Campo Meta Novos Clientes */}
                          <td className="py-3.5 px-3 text-right font-mono">
                            <div className="inline-flex items-center gap-1 bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-2 py-1 focus-within:border-emerald-400">
                              <input
                                type="number"
                                value={viewMode === 'mensal' ? (g.newClientsGoal || 0) : clientsDisp}
                                onChange={e => {
                                  let val = parseFloat(e.target.value) || 0
                                  if (viewMode === 'semanal') val = val * 4.4
                                  if (viewMode === 'diaria') val = val * businessDays
                                  handleUpdateGoalField(key, 'newClientsGoal', val.toString())
                                }}
                                className="bg-transparent border-none outline-none text-xs font-bold text-emerald-400 text-right w-16"
                              />
                              <span className="text-[10px] text-[var(--gray2)]">clientes</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: MOTIVOS DE PERDA */}
      {activeTab === 'motivos' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          
          <div className="card p-4 bg-[var(--card)] border border-[var(--line)] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[var(--white)] font-display flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <span>Cadastro de Motivos de Perda de Oportunidades</span>
              </h3>
              <p className="text-xs font-mono text-[var(--gray2)] mt-0.5">
                Arraste os cards para reordenar a sequência de motivos exibida no pipeline. Clique no card para editar.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingReason(null)
                setReasonLabel('')
                setReasonDesc('')
                setReasonActive(true)
                setReasonDefinitive(true)
                setShowReasonModal(true)
              }}
              className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer font-bold shadow-lg shrink-0"
            >
              <Plus size={14} />
              <span>Novo Motivo</span>
            </button>
          </div>

          {/* Lista de Motivos de Perda (Arrastáveis & Clicáveis) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lossReasons.map((reason, idx) => (
              <div 
                key={reason.id} 
                draggable
                onDragStart={(e) => handleDragStartReason(e, idx)}
                onDragOver={handleDragOverReason}
                onDrop={(e) => handleDropReason(e, idx)}
                onClick={() => {
                  setEditingReason(reason)
                  setReasonLabel(reason.label)
                  setReasonDesc(reason.description || '')
                  setReasonActive(reason.active ?? true)
                  setReasonDefinitive(reason.isDefinitive ?? true)
                  setShowReasonModal(true)
                }}
                className={`card p-4 border transition-all flex flex-col justify-between gap-3 cursor-pointer group hover:border-[var(--lime)] hover:scale-[1.01] ${
                  draggedReasonIndex === idx ? 'opacity-40 border-dashed border-[var(--lime)]' : ''
                } ${
                  reason.active 
                    ? 'bg-[var(--card)] border-[var(--line)]' 
                    : 'bg-black/40 border-red-500/20 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="text-[var(--gray2)] group-hover:text-[var(--lime)] cursor-grab active:cursor-grabbing p-1 -ml-1">
                      <GripVertical size={16} />
                    </div>
                    <span className="text-[10px] font-mono text-[var(--gray2)] font-bold bg-[var(--charcoal)] px-2 py-0.5 rounded border border-[var(--line)]">
                      #{idx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-[var(--white)] group-hover:text-[var(--lime)] transition-colors">{reason.label}</h4>
                  </div>
                </div>

                {reason.description && (
                  <p className="text-xs text-[var(--gray)] font-mono line-clamp-2 pl-7">
                    "{reason.description}"
                  </p>
                )}

                {/* Badges de Status & Tipo de Perda */}
                <div className="border-t border-[var(--line)]/60 pt-3 flex items-center justify-between text-xs font-mono">
                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    reason.active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {reason.active ? '🟢 Ativo' : '⚫ Inativo'}
                  </span>

                  <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    reason.isDefinitive !== false 
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30' 
                      : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                  }`}>
                    {reason.isDefinitive !== false ? '🔴 Perda Definitiva' : '🔄 Perda Temporária'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Adicionar / Editar Motivo de Perda */}
      {showReasonModal && (
        <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="card w-full max-w-md p-6 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 className="text-sm font-bold text-[var(--white)] font-display flex items-center gap-2">
                <XCircle size={16} className="text-red-400" />
                <span>{editingReason ? 'Editar Motivo de Perda' : 'Novo Motivo de Perda'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowReasonModal(false)}
                className="p-1 text-[var(--gray2)] hover:text-[var(--white)] transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveReasonModal} className="flex flex-col gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] text-[var(--gray2)] uppercase font-bold mb-1">
                  Nome do Motivo de Perda *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Preço alto / Orçamento estourado"
                  value={reasonLabel}
                  onChange={e => setReasonLabel(e.target.value)}
                  className="w-full bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-[var(--white)] outline-none focus:border-[var(--lime)] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[var(--gray2)] uppercase font-bold mb-1">
                  Descrição Explicativa (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Descreva quando esse motivo de perda deve ser selecionado pelos representantes..."
                  value={reasonDesc}
                  onChange={e => setReasonDesc(e.target.value)}
                  className="w-full bg-[var(--charcoal)] border border-[var(--line)] rounded-xl px-3 py-2 text-xs text-[var(--white)] outline-none focus:border-[var(--lime)] resize-none font-mono"
                />
              </div>

              {/* Toggles Grandes de Status & Perda Definitiva */}
              <div className="flex flex-col gap-3.5 p-4 border border-[var(--line)] rounded-xl bg-[var(--card2)]">
                
                {/* Toggle 1: Status (Ativo / Inativo) */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[var(--white)] block">Status do Motivo</span>
                    <span className="text-[10px] text-[var(--gray2)] font-mono">
                      {reasonActive ? '🟢 Motivo ativo (visível no pipeline)' : '⚫ Motivo desativado (oculto no pipeline)'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReasonActive(v => !v)}
                    className={`w-14 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                      reasonActive ? 'bg-emerald-500 justify-end' : 'bg-gray-700 justify-start'
                    }`}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                  </button>
                </div>

                <div className="border-t border-[var(--line)]/60 pt-3">
                  {/* Toggle 2: Perda Definitiva / Temporária */}
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <span className="text-xs font-bold text-[var(--white)] block">Tipo de Perda</span>
                      <span className="text-[10px] text-[var(--gray2)] font-mono">
                        {reasonDefinitive ? '🔴 Perda Definitiva (negócio encerrado)' : '🔄 Perda Temporária (oportunidade de retorno)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setReasonDefinitive(v => !v)}
                      className={`w-14 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 flex items-center ${
                        reasonDefinitive ? 'bg-red-500 justify-end' : 'bg-amber-500 justify-start'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Rodapé do Modal */}
              <div className="flex items-center justify-between border-t border-[var(--line)] pt-4 mt-2">
                {editingReason ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Tem certeza que deseja excluir o motivo "${editingReason.label}"?`)) {
                        handleDeleteReason(editingReason.id)
                        setShowReasonModal(false)
                      }
                    }}
                    className="p-2 px-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 font-bold transition-colors cursor-pointer text-[11px]"
                  >
                    <Trash2 size={13} />
                    <span>Excluir</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReasonModal(false)}
                    className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs py-2 px-4 cursor-pointer font-bold"
                  >
                    Salvar Motivo
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

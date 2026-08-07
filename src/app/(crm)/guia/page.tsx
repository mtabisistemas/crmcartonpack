'use client'

import { useState, useEffect } from 'react'
import {
  BookOpen,
  UserCheck,
  Users,
  BarChart3,
  Shield,
  Target,
  FileText,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  HelpCircle,
  ChevronRight,
  Printer,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Lock
} from 'lucide-react'

export default function GuiaPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'vendedor' | 'gestor' | 'admin'>('vendedor')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          const u = JSON.parse(session)
          setCurrentUser(u)
          const roleLower = (u?.role || '').toLowerCase()
          if (roleLower.includes('admin')) {
            setActiveTab('admin')
          } else if (roleLower.includes('gestor')) {
            setActiveTab('gestor')
          } else {
            setActiveTab('vendedor')
          }
        } catch (e) {}
      }
    }
  }, [])

  const roleLower = (currentUser?.role || '').toLowerCase()
  const isAdmin = roleLower.includes('admin')
  const isGestor = roleLower.includes('gestor')

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-4 overflow-y-auto pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 border-b border-[var(--line)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--lime)]/15 border border-[var(--lime)]/30 flex items-center justify-center text-[var(--lime)] shadow-md">
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
              Manual & Guia do Usuário
            </h1>
            <p className="text-xs text-[var(--gray2)] font-mono mt-0.5">
              Documentação e instruções de operação do Carton Pack CRM
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="btn btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-white font-bold shadow-md print:hidden"
          >
            <Printer size={13} className="text-[var(--lime)]" />
            <span>Imprimir Manual</span>
          </button>
        </div>
      </div>

      {/* Role Selection Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] pb-3 overflow-x-auto print:hidden">
        <span className="text-[10px] font-mono text-[var(--gray2)] uppercase tracking-wider mr-2 font-bold shrink-0">
          Seções do Manual:
        </span>

        <button
          type="button"
          onClick={() => setActiveTab('vendedor')}
          className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'vendedor'
              ? 'bg-[var(--lime)] text-black shadow-lg scale-105'
              : 'bg-[var(--card)] text-[var(--gray2)] border border-[var(--line)] hover:text-white'
          }`}
        >
          <UserCheck size={13} />
          <span>Vendedor & Representante</span>
        </button>

        {(isGestor || isAdmin) && (
          <button
            type="button"
            onClick={() => setActiveTab('gestor')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'gestor'
                ? 'bg-[var(--lime)] text-black shadow-lg scale-105'
                : 'bg-[var(--card)] text-[var(--gray2)] border border-[var(--line)] hover:text-white'
            }`}
          >
            <BarChart3 size={13} />
            <span>Gestão Comercial</span>
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-[var(--lime)] text-black shadow-lg scale-105'
                : 'bg-[var(--card)] text-[var(--gray2)] border border-[var(--line)] hover:text-white'
            }`}
          >
            <Shield size={13} />
            <span>Administrador Master</span>
          </button>
        )}
      </div>

      {/* ── SECTION 1: VENDEDOR & REPRESENTANTE ── */}
      {(activeTab === 'vendedor' || activeTab === 'gestor' || activeTab === 'admin') && (
        <div className="flex flex-col gap-5">
          
          <div className="card p-5 border-l-4 border-l-[var(--lime)] bg-[var(--card)] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-[var(--lime)]/10 border border-[var(--lime)]/30 text-[var(--lime)] font-mono text-[10px] font-bold uppercase">
                Perfil Operacional
              </span>
              <h2 className="font-display text-lg text-white font-bold">
                1. Operação Diária de Vendas (Vendedores & Representantes)
              </h2>
            </div>
            <p className="text-xs text-[var(--gray2)] leading-relaxed">
              Instruções de como utilizar o CRM no dia a dia para gerenciar sua carteira, acompanhar negociações e agendar atendimentos.
            </p>
          </div>

          {/* 1.1 Carteira de Clientes */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                1
              </div>
              <h3 className="font-display text-base font-bold text-white">Carteira de Clientes (Contatos)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[var(--lime)] font-mono uppercase text-[11px]">🔍 Busca e Filtros Inteligentes</h4>
                <ul className="list-disc list-inside space-y-1.5 text-[var(--gray2)]">
                  <li>Use a barra superior para buscar por <strong>Razão Social</strong>, <strong>CNPJ</strong> ou <strong>Cidade</strong>.</li>
                  <li>Clique nos cards de métricas no topo para filtrar por <strong>Status</strong> (Ativos ≤90d, Reativação &gt;90d, Prospecção) ou <strong>Curva ABC</strong>.</li>
                  <li>Selecione o representante <strong>DIRETO</strong> no filtro para visualizar clientes atendidos diretamente pela fábrica.</li>
                </ul>
              </div>

              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[var(--lime)] font-mono uppercase text-[11px]">📋 Ficha Completa do Cliente</h4>
                <ul className="list-disc list-inside space-y-1.5 text-[var(--gray2)]">
                  <li>Clique em qualquer cliente para abrir a <strong>Ficha Lateral (Drawer)</strong>.</li>
                  <li>Consulte os dados de CNPJ, Inscrição Estadual e Endereço.</li>
                  <li>Acesse o <strong>Histórico de Vendas Realizadas</strong> vinculado pelo código do cliente.</li>
                  <li>Veja a previsão automática de recompra e dias desde a última compra.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 1.2 Pipeline de Vendas */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 font-bold">
                2
              </div>
              <h3 className="font-display text-base font-bold text-white">Pipeline de Vendas (Funil Kanban)</h3>
            </div>

            <p className="text-xs text-[var(--gray2)] leading-relaxed">
              O Pipeline organiza visualmente suas oportunidades em 6 colunas ativas. Arraste os cartões entre as colunas à medida que o negócio avança:
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px] font-mono text-center">
              <div className="p-2.5 rounded-xl border border-zinc-700 bg-zinc-800/40 text-zinc-300 font-bold">1. Leads / Banco</div>
              <div className="p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 font-bold">2. Prospect</div>
              <div className="p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold">3. Orçamento</div>
              <div className="p-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 font-bold">4. Negociação</div>
              <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">5. Pedido Fechado</div>
              <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 font-bold">6. Perdido</div>
            </div>

            <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl text-xs text-zinc-300 space-y-2">
              <strong className="text-[var(--lime)] font-mono uppercase text-[11px]">⚠️ Regras Obrigatórias de Movimentação:</strong>
              <ul className="list-disc list-inside space-y-1 text-[var(--gray2)]">
                <li><strong>Ao mover para Pedido Fechado</strong>: É necessário informar o número do pedido comercial.</li>
                <li><strong>Ao mover para Perdidos</strong>: É obrigatório selecionar o motivo da perda (ex: Preço, Prazo, Concorrência).</li>
              </ul>
            </div>
          </div>

          {/* 1.3 Diário de Bordo */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 font-bold">
                3
              </div>
              <h3 className="font-display text-base font-bold text-white">Diário de Bordo (Agenda & Atividades)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[var(--lime)] font-mono uppercase text-[11px]">📝 Registrar Atendimento Concluído</h4>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Clique em <strong>Registrar Atividade</strong> para cadastrar Visitas, Ligações, Reuniões, E-mails ou Envios de Orçamentos realizados. O histórico fica salvo na ficha do cliente.
                </p>
              </div>

              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-[var(--lime)] font-mono uppercase text-[11px]">📅 Agendamento de Compromissos</h4>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Agende compromissos na grade semanal ou calendário. Os negócios no Pipeline exibirão automaticamente o selo da próxima visita agendada.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── SECTION 2: GESTÃO COMERCIAL (Gestores e Admins) ── */}
      {(activeTab === 'gestor' || activeTab === 'admin') && (
        <div className="flex flex-col gap-5 mt-4">
          
          <div className="card p-5 border-l-4 border-l-sky-400 bg-[var(--card)] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/30 text-sky-400 font-mono text-[10px] font-bold uppercase">
                Perfil de Gestão
              </span>
              <h2 className="font-display text-lg text-white font-bold">
                2. Ferramentas de Gestão Comercial (Gestores)
              </h2>
            </div>
            <p className="text-xs text-[var(--gray2)] leading-relaxed">
              Recursos de acompanhamento de metas, ranking da equipe e revisão de fechamento do mês.
            </p>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 font-bold">
                4
              </div>
              <h3 className="font-display text-base font-bold text-white">Acompanhamento de Metas & Ranking Comercial</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <strong className="text-sky-400 font-mono uppercase text-[11px]">🎯 Resultado vs Meta do Mês</strong>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Acompanhe a meta mensal em R$, ritmo de vendas (%) e a projeção de fechamento estimada.
                </p>
              </div>

              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <strong className="text-amber-400 font-mono uppercase text-[11px]">🏆 Pódio & Ranking</strong>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Visualização do ranking dos representantes campeões e classificação por faturamento total acumulado.
                </p>
              </div>

              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <strong className="text-[var(--lime)] font-mono uppercase text-[11px]">📊 Revisão do Mês no Pipeline</strong>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Clique em <strong>Revisão do Mês</strong> no topo do Pipeline para ver o Kanban congelado de qualquer mês anterior e a taxa de conversão.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── SECTION 3: ADMINISTRADOR MASTER (Admins) ── */}
      {activeTab === 'admin' && (
        <div className="flex flex-col gap-5 mt-4">
          
          <div className="card p-5 border-l-4 border-l-purple-500 bg-[var(--card)] flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[10px] font-bold uppercase">
                Perfil Administrador
              </span>
              <h2 className="font-display text-lg text-white font-bold">
                3. Gerenciamento e Administração do CRM (Admin)
              </h2>
            </div>
            <p className="text-xs text-[var(--gray2)] leading-relaxed">
              Controle avançado de usuários, permissões, senhas e parâmetros globais do sistema.
            </p>
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-[var(--line)] pb-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0 font-bold">
                5
              </div>
              <h3 className="font-display text-base font-bold text-white">Gestão de Usuários & Senhas</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-300">
              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-purple-300 font-mono uppercase text-[11px]">👤 Cadastrar e Editar Usuários</h4>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Acesse a página <strong>Usuários</strong> para cadastrar membros da equipe, definir cargo (*Vendedor, Representante, Gestor, Admin*) e editar dados a qualquer momento em formulário destacado na tela.
                </p>
              </div>

              <div className="bg-[var(--charcoal)] border border-[var(--line)] p-4 rounded-xl space-y-2">
                <h4 className="font-bold text-purple-300 font-mono uppercase text-[11px]">🔑 Redefinir Senhas Temporárias</h4>
                <p className="text-[var(--gray2)] leading-relaxed">
                  Abra a ficha do usuário na lista para redefinir a senha temporária e gerar a mensagem formatada para envio direto ao colaborador.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}

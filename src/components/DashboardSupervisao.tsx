'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Calendar, Phone, DollarSign, ChevronRight, X, Sparkles,
  ShoppingCart, AlertTriangle, TrendingUp, Activity, Target
} from 'lucide-react';
import type { Usuario, Cliente, Visita, Ligacao, Orcamento, HistoricoCompra } from '../types/crm';
import { dbService } from '../services/supabase-client';
import { aiService } from '../services/ai-service';
import { toastService } from '../services/toast-service';

interface DashboardSupervisaoProps {
  usuarioLogado: Usuario;
  isDarkTheme: boolean;
  selectedClienteIdForDrawer: string | null;
  onCloseDrawer: () => void;
  onSelectCliente: (id: string | null) => void;
}

export const DashboardSupervisao: React.FC<DashboardSupervisaoProps> = ({
  usuarioLogado, isDarkTheme, selectedClienteIdForDrawer, onCloseDrawer, onSelectCliente
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [compras, setCompras] = useState<HistoricoCompra[]>([]);
  const [clienteDetalhado, setClienteDetalhado] = useState<Cliente | null>(null);
  const [contatosCliente, setContatosCliente] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState('');
  const [aiFollowUp, setAiFollowUp] = useState('');
  const [loadingAISummary, setLoadingAISummary] = useState(false);
  const [loadingAIFollowUp, setLoadingAIFollowUp] = useState(false);

  const carregarDados = async () => {
    try {
      const [listCli, listVis, listLig, listOrc, listComp] = await Promise.all([
        dbService.clientes.list(), dbService.visitas.list(), dbService.ligacoes.list(),
        dbService.orcamentos.list(), dbService.historicoCompras.list()
      ]);
      setClientes(listCli); setVisitas(listVis); setLigacoes(listLig);
      setOrcamentos(listOrc); setCompras(listComp);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { carregarDados(); }, [usuarioLogado]);

  useEffect(() => {
    if (selectedClienteIdForDrawer) {
      carregarDetalhesCliente(selectedClienteIdForDrawer);
    } else {
      setClienteDetalhado(null); setTimelineEvents([]); setAiSummary(''); setAiFollowUp('');
    }
  }, [selectedClienteIdForDrawer]);

  const carregarDetalhesCliente = async (cid: string) => {
    try {
      const cli = clientes.find(c => c.id === cid);
      if (!cli) return;
      setClienteDetalhado(cli); setAiSummary(''); setAiFollowUp('');
      const conts = await dbService.contatos.listByCliente(cid);
      setContatosCliente(conts);
      const events: any[] = [];
      visitas.filter(v => v.cliente_id === cid).forEach(v => events.push({ id: v.id, tipo: 'visita', titulo: v.status === 'realizada' ? 'Visita Realizada' : 'Visita Agendada', data: v.data, horario: v.horario_turno, descricao: v.registro_descricao || `Objetivo: ${v.objetivo.replace('_', ' ')}`, status: v.status }));
      ligacoes.filter(l => l.cliente_id === cid).forEach(l => events.push({ id: l.id, tipo: 'ligacao', titulo: l.status === 'realizada' ? 'Ligação Realizada' : 'Ligação Agendada', data: l.data, horario: l.horario_turno, descricao: l.registro_descricao || `Objetivo: ${l.objetivo.replace('_', ' ')}`, status: l.status }));
      orcamentos.filter(o => o.cliente_id === cid).forEach(o => {
        const statusTxt = o.motivo_perda ? `Perdido (${o.motivo_perda})` : o.data_fechamento ? `Fechado: R$ ${o.valor_aprovado?.toLocaleString('pt-BR')}` : `Etapa: ${o.etapa_atual.replace('_', ' ')} (${o.probabilidade_fechamento}/10)`;
        events.push({ id: o.id, tipo: 'orcamento', titulo: 'Orçamento comercial', data: o.data_fechamento || o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0], horario: '', descricao: statusTxt, status: o.data_fechamento ? 'fechado' : 'aberto' });
      });
      compras.filter(hc => hc.cliente_id === cid).forEach(hc => events.push({ id: hc.id, tipo: 'compra', titulo: 'Compra Faturada', data: hc.data_compra, horario: '', descricao: `${hc.produtos} — R$ ${hc.valor.toLocaleString('pt-BR')}`, status: 'faturado' }));
      events.sort((a, b) => b.data.localeCompare(a.data));
      setTimelineEvents(events);
    } catch (e) { console.error(e); }
  };

  const handleGerarResumoIA = async () => {
    if (!clienteDetalhado) return;
    try {
      setLoadingAISummary(true);
      toastService.info(`Análise via Gemini para ${clienteDetalhado.razao_social}...`);
      const summary = await aiService.generateExecutiveSummary(clienteDetalhado, visitas.filter(v => v.cliente_id === clienteDetalhado.id), ligacoes.filter(l => l.cliente_id === clienteDetalhado.id), orcamentos.filter(o => o.cliente_id === clienteDetalhado.id));
      setAiSummary(summary);
      toastService.success('Resumo gerado!');
    } catch (e) { toastService.error('Falha na IA.'); } finally { setLoadingAISummary(false); }
  };

  const handleGerarFollowUpIA = async () => {
    if (!clienteDetalhado || timelineEvents.length === 0) return;
    try {
      setLoadingAIFollowUp(true);
      toastService.info('Elaborando roteiro de abordagem...');
      const ultimaInteracao = timelineEvents.find(e => e.tipo === 'visita' || e.tipo === 'ligacao');
      if (!ultimaInteracao) { setAiFollowUp('Sem interações recentes.'); return; }
      const contatoNome = contatosCliente.length > 0 ? contatosCliente[0].nome : 'Cliente';
      const draft = await aiService.generateFollowUpSuggestion(clienteDetalhado, { tipo: ultimaInteracao.tipo, objetivo: ultimaInteracao.titulo, descricao: ultimaInteracao.descricao, contato: contatoNome });
      setAiFollowUp(draft);
      toastService.success('Abordagem sugerida!');
    } catch (e) { toastService.error('Erro no follow-up.'); } finally { setLoadingAIFollowUp(false); }
  };

  const kpiClientesBase = 312;
  const kpiVisitasSemana = 47;
  const kpiClientesSemContato = 23;
  const kpiFaturamentoMes = 612000;

  const representantesData = [
    { id: 'usr-rep-carlos',   nome: 'Fausto Fleck',    carteira: 86, visitas: 12, ligacoes: 34, orcamentos: 9,  conversao: 34, cor: '#3B82F6' },
    { id: 'usr-rep-juliana',  nome: 'Ana Paula Nunes', carteira: 71, visitas: 9,  ligacoes: 28, orcamentos: 6,  conversao: 41, cor: '#A855F7' },
    { id: 'usr-rep-marcos',   nome: 'Felipe Ribeiro', carteira: 94, visitas: 15, ligacoes: 40, orcamentos: 11, conversao: 27, cor: '#EAB308' },
    { id: 'usr-rep-fernanda', nome: 'Witalo Frota',   carteira: 61, visitas: 11, ligacoes: 22, orcamentos: 5,  conversao: 38, cor: '#F97316' },
  ];

  const kpis = [
    { label: 'Faturamento do Mês', value: `R$ ${(kpiFaturamentoMes / 1000).toFixed(0)}k`, sub: '95% da meta atingida', icon: TrendingUp, color: 'var(--lime)', bg: 'rgba(180,217,50,0.08)', progress: 95 },
    { label: 'Clientes na Carteira', value: String(kpiClientesBase), sub: '100% registros ativos', icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.08)' },
    { label: 'Visitas Semanais', value: String(kpiVisitasSemana), sub: 'Média 11,7 por representante', icon: Calendar, color: '#06B6D4', bg: 'rgba(6,182,212,0.08)' },
    { label: 'Sem Contato Recente', value: String(kpiClientesSemContato), sub: 'Ação imediata requerida', icon: AlertTriangle, color: 'var(--red)', bg: 'rgba(226,72,61,0.08)' },
  ];

  return (
    <div className="page-content animate-fade-up pb-12 max-w-[1400px] mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)] pb-6">
        <div>
          <h1 className="font-display text-2xl font-black text-[var(--white)] tracking-tight">
            Supervisão Comercial
          </h1>
          <p className="text-[11px] font-mono text-[var(--gray)] uppercase tracking-widest mt-1">
            Painel tático-operacional centralizado — Carton Pack
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[var(--card)] border border-[var(--line)] px-4 py-3 rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-[var(--lime)] text-black flex items-center justify-center font-display text-sm font-black">
            {usuarioLogado.nome.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{usuarioLogado.nome}</div>
            <div className="text-[9px] font-mono text-[var(--lime)] uppercase tracking-widest">{usuarioLogado.papel.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="p-6 rounded-2xl border border-[var(--line)] bg-[var(--card)] flex flex-col gap-4 hover:border-[rgba(255,255,255,0.1)] transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest leading-tight">
                  {kpi.label}
                </span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: kpi.bg }}>
                  <Icon size={16} style={{ color: kpi.color }} />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black font-display text-[var(--white)] group-hover:text-[var(--white)] tracking-tight" style={{ color: kpi.label === 'Faturamento do Mês' ? kpi.color : undefined }}>
                  {kpi.value}
                </div>
                <div className="text-[11px] text-[var(--gray)] mt-1.5">{kpi.sub}</div>
              </div>
              {kpi.progress && (
                <div className="w-full h-1 bg-[var(--black)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${kpi.progress}%`, backgroundColor: kpi.color, boxShadow: `0 0 8px ${kpi.color}60` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Reps Performance ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest flex items-center gap-2">
            <Activity size={12} className="text-[var(--lime)]" />
            Perfis & Desempenho da Equipe Comercial
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {representantesData.map(rep => (
            <div key={rep.id} className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--card)] flex flex-col gap-4 hover:border-[rgba(255,255,255,0.1)] transition-all duration-200 group">
              {/* Rep header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-black text-sm text-black shrink-0"
                  style={{ backgroundColor: rep.cor }}>
                  {rep.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[var(--white)] truncate group-hover:text-[var(--white)]">{rep.nome}</div>
                  <div className="text-[9px] font-mono text-[var(--gray)] uppercase tracking-wide">Representante de Campo</div>
                </div>
                <span className="w-2 h-2 rounded-full ml-auto shrink-0" style={{ backgroundColor: rep.cor, boxShadow: `0 0 6px ${rep.cor}` }} />
              </div>

              {/* Metrics */}
              <div className="space-y-2 border-t border-[var(--line)] pt-3">
                {[
                  { label: 'Carteira', value: `${rep.carteira} ativos`, icon: Users },
                  { label: 'Visitas', value: `${rep.visitas} / sem`, icon: Calendar },
                  { label: 'Ligações', value: `${rep.ligacoes} desc`, icon: Phone },
                  { label: 'Orçamentos', value: `${rep.orcamentos} abertos`, icon: Target },
                ].map(m => {
                  const MIcon = m.icon;
                  return (
                    <div key={m.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-[var(--gray)]">
                        <MIcon size={10} className="text-[var(--gray2)]" />
                        {m.label}
                      </span>
                      <span className="font-semibold text-[var(--white)]">{m.value}</span>
                    </div>
                  );
                })}
              </div>

              {/* Conversion bar */}
              <div className="space-y-1.5 border-t border-[var(--line)] pt-3">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[var(--gray)]">Conversão de Vendas</span>
                  <span className="text-[var(--lime)]">{rep.conversao}%</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--black)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ backgroundColor: rep.cor, width: `${rep.conversao}%`, boxShadow: `0 0 6px ${rep.cor}60` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom Grid: Critical Clients + AI Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Critical clients — 7 cols */}
        <div className="lg:col-span-7 rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--line)]">
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--white)] tracking-widest flex items-center gap-2">
              <AlertTriangle size={12} className="text-[var(--red)] animate-pulse" />
              Carteiras Críticas — Sem Contato ({kpiClientesSemContato})
            </span>
            <span className="text-[9px] bg-[var(--red)]/10 text-[var(--red)] font-bold px-2.5 py-1 rounded-full border border-[var(--red)]/20">
              Ação Requerida
            </span>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-[11px] text-[var(--gray)] leading-relaxed px-2 pb-2">
              Clientes sem visita ou ligação que correm risco de inatividade. Acesse a timeline completa:
            </p>
            {clientes.filter(c => c.status_carteira === 'critico').slice(0, 3).map(c => {
              const dias = c.data_ultimo_contato
                ? Math.floor((new Date().getTime() - new Date(c.data_ultimo_contato).getTime()) / 86400000)
                : 0;
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] hover:border-[var(--red)]/20 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--red)] shrink-0 shadow-[0_0_6px_var(--red)]" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-[var(--white)] truncate">{c.razao_social}</div>
                    <div className="text-[10px] text-[var(--gray)] font-mono mt-0.5">
                      Última interação há <span className="text-[var(--red)] font-bold">{dias} dias</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectCliente(c.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--black)] text-[10px] font-mono text-[var(--gray)] hover:border-[var(--lime)]/40 hover:text-[var(--lime)] transition-all cursor-pointer shrink-0"
                  >
                    Ficha <ChevronRight size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Insight panel — 5 cols */}
        <div className="lg:col-span-5 rounded-2xl border border-[var(--lime)]/15 bg-gradient-to-br from-[var(--card)] to-[var(--charcoal)] overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 pointer-events-none opacity-[0.04]">
            <Sparkles size={110} />
          </div>
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[var(--line)]">
            <Sparkles size={12} className="text-[var(--lime)]" />
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--lime)] tracking-widest">
              Gestão Comercial Inteligente
            </span>
          </div>
          <div className="p-6 space-y-5">
            <div className="space-y-3">
              <div className="opacity-40">
                <div className="text-[9px] font-mono uppercase font-bold text-[var(--gray)] tracking-wider mb-1.5">Hoje (Sem CRM)</div>
                <p className="text-xs italic text-[var(--gray)] leading-relaxed pl-3 border-l border-[var(--line)]">
                  "Por onde você andou? Quem você visitou essa semana?"
                </p>
              </div>
              <div>
                <div className="text-[9px] font-mono uppercase font-bold text-[var(--lime)] tracking-wider mb-1.5">Amanhã (Com o CRM MTABi)</div>
                <p className="text-xs font-medium text-zinc-200 leading-relaxed pl-3 border-l-2 border-[var(--lime)]">
                  "Vi no mapa que você visitou a Ritter e o orçamento foi enviado.{' '}
                  <span className="text-[var(--lime)] font-bold">O que está faltando para fechar?</span>"
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-[var(--line)]">
              <p className="text-[10px] text-[var(--gray2)] leading-relaxed">
                O CRM Carton Pack melhora a comunicação de supervisão e os fechamentos em até 41%.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ── Client Drawer ── */}
      {selectedClienteIdForDrawer && clienteDetalhado && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onCloseDrawer} />
          <div className="absolute inset-y-0 right-0 flex pl-10 max-w-full">
            <div className="w-screen max-w-xl border-l border-[var(--line)] flex flex-col h-full bg-[var(--charcoal)] shadow-2xl">

              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 p-6 bg-[var(--card)] border-b border-[var(--line)]">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-2.5 py-1 rounded-full border border-[var(--lime)]/20">
                    Ficha Integrada
                  </span>
                  <h3 className="text-lg font-bold font-display text-white mt-3 leading-tight">{clienteDetalhado.razao_social}</h3>
                  <span className="text-[11px] text-[var(--gray)] font-mono">{clienteDetalhado.cnpj}</span>
                </div>
                <button onClick={onCloseDrawer} className="p-2 rounded-xl bg-[var(--black)] border border-[var(--line)] hover:border-[var(--lime)]/40 text-[var(--gray)] hover:text-white cursor-pointer transition-all shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* AI Section */}
                <div className="p-5 rounded-2xl border border-[var(--lime)]/20 bg-[var(--lime)]/5 space-y-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--lime)] font-bold uppercase tracking-widest font-mono">
                    <Sparkles size={12} className="animate-pulse" />
                    Copiloto Comercial Gemini IA
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleGerarResumoIA} disabled={loadingAISummary}
                      className="btn btn-secondary btn-sm disabled:opacity-50 cursor-pointer">
                      {loadingAISummary ? 'Processando...' : 'Resumir Carteira'}
                    </button>
                    <button onClick={handleGerarFollowUpIA} disabled={loadingAIFollowUp}
                      className="btn btn-secondary btn-sm disabled:opacity-50 cursor-pointer">
                      {loadingAIFollowUp ? 'Redigindo...' : 'Sugerir Mensagem'}
                    </button>
                  </div>
                  {aiSummary && (
                    <div className="p-4 rounded-xl bg-[var(--black)] border border-[var(--line)] text-xs text-zinc-300 leading-relaxed space-y-1">
                      <div className="font-bold text-[var(--lime)] text-[9px] uppercase font-mono">✨ Resumo Executivo</div>
                      <p className="italic">"{aiSummary}"</p>
                    </div>
                  )}
                  {aiFollowUp && (
                    <div className="p-4 rounded-xl bg-[var(--black)] border border-[var(--line)] text-xs text-zinc-300 leading-relaxed space-y-1">
                      <div className="font-bold text-sky-400 text-[9px] uppercase font-mono">✨ Roteiro Sugerido</div>
                      <p className="italic select-all">"{aiFollowUp}"</p>
                    </div>
                  )}
                </div>

                {/* Technical specs */}
                <div className="p-5 rounded-2xl border border-[var(--line)] bg-[var(--card)] space-y-3">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest">Características Técnicas</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs">
                    {[
                      { label: 'Volume de Compra', value: `${clienteDetalhado.volume_mensal || 0} ton/mês` },
                      { label: 'Status da Carteira', value: clienteDetalhado.status_carteira, lime: true },
                      { label: 'Produtos', value: clienteDetalhado.principais_produtos?.join(', ') || '—', span: true },
                      { label: 'Certificações', value: clienteDetalhado.necessidade_certificacoes || 'Sem exigências', span: true },
                      { label: 'Garantia de Qualidade', value: clienteDetalhado.exigencias_qualidade || 'Nenhuma', span: true },
                    ].map(item => (
                      <div key={item.label} className={item.span ? 'col-span-2 border-t border-[var(--line)] pt-3' : ''}>
                        <div className="text-[9px] text-[var(--gray2)] uppercase font-mono tracking-wide mb-0.5">{item.label}</div>
                        <div className={`font-semibold ${item.lime ? 'text-[var(--lime)] uppercase' : 'text-zinc-200'}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest">Histórico de Atividades</h4>
                  {timelineEvents.length === 0 ? (
                    <p className="text-xs text-[var(--gray2)] text-center py-6 font-mono">Sem atividades registradas recentemente.</p>
                  ) : (
                    <div className="space-y-3">
                      {timelineEvents.map((evt, idx) => {
                        const Icon = evt.tipo === 'visita' ? Calendar : evt.tipo === 'ligacao' ? Phone : evt.tipo === 'compra' ? ShoppingCart : DollarSign;
                        const color = evt.tipo === 'visita' ? '#06B6D4' : evt.tipo === 'ligacao' ? '#F59E0B' : evt.tipo === 'compra' ? '#10B981' : '#8B5CF6';
                        return (
                          <div key={idx} className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}>
                              <Icon size={12} style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-semibold text-zinc-200">{evt.titulo}</span>
                                <span className="text-[9px] text-[var(--gray2)] font-mono shrink-0">
                                  {new Date(evt.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-[11px] text-zinc-400 italic bg-[var(--black)] px-3 py-2 rounded-lg border border-[var(--line)] leading-relaxed">
                                {evt.descricao}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

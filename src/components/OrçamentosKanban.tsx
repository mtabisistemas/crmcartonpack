'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, CheckCircle, XCircle, ArrowRight, X, Sparkles,
  Settings, DollarSign, Hammer, Calculator, Ruler, ChevronDown, FileText
} from 'lucide-react';
import type { Orcamento, Cliente, Usuario, OrcamentoEtapa, OrcamentoMotivoPerda, PropostaComercial } from '../types/crm';
import { dbService } from '../services/supabase-client';
import { toastService } from '../services/toast-service';
import { PropostaComercialModal } from './PropostaComercialModal';

interface OrçamentosKanbanProps {
  usuarioLogado: Usuario;
  usuariosDisponiveis: Usuario[];
  isDarkTheme: boolean;
}

// Flex input group helper components (declared at module level to preserve input focus across state updates)
function MoneyInput({ value, onChange, placeholder }: { value: number; onChange: (n: number) => void; placeholder?: string }) {
  return (
    <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/50 focus-within:shadow-[0_0_10px_rgba(180,217,50,0.10)] transition-all px-3 py-2.5 gap-2">
      <span className="text-xs text-[var(--gray2)] font-mono shrink-0">R$</span>
      <input
        type="number"
        className="bg-transparent border-none outline-none text-sm font-mono text-[var(--lime)] w-full"
        value={value || ''}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        placeholder={placeholder || '0,00'}
      />
    </div>
  );
}

function MmInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div>
      <label className="text-[9px] text-[var(--gray2)] uppercase font-mono tracking-wide block mb-1.5">{label}</label>
      <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/50 transition-all px-3 py-2.5 gap-1.5">
        <input
          type="number"
          className="bg-transparent border-none outline-none text-sm font-mono text-white w-full"
          value={value || ''}
          onChange={e => onChange(parseInt(e.target.value) || 0)}
        />
        <span className="text-xs text-[var(--gray2)] font-mono shrink-0">mm</span>
      </div>
    </div>
  );
}

export const OrçamentosKanban: React.FC<OrçamentosKanbanProps> = ({
  usuarioLogado, usuariosDisponiveis, isDarkTheme
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNovo, setShowNovo] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [probabilidade, setProbabilidade] = useState(5);

  const [showAprovadoModal, setShowAprovadoModal] = useState<string | null>(null);
  const [valorAprovado, setValorAprovado] = useState('');

  const [showPerdidoModal, setShowPerdidoModal] = useState<string | null>(null);
  const [motivoPerda, setMotivoPerda] = useState<OrcamentoMotivoPerda>('preco');
  const [justificativa, setJustificativa] = useState('');
  const [percentDiferenca, setPercentDiferenca] = useState('0');

  const [selectedOrcamento, setSelectedOrcamento] = useState<Orcamento | null>(null);

  const [tipoEmbalagem, setTipoEmbalagem] = useState('maleta');
  const [comprimento, setComprimento] = useState(200);
  const [largura, setLargura] = useState(150);
  const [altura, setAltura] = useState(100);
  const [tipoPapel, setTipoPapel] = useState('microondulado_e');
  const [gramatura, setGramatura] = useState(320);
  const [acabamentosSelected, setAcabamentosSelected] = useState<string[]>([]);

  const [custoPapel, setCustoPapel] = useState(0);
  const [custoImpressao, setCustoImpressao] = useState(0);
  const [custoAcabamento, setCustoAcabamento] = useState(0);
  const [custoFaca, setCustoFaca] = useState(0);
  const [custoOutros, setCustoOutros] = useState(0);
  const [margemDesejada, setMargemDesejada] = useState(25);

  // Proposta Comercial Modal States
  const [showPropostaModal, setShowPropostaModal] = useState(false);
  const [initialPropData, setInitialPropData] = useState<Partial<PropostaComercial> | undefined>(undefined);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [listCli, listOrc] = await Promise.all([dbService.clientes.list(), dbService.orcamentos.list()]);
      setClientes(listCli); setOrcamentos(listOrc);
      if (listCli.length > 0) setClienteId(listCli[0].id);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { carregarDados(); }, [usuarioLogado]);

  const handleOpenDrawer = (orc: Orcamento) => {
    setSelectedOrcamento(orc);
    setTipoEmbalagem(orc.tipo_embalagem || 'maleta');
    setComprimento(orc.comprimento_mm || 200); setLargura(orc.largura_mm || 150); setAltura(orc.altura_mm || 100);
    setTipoPapel(orc.tipo_papel || 'microondulado_e'); setGramatura(orc.gramatura_g || 320);
    setAcabamentosSelected(orc.acabamentos || []);
    setCustoPapel(orc.custo_papel || 0); setCustoImpressao(orc.custo_impressao || 0);
    setCustoAcabamento(orc.custo_acabamento || 0); setCustoFaca(orc.custo_faca || 0);
    setCustoOutros(orc.custo_outros || 0); setMargemDesejada(orc.margem_desejada || 25);
  };

  const handleCloseDrawer = () => setSelectedOrcamento(null);

  const handleSalvarFichaTecnica = async () => {
    if (!selectedOrcamento) return;
    const totalCusto = custoPapel + custoImpressao + custoAcabamento + custoFaca + custoOutros;
    const divisor = 1 - (margemDesejada / 100);
    const precoSugerido = divisor <= 0 ? totalCusto : totalCusto / divisor;
    try {
      await dbService.orcamentos.update(selectedOrcamento.id, {
        tipo_embalagem: tipoEmbalagem, comprimento_mm: comprimento, largura_mm: largura, altura_mm: altura,
        tipo_papel: tipoPapel, gramatura_g: gramatura, acabamentos: acabamentosSelected,
        custo_papel: custoPapel, custo_impressao: custoImpressao, custo_acabamento: custoAcabamento,
        custo_faca: custoFaca, custo_outros: custoOutros, margem_desejada: margemDesejada,
        valor_estimado: Math.round(precoSugerido)
      });
      toastService.success('Ficha técnica salva!'); handleCloseDrawer(); carregarDados();
    } catch (e) { toastService.error('Erro ao salvar.'); }
  };

  const toggleAcabamento = (name: string) =>
    setAcabamentosSelected(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);

  const handleAvancarEtapa = async (orc: Orcamento) => {
    const etapas: OrcamentoEtapa[] = ['solicitacao_briefing','ficha_tecnica','desenvolvimento','pcp','programacao','enviado_representante','solicitacao_amostra','enviado_representante_final'];
    const currIdx = etapas.indexOf(orc.etapa_atual);
    if (currIdx !== -1 && currIdx < etapas.length - 1) {
      const nextEtapa = etapas[currIdx + 1];
      if (nextEtapa === 'enviado_representante_final') { setShowAprovadoModal(orc.id); }
      else {
        try {
          await dbService.orcamentos.update(orc.id, { etapa_atual: nextEtapa });
          toastService.success(`Avançado para: ${nextEtapa.replace(/_/g, ' ').toUpperCase()}`);
          carregarDados();
        } catch (e) { toastService.error('Erro ao avançar.'); }
      }
    }
  };

  const handleCriarOrcamento = async (e: React.FormEvent) => {
    e.preventDefault(); if (!clienteId) return;
    try {
      const cli = clientes.find(c => c.id === clienteId);
      await dbService.orcamentos.save({ cliente_id: clienteId, responsavel_id: usuarioLogado.id, etapa_atual: 'solicitacao_briefing', probabilidade_fechamento: probabilidade, valor_aprovado: null, data_fechamento: null, motivo_perda: null, justificativa_livre: 'Orçamento padrão aberto no funil' });
      setShowNovo(false);
      toastService.success(`Briefing iniciado para: ${cli?.razao_social}`);
      carregarDados();
    } catch (e) { toastService.error('Erro ao criar orçamento.'); }
  };

  const handleConfirmarAprovado = async () => {
    if (!showAprovadoModal || !valorAprovado) return;
    try {
      await dbService.orcamentos.update(showAprovadoModal, { etapa_atual: 'enviado_representante_final', valor_aprovado: parseFloat(valorAprovado) || 0, data_fechamento: new Date().toISOString().split('T')[0] });
      setShowAprovadoModal(null); setValorAprovado('');
      toastService.success('Orçamento ganho e faturado!'); carregarDados();
    } catch (e) { toastService.error('Erro ao processar.'); }
  };

  const handleConfirmarPerdido = async () => {
    if (!showPerdidoModal || !justificativa) return;
    try {
      await dbService.orcamentos.update(showPerdidoModal, { motivo_perda: motivoPerda, justificativa_livre: justificativa, percentual_diferenca_fechamento: parseFloat(percentDiferenca) || 0 });
      setShowPerdidoModal(null); setJustificativa(''); setPercentDiferenca('0');
      toastService.warning('Perda registrada.'); carregarDados();
    } catch (e) { toastService.error('Erro ao processar.'); }
  };

  const raiasKanban: { id: OrcamentoEtapa; label: string; desc: string; color: string }[] = [
    { id: 'solicitacao_briefing',       label: 'Briefing',       desc: 'Identificação',  color: '#3B82F6' },
    { id: 'ficha_tecnica',              label: 'Ficha Técnica',  desc: 'Composição',     color: '#8B5CF6' },
    { id: 'desenvolvimento',            label: 'Desenvolvimento', desc: 'Layout / Faca',  color: '#A855F7' },
    { id: 'pcp',                        label: 'PCP',            desc: 'Planejamento',   color: '#F59E0B' },
    { id: 'programacao',                label: 'Programação',    desc: 'Fila Produção',  color: '#F97316' },
    { id: 'enviado_representante',      label: 'Representante',  desc: 'Proposta Env.',  color: '#06B6D4' },
    { id: 'solicitacao_amostra',        label: 'Amostra',        desc: 'Física/Aprovação', color: '#B4D932' },
  ];

  const totalCustoSimulado = custoPapel + custoImpressao + custoAcabamento + custoFaca + custoOutros;
  const divisorMargem = 1 - (margemDesejada / 100);
  const precoVendaSugerido = divisorMargem <= 0 ? totalCustoSimulado : totalCustoSimulado / divisorMargem;
  const lucroEstimado = precoVendaSugerido - totalCustoSimulado;
  const markupEstimado = totalCustoSimulado > 0 ? precoVendaSugerido / totalCustoSimulado : 1.0;

  const acabamentosOpcoes = ['Verniz UV Total', 'Laminação Fosca', 'Laminação Brilho', 'Hot Stamping', 'Relevo Seco', 'Janela PVC'];

  const selectClass = "w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--lime)]/50 transition-all appearance-none cursor-pointer";
  const labelClass = "text-[9px] text-[var(--gray2)] uppercase font-mono tracking-wide block mb-1.5";



  return (
    <div className="page-content animate-fade-up pb-12 space-y-7">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-[var(--white)] tracking-tight">Kanban de Orçamentos</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              const firstCli = clientes[0];
              const firstOrc = orcamentos[0];
              setInitialPropData({
                numero_proposta: `Prop. 27.${firstOrc ? firstOrc.id.replace('orc-', '') : '105'}`,
                empresa_nome: firstCli ? firstCli.razao_social.toUpperCase() : 'CALÇADOS NACIONAL LTDA',
                cidade_estado: firstCli ? `${firstCli.cidade.toUpperCase()} / ${firstCli.estado.toUpperCase()}` : 'NOVO HAMBURGO / RS',
                contato_atencao: 'Depto. Compras / Comercial',
                itens: [
                  {
                    id: 'item-1',
                    titulo: firstOrc?.tipo_embalagem ? firstOrc.tipo_embalagem.toUpperCase() : 'EMBALAGEM PERSONALIZADA CARTON PACK',
                    tamanho: `Tamanho ${firstOrc?.comprimento_mm || 200}x${firstOrc?.largura_mm || 150}x${firstOrc?.altura_mm || 100}mm`,
                    especificacao_tecnica: `Fechamento com fundo automático, impressão offset em 4 cores seleção, revestido com verniz brilho, em material ${firstOrc?.tipo_papel ? firstOrc.tipo_papel.replace(/_/g, ' ').toUpperCase() : 'MICROONDULADO E'} acoplado com micro ondulado pardo, gramatura aprox. ${firstOrc?.gramatura_g || 320}g/m², selados em pacotes plásticos e acondicionados em paletes com filme stretch.`,
                    lotes: [
                      { no_orcamento: `256${firstOrc ? firstOrc.id.replace('orc-', '') : '001'}`, quantidade: 1000, unidade: 'unidades', valor_unitario: 3.50 },
                      { no_orcamento: `256${firstOrc ? String(Number(firstOrc.id.replace('orc-', '')) + 1) : '002'}`, quantidade: 2000, unidade: 'unidades', valor_unitario: 2.30 },
                      { no_orcamento: `256${firstOrc ? String(Number(firstOrc.id.replace('orc-', '')) + 2) : '003'}`, quantidade: 3000, unidade: 'unidades', valor_unitario: 1.85 }
                    ]
                  }
                ]
              });
              setShowPropostaModal(true);
            }} 
            className="btn btn-secondary flex items-center gap-2 cursor-pointer shrink-0 text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)]"
          >
            <FileText size={14} /> Gerar Proposta PDF
          </button>
          <button onClick={() => setShowNovo(true)} className="btn btn-primary flex items-center gap-2 cursor-pointer shrink-0">
            <Plus size={14} /> Abrir Orçamento
          </button>
        </div>
      </div>

      {/* ── Kanban Board ── */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-xs text-[var(--gray2)] font-mono gap-3">
          <div className="w-4 h-4 border-2 border-[var(--lime)] border-t-transparent rounded-full animate-spin" />
          Carregando funil...
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minWidth: 'max-content' }}>
          {raiasKanban.map(raia => {
            const orcsDaRaia = orcamentos.filter(o => o.etapa_atual === raia.id && !o.motivo_perda && !o.data_fechamento);
            return (
              <div key={raia.id} className="min-w-[260px] flex-shrink-0 flex flex-col rounded-2xl border border-[var(--line)] bg-[var(--charcoal)] overflow-hidden" style={{ maxHeight: '520px', borderTop: `2px solid ${raia.color}` }}>
                {/* Column Header */}
                <div className="px-4 py-3.5 border-b border-[var(--line)] flex items-center justify-between shrink-0">
                  <div>
                    <div className="text-xs font-bold text-[var(--white)]">{raia.label}</div>
                    <div className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wide">{raia.desc}</div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ color: raia.color, backgroundColor: `${raia.color}18` }}>
                    {orcsDaRaia.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                  {orcsDaRaia.map(orc => {
                    const cli = clientes.find(c => c.id === orc.cliente_id);
                    const rep = usuariosDisponiveis.find(u => u.id === orc.responsavel_id);
                    return (
                      <div key={orc.id} onClick={() => handleOpenDrawer(orc)}
                        className="p-4 rounded-xl border border-[var(--line)] bg-[var(--card)] cursor-pointer hover:border-[rgba(255,255,255,0.1)] hover:-translate-y-0.5 transition-all space-y-3 group">
                        <div>
                          <div className="text-sm font-semibold text-[var(--white)] group-hover:text-[var(--white)] truncate leading-snug">
                            {cli?.razao_social || 'Cliente'}
                          </div>
                          <div className="text-[10px] font-mono text-[var(--gray2)] mt-0.5">
                            {rep?.nome.split(' ')[0] || 'Comercial'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {orc.valor_estimado && orc.valor_estimado > 0 ? (
                            <span className="text-xs font-bold font-mono text-[var(--lime)]">
                              R$ {orc.valor_estimado.toLocaleString('pt-BR')}
                            </span>
                          ) : <span />}
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--lime)]/10 text-[var(--lime)]">
                            {orc.probabilidade_fechamento}/10
                          </span>
                        </div>

                        <div className="flex gap-2 border-t border-[var(--line)] pt-2.5">
                          <button onClick={(e) => { e.stopPropagation(); handleAvancarEtapa(orc); }}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-bold font-mono border border-[var(--line)] bg-[var(--black)] hover:bg-[var(--lime)] hover:text-black hover:border-[var(--lime)] transition-all cursor-pointer text-[var(--gray)]">
                            Avançar <ArrowRight size={9} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setShowPerdidoModal(orc.id); }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--red)]/20 bg-transparent text-[var(--red)] text-xs hover:bg-[var(--red)]/10 transition-all cursor-pointer font-bold">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {orcsDaRaia.length === 0 && (
                    <div className="border border-dashed border-[var(--line)] rounded-xl py-8 text-center text-[10px] text-[var(--gray2)] font-mono">Vazio</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Win/Loss history ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Ganhos */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line)]">
            <CheckCircle size={13} className="text-[var(--green)]" />
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--green)] tracking-widest">Histórico · Ganhos</span>
          </div>
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {orcamentos.filter(o => o.etapa_atual === 'enviado_representante_final' && o.data_fechamento && !o.motivo_perda).map(o => {
              const cli = clientes.find(c => c.id === o.cliente_id);
              return (
                <div key={o.id} className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)]">
                  <div>
                    <div className="text-sm font-semibold text-[var(--white)]">{cli?.razao_social}</div>
                    <div className="text-[10px] font-mono text-[var(--gray)]">{o.data_fechamento ? new Date(o.data_fechamento + 'T12:00:00').toLocaleDateString('pt-BR') : ''}</div>
                  </div>
                  <span className="text-sm font-bold font-mono text-[var(--lime)]">R$ {o.valor_aprovado?.toLocaleString('pt-BR')}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Perdidos */}
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--card)] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--line)]">
            <XCircle size={13} className="text-[var(--red)]" />
            <span className="text-[10px] font-mono uppercase font-bold text-[var(--red)] tracking-widest">Histórico · Perdidos</span>
          </div>
          <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {orcamentos.filter(o => o.motivo_perda !== null).map(o => {
              const cli = clientes.find(c => c.id === o.cliente_id);
              return (
                <div key={o.id} className="p-3.5 rounded-xl bg-[var(--charcoal)] border border-[var(--line)] space-y-1.5">
                  <div className="text-sm font-semibold text-[var(--white)]">{cli?.razao_social}</div>
                  <div className="text-[10px] font-mono text-[var(--red)] uppercase font-bold">{o.motivo_perda} · {o.percentual_diferenca_fechamento}% preço</div>
                  <p className="text-[10px] text-[var(--gray)] italic border-l-2 border-[var(--red)]/30 pl-2 leading-relaxed">"{o.justificativa_livre}"</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Technical Drawer ── */}
      {selectedOrcamento && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleCloseDrawer} />
          <div className="absolute inset-y-0 right-0 flex pl-10 max-w-full">
            <div className="w-screen max-w-[560px] border-l border-[var(--line)] flex flex-col h-full bg-[var(--charcoal)] shadow-2xl">

              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4 p-6 bg-[var(--card)] border-b border-[var(--line)]">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono uppercase tracking-wider font-bold text-[var(--lime)] bg-[var(--lime)]/10 px-2.5 py-1 rounded-full border border-[var(--lime)]/20 inline-block">
                    Ficha Técnica & Precificação
                  </span>
                  <h3 className="text-lg font-bold font-display text-white mt-3 leading-tight">
                    {clientes.find(c => c.id === selectedOrcamento.cliente_id)?.razao_social || 'Cliente'}
                  </h3>
                  <span className="text-[11px] text-[var(--gray)] font-mono">Orçamento #{selectedOrcamento.id}</span>
                </div>
                <button onClick={handleCloseDrawer} className="p-2 rounded-xl bg-[var(--black)] border border-[var(--line)] hover:border-[var(--lime)]/40 text-[var(--gray)] hover:text-white cursor-pointer transition-all shrink-0">
                  <X size={16} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Especificações da Embalagem */}
                <div>
                  <h4 className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest mb-3">
                    <Ruler size={11} className="text-[var(--lime)]" /> Especificações da Embalagem
                  </h4>
                  <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-4">
                    <div>
                      <label className={labelClass}>Tipo de Embalagem</label>
                      <div className="relative">
                        <select className={selectClass} value={tipoEmbalagem} onChange={e => setTipoEmbalagem(e.target.value)}>
                          <option value="maleta">Maleta / Caixa com Tampa</option>
                          <option value="display">Display de Chão</option>
                          <option value="cartucho">Cartucho / Caixa Dobrável</option>
                          <option value="estojo">Estojo Rígido</option>
                          <option value="bandeja">Bandeja / Divisória</option>
                          <option value="caixa_termica">Caixa Isotérmica</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <MmInput value={comprimento} onChange={setComprimento} label="Comprimento" />
                      <MmInput value={largura} onChange={setLargura} label="Largura" />
                      <MmInput value={altura} onChange={setAltura} label="Altura" />
                    </div>
                  </div>
                </div>

                {/* Material & Acabamento */}
                <div>
                  <h4 className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest mb-3">
                    <Hammer size={11} className="text-[var(--lime)]" /> Material & Acabamento
                  </h4>
                  <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Tipo de Papel</label>
                        <div className="relative">
                          <select className={selectClass} value={tipoPapel} onChange={e => setTipoPapel(e.target.value)}>
                            <option value="microondulado_e">Microondulado E (1,3mm)</option>
                            <option value="microondulado_b">Microondulado B (3mm)</option>
                            <option value="duplex_lb">Duplex LB</option>
                            <option value="triplex_slb">Triplex SLB</option>
                            <option value="kraft">Kraft Natural</option>
                          </select>
                          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Gramatura</label>
                        <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/50 transition-all px-3 py-2.5 gap-1.5">
                          <input type="number" className="bg-transparent border-none outline-none text-sm font-mono text-white w-full"
                            value={gramatura} onChange={e => setGramatura(parseInt(e.target.value) || 0)} />
                          <span className="text-xs text-[var(--gray2)] font-mono shrink-0">g/m²</span>
                        </div>
                      </div>
                    </div>

                    {/* Acabamentos checkboxes */}
                    <div>
                      <label className={labelClass}>Acabamentos</label>
                      <div className="grid grid-cols-2 gap-2">
                        {acabamentosOpcoes.map(op => (
                          <label key={op} className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all text-xs ${acabamentosSelected.includes(op) ? 'border-[var(--lime)]/40 bg-[var(--lime)]/8 text-[var(--lime)]' : 'border-[var(--line)] bg-[var(--black)] text-[var(--gray)]'}`}>
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${acabamentosSelected.includes(op) ? 'bg-[var(--lime)] border-[var(--lime)]' : 'border-[var(--line)]'}`}>
                              {acabamentosSelected.includes(op) && <span className="text-black font-black text-[8px]">✓</span>}
                            </div>
                            <span onClick={() => toggleAcabamento(op)}>{op}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost simulator */}
                <div>
                  <h4 className="flex items-center gap-2 text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest mb-3">
                    <Calculator size={11} className="text-[var(--lime)]" /> Simulador de Custos
                  </h4>
                  <div className="p-5 rounded-2xl bg-[var(--card)] border border-[var(--line)] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: 'Custo do Papel', value: custoPapel, set: setCustoPapel },
                        { label: 'Custo Impressão', value: custoImpressao, set: setCustoImpressao },
                        { label: 'Custo Acabamento', value: custoAcabamento, set: setCustoAcabamento },
                        { label: 'Custo Faca / Corte', value: custoFaca, set: setCustoFaca },
                        { label: 'Outros Custos', value: custoOutros, set: setCustoOutros },
                      ].map(f => (
                        <div key={f.label}>
                          <label className={labelClass}>{f.label}</label>
                          <MoneyInput value={f.value} onChange={f.set} />
                        </div>
                      ))}
                      <div>
                        <label className={labelClass}>Margem Desejada ({margemDesejada}%)</label>
                        <input type="range" min={5} max={80} step={1} value={margemDesejada} onChange={e => setMargemDesejada(parseInt(e.target.value))}
                          className="w-full mt-3 accent-[var(--lime)]" />
                      </div>
                    </div>

                    {/* Results */}
                    <div className="mt-2 p-5 rounded-2xl bg-gradient-to-br from-[var(--charcoal)] to-[var(--black)] border border-[var(--lime)]/20 space-y-3">
                      <div className="text-[10px] font-mono uppercase font-bold text-[var(--lime)] tracking-widest">Resultado da Simulação</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Custo Total</div>
                          <div className="text-lg font-black font-mono text-[var(--white)] mt-0.5">R$ {totalCustoSimulado.toLocaleString('pt-BR')}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Preço Sugerido</div>
                          <div className="text-lg font-black font-mono text-[var(--lime)] mt-0.5">R$ {Math.round(precoVendaSugerido).toLocaleString('pt-BR')}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Lucro Bruto</div>
                          <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">R$ {Math.round(lucroEstimado).toLocaleString('pt-BR')}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Markup</div>
                          <div className="text-base font-bold font-mono text-sky-400 mt-0.5">{markupEstimado.toFixed(2)}x</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-5 border-t border-[var(--line)] bg-[var(--black)] flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const cli = clientes.find(c => c.id === selectedOrcamento?.cliente_id);
                    const orcNum = selectedOrcamento?.id ? selectedOrcamento.id.replace('orc-', '') : '256001';
                    const empNomeClean = cli?.razao_social ? cli.razao_social.toUpperCase() : 'EMPRESA CLIENTE LTDA';
                    const cidEstClean = cli ? `${cli.cidade.toUpperCase()} / ${cli.estado.toUpperCase()}` : 'NOVO HAMBURGO / RS';
                    const itemTituloClean = tipoEmbalagem ? `CAIXA MODELO ${tipoEmbalagem.toUpperCase()}` : 'EMBALAGEM PERSONALIZADA CARTON PACK';
                    
                    const unit1000 = precoVendaSugerido > 0 ? Math.round((precoVendaSugerido / 1000) * 100) / 100 : 3.50;
                    const unit2000 = precoVendaSugerido > 0 ? Math.round((precoVendaSugerido / 2000 * 0.85) * 100) / 100 : 2.30;
                    const unit3000 = precoVendaSugerido > 0 ? Math.round((precoVendaSugerido / 3000 * 0.75) * 100) / 100 : 1.85;

                    setInitialPropData({
                      numero_proposta: `Prop. 27.${orcNum}`,
                      empresa_nome: empNomeClean,
                      cidade_estado: cidEstClean,
                      contato_atencao: 'Depto. Compras / Comercial',
                      itens: [
                        {
                          id: 'item-1',
                          titulo: itemTituloClean,
                          tamanho: `Tamanho ${comprimento}x${largura}x${altura}mm`,
                          especificacao_tecnica: `Fechamento com fundo automático, impressão offset em 4 cores seleção, revestido com verniz brilho, em material ${tipoPapel.replace(/_/g, ' ').toUpperCase()} acoplado com micro ondulado pardo, gramatura aprox. ${gramatura}g/m², selados em pacotes plásticos e acondicionados em paletes com filme stretch.`,
                          lotes: [
                            { no_orcamento: `256${orcNum}`, quantidade: 1000, unidade: 'unidades', valor_unitario: unit1000 },
                            { no_orcamento: `256${Number(orcNum) + 1}`, quantidade: 2000, unidade: 'unidades', valor_unitario: unit2000 },
                            { no_orcamento: `256${Number(orcNum) + 2}`, quantidade: 3000, unidade: 'unidades', valor_unitario: unit3000 }
                          ]
                        }
                      ]
                    });
                    setShowPropostaModal(true);
                  }}
                  className="btn btn-secondary text-xs py-2.5 px-4 flex items-center gap-1.5 cursor-pointer text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)]"
                >
                  <FileText size={14} />
                  <span>Gerar Proposta PDF</span>
                </button>
                <div className="flex gap-3">
                  <button onClick={handleCloseDrawer} className="btn btn-secondary text-xs py-2.5 px-5 cursor-pointer">Cancelar</button>
                  <button onClick={handleSalvarFichaTecnica} className="btn btn-primary text-xs py-2.5 px-6 cursor-pointer">Salvar Ficha Técnica</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── New Orcamento Modal ── */}
      {showNovo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowNovo(false)} />
          <div className="relative z-10 w-full max-w-md bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)] bg-[var(--card)]">
              <h3 className="font-display font-bold text-lg text-white">Novo Orçamento</h3>
              <button onClick={() => setShowNovo(false)} className="p-2 rounded-xl border border-[var(--line)] hover:border-[var(--lime)]/40 text-[var(--gray)] hover:text-white cursor-pointer transition-all"><X size={15} /></button>
            </div>
            <form onSubmit={handleCriarOrcamento} className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Cliente</label>
                <div className="relative">
                  <select className={selectClass} value={clienteId} onChange={e => setClienteId(e.target.value)} required>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Probabilidade de Fechamento ({probabilidade}/10)</label>
                <input type="range" min={1} max={10} step={1} value={probabilidade} onChange={e => setProbabilidade(parseInt(e.target.value))} className="w-full accent-[var(--lime)]" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNovo(false)} className="btn btn-secondary flex-1 cursor-pointer">Cancelar</button>
                <button type="submit" className="btn btn-primary flex-1 cursor-pointer">Iniciar Briefing</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Aprovado Modal ── */}
      {showAprovadoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowAprovadoModal(null)} />
          <div className="relative z-10 w-full max-w-md bg-[var(--charcoal)] border border-[var(--lime)]/25 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--line)] bg-[var(--card)]">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle size={14} className="text-[var(--green)]" />
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--green)] tracking-widest">Confirmar Ganho Comercial</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mt-2">Orçamento Aprovado!</h3>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className={labelClass}>Valor Comercial Aprovado</label>
                <MoneyInput value={parseFloat(valorAprovado) || 0} onChange={v => setValorAprovado(String(v))} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAprovadoModal(null)} className="btn btn-secondary flex-1 cursor-pointer">Cancelar</button>
                <button onClick={handleConfirmarAprovado} className="btn btn-primary flex-1 cursor-pointer">Confirmar Ganho</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Perdido Modal ── */}
      {showPerdidoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowPerdidoModal(null)} />
          <div className="relative z-10 w-full max-w-md bg-[var(--charcoal)] border border-[var(--red)]/25 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-[var(--line)] bg-[var(--card)]">
              <div className="flex items-center gap-2 mb-1">
                <XCircle size={14} className="text-[var(--red)]" />
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--red)] tracking-widest">Registrar Perda Comercial</span>
              </div>
              <h3 className="font-display font-bold text-lg text-white mt-2">Perda de Negócio</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Motivo da Perda</label>
                <div className="relative">
                  <select className={selectClass} value={motivoPerda} onChange={e => setMotivoPerda(e.target.value as OrcamentoMotivoPerda)}>
                    <option value="preco">Preço acima do mercado</option>
                    <option value="prazo">Prazo de entrega</option>
                    <option value="qualidade">Questão técnica / qualidade</option>
                    <option value="concorrencia">Concorrência</option>
                    <option value="cancelamento">Cancelamento interno do cliente</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelClass}>% Diferença no Preço</label>
                <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--red)]/50 transition-all px-3 py-2.5 gap-2">
                  <input type="number" className="bg-transparent border-none outline-none text-sm font-mono text-white w-full"
                    value={percentDiferenca} onChange={e => setPercentDiferenca(e.target.value)} placeholder="0" />
                  <span className="text-xs text-[var(--gray2)] font-mono shrink-0">%</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Justificativa Comercial</label>
                <textarea rows={3} className="w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[var(--gray2)] outline-none focus:border-[var(--red)]/50 transition-all resize-none"
                  placeholder="Descreva o contexto..." value={justificativa} onChange={e => setJustificativa(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowPerdidoModal(null)} className="btn btn-secondary flex-1 cursor-pointer">Cancelar</button>
                <button onClick={handleConfirmarPerdido} className="flex-1 py-2.5 rounded-xl bg-[var(--red)]/15 border border-[var(--red)]/30 text-[var(--red)] text-sm font-bold hover:bg-[var(--red)]/25 transition-all cursor-pointer">Registrar Perda</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Proposta Comercial Modal ── */}
      <PropostaComercialModal
        isOpen={showPropostaModal}
        onClose={() => setShowPropostaModal(false)}
        initialProposal={initialPropData}
      />
    </div>
  );
};
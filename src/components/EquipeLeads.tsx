'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, PhoneCall, PlusCircle
} from 'lucide-react';
import type { Ligacao, Prospeccao, Cliente, Usuario } from '../types/crm';
import { dbService } from '../services/supabase-client';
import { toastService } from '../services/toast-service';

interface EquipeLeadsProps {
  usuarioLogado: Usuario;
  isDarkTheme: boolean;
}

export const EquipeLeads: React.FC<EquipeLeadsProps> = ({
  usuarioLogado,
  isDarkTheme
}) => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const [prospeccoes, setProspeccoes] = useState<Prospeccao[]>([]);

  // Registrar Ligação
  const [clienteId, setClienteId] = useState('');
  const [objetivo, setObjetivo] = useState('negociacao_comercial');
  const [descricao, setDescricao] = useState('');
  const [gravandoLigacao, setGravandoLigacao] = useState(false);

  // Registrar Lead
  const [empresaLead, setEmpresaLead] = useState('');
  const [contatoLead, setContatoLead] = useState('');
  const [telefoneLead, setTelefoneLead] = useState('');
  const [emailLead, setEmailLead] = useState('');
  const [segmentoLead, setSegmentoLead] = useState('Papel Cartão');
  const [gravandoLead, setGravandoLead] = useState(false);

  const carregarDados = async () => {
    try {
      const [listCli, listLig, listProsp] = await Promise.all([
        dbService.clientes.list(),
        dbService.ligacoes.list(),
        dbService.prospeccao.list()
      ]);

      setClientes(listCli);
      setLigacoes(listLig);
      setProspeccoes(listProsp);
      if (listCli.length > 0) {
        setClienteId(listCli[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [usuarioLogado]);

  // Salvar ligação
  const handleSalvarLigacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !descricao) {
      toastService.warning('Preencha os campos obrigatórios.');
      return;
    }
    setGravandoLigacao(true);
    try {
      await dbService.ligacoes.save({
        cliente_id: clienteId,
        contato_id: null,
        responsavel_id: usuarioLogado.id,
        data: new Date().toISOString().split('T')[0],
        horario_turno: 'Manhã',
        objetivo: objetivo as any,
        registro_descricao: descricao,
        status: 'realizada'
      });
      toastService.success('Ligação registrada com sucesso!');
      setDescricao('');
      carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setGravandoLigacao(false);
    }
  };

  // Salvar Lead
  const handleSalvarLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaLead || !contatoLead) {
      toastService.warning('Preencha os campos obrigatórios.');
      return;
    }
    setGravandoLead(true);
    try {
      await dbService.prospeccao.save({
        empresa: empresaLead,
        contato: contatoLead,
        telefone: telefoneLead,
        email: emailLead,
        segmento: segmentoLead,
        status: 'frio'
      });
      toastService.success('Lead de prospecção salvo no Banco!');
      setEmpresaLead(''); setContatoLead(''); setTelefoneLead(''); setEmailLead('');
      carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setGravandoLead(false);
    }
  };

  // Converter Lead em Cliente
  const handleConverterLead = async (leadId: string) => {
    try {
      // Usar Fausto Fleck como representante padrão para o cliente e Thiago como interno
      await dbService.prospeccao.convert(leadId, 'usr-rep-carlos', 'usr-vend');
      toastService.success('Lead convertido em Cliente Ativo com sucesso!');
      carregarDados();
    } catch (e) {
      console.error(e);
    }
  };

  // Estatísticas de Atividades
  const ligacoesRealizadasHoje = ligacoes.filter(l => l.responsavel_id === usuarioLogado.id && l.status === 'realizada').length;
  const metaDiariaLigacoes = 15;
  const percentMeta = Math.min(100, Math.round((ligacoesRealizadasHoje / metaDiariaLigacoes) * 100));

  // Próximas ligações agendadas
  const ligacoesAgendadas = ligacoes.filter(l => l.status === 'agendada' && l.responsavel_id === usuarioLogado.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight text-[var(--white)]">Atividades da Equipe & Leads</h1>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: Registro de Ligações e Metas (7 colunas) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card Meta e Progresso */}
          <div className={`p-6 rounded-xl border flex flex-wrap items-center justify-between gap-6 ${
            isDarkTheme ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="space-y-2 flex-1 min-w-[200px]">
              <span className="text-[10px] uppercase font-bold text-zinc-550 block">Desempenho Comercial Hoje</span>
              <h3 className="text-lg font-bold text-zinc-200">Ligações Realizadas vs Meta Diária</h3>
              <p className="text-xs text-zinc-500">A meta diária padrão Carton Pack é de 15 ligações ativas qualificadas.</p>
              
              <div className="flex items-center gap-3 pt-2">
                <span className="text-2xl font-black text-[#B4D932]">{ligacoesRealizadasHoje}</span>
                <span className="text-zinc-500">/</span>
                <span className="text-sm font-bold text-zinc-400">{metaDiariaLigacoes} ligações</span>
              </div>
            </div>

            {/* Circular Progress em SVG */}
            <div className="relative h-20 w-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="34" stroke={isDarkTheme ? '#27272A' : '#E4E4E7'} strokeWidth="6" fill="transparent" />
                <circle cx="40" cy="40" r="34" stroke="#B4D932" strokeWidth="6" fill="transparent" 
                  strokeDasharray="213"
                  strokeDashoffset={213 - (213 * percentMeta) / 100}
                  className="transition-all duration-750"
                />
              </svg>
              <span className="absolute text-xs font-black text-zinc-200">{percentMeta}%</span>
            </div>
          </div>

          {/* Form de Registro de Ligação */}
          <form onSubmit={handleSalvarLigacao} className={`p-6 rounded-xl border space-y-4 ${
            isDarkTheme ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
              <PhoneCall size={16} className="text-[#B4D932]" />
              <span className="text-xs uppercase font-bold text-zinc-300 tracking-wider">Registrar Nova Ligação Realizada</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-zinc-500 font-bold mb-1">Selecione o Cliente *</label>
                <select
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className={`w-full p-2.5 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                    isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                >
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.razao_social}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 font-bold mb-1">Objetivo da Ligação</label>
                <select
                  value={objetivo}
                  onChange={(e) => setObjetivo(e.target.value)}
                  className={`w-full p-2.5 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                    isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                >
                  <option value="negociacao_comercial">Negociação Comercial</option>
                  <option value="desenvolvimento_projeto">Desenvolvimento de Projeto</option>
                  <option value="pos_venda">Pós-venda</option>
                  <option value="relacionamento_vinculo">Relacionamento / Vínculo</option>
                  <option value="qualidade_reclamacao">Qualidade / Reclamação</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-zinc-500 font-bold mb-1">Descrição / Relato da Conversa *</label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                  rows={3}
                  placeholder="ex: Liguei para cobrar retorno do orçamento. Comprador informou que está aprovando com a diretoria financeira..."
                  className={`w-full p-2.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                    isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={gravandoLigacao}
                className="bg-[#B4D932] hover:bg-[#a3c42a] text-black text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
              >
                {gravandoLigacao ? 'Gravando...' : 'Salvar Ligação'}
              </button>
            </div>
          </form>

          {/* Próximas Ligações Agendadas */}
          <div className={`p-6 rounded-xl border space-y-4 ${
            isDarkTheme ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <span className="text-xs uppercase font-bold text-zinc-400 block border-b border-zinc-850 pb-2">
              Agenda Comercial e Follow-ups Pendentes
            </span>
            <div className="space-y-2">
              {ligacoesAgendadas.map(l => {
                const cli = clientes.find(c => c.id === l.cliente_id);
                return (
                  <div key={l.id} className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-900 flex justify-between items-center text-xs">
                    <div>
                      <strong className="text-zinc-200 block">{cli?.razao_social || 'Cliente'}</strong>
                      <span className="text-[10px] text-zinc-500">Agendado para: {new Date(l.data + 'T12:00:00').toLocaleDateString('pt-BR')} ({l.horario_turno})</span>
                    </div>
                    <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                      Pendente
                    </span>
                  </div>
                );
              })}
              {ligacoesAgendadas.length === 0 && (
                <div className="text-center py-4 text-xs text-zinc-550 italic">Nenhum follow-up pendente para hoje.</div>
              )}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: Banco de Prospecção / Leads (5 colunas) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Novo Lead */}
          <form onSubmit={handleSalvarLead} className={`p-5 rounded-xl border space-y-4 ${
            isDarkTheme ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 border-b border-zinc-850 pb-2">
              <PlusCircle size={16} className="text-[#B4D932]" />
              <span className="text-xs uppercase font-bold text-zinc-300 tracking-wider">Novo Prospect (Lead)</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-500 font-bold mb-1">Empresa *</label>
                <input
                  type="text"
                  required
                  value={empresaLead}
                  onChange={(e) => setEmpresaLead(e.target.value)}
                  placeholder="ex: Laticínios Ritter S.A."
                  className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                    isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-zinc-500 font-bold mb-1">Contato Principal *</label>
                <input
                  type="text"
                  required
                  value={contatoLead}
                  onChange={(e) => setContatoLead(e.target.value)}
                  placeholder="ex: Roberto Ritter"
                  className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                    isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={telefoneLead}
                    onChange={(e) => setTelefoneLead(e.target.value)}
                    className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                      isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 font-bold mb-1">Segmento</label>
                  <select
                    value={segmentoLead}
                    onChange={(e) => setSegmentoLead(e.target.value)}
                    className={`w-full p-2 rounded border focus:outline-none focus:ring-1 focus:ring-[#B4D932] ${
                      isDarkTheme ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                    }`}
                  >
                    <option value="Papel Cartão">Papel Cartão</option>
                    <option value="Micro-ondulado">Micro-ondulado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={gravandoLead}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-4 py-2 rounded transition-colors"
                >
                  {gravandoLead ? 'Salvando...' : 'Adicionar Lead'}
                </button>
              </div>
            </div>
          </form>

          {/* Lista de Prospects / Leads */}
          <div className={`p-5 rounded-xl border space-y-4 ${
            isDarkTheme ? 'bg-[#18181B] border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'
          }`}>
            <span className="text-xs uppercase font-bold text-zinc-400 block border-b border-zinc-850 pb-2">
              Banco de Prospecção Ativo
            </span>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs">
              {prospeccoes.filter(p => p.status !== 'convertido').map(p => (
                <div key={p.id} className="p-3 rounded-lg bg-zinc-950/40 border border-zinc-900 space-y-3">
                  <div>
                    <div className="font-bold text-zinc-200">{p.empresa}</div>
                    <div className="text-[10px] text-zinc-500">Contato: {p.contato} • Segmento: {p.segmento}</div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleConverterLead(p.id)}
                      className="bg-[#B4D932]/10 hover:bg-[#B4D932]/25 text-[#B4D932] text-[10px] font-black px-3 py-1.5 rounded transition-all flex items-center gap-1 border border-[#B4D932]/20"
                    >
                      <UserPlus size={10} />
                      Converter em Cliente Ativo
                    </button>
                  </div>
                </div>
              ))}
              {prospeccoes.filter(p => p.status !== 'convertido').length === 0 && (
                <div className="text-center py-4 text-xs text-zinc-550 italic">Nenhum prospect frio cadastrado.</div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Typescript definitions for Carton PACK CRM

export type UsuarioPapel = 'admin' | 'supervisor' | 'vendedor_interno' | 'representante';

export type VisitaObjetivo = 
  | 'apresentacao_empresa'
  | 'desenvolvimento_projeto'
  | 'negociacao_comercial'
  | 'pos_venda'
  | 'relacionamento_vinculo'
  | 'qualidade_reclamacao'
  | 'outros';

export type VisitaStatus = 'agendada' | 'realizada';

export type OrcamentoEtapa = 
  | 'solicitacao_briefing'
  | 'ficha_tecnica'
  | 'desenvolvimento'
  | 'pcp'
  | 'programacao'
  | 'enviado_representante'
  | 'solicitacao_amostra'
  | 'enviado_representante_final';

export type OrcamentoMotivoPerda = 'preco' | 'prazo' | 'concorrencia' | 'produto' | 'cliente_cancelou' | 'outro';

export type ProspeccaoStatus = 'frio' | 'em_abordagem' | 'convertido';

export type CarteiraStatus = 'ativo' | 'atencao' | 'critico' | 'inativo';

export type PotencialClassificacao = 'A' | 'B' | 'C';

export type MetaTipo = 'ligacoes' | 'visitas' | 'faturamento';

export interface Usuario {
  id: string;
  nome: string;
  papel: UsuarioPapel;
  ativo: boolean;
  created_at?: string;
}

export interface Cliente {
  id: string;
  razao_social: string;
  cnpj: string;
  cidade: string;
  estado: string; // UF (ex: 'RS')
  segmento: string; // ex: 'Papel Cartão', 'Micro-ondulado'
  representante_id: string | null;
  vendedor_interno_id: string | null;
  data_ultima_compra: string | null;
  intervalo_medio_compras: number | null; // em dias
  data_ultimo_contato: string | null;
  status_carteira: CarteiraStatus;
  classificacao_potencial: PotencialClassificacao;
  volume_mensal: number;
  principais_produtos: string[];
  potencial_crescimento?: string;
  website?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  exigencias_qualidade?: string;
  necessidade_certificacoes?: string;
  potencial_novos_projetos?: string;
  created_at?: string;
}

export interface ContatoCliente {
  id: string;
  cliente_id: string;
  nome: string;
  cargo: string;
  telefone?: string;
  email?: string;
  created_at?: string;
}

export interface Visita {
  id: string;
  cliente_id: string;
  contato_id: string | null;
  responsavel_id: string;
  data: string; // YYYY-MM-DD
  horario_turno: string; // ex: 'Manhã', 'Tarde' ou HH:MM
  objetivo: VisitaObjetivo;
  registro_descricao?: string;
  fornecedores_concorrentes?: string;
  status: VisitaStatus;
  created_at?: string;
}

export interface Ligacao {
  id: string;
  cliente_id: string;
  contato_id: string | null;
  responsavel_id: string;
  data: string; // YYYY-MM-DD
  horario_turno: string;
  objetivo: VisitaObjetivo;
  registro_descricao?: string;
  status: VisitaStatus;
  created_at?: string;
}

export interface Orcamento {
  id: string;
  cliente_id: string;
  responsavel_id: string;
  etapa_atual: OrcamentoEtapa;
  probabilidade_fechamento: number; // 0 a 10
  valor_aprovado: number | null;
  data_fechamento: string | null; // YYYY-MM-DD
  motivo_perda: OrcamentoMotivoPerda | null;
  justificativa_livre?: string;
  percentual_diferenca_fechamento?: number;
  tipo_embalagem?: string;
  comprimento_mm?: number;
  largura_mm?: number;
  altura_mm?: number;
  tipo_papel?: string;
  gramatura_g?: number;
  acabamentos?: string[];
  custo_papel?: number;
  custo_impressao?: number;
  custo_acabamento?: number;
  custo_faca?: number;
  custo_outros?: number;
  margem_desejada?: number;
  valor_estimado?: number;
  created_at?: string;
}

export interface HistoricoCompra {
  id: string;
  cliente_id: string;
  data_compra: string; // YYYY-MM-DD
  valor: number;
  produtos: string;
  created_at?: string;
}

export interface Meta {
  id: string;
  usuario_id: string;
  tipo: MetaTipo;
  periodo: string; // YYYY-MM
  valor_meta: number;
  created_at?: string;
}

export interface Prospeccao {
  id: string;
  empresa: string;
  contato: string;
  telefone?: string;
  email?: string;
  segmento: string;
  status: ProspeccaoStatus;
  created_at?: string;
}

export interface ItemPropostaLote {
  no_orcamento: string;
  quantidade: number;
  unidade: string; // ex: 'unidades'
  valor_unitario: number;
}

export interface ItemProposta {
  id: string;
  titulo: string; // ex: 'Display Barrinha Proteica menor 12 unid.'
  tamanho: string; // ex: '130x130x110mm'
  especificacao_tecnica: string; // texto completo da especificação
  lotes: ItemPropostaLote[];
}

export interface CondicoesComerciais {
  prazo_pagamento: string; // ex: '28 dias (mediante aprovação de crédito financeiro Carton Pack)'
  local_faturamento: string; // ex: 'Novo Hamburgo / RS – Faturamento único.'
  local_entrega: string; // ex: 'Frete CIF - Novo Hamburgo / RS – Retirada única.'
  aliquota_icms: string; // ex: '17,00%, diferido para 12,00% (incluso no preço...)'
  aliquota_ipi: string; // ex: '09,75% (NÃO incluso no preço...)'
  validade_dias: string; // ex: '07 dias.'
}

export interface PropostaComercial {
  id: string;
  numero_proposta: string; // ex: 'Prop. 27.105'
  data_emissao: string; // ex: '13 de Julho de 2026'
  cidade_emissao: string; // ex: 'Sapiranga'
  cliente_id?: string;
  contato_atencao: string; // ex: 'Maria Eduarda'
  empresa_nome: string; // ex: 'CHURRASQUITO'
  cidade_estado: string; // ex: 'NOVO HAMBURGO / RS'
  representante_nome: string; // ex: 'Josimar Soares'
  representante_cargo: string; // ex: 'Consultor de vendas CARTON PACK'
  representante_fone: string; // ex: '51 9 9883 6667'
  representante_email: string; // ex: 'josimar.soares@cartonpack.com.br'
  itens: ItemProposta[];
  condicoes: CondicoesComerciais;
}

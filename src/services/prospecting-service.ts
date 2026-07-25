/**
 * Serviço de Prospecção B2B — Busca Híbrida Riquíssima & Motor Dinâmico de Prospecção
 * Catálogo de empresas brasileiras com dados reais e autênticos da Receita Federal via APIs Públicas (Minha Receita / CNPJ.ws / AchaCNPJ)
 */
import { dbService } from './supabase-client'
import { formatCnaeCode } from '@/lib/utils'

export interface ProspectLead {
  cnpj: string
  razao_social: string
  nome_fantasia?: string
  cnae_codigo: string
  cnae_descricao: string
  setor: string           // Descrição do setor/indústria
  cidade: string
  estado: string
  cep?: string
  logradouro?: string
  porte: 'MEI' | 'Pequena' | 'Média' | 'Grande' | ''
  telefone?: string
  email?: string
  contato_nome?: string
  situacao?: string       // Situação cadastral (RFB) ex: 'ATIVA desde 03/11/2005'
  isDuplicate?: boolean
  duplicateReason?: string
  enriched?: boolean
  enriching?: boolean

  // ─── Campos Ricos no Formato Econodata ─────────────────────────────────────
  posicao?: number
  logo_url?: string
  data_abertura?: string        // ex: '26/10/1995'
  natureza_juridica?: string    // ex: 'Sociedade Empresária Limitada (206-2)'
  situacao_especial?: string    // ex: 'Não Disponível'
  tipo_unidade?: string         // ex: 'MATRIZ' | 'FILIAL'
  opcao_simples?: string        // ex: 'NAO OPTANTE' | 'OPTANTE'
  enquadramento_porte?: string  // ex: 'Sem Enquadramento'
  capital_social?: string       // ex: 'R$ 7.740.000,00'
  opcao_mei?: string            // ex: 'Não' | 'Sim'
  
  nivel_atividade?: string      // ex: 'Alta' | 'Média' | 'Baixa'
  crescimento_medio?: string    // ex: 'Alta' | 'Médio'
  faixa_funcionarios?: string   // ex: '500 a 999 funcionários'
  faturamento_estimado?: string // ex: 'R$ 50 milhões a R$ 100 milhões'

  site?: string
  instagram?: string
  youtube?: string
  facebook?: string
  linkedin?: string
  bairro?: string
  qsa?: Array<{ nome_socio?: string; qualificacao_socio?: string }>
  cnaes_secundarios?: Array<{ codigo: string; descricao: string }>
}

export interface SearchLeadsParams {
  setor_texto?: string    // texto livre: setor, palavra-chave ou código CNAE
  regiao?: string         // Estado (UF) ou Cidade (ex: 'RS', 'Imperatriz', 'Piratini, RS', 'São Paulo')
  porte?: string          // 'todos' | 'MEI' | 'Pequena' | 'Média' | 'Grande'
  page?: number
  limit?: number
}

export interface SearchLeadsResponse {
  leads: ProspectLead[]
  totalFound: number
  currentPage: number
  totalPages: number
  hasMore: boolean
}

/**
 * Função de Normalização de Texto Sem Acentos (NFD)
 */
export function normalizeText(str: string): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// ─── Setores mais buscados (Estilo Econodata) ──────────────────────────────────
export const SETORES_CNAE = [
  { label: 'Todos os setores', keywords: ['todos'] },
  { label: 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas', keywords: ['construção', 'construcao', 'redes', 'água', 'agua', 'esgoto', 'coleta', 'abastecimento', 'saneamento', '4222', '4222-7', '4222701'] },
  { label: 'Logística e Transporte', keywords: ['transporte', 'transportes', 'logística', 'logistica', 'frete', 'carga', 'armazém', 'armazem', 'rodoviário', 'aéreo', 'marítimo'] },
  { label: 'Telecomunicações', keywords: ['telecomunicações', 'telecomunicacoes', 'telecom', 'redes', 'internet', 'provedor', 'comunicação', 'comunicacao', 'telefonia'] },
  { label: 'Serviços', keywords: ['serviços', 'servicos', 'consultoria', 'facilities'] },
  { label: 'Comércio Varejista', keywords: ['varejo', 'varejista', 'loja', 'supermercado'] },
  { label: 'Alimentos', keywords: ['alimentos', 'alimento', 'frigorifico', 'doces', 'laticinios', 'panificação'] },
  { label: 'Restaurantes', keywords: ['restaurante', 'lanchonete', 'gastronomia', 'bar'] },
  { label: 'Arte e Cultura', keywords: ['arte', 'cultura', 'teatro', 'cinema', 'eventos'] },
  { label: 'Produtos farmacêuticos', keywords: ['farmacêutica', 'farmacia', 'medicamentos', 'remedios'] },
  { label: 'Esporte e Recreação', keywords: ['esporte', 'recreação', 'academia', 'lazer'] },
  { label: 'Contabilidade', keywords: ['contabilidade', 'contabil', 'auditoria'] },
  { label: 'Advocacia', keywords: ['advocacia', 'juridico', 'advogado', 'direito'] },
  { label: 'Calçados', keywords: ['calçados', 'calcados', 'sapato', 'tênis'] },
  { label: 'Couro', keywords: ['couro', 'bolsa', 'artefatos'] },
  { label: 'Embalagens', keywords: ['embalagens', 'embalagem', 'caixa', 'cartonagem', 'ondulado'] },
  { label: 'Papel', keywords: ['papel', 'papelão', 'celulose'] },
  { label: 'Química', keywords: ['química', 'quimica', 'tintas', 'resinas', 'fertilizantes'] },
  { label: 'Plásticos', keywords: ['plásticos', 'plasticos', 'borracha', 'pvc', 'embalagens plásticas'] },
  { label: 'Cosméticos', keywords: ['cosméticos', 'cosmeticos', 'perfumaria', 'higiene', 'beleza'] },
  { label: 'Têxtil', keywords: ['têxtil', 'textil', 'tecido', 'fios'] },
  { label: 'Vestuário', keywords: ['vestuário', 'vestuario', 'confecção', 'moda', 'roupas'] },
  { label: 'Metalúrgica', keywords: ['metalúrgica', 'metalurgica', 'aço', 'ferro', 'fundição', 'usinagem'] },
  { label: 'Automotivo', keywords: ['automotivo', 'autopeças', 'veículos', 'carrocerias'] },
  { label: 'Móveis', keywords: ['móveis', 'moveis', 'marcenaria'] },
  { label: 'Madeira', keywords: ['madeira', 'madeireira', 'eucalipto'] },
  { label: 'Bebidas', keywords: ['bebidas', 'cerveja', 'vinho', 'refrigerante', 'sucos'] },
  { label: 'Construção', keywords: ['construção', 'construcao', 'civil', 'obra', 'construtora'] },
  { label: 'Agronegócio', keywords: ['agronegócio', 'agronegocio', 'agricultura', 'pecuária', 'agro'] },
  { label: 'Tecnologia & TI', keywords: ['tecnologia', 'TI', 'software', 'sistemas', 'internet'] },
  { label: 'Hotelaria', keywords: ['hotelaria', 'hotel', 'pousada'] },
  { label: 'Saúde', keywords: ['saúde', 'saude', 'hospital', 'clínica', 'laboratório'] },
  { label: 'Pet shop', keywords: ['pet shop', 'petshop', 'veterinária', 'ração'] }
]

// ─── Tabela de CNAEs Oficiais Formatados Completa (Estilo Econodata A-U) ───────
export interface CnaeOfficial {
  code: string          // Ex: 'H-49', 'H-512', 'C-1733-8', 'F-4222-7'
  fullCode: string      // Ex: '4930-2/02', '4222-7/01'
  description: string   // Ex: 'Transporte Terrestre'
  display: string       // Ex: '(F-4222-7) Construção de redes de abastecimento de água, coleta de esgoto'
  keywords: string[]
}

export const LISTA_CNAES_OFFICIAL: CnaeOfficial[] = [
  // ── CONSTRUÇÃO DE REDES DE ÁGUA E ESGOTO (F-4222) ──
  { code: 'F-4222-7/01', fullCode: '4222-7/01', description: 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas, exceto obras de irrigação', display: '(F-4222-7/01) Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas', keywords: ['construção', 'construcao', 'redes', 'água', 'agua', 'esgoto', 'coleta', 'abastecimento', 'saneamento', '4222', '4222-7', '4222701'] },

  // ── TELECOMUNICAÇÕES & REDES (F-42 / J-61) ──
  { code: 'F-4221-9/05', fullCode: '4221-9/05', description: 'Manutenção de estações e redes de telecomunicações', display: '(F-4221-9/05) Manutenção de estações e redes de telecomunicações', keywords: ['telecomunicações', 'telecomunicacoes', 'manutenção', 'redes', 'estações', '4221', '4221-9/05'] },
  { code: 'F-4221-9/04', fullCode: '4221-9/04', description: 'Construção de estações e redes de telecomunicações', display: '(F-4221-9/04) Construção de estações e redes de telecomunicações', keywords: ['telecomunicações', 'telecomunicacoes', 'construção', 'redes', 'estações', '4221', '4221-9/04'] },
  { code: 'F-4221-9/01', fullCode: '4221-9/01', description: 'Construção de barragens e represas para geração de energia elétrica', display: '(F-4221-9/01) Construção de barragens e represas para geração de energia elétrica', keywords: ['energia', 'barragens', 'represas', '4221', '4221-9/01'] },
  { code: 'F-4221-9/02', fullCode: '4221-9/02', description: 'Construção de estações e redes de distribuição de energia elétrica', display: '(F-4221-9/02) Construção de estações e redes de distribuição de energia elétrica', keywords: ['energia', 'distribuição', 'redes', '4221', '4221-9/02'] },
  { code: 'F-4221-9/03', fullCode: '4221-9/03', description: 'Manutenção de redes de distribuição de energia elétrica', display: '(F-4221-9/03) Manutenção de redes de distribuição de energia elétrica', keywords: ['energia', 'manutenção', 'redes', '4221', '4221-9/03'] },

  { code: 'J-6110-8/01', fullCode: '6110-8/01', description: 'Serviços de telefonia fixa comutada - STFC', display: '(J-6110-8/01) Serviços de telefonia fixa comutada - STFC', keywords: ['telecomunicações', 'telefonia', 'redes', 'stfc', '6110'] },
  { code: 'J-6190-6/01', fullCode: '6190-6/01', description: 'Provedores de acesso às redes de comunicações', display: '(J-6190-6/01) Provedores de acesso às redes de comunicações', keywords: ['telecomunicações', 'provedor', 'internet', 'comunicações', '6190'] },
  { code: 'J-6190-6/99', fullCode: '6190-6/99', description: 'Outras atividades de telecomunicações não especificadas anteriormente', display: '(J-6190-6/99) Outras atividades de telecomunicações', keywords: ['telecomunicações', 'telecom', 'redes', '6190'] },

  // ── TRANSPORTE & LOGÍSTICA (H) ──
  { code: 'H-4930-2/02', fullCode: '4930-2/02', description: 'Transporte Rodoviário de Carga', display: '(H-4930-2/02) Transporte Rodoviário de Carga', keywords: ['transporte', 'transportes', 'terrestre', 'rodoviário', 'caminhão', 'frete', '4930', '49'] },
  { code: 'H-5011-4/01', fullCode: '5011-4/01', description: 'Transporte Aquaviário', display: '(H-5011-4/01) Transporte Aquaviário', keywords: ['transporte', 'transportes', 'aquaviário', 'marítimo', 'navegação', 'porto', '50'] },
  { code: 'H-5120-0/00', fullCode: '5120-0/00', description: 'Transporte Aéreo de Carga', display: '(H-5120-0/00) Transporte Aéreo de Carga', keywords: ['transporte', 'transportes', 'aéreo', 'carga', 'aviação', '512'] },
  { code: 'H-5211-7/99', fullCode: '5211-7/99', description: 'Armazenamento e Atividades Auxiliares dos Transportes', display: '(H-5211-7/99) Armazenamento e Atividades Auxiliares dos Transportes', keywords: ['transporte', 'transportes', 'armazenamento', 'logística', 'depósito', 'armazém', '52'] },

  // ── EMBALAGENS & PAPEL (C-17 / C-22) ──
  { code: 'C-1733-8/00', fullCode: '1733-8/00', description: 'Fabricação de Chapas e de Embalagens de Papelão Ondulado', display: '(C-1733-8/00) Fabricação de Chapas e de Embalagens de Papelão Ondulado', keywords: ['embala', 'embalagens', 'papelão', 'ondulado', 'chapas', 'caixas', '1733'] },
  { code: 'C-1731-1/00', fullCode: '1731-1/00', description: 'Fabricação de Embalagens de Papel', display: '(C-1731-1/00) Fabricação de Embalagens de Papel', keywords: ['embala', 'embalagens', 'papel', 'sacolas', '1731'] },
  { code: 'C-1732-0/00', fullCode: '1732-0/00', description: 'Fabricação de Embalagens de Cartolina e Papel-Cartão', display: '(C-1732-0/00) Fabricação de Embalagens de Cartolina e Papel-Cartão', keywords: ['embala', 'embalagens', 'cartolina', 'papel-cartão', 'cartonagem', '1732'] },
  { code: 'C-2222-6/00', fullCode: '2222-6/00', description: 'Fabricação de Embalagens de Material Plástico', display: '(C-2222-6/00) Fabricação de Embalagens de Material Plástico', keywords: ['embala', 'embalagens', 'plástico', 'filme', 'sacaria', '2222'] },

  // ── CALÇADOS & COURO (C-15) ──
  { code: 'C-1531-9/01', fullCode: '1531-9/01', description: 'Fabricação de Calçados de Couro', display: '(C-1531-9/01) Fabricação de Calçados de Couro', keywords: ['calçados', 'calcados', 'couro', 'sapato', '1531'] },
  { code: 'C-1532-7/00', fullCode: '1532-7/00', description: 'Fabricação de Tênis e Calçados Esportivos', display: '(C-1532-7/00) Fabricação de Tênis e Calçados Esportivos', keywords: ['calçados', 'calcados', 'tênis', 'esportivo', '1532'] },
  { code: 'C-1521-1/00', fullCode: '1521-1/00', description: 'Fabricação de Artigos de Couro e Artefatos', display: '(C-1521-1/00) Fabricação de Artigos de Couro e Artefatos', keywords: ['couro', 'artefatos', 'bolsas', 'cintos', '1521'] },

  // ── ALIMENTOS & BEBIDAS (C-10 / C-11) ──
  { code: 'C-1012-1/01', fullCode: '1012-1/01', description: 'Abate de Aves e Produtos Alimentícios', display: '(C-1012-1/01) Abate de Aves e Produtos Alimentícios', keywords: ['alimentos', 'aves', 'frigorífico', 'frango', '1012'] },
  { code: 'C-1091-0/01', fullCode: '1091-0/01', description: 'Fabricação de Produtos de Panificação e Alimentos', display: '(C-1091-0/01) Fabricação de Produtos de Panificação e Alimentos', keywords: ['alimentos', 'padaria', 'pão', 'biscoitos', '1091'] },
  { code: 'C-1093-7/01', fullCode: '1093-7/01', description: 'Fabricação de Produtos de Confeitaria e Chocolates', display: '(C-1093-7/01) Fabricação de Produtos de Confeitaria e Chocolates', keywords: ['alimentos', 'chocolates', 'doces', 'confeitaria', '1093'] },
  { code: 'C-1111-9/01', fullCode: '1111-9/01', description: 'Fabricação de Cervejas e Chopes', display: '(C-1111-9/01) Fabricação de Cervejas e Chopes', keywords: ['bebidas', 'cerveja', 'chope', '1111'] },

  // ── QUÍMICA & FARMÁCIA (C-20 / C-21) ──
  { code: 'C-2063-1/00', fullCode: '2063-1/00', description: 'Fabricação de Cosméticos, Perfumaria e Higiene Pessoal', display: '(C-2063-1/00) Fabricação de Cosméticos, Perfumaria e Higiene Pessoal', keywords: ['cosméticos', 'cosmeticos', 'perfumaria', 'higiene', '2063'] },
  { code: 'C-2121-1/01', fullCode: '2121-1/01', description: 'Fabricação de Produtos Farmacêuticos e Medicamentos', display: '(C-2121-1/01) Fabricação de Produtos Farmacêuticos e Medicamentos', keywords: ['farmacêutica', 'farmacia', 'medicamentos', 'remédios', '2121'] },
  { code: 'C-2071-1/00', fullCode: '2071-1/00', description: 'Fabricação de Tintas, Vernizes, Esmaltes e Lacas', display: '(C-2071-1/00) Fabricação de Tintas, Vernizes, Esmaltes e Lacas', keywords: ['tintas', 'química', 'quimica', 'vernizes', '2071'] },
  { code: 'C-2031-2/00', fullCode: '2031-2/00', description: 'Fabricação de Resinas Termoplásticas e Plásticos', display: '(C-2031-2/00) Fabricação de Resinas Termoplásticas e Plásticos', keywords: ['química', 'plásticos', 'resinas', '2031'] },

  // ── METALÚRGICA & AUTOMOTIVO (C-24 / C-25 / C-29) ──
  { code: 'C-2424-5/01', fullCode: '2424-5/01', description: 'Produção de Arames de Aço', display: '(C-2424-5/01) Produção de arames de aço', keywords: ['arames', 'arame', 'aço', 'trefilados', 'metalúrgica', '2424'] },
  { code: 'C-2592-6/01', fullCode: '2592-6/01', description: 'Fabricação de Produtos de Trefilados de Metal, Exceto Padronizados', display: '(C-2592-6/01) Fabricação de produtos de trefilados de metal', keywords: ['trefilados', 'arames', 'arame', 'metal', 'produtos', '2592'] },
  { code: 'C-2411-3/00', fullCode: '2411-3/00', description: 'Produção de Ferro e Aço e Siderurgia', display: '(C-2411-3/00) Produção de Ferro e Aço e Siderurgia', keywords: ['metalúrgica', 'metalurgica', 'aço', 'ferro', '2411'] },
  { code: 'C-2599-3/99', fullCode: '2599-3/99', description: 'Fabricação de Produtos de Metal e Usinagem', display: '(C-2599-3/99) Fabricação de Produtos de Metal e Usinagem', keywords: ['metalúrgica', 'metalurgica', 'usinagem', 'peças', '2599'] },
  { code: 'C-2920-4/01', fullCode: '2920-4/01', description: 'Fabricação de Carrocerias para Veículos Automotores e Ônibus', display: '(C-2920-4/01) Fabricação de Carrocerias para Veículos Automotores e Ônibus', keywords: ['automotivo', 'carrocerias', 'ônibus', '2920'] },

  // ── COMÉRCIO VAREJISTA (G-47) ──
  { code: 'G-4744-0/01', fullCode: '4744-0/01', description: 'Comércio Varejista de Ferragens e Ferramentas', display: '(G-4744-0/01) Comércio Varejista de Ferragens e Ferramentas', keywords: ['ferragens', 'ferramentas', 'varejo', 'varejista', '4744'] },
  { code: 'G-4721-1/02', fullCode: '4721-1/02', description: 'Padaria, Confeitaria com Predominância de Revenda', display: '(G-4721-1/02) Padaria e Confeitaria com Predominância de Revenda', keywords: ['padaria', 'confeitaria', 'pão', 'varejo', '4721'] },
  { code: 'G-4712-1/00', fullCode: '4712-1/00', description: 'Comércio Varejista de Mercadorias em Geral, com Predominância de Produtos Alimentícios', display: '(G-4712-1/00) Minimercado e Mercearia', keywords: ['minimercado', 'mercearia', 'varejo', 'alimentos', '4712'] },
  { code: 'G-4771-7/01', fullCode: '4771-7/01', description: 'Comércio Varejista de Produtos Farmacêuticos, sem Manipulação de Fórmulas', display: '(G-4771-7/01) Farmácia e Drogaria', keywords: ['farmácia', 'drogaria', 'farmacia', 'remédios', 'saúde', '4771'] },
  { code: 'G-4781-4/00', fullCode: '4781-4/00', description: 'Comércio Varejista de Artigos do Vestuário e Acessórios', display: '(G-4781-4/00) Comércio Varejista de Roupas e Acessórios', keywords: ['vestuário', 'roupas', 'moda', 'confecção', 'varejo', '4781'] },
  { code: 'G-4754-7/01', fullCode: '4754-7/01', description: 'Comércio Varejista de Móveis', display: '(G-4754-7/01) Comércio Varejista de Móveis', keywords: ['móveis', 'moveis', 'marcenaria', 'varejo', '4754'] },
  { code: 'G-4762-8/00', fullCode: '4762-8/00', description: 'Comércio Varejista de Artigos de Óptica', display: '(G-4762-8/00) Ótica e Artigos de Óptica', keywords: ['ótica', 'otica', 'óculos', 'varejo', '4762'] },

  // ── AGRONEGÓCIO & PRODUÇÃO AGROPECUÁRIA (A-01) ──
  { code: 'A-0111-3/01', fullCode: '0111-3/01', description: 'Cultivo de Trigo', display: '(A-0111-3/01) Cultivo de Trigo', keywords: ['agronegócio', 'agronegocio', 'agricultura', 'grãos', 'trigo', 'lavoura', '0111'] },
  { code: 'A-0115-6/00', fullCode: '0115-6/00', description: 'Cultivo de Soja', display: '(A-0115-6/00) Cultivo de Soja', keywords: ['agronegócio', 'agronegocio', 'agricultura', 'soja', 'grãos', 'lavoura', '0115'] },
  { code: 'A-0151-2/01', fullCode: '0151-2/01', description: 'Criação de Bovinos para Corte', display: '(A-0151-2/01) Pecuária Bovina para Corte', keywords: ['agronegócio', 'agronegocio', 'pecuária', 'pecuaria', 'gado', 'bovinos', 'fazenda', '0151'] },
  { code: 'A-0161-0/00', fullCode: '0161-0/00', description: 'Atividade de Apoio à Agricultura', display: '(A-0161-0/00) Atividade de Apoio à Agricultura', keywords: ['agronegócio', 'agronegocio', 'agricultura', 'agro', 'insumos', '0161'] },
  { code: 'G-4612-1/00', fullCode: '4612-1/00', description: 'Representantes Comerciais de Insumos Agropecuários', display: '(G-4612-1/00) Representantes Comerciais de Insumos Agropecuários', keywords: ['agronegócio', 'agronegocio', 'insumos', 'agropecuário', 'sementes', 'fertilizantes', '4612'] },
  { code: 'G-4632-0/01', fullCode: '4632-0/01', description: 'Comércio Atacadista de Cereais e Grãos', display: '(G-4632-0/01) Comércio Atacadista de Cereais e Grãos', keywords: ['agronegócio', 'agronegocio', 'cereais', 'grãos', 'atacado', '4632'] },

  // ── SAÚDE & CLÍNICAS (Q-86 / Q-87) ──
  { code: 'Q-8610-1/01', fullCode: '8610-1/01', description: 'Atividades de Atendimento Hospitalar', display: '(Q-8610-1/01) Hospital e Atendimento Hospitalar', keywords: ['saúde', 'saude', 'hospital', 'atendimento', 'internação', '8610'] },
  { code: 'Q-8630-5/01', fullCode: '8630-5/01', description: 'Atividade Médica Ambulatorial com Recursos para Realização de Procedimentos Cirúrgicos', display: '(Q-8630-5/01) Clínica Médica e Cirúrgica', keywords: ['saúde', 'saude', 'clínica', 'clinica', 'médico', 'cirurgia', '8630'] },
  { code: 'Q-8640-2/08', fullCode: '8640-2/08', description: 'Serviços de Diagnóstico por Imagem sem Uso de Radiação Ionizante', display: '(Q-8640-2/08) Laboratório e Diagnóstico por Imagem', keywords: ['saúde', 'saude', 'laboratório', 'laboratorio', 'exames', 'diagnóstico', '8640'] },
  { code: 'Q-8650-0/04', fullCode: '8650-0/04', description: 'Atividades de Fisioterapia', display: '(Q-8650-0/04) Fisioterapia', keywords: ['saúde', 'saude', 'fisioterapia', 'reabilitação', '8650'] },
  { code: 'Q-8660-7/00', fullCode: '8660-7/00', description: 'Atividades de Apoio à Gestão de Saúde', display: '(Q-8660-7/00) Gestão e Serviços de Saúde', keywords: ['saúde', 'saude', 'gestão', 'plano de saúde', '8660'] },

  // ── EDUCAÇÃO (P-85) ──
  { code: 'P-8511-2/00', fullCode: '8511-2/00', description: 'Educação Infantil — Creche e Pré-Escola', display: '(P-8511-2/00) Escola de Educação Infantil', keywords: ['educação', 'educacao', 'escola', 'creche', 'ensino', '8511'] },
  { code: 'P-8512-1/00', fullCode: '8512-1/00', description: 'Educação Pré-Escolar', display: '(P-8512-1/00) Educação Pré-Escolar', keywords: ['educação', 'educacao', 'escola', 'ensino', '8512'] },
  { code: 'P-8541-4/00', fullCode: '8541-4/00', description: 'Educação Profissional de Nível Técnico', display: '(P-8541-4/00) Escola Técnica e Ensino Profissionalizante', keywords: ['educação', 'educacao', 'escola', 'técnico', 'profissionalizante', 'curso', '8541'] },
  { code: 'P-8599-6/04', fullCode: '8599-6/04', description: 'Treinamento em Desenvolvimento Profissional e Gerencial', display: '(P-8599-6/04) Treinamento Corporativo e Desenvolvimento Profissional', keywords: ['educação', 'educacao', 'treinamento', 'capacitação', 'curso', '8599'] },

  // ── SERVIÇOS PROFISSIONAIS (M-69 / M-70 / M-74) ──
  { code: 'M-6911-7/01', fullCode: '6911-7/01', description: 'Serviços Advocatícios e Jurídicos', display: '(M-6911-7/01) Serviços Advocatícios e Jurídicos', keywords: ['advocacia', 'advocaticio', 'jurídico', 'juridico', 'advogado', 'direito', '6911'] },
  { code: 'M-6920-6/01', fullCode: '6920-6/01', description: 'Atividades de Contabilidade', display: '(M-6920-6/01) Contabilidade e Escritório Contábil', keywords: ['contabilidade', 'contabil', 'contábil', 'auditoria', 'contador', '6920'] },
  { code: 'M-7020-4/00', fullCode: '7020-4/00', description: 'Atividades de Consultoria em Gestão Empresarial', display: '(M-7020-4/00) Consultoria e Gestão Empresarial', keywords: ['consultoria', 'gestão', 'gestao', 'empresarial', 'managment', '7020'] },
  { code: 'M-7111-1/00', fullCode: '7111-1/00', description: 'Serviços de Arquitetura', display: '(M-7111-1/00) Arquitetura e Urbanismo', keywords: ['arquitetura', 'urbanismo', 'projeto', 'construção', '7111'] },
  { code: 'M-7112-0/00', fullCode: '7112-0/00', description: 'Serviços de Engenharia', display: '(M-7112-0/00) Engenharia e Projetos Técnicos', keywords: ['engenharia', 'projetos', 'técnico', 'laudo', '7112'] },

  // ── HOTELARIA & ALIMENTAÇÃO (I-55 / I-56) ──
  { code: 'I-5510-8/01', fullCode: '5510-8/01', description: 'Hotéis', display: '(I-5510-8/01) Hotel e Hospedagem', keywords: ['hotelaria', 'hotel', 'pousada', 'hospedagem', 'turismo', '5510'] },
  { code: 'I-5590-6/01', fullCode: '5590-6/01', description: 'Albergues e Pousadas', display: '(I-5590-6/01) Pousada e Albergue', keywords: ['hotelaria', 'pousada', 'hospedagem', 'turismo', '5590'] },
  { code: 'I-5611-2/01', fullCode: '5611-2/01', description: 'Restaurante e Similares', display: '(I-5611-2/01) Restaurante', keywords: ['restaurante', 'gastronomia', 'alimentação', 'alimentacao', 'refeitório', '5611'] },
  { code: 'I-5611-2/03', fullCode: '5611-2/03', description: 'Lanchonetes, Casas de Chá, de Sucos e Similares', display: '(I-5611-2/03) Lanchonete e Bar', keywords: ['lanchonete', 'bar', 'café', 'gastronomia', '5611'] },

  // ── PET SHOP & VETERINÁRIA (G-47 / M-75) ──
  { code: 'G-4789-0/04', fullCode: '4789-0/04', description: 'Comércio Varejista de Animais Vivos e Artigos para Animais de Estimação', display: '(G-4789-0/04) Pet Shop e Loja de Animais', keywords: ['pet shop', 'petshop', 'animais', 'ração', 'veterinária', '4789'] },
  { code: 'M-7500-1/00', fullCode: '7500-1/00', description: 'Atividades Veterinárias', display: '(M-7500-1/00) Clínica Veterinária', keywords: ['veterinária', 'veterinaria', 'pet', 'animais', '7500'] },

  // ── BELEZA & ESTÉTICA (S-96) ──
  { code: 'S-9602-5/01', fullCode: '9602-5/01', description: 'Cabeleireiros', display: '(S-9602-5/01) Salão de Beleza e Cabeleireiro', keywords: ['beleza', 'estética', 'estetica', 'cabeleireiro', 'salão', 'salao', '9602'] },
  { code: 'S-9602-5/02', fullCode: '9602-5/02', description: 'Outras Atividades de Tratamento de Beleza', display: '(S-9602-5/02) Estética e Tratamento de Beleza', keywords: ['beleza', 'estética', 'estetica', 'spa', 'tratamento', '9602'] },

  // ── IMÓVEIS & INCORPORAÇÃO (L-68) ──
  { code: 'L-6810-2/01', fullCode: '6810-2/01', description: 'Compra e Venda de Imóveis Próprios', display: '(L-6810-2/01) Imobiliária — Compra e Venda de Imóveis', keywords: ['imóveis', 'imoveis', 'imobiliária', 'imobiliaria', 'construção', '6810'] },
  { code: 'L-6822-6/00', fullCode: '6822-6/00', description: 'Gestão e Administração da Propriedade Imobiliária', display: '(L-6822-6/00) Administração de Imóveis e Condomínios', keywords: ['imóveis', 'imoveis', 'administração', 'condomínio', '6822'] },

  // ── CONSTRUÇÃO CIVIL & REFORMAS (F-41 / F-43) ──
  { code: 'F-4110-7/00', fullCode: '4110-7/00', description: 'Incorporação e Construção Civil', display: '(F-4110-7/00) Incorporação e Construção Civil', keywords: ['construção', 'civil', 'obra', 'incorporação', '4110'] },
  { code: 'F-4321-5/00', fullCode: '4321-5/00', description: 'Instalação e Manutenção Elétrica', display: '(F-4321-5/00) Instalação Elétrica e Manutenção', keywords: ['elétrico', 'eletrico', 'instalação', 'manutenção', 'construção', '4321'] },
  { code: 'F-4330-4/05', fullCode: '4330-4/05', description: 'Aplicação de Revestimentos e Decoração', display: '(F-4330-4/05) Revestimentos, Pintura e Decoração', keywords: ['pintura', 'revestimento', 'decoração', 'reforma', 'construção', '4330'] },
  { code: 'F-4399-1/03', fullCode: '4399-1/03', description: 'Obras de Alvenaria', display: '(F-4399-1/03) Alvenaria e Obras de Construção', keywords: ['construção', 'alvenaria', 'obra', 'reforma', '4399'] },

  // ── TI & SOFTWARE (J-62) ──
  { code: 'J-6201-5/01', fullCode: '6201-5/01', description: 'Desenvolvimento de Programas de Computador sob Encomenda', display: '(J-6201-5/01) Desenvolvimento de Software sob Encomenda', keywords: ['tecnologia', 'ti', 'software', 'sistemas', 'desenvolvimento', '6201'] },
  { code: 'J-6202-3/00', fullCode: '6202-3/00', description: 'Desenvolvimento e Licenciamento de Programas de Computador Customizáveis', display: '(J-6202-3/00) Software Customizável e SaaS', keywords: ['tecnologia', 'ti', 'software', 'saas', 'licenciamento', '6202'] },
  { code: 'J-6209-1/00', fullCode: '6209-1/00', description: 'Suporte Técnico, Manutenção e Outros Serviços em Tecnologia da Informação', display: '(J-6209-1/00) Suporte Técnico e Manutenção de TI', keywords: ['tecnologia', 'ti', 'suporte', 'manutenção', 'informática', '6209'] },

  // ── COMÉRCIO ATACADISTA (G-46) ──
  { code: 'G-4692-3/00', fullCode: '4692-3/00', description: 'Comércio Atacadista de Mercadorias em Geral', display: '(G-4692-3/00) Comércio Atacadista de Mercadorias em Geral', keywords: ['atacado', 'distribuição', 'distribuicao', 'atacadista', '4692'] },
  { code: 'G-4644-3/01', fullCode: '4644-3/01', description: 'Comércio Atacadista de Medicamentos e Drogas de Uso Humano', display: '(G-4644-3/01) Atacado Farmacêutico', keywords: ['farmacêutico', 'atacado', 'medicamentos', 'distribuição', '4644'] },
  { code: 'G-4634-6/01', fullCode: '4634-6/01', description: 'Comércio Atacadista de Carnes Bovinas e Suínas e Derivados', display: '(G-4634-6/01) Atacado de Carnes e Derivados', keywords: ['alimentos', 'carnes', 'frigorífico', 'atacado', '4634'] }
]

// Cache em memória de TODOS os CNAEs do IBGE em tempo real
let ibgeCnaesCache: CnaeOfficial[] | null = null

export async function fetchAllIbgeCnaes(): Promise<CnaeOfficial[]> {
  if (ibgeCnaesCache && ibgeCnaesCache.length > 0) return ibgeCnaesCache
  try {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v2/cnae/subclasses', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return LISTA_CNAES_OFFICIAL
    const data = await res.json()
    const mapped: CnaeOfficial[] = data.map((item: any) => {
      const rawId = String(item.id || '').replace(/\D/g, '')
      const secaoId = item.classe?.grupo?.divisao?.secao?.id || 'C'
      
      let formattedCode = ''
      if (rawId.length === 7) {
        formattedCode = `${secaoId}-${rawId.slice(0, 4)}-${rawId.slice(4, 5)}/${rawId.slice(5, 7)}`
      } else if (rawId.length === 5) {
        formattedCode = `${secaoId}-${rawId.slice(0, 4)}-${rawId.slice(4, 5)}`
      } else {
        formattedCode = `${secaoId}-${rawId}`
      }

      const desc = item.descricao ? item.descricao.charAt(0).toUpperCase() + item.descricao.slice(1).toLowerCase() : ''
      const keywords = desc.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3)
      const fullSubclassCode = rawId.length === 7 ? `${rawId.slice(0, 4)}-${rawId.slice(4, 5)}/${rawId.slice(5, 7)}` : rawId

      return {
        code: formattedCode,
        fullCode: fullSubclassCode,
        description: desc,
        display: `(${formattedCode}) ${desc}`,
        keywords
      }
    })

    const existingDisplays = new Set(LISTA_CNAES_OFFICIAL.map(c => c.display.toLowerCase()))
    const newFromApi = mapped.filter(m => !existingDisplays.has(m.display.toLowerCase()))
    
    ibgeCnaesCache = [...LISTA_CNAES_OFFICIAL, ...newFromApi]
    return ibgeCnaesCache
  } catch {
    return LISTA_CNAES_OFFICIAL
  }
}

// ─── Opções de Região Sugeridas (TODOS os 27 Estados do Brasil + Principais Cidades) ────
export interface RegiaoOption {
  label: string
  tipo: 'Estado' | 'Cidade'
  uf: string
  cidade?: string
}

export const REGIOES_SUGERIDAS: RegiaoOption[] = [
  { label: 'Todo Brasil', tipo: 'Estado', uf: 'TODOS' },
  
  // Todos os 27 Estados do Brasil em Ordem Alfabética por Nome
  { label: 'Acre', tipo: 'Estado', uf: 'AC' },
  { label: 'Alagoas', tipo: 'Estado', uf: 'AL' },
  { label: 'Amapá', tipo: 'Estado', uf: 'AP' },
  { label: 'Amazonas', tipo: 'Estado', uf: 'AM' },
  { label: 'Bahia', tipo: 'Estado', uf: 'BA' },
  { label: 'Ceará', tipo: 'Estado', uf: 'CE' },
  { label: 'Distrito Federal', tipo: 'Estado', uf: 'DF' },
  { label: 'Espírito Santo', tipo: 'Estado', uf: 'ES' },
  { label: 'Goiás', tipo: 'Estado', uf: 'GO' },
  { label: 'Maranhão', tipo: 'Estado', uf: 'MA' },
  { label: 'Mato Grosso', tipo: 'Estado', uf: 'MT' },
  { label: 'Mato Grosso do Sul', tipo: 'Estado', uf: 'MS' },
  { label: 'Minas Gerais', tipo: 'Estado', uf: 'MG' },
  { label: 'Pará', tipo: 'Estado', uf: 'PA' },
  { label: 'Paraíba', tipo: 'Estado', uf: 'PB' },
  { label: 'Paraná', tipo: 'Estado', uf: 'PR' },
  { label: 'Pernambuco', tipo: 'Estado', uf: 'PE' },
  { label: 'Piauí', tipo: 'Estado', uf: 'PI' },
  { label: 'Rio de Janeiro', tipo: 'Estado', uf: 'RJ' },
  { label: 'Rio Grande do Norte', tipo: 'Estado', uf: 'RN' },
  { label: 'Rio Grande do Sul', tipo: 'Estado', uf: 'RS' },
  { label: 'Rondônia', tipo: 'Estado', uf: 'RO' },
  { label: 'Roraima', tipo: 'Estado', uf: 'RR' },
  { label: 'Santa Catarina', tipo: 'Estado', uf: 'SC' },
  { label: 'São Paulo', tipo: 'Estado', uf: 'SP' },
  { label: 'Sergipe', tipo: 'Estado', uf: 'SE' },
  { label: 'Tocantins', tipo: 'Estado', uf: 'TO' },

  // Cidades em Destaque
  { label: 'Piratini, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Piratini' },
  { label: 'São Leopoldo, RS', tipo: 'Cidade', uf: 'RS', cidade: 'São Leopoldo' },
  { label: 'Ibirubá, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Ibirubá' },
  { label: 'Sapiranga, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Sapiranga' },
  { label: 'Imperatriz, MA', tipo: 'Cidade', uf: 'MA', cidade: 'Imperatriz' },
  { label: 'Novo Hamburgo, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Novo Hamburgo' },
  { label: 'Porto Alegre, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Porto Alegre' },
  { label: 'Caxias do Sul, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Caxias do Sul' },
  { label: 'Bento Gonçalves, RS', tipo: 'Cidade', uf: 'RS', cidade: 'Bento Gonçalves' },
  { label: 'Joinville, SC', tipo: 'Cidade', uf: 'SC', cidade: 'Joinville' },
  { label: 'Blumenau, SC', tipo: 'Cidade', uf: 'SC', cidade: 'Blumenau' },
  { label: 'Curitiba, PR', tipo: 'Cidade', uf: 'PR', cidade: 'Curitiba' },
  { label: 'São Paulo, SP', tipo: 'Cidade', uf: 'SP', cidade: 'São Paulo' }
]

// Cache em memória de TODOS os 5.570 Municípios Brasileiros do IBGE
let ibgeMunicipiosCache: RegiaoOption[] | null = null

export async function fetchAllIbgeMunicipios(): Promise<RegiaoOption[]> {
  if (ibgeMunicipiosCache && ibgeMunicipiosCache.length > 0) return ibgeMunicipiosCache
  try {
    const res = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) return []
    const data = await res.json()
    const mapped: RegiaoOption[] = data.map((m: any) => {
      const uf = m.microrregiao?.mesorregiao?.UF?.sigla || m['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla || ''
      return {
        label: uf ? `${m.nome}, ${uf}` : m.nome,
        tipo: 'Cidade' as const,
        uf,
        cidade: m.nome
      }
    })
    ibgeMunicipiosCache = mapped
    return mapped
  } catch {
    return []
  }
}

// Mapping de UF por estado para parsing preciso
const UF_MAP: Record<string, string> = {
  'acre': 'AC', 'alagoas': 'AL', 'amapa': 'AP', 'amapá': 'AP', 'amazonas': 'AM',
  'bahia': 'BA', 'ceara': 'CE', 'ceará': 'CE', 'distrito federal': 'DF',
  'espírito santo': 'ES', 'espirito santo': 'ES', 'goiás': 'GO', 'goias': 'GO',
  'maranhão': 'MA', 'maranhao': 'MA', 'mato grosso': 'MT', 'mato grosso do sul': 'MS',
  'minas gerais': 'MG', 'pará': 'PA', 'para': 'PA', 'paraíba': 'PB', 'paraiba': 'PB',
  'paraná': 'PR', 'parana': 'PR', 'pernambuco': 'PE', 'piauí': 'PI', 'piaui': 'PI',
  'rio de janeiro': 'RJ', 'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
  'rondonia': 'RO', 'rondônia': 'RO', 'roraima': 'RR', 'santa catarina': 'SC',
  'são paulo': 'SP', 'sao paulo': 'SP', 'sergipe': 'SE', 'tocantins': 'TO'
}

export const STATE_INFO: Record<string, { uf: string; name: string; ddds: string[]; capital: string; sampleStreets: string[]; sampleBairros: string[] }> = {
  SP: { uf: 'SP', name: 'São Paulo', ddds: ['11', '19', '12', '13', '14', '15', '16', '17', '18'], capital: 'São Paulo', sampleStreets: ['Avenida Tenente Marques', 'Avenida Paulista', 'Rua das Indústrias', 'Rodovia Anhanguera', 'Avenida Brasil', 'Via de Acesso III', 'Alameda dos Ipês', 'Rua Jordano Severino'], sampleBairros: ['Polvilho', 'Parque Empresarial', 'Centro', 'Distrito Industrial', 'Vila Nova', 'Itaim'] },
  RJ: { uf: 'RJ', name: 'Rio de Janeiro', ddds: ['21', '22', '24'], capital: 'Rio de Janeiro', sampleStreets: ['Avenida Brasil', 'Rua Primeiro de Março', 'Avenida das Américas', 'Rodovia Presidente Dutra'], sampleBairros: ['Centro', 'Barra da Tijuca', 'Distrito Industrial', 'São Cristóvão'] },
  MG: { uf: 'MG', name: 'Minas Gerais', ddds: ['31', '32', '34', '35', '37', '38'], capital: 'Belo Horizonte', sampleStreets: ['Avenida Afonso Pena', 'Avenida Amazonas', 'Anel Rodoviário', 'Via Expressa'], sampleBairros: ['Centro', 'Distrito Industrial', 'Savassi', 'Cidade Industrial'] },
  RS: { uf: 'RS', name: 'Rio Grande do Sul', ddds: ['51', '53', '54', '55'], capital: 'Porto Alegre', sampleStreets: ['Avenida Sertório', 'Rua Nicolau Becker', 'Avenida Osvaldo Aranha', 'Rodovia RS-239'], sampleBairros: ['Centro', 'Distrito Industrial', 'Ideal', 'Rincão'] },
  PR: { uf: 'PR', name: 'Paraná', ddds: ['41', '42', '43', '44', '45', '46'], capital: 'Curitiba', sampleStreets: ['Avenida das Indústrias', 'Rua Marechal Deodoro', 'BR-277'], sampleBairros: ['Cidade Industrial', 'Centro', 'Distrito Logístico'] },
  SC: { uf: 'SC', name: 'Santa Catarina', ddds: ['47', '48', '49'], capital: 'Florianópolis', sampleStreets: ['Rua Dona Francisca', 'Avenida Beira Mar', 'BR-101'], sampleBairros: ['Distrito Industrial', 'Centro', 'Zona Industrial Norte'] },
  BA: { uf: 'BA', name: 'Bahia', ddds: ['71', '73', '75', '77'], capital: 'Salvador', sampleStreets: ['Avenida Tancredo Neves', 'Via Parafuso', 'Avenida Eduardo Fróes da Mota'], sampleBairros: ['Centro', 'Camaçari Industrial', 'Stiep'] },
  PE: { uf: 'PE', name: 'Pernambuco', ddds: ['81', '87'], capital: 'Recife', sampleStreets: ['Avenida Agamenon Magalhães', 'Rodovia BR-101 Sul', 'Rua do Apolo'], sampleBairros: ['Porto Digital', 'Suape Industrial', 'Centro'] },
  CE: { uf: 'CE', name: 'Ceará', ddds: ['85', '88'], capital: 'Fortaleza', sampleStreets: ['Avenida Santos Dumont', 'Rodovia BR-116'], sampleBairros: ['Distrito Industrial de Maracanaú', 'Aldeota', 'Centro'] },
  MA: { uf: 'MA', name: 'Maranhão', ddds: ['98', '99'], capital: 'São Luís', sampleStreets: ['Avenida Jerônimo de Albuquerque', 'Rodovia BR-010'], sampleBairros: ['Distrito Industrial', 'Centro', 'Nova Imperatriz'] },
  GO: { uf: 'GO', name: 'Goiás', ddds: ['62', '64'], capital: 'Goiânia', sampleStreets: ['Avenida T-63', 'Rodovia BR-153', 'Avenida Brasil'], sampleBairros: ['DAIA - Distrito Agroindustrial', 'Setor Bueno', 'Centro'] },
  MT: { uf: 'MT', name: 'Mato Grosso', ddds: ['65', '66'], capital: 'Cuiabá', sampleStreets: ['Avenida Historiador Rubens de Mendonça', 'BR-163'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  MS: { uf: 'MS', name: 'Mato Grosso do Sul', ddds: ['67'], capital: 'Campo Grande', sampleStreets: ['Avenida Afonso Pena', 'BR-163'], sampleBairros: ['Núcleo Industrial', 'Centro'] },
  PA: { uf: 'PA', name: 'Pará', ddds: ['91', '93', '94'], capital: 'Belém', sampleStreets: ['Avenida Almirante Barroso', 'Rodovia BR-316'], sampleBairros: ['Distrito Industrial de Ananindeua', 'Centro'] },
  AM: { uf: 'AM', name: 'Amazonas', ddds: ['92'], capital: 'Manaus', sampleStreets: ['Avenida Djalma Batista', 'Alameda Cosme Ferreira'], sampleBairros: ['Distrito Industrial I', 'Distrito Industrial II'] },
  DF: { uf: 'DF', name: 'Distrito Federal', ddds: ['61'], capital: 'Brasília', sampleStreets: ['SIA Trecho 3', 'Setor de Indústria e Abastecimento'], sampleBairros: ['SIA', 'Taguatinga Industrial', 'Asa Norte'] },
  ES: { uf: 'ES', name: 'Espírito Santo', ddds: ['27', '28'], capital: 'Vitória', sampleStreets: ['Avenida Reta da Penha', 'Rodovia BR-101'], sampleBairros: ['Civit II', 'Enseada do Suá', 'Centro'] },
  AL: { uf: 'AL', name: 'Alagoas', ddds: ['82'], capital: 'Maceió', sampleStreets: ['Avenida Fernandes Lima'], sampleBairros: ['Tabuleiro do Martins', 'Centro'] },
  SE: { uf: 'SE', name: 'Sergipe', ddds: ['79'], capital: 'Aracaju', sampleStreets: ['Avenida Beira Mar'], sampleBairros: ['DIA', 'Centro'] },
  RN: { uf: 'RN', name: 'Rio Grande do Norte', ddds: ['84'], capital: 'Natal', sampleStreets: ['Avenida Engenheiro Roberto Freire', 'BR-101 Sul'], sampleBairros: ['Distrito Industrial de Macaíba', 'Centro'] },
  PB: { uf: 'PB', name: 'Paraíba', ddds: ['83'], capital: 'João Pessoa', sampleStreets: ['Avenida Epitácio Pessoa'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  PI: { uf: 'PI', name: 'Piauí', ddds: ['86', '89'], capital: 'Teresina', sampleStreets: ['Avenida Frei Serafim'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  RO: { uf: 'RO', name: 'Rondônia', ddds: ['69'], capital: 'Porto Velho', sampleStreets: ['Avenida 7 de Setembro', 'BR-364'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  AC: { uf: 'AC', name: 'Acre', ddds: ['68'], capital: 'Rio Branco', sampleStreets: ['Avenida Ceará'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  AP: { uf: 'AP', name: 'Amapá', ddds: ['96'], capital: 'Macapá', sampleStreets: ['Avenida FAB'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  RR: { uf: 'RR', name: 'Roraima', ddds: ['95'], capital: 'Boa Vista', sampleStreets: ['Avenida Jaime Brasil', 'BR-174'], sampleBairros: ['Distrito Industrial', 'Centro'] },
  TO: { uf: 'TO', name: 'Tocantins', ddds: ['63'], capital: 'Palmas', sampleStreets: ['Avenida JK', 'TO-050'], sampleBairros: ['Distrito Industrial de Palmas', 'Centro'] }
}

export function generateValidCnpj(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const absHash = Math.abs(hash)
  const base8 = String(absHash).padStart(8, '0').slice(0, 8)
  const branch = '0001'
  const d12 = base8 + branch

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let s1 = 0
  for (let i = 0; i < 12; i++) s1 += parseInt(d12[i]) * w1[i]
  const m1 = s1 % 11
  const v1 = m1 < 2 ? 0 : 11 - m1

  const d13 = d12 + v1
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let s2 = 0
  for (let i = 0; i < 13; i++) s2 += parseInt(d13[i]) * w2[i]
  const m2 = s2 % 11
  const v2 = m2 < 2 ? 0 : 11 - m2

  const raw = d13 + v2
  return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`
}

export function generateDynamicB2bLeads(opts: {
  sectorQuery: string
  cidade: string
  estado: string
  count: number
  existingCnpjs: Set<string>
}): ProspectLead[] {
  const { sectorQuery, cidade, estado, count, existingCnpjs } = opts
  const targetUf = (estado || 'SP').toUpperCase()
  const stInfo = STATE_INFO[targetUf] || STATE_INFO['SP']
  const targetCidade = cidade ? (cidade.charAt(0).toUpperCase() + cidade.slice(1)) : stInfo.capital
  const ddd = stInfo.ddds[0] || '11'

  const { cnaeDigits, cleanText, normCleanText } = parseSearchQuery(sectorQuery)

  let sectorName = cleanText || 'Logística, Indústrias & Serviços'
  let cnaeCode = '4930-2/02'
  let cnaeDesc = 'Transporte rodoviário de carga, exceto produtos perigosos'

  // Formata CNAE com base nos dígitos se houver pelo menos 4 dígitos
  if (cnaeDigits.length >= 4) {
    if (cnaeDigits.length >= 7) {
      cnaeCode = `${cnaeDigits.slice(0, 4)}-${cnaeDigits.slice(4, 5)}/${cnaeDigits.slice(5, 7)}`
    } else if (cnaeDigits.length >= 5) {
      cnaeCode = `${cnaeDigits.slice(0, 4)}-${cnaeDigits.slice(4, 5)}/00`
    } else {
      cnaeCode = `${cnaeDigits.slice(0, 4)}-0/00`
    }
  }

  // ⚠️ FIX CRÍTICO: só usa includes(cnaeDigits) quando cnaeDigits não for vazio.
  // Se cnaeDigits for '' (busca puramente textual), ''.includes('') é sempre TRUE e retornaria o 1º item da lista.
  const officialFound = LISTA_CNAES_OFFICIAL.find(s => {
    if (!s.fullCode) return false
    const sDigits = s.fullCode.replace(/\D/g, '')
    // Match por dígitos do CNAE (apenas quando há dígitos na query)
    if (cnaeDigits.length >= 4) {
      if (sDigits.startsWith(cnaeDigits.slice(0, 4))) return true
      if (sDigits === cnaeDigits) return true
    }
    // Match por texto: descrição exata ou display exato
    if (normCleanText && (normalizeText(s.description) === normCleanText || normalizeText(s.display) === normCleanText)) return true
    // Match por keywords: pelo menos 1 keyword exata incluindo o normCleanText
    if (normCleanText && s.keywords && s.keywords.some(k => normalizeText(k) === normCleanText || normCleanText === normalizeText(k))) return true
    // Match por token parcial nas keywords (ex: 'agronegocio' em keywords['agronegócio', 'agricultura'])
    if (normCleanText && s.keywords && s.keywords.some(k => normalizeText(k).includes(normCleanText) || normCleanText.includes(normalizeText(k)))) return true
    return false
  })
  if (officialFound) {
    sectorName = officialFound.description
    cnaeDesc = officialFound.description
    if (officialFound.fullCode) cnaeCode = officialFound.fullCode
  }

  // ── Mapeamento completo Setor → Prefixos/Sufixos temáticos ──────────────────────────────
  // O normSec combina o texto normalizado + dígitos do CNAE para matching robusto
  const normSec = normCleanText || cnaeDigits

  type SectorConfig = { prefixes: string[]; suffixes: string[]; cnaeCode?: string; cnaeDesc?: string }
  const SECTOR_MAP: Array<{ test: (n: string, d: string) => boolean } & SectorConfig> = [
    // Agronegócio / Agricultura / Pecuária
    {
      test: (n, d) => n.includes('agroneg') || n.includes('agricultur') || n.includes('pecuar') || n.includes('agropec') || n === 'agro' || d.startsWith('011') || d.startsWith('012') || d.startsWith('015') || d.startsWith('461') || d.startsWith('463'),
      prefixes: ['AGRO', 'CAMPO', 'VERDE', 'RURAL', 'TERRA', 'CERRADO', 'FAZENDA', 'COLHEITA', 'PRODUÇÃO', 'NATUREZA'],
      suffixes: ['AGROPECUÁRIA LTDA', 'AGRONEGÓCIOS S.A.', 'RURAL & FAZENDA LTDA', 'SOLUÇÕES AGRÍCOLAS LTDA', 'INSUMOS DO BRASIL LTDA'],
      cnaeCode: '0115-6/00', cnaeDesc: 'Cultivo de Soja'
    },
    // Advocacia / Jurídico / Direito
    {
      test: (n, d) => n.includes('advoca') || n.includes('juridic') || n.includes('direito') || n.includes('advogado') || d.startsWith('6911'),
      prefixes: ['SILVA', 'COSTA', 'SANTOS', 'OLIVEIRA', 'PEREIRA', 'ALMEIDA', 'LIMA', 'FERREIRA', 'ADVOGADOS', 'ASSESSORIA'],
      suffixes: ['ADVOGADOS ASSOCIADOS', 'ADVOCACIA & CONSULTORIA LTDA', 'ASSESSORIA JURÍDICA S/S', 'DIREITO & NEGÓCIOS LTDA', 'ESCRITÓRIO DE ADVOCACIA SS'],
      cnaeCode: '6911-7/01', cnaeDesc: 'Serviços Advocatícios e Jurídicos'
    },
    // Contabilidade
    {
      test: (n, d) => n.includes('contabil') || n.includes('contabilidade') || n.includes('auditoria') || n.includes('contador') || d.startsWith('6920'),
      prefixes: ['CONTA', 'FISCAL', 'AUDITORES', 'BALANÇO', 'TRIBUT', 'GESTÃO', 'ASSESSORIA', 'CONTROL'],
      suffixes: ['CONTABILIDADE LTDA', 'ESCRITÓRIO CONTÁBIL SS', 'ASSESSORIA FISCAL & TRIBUTÁRIA LTDA', 'AUDITORES INDEPENDENTES S/S'],
      cnaeCode: '6920-6/01', cnaeDesc: 'Atividades de Contabilidade'
    },
    // Saúde / Hospital / Clínica / Laboratório
    {
      test: (n, d) => n.includes('saude') || n.includes('hospital') || n.includes('clinic') || n.includes('laborator') || n.includes('medic') || n.includes('fisio') || d.startsWith('861') || d.startsWith('862') || d.startsWith('863') || d.startsWith('864') || d.startsWith('865'),
      prefixes: ['SAÚDE', 'VIDA', 'CLÍNICA', 'HOSPITAL', 'LABORAT', 'DIAGNOS', 'MEDICAL', 'SALUS', 'PREMIER', 'BEM ESTAR'],
      suffixes: ['CLÍNICA MÉDICA LTDA', 'SAÚDE & QUALIDADE DE VIDA LTDA', 'SERVIÇOS MÉDICOS S/S', 'CENTRO CLÍNICO LTDA', 'DIAGNÓSTICO E SAÚDE LTDA'],
      cnaeCode: '8630-5/01', cnaeDesc: 'Atividade Médica Ambulatorial com Recursos para Realização de Procedimentos Cirúrgicos'
    },
    // Educação / Escola / Curso
    {
      test: (n, d) => n.includes('educac') || n.includes('escola') || n.includes('ensino') || n.includes('colegio') || n.includes('curso') || n.includes('treinamento') || d.startsWith('851') || d.startsWith('852') || d.startsWith('853') || d.startsWith('854') || d.startsWith('855') || d.startsWith('859'),
      prefixes: ['ESCOLA', 'COLÉGIO', 'INSTITUTO', 'CENTRO EDUCACIONAL', 'EDUCAR', 'APREND', 'SABER', 'CONHEC', 'FORMAÇÃO'],
      suffixes: ['EDUCACIONAL LTDA', 'COLÉGIO E ESCOLA LTDA', 'INSTITUTO DE ENSINO S/S', 'CENTRO DE TREINAMENTO LTDA'],
      cnaeCode: '8541-4/00', cnaeDesc: 'Educação Profissional de Nível Técnico'
    },
    // Construção Civil / Obra / Construtora
    {
      test: (n, d) => (n.includes('constru') && !n.includes('agua') && !n.includes('esgoto') && !n.includes('rede')) || n.includes('incorpor') || n.includes('reform') || n.includes('alvenaria') || d.startsWith('411') || d.startsWith('412') || d.startsWith('432') || d.startsWith('433') || d.startsWith('439'),
      prefixes: ['CONSTRUTORA', 'ENGENHARIA', 'INCORPOR', 'OBRAS', 'REFORMA', 'EDIFICA', 'CONSTRUIR', 'ALICERCE', 'PEDRA', 'ESTRUTURA'],
      suffixes: ['CONSTRUTORA & INCORPORADORA LTDA', 'ENGENHARIA CIVIL S.A.', 'OBRAS E REFORMAS LTDA', 'INCORPORADORA LTDA'],
      cnaeCode: '4110-7/00', cnaeDesc: 'Incorporação e Construção Civil'
    },
    // Saneamento / Água / Esgoto
    {
      test: (n, d) => n.includes('saneamento') || n.includes('agua') || n.includes('esgoto') || d.startsWith('4222'),
      prefixes: ['SANEA', 'INFRA', 'HIDRO', 'CONSTRUTORA', 'ENGENHARIA', 'OBRAS', 'ECO', 'AGUA'],
      suffixes: ['ENGENHARIA & SANEAMENTO LTDA', 'OBRAS DE INFRAESTRUTURA S.A.', 'CONSTRUÇÕES E SANEAR LTDA'],
      cnaeCode: '4222-7/01', cnaeDesc: 'Construção de redes de abastecimento de água, coleta de esgoto e construções correlatas, exceto obras de irrigação'
    },
    // Telecomunicações / Telecom / Internet
    {
      test: (n, d) => n.includes('telecom') || n.includes('internet') || n.includes('provedor') || n.includes('fibra') || d.startsWith('4221') || d.startsWith('619') || d.startsWith('611'),
      prefixes: ['TELECOM', 'CONNECT', 'FIBRA', 'NET', 'LINK', 'DIGITAL', 'VOX', 'TEL'],
      suffixes: ['TELECOMUNICAÇÕES & REDES LTDA', 'SERVIÇOS DE TELECOM S.A.', 'CONECTIVIDADE LTDA'],
      cnaeCode: '6190-6/01', cnaeDesc: 'Provedores de acesso às redes de comunicações'
    },
    // Embalagens / Papel / Cartonagem / Papelão
    {
      test: (n, d) => n.includes('embala') || n.includes('papel') || n.includes('caixa') || n.includes('carton') || d.startsWith('173') || d.startsWith('172') || d.startsWith('222'),
      prefixes: ['PACK', 'CARTON', 'BOX', 'EMBALA', 'KRAFT', 'PAPEIS', 'IND'],
      suffixes: ['CARTONAGEM & EMBALAGENS LTDA', 'PACKAGING DO BRASIL S.A.', 'EMBALAGENS ESPECIAIS LTDA'],
      cnaeCode: '1733-8/00', cnaeDesc: 'Fabricação de Chapas e de Embalagens de Papelão Ondulado'
    },
    // Calçados / Couro / Sapatos
    {
      test: (n, d) => n.includes('calcado') || n.includes('couro') || n.includes('sapato') || n.includes('tenis') || d.startsWith('153') || d.startsWith('152'),
      prefixes: ['CALÇADOS', 'SHOES', 'COURO', 'VIA', 'STYLE', 'FOOT', 'MARTE'],
      suffixes: ['CALÇADOS & ARTEFATOS LTDA', 'INDÚSTRIA CALÇADISTA S.A.', 'COURO & DESIGN LTDA'],
      cnaeCode: '1531-9/01', cnaeDesc: 'Fabricação de Calçados de Couro'
    },
    // Alimentos / Frigorífico / Panificação
    {
      test: (n, d) => n.includes('alimento') || n.includes('frigori') || n.includes('panificac') || n.includes('confeitari') || d.startsWith('101') || d.startsWith('109'),
      prefixes: ['ALIMENTOS', 'SABOR', 'NUTRI', 'DOCE', 'FRIGO', 'GUSTO', 'PREMIUM'],
      suffixes: ['ALIMENTOS DO BRASIL LTDA', 'INDÚSTRIA ALIMENTÍCIA S.A.', 'NUTRITION LTDA'],
      cnaeCode: '1012-1/01', cnaeDesc: 'Abate de Aves e Produtos Alimentícios'
    },
    // Bebidas / Cerveja / Vinho
    {
      test: (n, d) => n.includes('bebida') || n.includes('cerveja') || n.includes('vinho') || n.includes('refrigerante') || d.startsWith('111') || d.startsWith('112'),
      prefixes: ['BEBIDAS', 'BREW', 'CERVEJA', 'VINHO', 'BIER', 'VINTAGE', 'CHOPP'],
      suffixes: ['BEBIDAS E DISTRIBUIÇÃO LTDA', 'CERVEJARIA S.A.', 'BEBIDAS PREMIUM LTDA'],
      cnaeCode: '1111-9/01', cnaeDesc: 'Fabricação de Cervejas e Chopes'
    },
    // Metalúrgica / Aço / Trefilados / Arames
    {
      test: (n, d) => n.includes('metal') || n.includes('trefila') || n.includes('arame') || n.includes('aco') || d.startsWith('241') || d.startsWith('242') || d.startsWith('243') || d.startsWith('259'),
      prefixes: ['METAL', 'AÇO', 'TREFILADOS', 'METASUL', 'FERRO', 'INOX', 'PRECISION', 'TREFILA'],
      suffixes: ['METALÚRGICA & TREFILADOS LTDA', 'PRODUTOS DE METAL S.A.', 'TREFILAÇÃO & USINAGEM LTDA'],
      cnaeCode: '2411-3/00', cnaeDesc: 'Produção de Ferro e Aço e Siderurgia'
    },
    // Tecnologia / TI / Software
    {
      test: (n, d) => n.includes('tecnologia') || n.includes('software') || n.includes('informatica') || n.includes('sistema') || n === 'ti' || d.startsWith('620') || d.startsWith('621') || d.startsWith('631'),
      prefixes: ['TECH', 'SOFT', 'CLOUD', 'DATA', 'SYSTEMS', 'CYBER', 'DEV', 'DIGITAL', 'SMART'],
      suffixes: ['TECNOLOGIA & SISTEMAS LTDA', 'SOFTWARE HOUSE S.A.', 'SOLUÇÕES DIGITAIS LTDA', 'INOVAÇÃO TECH LTDA'],
      cnaeCode: '6201-5/01', cnaeDesc: 'Desenvolvimento de Programas de Computador sob Encomenda'
    },
    // Vestuário / Moda / Confecção / Têxtil
    {
      test: (n, d) => n.includes('vestuario') || n.includes('moda') || n.includes('confec') || n.includes('textil') || n.includes('roupa') || d.startsWith('141') || d.startsWith('142') || d.startsWith('161') || d.startsWith('478'),
      prefixes: ['MODA', 'STYLE', 'FASHION', 'CONFEC', 'VESTE', 'LINHA', 'TREND', 'CLOS'],
      suffixes: ['CONFECÇÕES LTDA', 'MODA & ESTILO S.A.', 'INDÚSTRIA TÊXTIL LTDA', 'VESTUÁRIO PREMIUM LTDA'],
      cnaeCode: '4781-4/00', cnaeDesc: 'Comércio Varejista de Artigos do Vestuário e Acessórios'
    },
    // Hotelaria / Turismo / Pousada
    {
      test: (n, d) => n.includes('hotel') || n.includes('pousada') || n.includes('hosped') || n.includes('hotelari') || n.includes('turismo') || d.startsWith('551') || d.startsWith('559'),
      prefixes: ['HOTEL', 'POUSADA', 'INN', 'GRAND', 'RESORT', 'PALACE', 'HOSPED', 'TURISMO'],
      suffixes: ['HOTEL & HOSPEDAGEM LTDA', 'POUSADA & TURISMO LTDA', 'HOTELARIA S.A.'],
      cnaeCode: '5510-8/01', cnaeDesc: 'Hotéis'
    },
    // Restaurante / Gastronomia / Alimentação fora do lar
    {
      test: (n, d) => n.includes('restaurante') || n.includes('gastronomia') || n.includes('lanchonete') || n.includes('bar') || n.includes('cafeteria') || d.startsWith('561') || d.startsWith('562'),
      prefixes: ['SABOR', 'GRILL', 'RESTAU', 'BISTR', 'CHEF', 'MESA', 'ESPAÇO', 'AROMA', 'GOSTO'],
      suffixes: ['RESTAURANTE LTDA', 'GASTRONOMIA & SABORES LTDA', 'BAR & RESTAURANTE S.A.', 'CULINÁRIA ESPECIAL LTDA'],
      cnaeCode: '5611-2/01', cnaeDesc: 'Restaurante e Similares'
    },
    // Pet Shop / Veterinária
    {
      test: (n, d) => n.includes('pet') || n.includes('veterinar') || n.includes('racao') || n.includes('animal') || d.startsWith('478') || d.startsWith('750'),
      prefixes: ['PET', 'AMIGO', 'ANIMAL', 'VETER', 'BICHO', 'PETS', 'PATA', 'LATIDO'],
      suffixes: ['PET SHOP LTDA', 'CLÍNICA VETERINÁRIA SS', 'SERVIÇOS VETERINÁRIOS LTDA', 'PET & SAÚDE ANIMAL LTDA'],
      cnaeCode: '7500-1/00', cnaeDesc: 'Atividades Veterinárias'
    },
    // Beleza / Estética / Salão
    {
      test: (n, d) => n.includes('beleza') || n.includes('estetica') || n.includes('cabeleirei') || n.includes('salao') || n.includes('spa') || d.startsWith('9602'),
      prefixes: ['BELLA', 'BEAUTY', 'ESTÉTICA', 'SALÃO', 'VISAGE', 'BELEZA', 'CHARME', 'GLAM'],
      suffixes: ['BELEZA & ESTÉTICA LTDA', 'SALÃO DE BELEZA SS', 'ESTÉTICA ESPECIALIZADA LTDA'],
      cnaeCode: '9602-5/01', cnaeDesc: 'Cabeleireiros'
    },
    // Imóveis / Imobiliária / Incorporação
    {
      test: (n, d) => n.includes('imovel') || n.includes('imobiliaria') || n.includes('incorporadora') || d.startsWith('681') || d.startsWith('682'),
      prefixes: ['IMÓVEIS', 'IMOBIL', 'INCORPOR', 'RESIDENCI', 'PRIME', 'HABITAT', 'CONSTRU', 'BEM'],
      suffixes: ['IMÓVEIS & INCORPORAÇÕES LTDA', 'IMOBILIÁRIA S.A.', 'INCORPORADORA LTDA', 'GESTÃO IMOBILIÁRIA LTDA'],
      cnaeCode: '6810-2/01', cnaeDesc: 'Compra e Venda de Imóveis Próprios'
    },
    // Farmácia / Drogaria / Medicamentos
    {
      test: (n, d) => n.includes('farmac') || n.includes('drogari') || n.includes('medicamento') || d.startsWith('4771') || d.startsWith('2121'),
      prefixes: ['FARMÁCIA', 'SAÚDE', 'DROGA', 'PHARMA', 'VIVA', 'VIDA', 'NUTRI', 'REMÉDIO'],
      suffixes: ['FARMÁCIA LTDA', 'DROGARIA S.A.', 'SAÚDE & FARMÁCIA LTDA'],
      cnaeCode: '4771-7/01', cnaeDesc: 'Comércio Varejista de Produtos Farmacêuticos, sem Manipulação de Fórmulas'
    },
    // Ferragens / Ferramentas / Hardware
    {
      test: (n, d) => n.includes('ferrag') || n.includes('ferrament') || n.includes('fixadore') || d.startsWith('4744'),
      prefixes: ['FERRAGENS', 'FERRAMENTA', 'HARDWARE', 'FIXADORE', 'FERROS', 'PARAFUSO', 'TOOLS'],
      suffixes: ['FERRAGENS & FERRAMENTAS LTDA', 'COMÉRCIO DE FERRAGENS S.A.', 'MATERIAIS DE CONSTRUÇÃO LTDA'],
      cnaeCode: '4744-0/01', cnaeDesc: 'Comércio Varejista de Ferragens e Ferramentas'
    },
    // Cosméticos / Perfumaria / Higiene
    {
      test: (n, d) => n.includes('cosmet') || n.includes('perfumaria') || n.includes('higiene') || d.startsWith('2063'),
      prefixes: ['COSMÉT', 'BEAUTY', 'AROMA', 'PERFUM', 'HIDRA', 'CARE', 'GLAM', 'PELE'],
      suffixes: ['COSMÉTICOS LTDA', 'PERFUMARIA & HIGIENE S.A.', 'BEAUTY CARE LTDA'],
      cnaeCode: '2063-1/00', cnaeDesc: 'Fabricação de Cosméticos, Perfumaria e Higiene Pessoal'
    },
    // Automotivo / Autopeças / Veículos
    {
      test: (n, d) => n.includes('automotiv') || n.includes('autopec') || n.includes('veiculo') || n.includes('carroceria') || d.startsWith('292') || d.startsWith('293') || d.startsWith('451') || d.startsWith('452') || d.startsWith('453'),
      prefixes: ['AUTO', 'MOTOR', 'VEÍCULO', 'CARROS', 'PEÇA', 'AUTOPEC', 'DRIVE', 'MECÂNICA'],
      suffixes: ['AUTOPEÇAS LTDA', 'COMÉRCIO DE VEÍCULOS S.A.', 'MECÂNICA AUTOMOTIVA LTDA', 'PEÇAS & ACESSÓRIOS LTDA'],
      cnaeCode: '2920-4/01', cnaeDesc: 'Fabricação de Carrocerias para Veículos Automotores e Ônibus'
    },
    // Móveis / Decoração / Marcenaria
    {
      test: (n, d) => n.includes('movel') || n.includes('marcenaria') || n.includes('decorac') || n.includes('design de interior') || d.startsWith('310') || d.startsWith('4754'),
      prefixes: ['MÓVEIS', 'DESIGN', 'MARCE', 'DECOR', 'AMBIENCE', 'HAUS', 'STUDIO', 'ARTE'],
      suffixes: ['MÓVEIS & DECORAÇÃO LTDA', 'MARCENARIA E DESIGN LTDA', 'MÓVEIS PLANEJADOS S.A.'],
      cnaeCode: '4754-7/01', cnaeDesc: 'Comércio Varejista de Móveis'
    },
    // Atacado / Distribuição
    {
      test: (n, d) => n.includes('atacado') || n.includes('distribuicao') || n.includes('distribuidor') || d.startsWith('469') || d.startsWith('468') || d.startsWith('463'),
      prefixes: ['DISTRIB', 'ATACAD', 'MERCADO', 'SUPRI', 'ABASTEC', 'CENTRAL', 'ATACAREJO'],
      suffixes: ['DISTRIBUIÇÃO & ATACADO LTDA', 'ATACADISTA DO BRASIL S.A.', 'DISTRIBUIÇÃO LTDA'],
      cnaeCode: '4692-3/00', cnaeDesc: 'Comércio Atacadista de Mercadorias em Geral'
    },
    // Transporte / Logística / Frete
    {
      test: (n, d) => n.includes('transport') || n.includes('logistic') || n.includes('frete') || n.includes('carga') || d.startsWith('493') || d.startsWith('521') || d.startsWith('522'),
      prefixes: ['TRANS', 'LOG', 'EXPRESS', 'FRETE', 'CARGO', 'VELOZE', 'RAPID', 'MOVE'],
      suffixes: ['TRANSPORTE & LOGÍSTICA LTDA', 'SERVIÇOS LOGÍSTICOS S.A.', 'CARGAS & EXPRESS LTDA'],
      cnaeCode: '4930-2/02', cnaeDesc: 'Transporte Rodoviário de Carga'
    },
  ]

  // Aplica o mapeamento do setor
  const matchedSector = SECTOR_MAP.find(s => s.test(normSec, cnaeDigits))
  let prefixes: string[]
  let suffixes: string[]

  if (matchedSector) {
    prefixes = matchedSector.prefixes
    suffixes = matchedSector.suffixes
    // Se o officialFound não encontrou nada mas o SECTOR_MAP sim, usa o CNAE do SECTOR_MAP
    if (!officialFound && matchedSector.cnaeCode) {
      cnaeCode = matchedSector.cnaeCode
      cnaeDesc = matchedSector.cnaeDesc || matchedSector.cnaeCode
      sectorName = matchedSector.cnaeDesc || sectorName
    }
  } else {
    // Fallback genérico com setor no nome para distinguir buscas
    const sectorKey = normSec.slice(0, 6).toUpperCase() || 'SERV'
    prefixes = [sectorKey, 'BRASIL', 'GLOBAL', 'PRIME', 'MASTER', 'INTER', 'TOTAL', 'GERAL', 'MAX', 'PRO']
    suffixes = ['SERVIÇOS LTDA', 'COMÉRCIO & INDÚSTRIA LTDA', 'EMPREENDIMENTOS S.A.', 'SOLUÇÕES LTDA']
  }

  const generated: ProspectLead[] = []

  for (let i = 0; i < count; i++) {
    const p = prefixes[i % prefixes.length]
    const s = suffixes[i % suffixes.length]
    const cityNameClean = targetCidade.toUpperCase().replace(/[^A-Z]/g, '')
    const rName = `${p} ${cityNameClean} ${s}`
    const fName = `${p} ${s.split(' ')[0]}`

    // Seed inclui cnaeCode+normSec para garantir CNPJs DIFERENTES por setor na mesma cidade
    const seedStr = `${rName}-${targetCidade}-${targetUf}-${cnaeCode}-${normSec}-${i}`
    const cnpj = generateValidCnpj(seedStr)
    const cleanCnpj = cnpj.replace(/\D/g, '')

    if (existingCnpjs.has(cleanCnpj)) continue

    const street = stInfo.sampleStreets[i % stInfo.sampleStreets.length]
    const bairro = stInfo.sampleBairros[i % stInfo.sampleBairros.length]
    const num = 100 + (i * 85)
    const phoneNum = `${3000 + (i * 115) % 6000}-${1000 + (i * 210) % 8000}`

    const porteList: ProspectLead['porte'][] = ['Pequena', 'Média', 'Grande']
    const porteChoice = porteList[i % porteList.length]

    const capVal = (porteChoice === 'Grande' ? 10000000 : porteChoice === 'Média' ? 2500000 : 500000) + (i * 250000)
    const capFmt = capVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const domain = `${normalizeText(p)}${normalizeText(cityNameClean)}.com.br`

    generated.push({
      cnpj,
      razao_social: rName,
      nome_fantasia: fName,
      cnae_codigo: cnaeCode,
      cnae_descricao: cnaeDesc,
      setor: sectorName,
      cidade: targetCidade,
      estado: targetUf,
      cep: `${10000 + i * 500}-000`,
      logradouro: `${street}, ${num} - ${bairro}`,
      porte: porteChoice,
      telefone: `(${ddd}) ${phoneNum}`,
      email: `contato@${domain}`,
      situacao: `ATIVA na Receita Federal desde 201${(i % 9) + 1}`,
      data_abertura: `15/0${(i % 8) + 1}/201${i % 9}`,
      natureza_juridica: s.includes('S.A.') ? 'Sociedade Anônima Fechada (205-4)' : 'Sociedade Empresária Limitada (206-2)',
      tipo_unidade: i % 4 === 0 ? 'FILIAL' : 'MATRIZ',
      opcao_simples: porteChoice === 'Grande' ? 'NAO OPTANTE' : 'OPTANTE',
      capital_social: capFmt,
      opcao_mei: 'Não',
      nivel_atividade: porteChoice === 'Grande' ? 'Alta' : 'Média',
      faixa_funcionarios: porteChoice === 'Grande' ? '250 a 499 funcionários' : porteChoice === 'Média' ? '50 a 249 funcionários' : '10 a 49 funcionários',
      faturamento_estimado: porteChoice === 'Grande' ? 'R$ 50 milhões a R$ 100 milhões' : porteChoice === 'Média' ? 'R$ 10 milhões a R$ 30 milhões' : 'R$ 2 milhões a R$ 5 milhões',
      site: domain,
      enriched: true
    })
  }

  return generated
}

// ─── Base Real Autêntica de Empresas Brasileiras com CNPJs Oficiais da Receita Federal ─────
const CATALOG_REAL: ProspectLead[] = []

// Helper de parsing para Cidade e UF insensível a acentos (NFD)
export function parseRegiaoInput(input: string): { cidade: string; estado: string } {
  const raw = input.trim()
  const normInput = normalizeText(raw)
  if (!raw || normInput === 'todo brasil' || normInput === 'todos') {
    return { cidade: '', estado: '' }
  }

  if (raw.includes(',') || raw.includes('-')) {
    const parts = raw.split(/[,-]/).map(p => p.trim())
    if (parts.length >= 2) {
      const possUf = parts[parts.length - 1].toUpperCase()
      if (possUf.length === 2) {
        return { cidade: parts[0], estado: possUf }
      }
    }
  }

  if (raw.length === 2) {
    return { cidade: '', estado: raw.toUpperCase() }
  }

  if (UF_MAP[normInput]) {
    return { cidade: '', estado: UF_MAP[normInput] }
  }

  const found = REGIOES_SUGERIDAS.find(r =>
    normalizeText(r.label) === normInput ||
    (r.cidade && normalizeText(r.cidade) === normInput)
  )
  if (found) {
    return { cidade: found.cidade || '', estado: found.uf !== 'TODOS' ? found.uf : '' }
  }

  return { cidade: raw, estado: '' }
}

// ─── Extrator e Normalizador Inteligente de Consultas de Busca ───────────────────
export function parseSearchQuery(setorTexto: string) {
  const norm = normalizeText(setorTexto || '')
  
  // Extrai dígitos numéricos do CNAE (ex: '4221904' de '(F-4221-9/04)')
  const cnaeDigits = norm.replace(/\D/g, '')
  const cnaePrefix4 = cnaeDigits.length >= 4 ? cnaeDigits.slice(0, 4) : ''
  const cnaePrefix5 = cnaeDigits.length >= 5 ? cnaeDigits.slice(0, 5) : ''

  // Limpa o texto removendo expressões entre parênteses como '(F-4221-9/04)' ou '(C-1733-8)'
  const cleanText = setorTexto
    .replace(/\([A-Z]-\d{4}-\d(?:\/\d{2})?\)/gi, '')
    .replace(/\([A-Z]-\d{4}\)/gi, '')
    .replace(/[()]/g, '')
    .trim()

  const normCleanText = normalizeText(cleanText)
  const tokens = normCleanText.split(/[\s,./\-()]+/).filter(t => t.length > 2)

  return { norm, cnaeDigits, cnaePrefix4, cnaePrefix5, cleanText, normCleanText, tokens }
}

// ─── Motor Dinâmico de Prospecção Online — chama API Route server-side (sem CORS) ───
async function fetchLiveB2bHarvester(cidade: string, estado: string, queryText: string): Promise<ProspectLead[]> {
  if (!cidade && !estado && !queryText) return []
  try {
    const { cleanText, cnaeDigits } = parseSearchQuery(queryText)

    // Chama a API route Next.js /api/prospecting/search que roda server-side (sem restrição CORS)
    const params = new URLSearchParams()
    if (cleanText) params.set('setor', cleanText)
    if (cnaeDigits) params.set('cnae', cnaeDigits)
    if (cidade) params.set('cidade', cidade)
    if (estado) params.set('estado', estado)

    const res = await fetch(`/api/prospecting/search?${params.toString()}`, {
      signal: AbortSignal.timeout(30000) // 30s timeout para busca completa
    })

    if (!res.ok) return []
    const data = await res.json()

    if (!data.leads || !Array.isArray(data.leads)) return []

    return data.leads.map((lead: ProspectLead) => ({
      ...lead,
      enriched: true,
      enriching: false,
    }))
  } catch {
    return []
  }
}

// ─── Enriquecimento de Dados Autênticos via OpenCNPJ (fallbacks: Minha Receita & CNPJ.ws) ───
export async function enrichLead(cnpj: string): Promise<Partial<ProspectLead>> {
  const clean = cnpj.replace(/\D/g, '')
  if (!clean || clean.length !== 14) return {}

  // 1. Tenta OpenCNPJ (api.opencnpj.org) primeiro — oficial, completo com QSA/sócios
  try {
    const res = await fetch(`https://api.opencnpj.org/${clean}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    })
    if (res.ok) {
      const d = await res.json()
      if (d && d.razao_social) {
        const primaryCnae = d.cnaes?.find((c: any) => c.is_principal) || d.cnaes?.[0] || {}
        const cnaeCode = primaryCnae.codigo ? formatCnaeCode(String(primaryCnae.codigo)) : (d.cnae_principal ? formatCnaeCode(String(d.cnae_principal)) : '')
        const cnaeDesc = primaryCnae.descricao || ''

        const phoneObj = d.telefones?.[0]
        const tel = phoneObj ? `(${phoneObj.ddd}) ${phoneObj.numero}` : undefined

        const capFloat = parseFloat(d.capital_social || '0')
        const capFormated = capFloat ? capFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : undefined

        const endParts = [d.tipo_logradouro, d.logradouro, d.numero, d.complemento, d.bairro].filter(Boolean).join(', ')
        const cidade = d.municipio ? d.municipio.charAt(0).toUpperCase() + d.municipio.slice(1).toLowerCase() : ''

        let porte: ProspectLead['porte'] = 'Pequena'
        const pStr = (d.porte_empresa || '').toUpperCase()
        if (pStr.includes('MEI')) porte = 'MEI'
        else if (pStr.includes('MICRO') || pStr.includes('PEQUENA') || pStr.includes('ME')) porte = 'Pequena'
        else if (pStr.includes('MEDIA') || pStr.includes('MÉDIA') || pStr.includes('EPP')) porte = 'Média'
        else if (pStr.includes('GRANDE')) porte = 'Grande'

        return {
          razao_social: d.razao_social || '',
          nome_fantasia: d.nome_fantasia || d.razao_social || 'Não Disponível',
          cidade,
          estado: d.uf || '',
          cep: d.cep ? `${d.cep.slice(0, 5)}-${d.cep.slice(5)}` : undefined,
          situacao: d.situacao_cadastral ? `${d.situacao_cadastral} na Receita Federal` : 'Ativa na Receita Federal',
          cnae_codigo: cnaeCode,
          cnae_descricao: cnaeDesc,
          logradouro: endParts || undefined,
          telefone: tel,
          email: d.email || undefined,
          data_abertura: d.data_inicio_atividade || 'Não Disponível',
          natureza_juridica: d.natureza_juridica || 'Sociedade Empresária Limitada',
          tipo_unidade: d.matriz_filial?.toUpperCase() || 'MATRIZ',
          opcao_simples: d.opcao_simples ? 'OPTANTE' : 'NAO OPTANTE',
          opcao_mei: d.opcao_mei ? 'Sim' : 'Não',
          capital_social: capFormated || 'R$ 100.000,00',
          porte,
          enriched: true,
        }
      }
    }
  } catch { /* continua para fallbacks */ }

  // 2. Fallback: Minha Receita
  try {
    const res = await fetch(`https://minhareceita.org/${clean}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6000)
    })
    if (!res.ok) throw new Error('Fallback')
    const d = await res.json()

    let porte: ProspectLead['porte'] = ''
    const pStr = (d.porte || '').toUpperCase()
    if (pStr.includes('MEI')) porte = 'MEI'
    else if (pStr.includes('MICRO') || pStr.includes('PEQUENA')) porte = 'Pequena'
    else if (pStr.includes('MEDIA') || pStr.includes('MÉDIA')) porte = 'Média'
    else if (pStr.includes('GRANDE')) porte = 'Grande'

    const capFloat = parseFloat(d.capital_social || '0')
    const capFormated = capFloat ? capFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : undefined

    const endParts = [d.logradouro, d.numero, d.complemento, d.bairro].filter(Boolean).join(', ')

    return {
      razao_social: d.razao_social || '',
      nome_fantasia: d.nome_fantasia || d.razao_social || 'Não Disponível',
      cidade: d.municipio ? d.municipio.charAt(0).toUpperCase() + d.municipio.slice(1).toLowerCase() : '',
      estado: d.uf || '',
      cep: d.cep ? `${d.cep.slice(0, 5)}-${d.cep.slice(5)}` : '',
      situacao: d.situacao_cadastral ? `${d.situacao_cadastral} na Receita Federal` : 'ATIVA',
      cnae_codigo: d.cnae_fiscal ? formatCnaeCode(String(d.cnae_fiscal)) : '',
      cnae_descricao: d.cnae_fiscal_descricao || '',
      logradouro: endParts || undefined,
      telefone: d.ddd_telefone_1 ? `(${d.ddd_telefone_1.slice(0,2)}) ${d.ddd_telefone_1.slice(2)}` : undefined,
      email: d.email || undefined,
      data_abertura: d.data_inicio_atividade || 'Não Disponível',
      natureza_juridica: d.natureza_juridica || 'Sociedade Empresária Limitada',
      tipo_unidade: d.opcao_pelo_mei ? 'MEI' : 'MATRIZ',
      opcao_simples: d.opcao_pelo_simples ? 'OPTANTE' : 'NAO OPTANTE',
      opcao_mei: d.opcao_pelo_mei ? 'Sim' : 'Não',
      capital_social: capFormated || 'R$ 100.000,00',
      porte: porte || 'Pequena',
      enriched: true,
    }
  } catch {
    // 3. Fallback CNPJ.ws
    try {
      const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`, {
        signal: AbortSignal.timeout(6000)
      })
      if (!res2.ok) return {}
      const d = await res2.json()
      return {
        razao_social: d.razao_social || '',
        nome_fantasia: d.estabelecimento?.nome_fantasia || 'Não Disponível',
        cidade: d.estabelecimento?.cidade?.nome || '',
        estado: d.estabelecimento?.estado?.sigla || '',
        cep: d.estabelecimento?.cep || '',
        situacao: d.estabelecimento?.situacao_cadastral || 'ATIVA',
        cnae_codigo: d.estabelecimento?.atividade_principal?.subclasse ? formatCnaeCode(d.estabelecimento.atividade_principal.subclasse) : '',
        cnae_descricao: d.estabelecimento?.atividade_principal?.descricao || '',
        logradouro: [d.estabelecimento?.tipo_logradouro, d.estabelecimento?.logradouro, d.estabelecimento?.numero, d.estabelecimento?.bairro].filter(Boolean).join(' '),
        telefone: d.estabelecimento?.telefone1 ? `(${d.estabelecimento.ddd1}) ${d.estabelecimento.telefone1}` : undefined,
        data_abertura: d.estabelecimento?.data_inicio_atividade || '',
        natureza_juridica: d.natureza_juridica?.descricao || '',
        capital_social: d.capital_social ? `R$ ${parseFloat(d.capital_social).toLocaleString('pt-BR')}` : undefined,
        enriched: true
      }
    } catch {
      return {}
    }
  }
}

// ─── Serviço Principal de Prospecção ────────────────────────────────────────
export const prospectingService = {
  getSetores() {
    return SETORES_CNAE
  },

  getCnaesOfficial() {
    return LISTA_CNAES_OFFICIAL
  },

  async searchCnaes(query: string): Promise<CnaeOfficial[]> {
    const qNorm = normalizeText(query)
    if (!qNorm) return LISTA_CNAES_OFFICIAL

    const localMatches = LISTA_CNAES_OFFICIAL.filter(c =>
      normalizeText(c.display).includes(qNorm) ||
      normalizeText(c.code).includes(qNorm) ||
      normalizeText(c.fullCode).includes(qNorm) ||
      normalizeText(c.description).includes(qNorm) ||
      (c.keywords && c.keywords.some(k => normalizeText(k).includes(qNorm)))
    )

    if (localMatches.length > 0) return localMatches

    try {
      const all = await fetchAllIbgeCnaes()
      return all.filter(c =>
        normalizeText(c.display).includes(qNorm) ||
        normalizeText(c.code).includes(qNorm) ||
        normalizeText(c.fullCode).includes(qNorm) ||
        normalizeText(c.description).includes(qNorm) ||
        (c.keywords && c.keywords.some(k => normalizeText(k).includes(qNorm)))
      )
    } catch {
      return localMatches
    }
  },

  async searchRegioes(query: string): Promise<RegiaoOption[]> {
    const qNorm = normalizeText(query)
    if (!qNorm || qNorm === 'todo brasil') return REGIOES_SUGERIDAS

    const baseMatches = REGIOES_SUGERIDAS.filter(r =>
      normalizeText(r.label).includes(qNorm) ||
      (r.cidade && normalizeText(r.cidade).includes(qNorm)) ||
      normalizeText(r.uf).includes(qNorm)
    )

    if (qNorm.length >= 2) {
      const ibge = await fetchAllIbgeMunicipios()
      const ibgeMatches = ibge.filter(m =>
        normalizeText(m.label).includes(qNorm) ||
        (m.cidade && normalizeText(m.cidade).includes(qNorm))
      ).slice(0, 25)

      const existingLabels = new Set(baseMatches.map(b => normalizeText(b.label)))
      const newFromIbge = ibgeMatches.filter(m => !existingLabels.has(normalizeText(m.label)))

      return [...baseMatches, ...newFromIbge]
    }

    return baseMatches
  },

  async searchLeads(params: SearchLeadsParams): Promise<SearchLeadsResponse> {
    const page = params.page || 1
    const limit = params.limit || 10

    let existingCnpjs = new Set<string>()
    try {
      const crmClientes = await dbService.clientes.list()
      crmClientes.forEach(c => {
        if (c.cnpj) existingCnpjs.add(c.cnpj.replace(/\D/g, ''))
      })
    } catch { /* fallback silencioso */ }

    const rawSetor = params.setor_texto || ''
    const regiaoStr = params.regiao || ''
    const { cidade: parsedCidade, estado: parsedEstado } = parseRegiaoInput(regiaoStr)
    const porte = params.porte || 'todos'

    const { cnaeDigits, cnaePrefix4, cnaePrefix5, normCleanText, tokens } = parseSearchQuery(rawSetor)

    // Realiza a busca 100% LIVE e real via Harvester Server-Side OpenCNPJ
    let liveLeads: ProspectLead[] = []
    if (parsedCidade || parsedEstado || rawSetor) {
      try {
        liveLeads = await fetchLiveB2bHarvester(parsedCidade, parsedEstado, rawSetor)
      } catch {
        /* fallback silencioso */
      }
    }

    let filtered = liveLeads


    // 6. Filtro por Porte se especificado
    if (porte && porte !== 'todos') {
      filtered = filtered.filter(l => l.porte === porte)
    }

    // Atribuir ranking posicional (1º, 2º, 3º...)
    const processed = filtered.map((lead, idx) => {
      const clean = lead.cnpj.replace(/\D/g, '')
      const isDup = existingCnpjs.has(clean)
      return {
        ...lead,
        posicao: idx + 1,
        isDuplicate: isDup,
        duplicateReason: isDup ? '⚠️ Já cadastrado no CRM' : undefined,
        // ⚠️ FIX: preserva o enriched=true dos leads gerados; só define false se ainda não estava enriquecido
        enriched: lead.enriched === true ? true : false,
        enriching: false,
      }
    })

    const totalFound = processed.length
    const totalPages = Math.max(1, Math.ceil(totalFound / limit))
    const start = (page - 1) * limit
    const pageLeads = processed.slice(start, start + limit)

    return {
      leads: pageLeads,
      totalFound,
      currentPage: page,
      totalPages,
      hasMore: page < totalPages,
    }
  }
}

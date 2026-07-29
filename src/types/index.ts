import { Target, Radio, RefreshCw, Briefcase, Car, FileText, CheckCircle, Trophy, XCircle, Handshake } from 'lucide-react'

export type UserRole = 'admin' | 'gestor' | 'vendedor' | 'representante' | 'financeiro'

export type DealStage =
  | 'leads'
  | 'prospect'
  | 'dinamica'
  | 'potencial'
  | 'visita'
  | 'briefing'
  | 'aprovacao'
  | 'fechamento'
  | 'pedido'
  | 'perdido'
  | 'pos_venda'

export type ActivityType =
  | 'email'
  | 'whatsapp'
  | 'ligacao'
  | 'visita'
  | 'follow_up'
  | 'nota'
  | 'stage_change'
  | 'arquivo'

export type ApprovalStep = 'amostra_branca' | 'prova_cor' | 'mockup'
export type ApprovalStatus = 'aguardando' | 'enviado' | 'aprovado' | 'reprovado'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  phone?: string
  active: boolean
  created_at: string
}

export interface Contact {
  id: string
  name: string
  company?: string
  role?: string
  email?: string
  phone?: string
  whatsapp?: string
  city?: string
  state?: string
  source?: string
  notes?: string
  curve?: 'A' | 'B' | 'C' | 'D'
  assigned_to?: string
  representative?: string
  assigned_profile?: Profile
  status?: string
  cnpj?: string
  street?: string
  neighborhood?: string
  cep?: string
  cnae?: string
  taxRegime?: string
  stateRegistration?: string
  website?: string
  instagram?: string
  linkedin?: string
  facebook?: string
  
  // Planejamento & Recompra
  projectedPurchaseValue?: number
  purchaseFrequencyDays?: number
  lastPurchaseDate?: string
  inactivityThresholdDays?: number
  planningNotes?: string
  
  // Histórico de Alterações Auditado
  history?: Array<{
    id: string
    date: string
    author: string
    action: string
    details: string
  }>
  
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  title: string
  contact_id: string
  contact?: Contact
  stage: DealStage
  assigned_to?: string
  assigned_profile?: Profile
  estimated_value?: number
  final_value?: number
  lost_reason?: string
  lost_notes?: string
  activities?: any[]
  budget?: any
  stage_entered_at: string
  expected_close_date?: string
  closed_at?: string
  position?: number
  created_at: string
  updated_at: string
}

export interface DealActivity {
  id: string
  deal_id: string
  type: ActivityType
  title?: string
  description?: string
  performed_by?: string
  performed_profile?: Profile
  performed_at: string
  metadata?: Record<string, unknown>
}

export interface FollowUp {
  id: string
  deal_id: string
  sequence_number: number
  type: 'email' | 'whatsapp' | 'ligacao'
  scheduled_at: string
  completed_at?: string
  status: 'pendente' | 'enviado' | 'respondido' | 'ignorado'
  notes?: string
  assigned_to?: string
}

export interface Briefing {
  id: string
  deal_id: string
  packaging_type?: string
  dimensions_l?: number
  dimensions_a?: number
  dimensions_p?: number
  grammage?: string
  paper_type?: string
  quantity?: number
  deadline_days?: number
  finishings?: string[]
  reference_notes?: string
  reference_files?: string[]
  cost_paper?: number
  cost_printing?: number
  cost_finishing?: number
  cost_cutting?: number
  cost_other?: number
  cost_total?: number
  margin_percent?: number
  sale_price?: number
  status: 'rascunho' | 'aguardando_custo' | 'orcamento_enviado'
  created_at: string
  updated_at: string
}

export interface Approval {
  id: string
  deal_id: string
  step: ApprovalStep
  status: ApprovalStatus
  file_urls?: string[]
  sent_at?: string
  approved_at?: string
  notes?: string
}

export interface KanbanColumn {
  id: DealStage
  label: string
  color: string
  icon: any
  deals: Deal[]
  showValue: boolean
}

export const STAGE_CONFIG: Record<DealStage, { label: string; color: string; icon: any; showValue: boolean }> = {
  leads:      { label: 'Leads / Banco',         color: '#555555', icon: Target, showValue: false },
  prospect:   { label: 'Prospect',               color: '#3b82f6', icon: Radio, showValue: false },
  dinamica:   { label: 'Dinâmica',               color: '#8b5cf6', icon: RefreshCw, showValue: false },
  potencial:  { label: 'Potencial / Negociação', color: '#f0c419', icon: Briefcase, showValue: false },
  visita:     { label: 'Visita',                 color: '#06b6d4', icon: Car, showValue: false },
  briefing:   { label: 'Briefing / Orçamento',   color: '#f97316', icon: FileText, showValue: true  },
  aprovacao:  { label: 'Aprovação',              color: '#a855f7', icon: CheckCircle, showValue: true  },
  fechamento: { label: 'Fechamento',             color: '#b4d932', icon: Trophy, showValue: true  },
  pedido:     { label: 'Pedido Fechado',         color: '#10b981', icon: CheckCircle, showValue: true  },
  perdido:    { label: 'Perdidos',               color: '#e2483d', icon: XCircle, showValue: true  },
  pos_venda:  { label: 'Pós-Vendas',             color: '#48c767', icon: Handshake, showValue: true  },
}

export const FOLLOW_UP_LOST_REASONS = [
  'Preço',
  'Prazo',
  'Concorrência',
  'Sem retorno',
  'Produto não adequado',
  'Outro',
]

export const CONTACT_SOURCES = [
  'Indicação',
  'Google',
  'Instagram',
  'Feiras e eventos',
  'Prospecção ativa',
  'WhatsApp',
  'Outro',
]

export const PACKAGING_TYPES = [
  'Caixa dobra cola',
  'Caixinha',
  'Display',
  'Bandeja',
  'Envelope',
  'Outro',
]

export const FINISHINGS = [
  'Verniz UV',
  'Verniz aquoso',
  'Laminação fosca',
  'Laminação brilho',
  'Hot stamping dourado',
  'Hot stamping prateado',
  'Relevo seco',
  'Janela com PET',
  'Corte especial',
]

export interface Appointment {
  id: string
  deal_id?: string
  deal_title?: string
  contact_name?: string
  company_name?: string
  title: string
  date: string
  time: string
  type: 'visita' | 'reuniao' | 'ligacao' | 'email' | 'proposta'
  notes?: string
  status: 'agendado' | 'concluido' | 'cancelado'
  created_at: string
  updated_at?: string
}

export interface UserGoal {
  id: string
  userId?: string
  userName: string
  year: string
  month: string // "01" - "12"
  salesGoal: number // R$
  visitsGoal: number // Qtd
  newClientsGoal: number // Qtd novos clientes com pedido fechado
  customWeeklySalesGoal?: number
  customDailySalesGoal?: number
  customWeeklyVisitsGoal?: number
  customDailyVisitsGoal?: number
  customWeeklyNewClientsGoal?: number
  customDailyNewClientsGoal?: number
  updatedAt?: string
}

export interface LossReason {
  id: string
  label: string
  description?: string
  active: boolean
  order: number
  isDefinitive?: boolean
}

export const DEFAULT_LOSS_REASONS: LossReason[] = [
  { id: '1', label: 'Preço alto', description: 'Orçamento pontual superior à verba do cliente (permite novo contato no futuro)', active: true, order: 1, isDefinitive: false },
  { id: '2', label: 'Prazo longo de entrega', description: 'Prazo industrial incompatível com esta negociação (permite novo contato no futuro)', active: true, order: 2, isDefinitive: false },
  { id: '3', label: 'Concorrência venceu', description: 'Cliente optou por outro fornecedor nesta cotação (permite novo contato no futuro)', active: true, order: 3, isDefinitive: false },
  { id: '4', label: 'Cliente desistiu do projeto', description: 'Projeto específico cancelado pelo cliente (permite novo contato no futuro)', active: true, order: 4, isDefinitive: false },
  { id: '5', label: 'Especificação técnica não atende', description: 'Incompatibilidade técnica para este lote (permite novo contato no futuro)', active: true, order: 5, isDefinitive: false },
  { id: '6', label: 'Sem orçamento/verba', description: 'Cliente sem verba no momento (permite novo contato no futuro)', active: true, order: 6, isDefinitive: false },
  { id: '7', label: 'Cliente é concorrente', description: 'Empresa concorrente ou incompatível (NÃO voltar a contatar comercialmente)', active: true, order: 7, isDefinitive: true },
  { id: '8', label: 'Outro motivo', description: 'Outras razões comerciais ou operacionais', active: true, order: 8, isDefinitive: false },
]

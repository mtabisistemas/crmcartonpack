-- ============================================================
-- CRM Carton Pack — Schema Inicial
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS (empresas usando o SaaS)
-- ============================================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'starter', -- starter | pro | enterprise
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PROFILES (usuários vinculados a tenants)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor', -- admin | vendedor | representante
  avatar_url TEXT,
  phone TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CONTACTS (leads / banco de clientes)
-- ============================================================
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  role TEXT, -- cargo
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  city TEXT,
  state TEXT,
  source TEXT, -- indicação | google | instagram | feiras | prospecção ativa | outro
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEALS (negócios no pipeline)
-- ============================================================
CREATE TYPE deal_stage AS ENUM (
  'leads',          -- Leads / Banco
  'prospect',       -- Prospect
  'dinamica',       -- Dinâmica (follow-ups)
  'potencial',      -- Potencial / Negociação
  'visita',         -- Visita
  'briefing',       -- Briefing / Orçamento
  'aprovacao',      -- Aprovação
  'fechamento',     -- Fechamento
  'perdido',        -- Perdidos
  'pos_venda'       -- Pós-Vendas
);

CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contact_id UUID NOT NULL REFERENCES contacts(id),
  stage deal_stage NOT NULL DEFAULT 'leads',
  assigned_to UUID REFERENCES profiles(id),
  
  -- Valor (aparece a partir do briefing/orçamento)
  estimated_value NUMERIC(12,2),
  final_value NUMERIC(12,2),
  
  -- Dados de perda
  lost_reason TEXT, -- preço | prazo | concorrência | sem_retorno | outro
  lost_notes TEXT,
  
  -- Controle de tempo
  stage_entered_at TIMESTAMPTZ DEFAULT NOW(),
  expected_close_date DATE,
  closed_at TIMESTAMPTZ,
  
  position INTEGER DEFAULT 0, -- ordem no kanban
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEAL ACTIVITIES (histórico de interações)
-- ============================================================
CREATE TYPE activity_type AS ENUM (
  'email',
  'whatsapp',
  'ligacao',
  'visita',
  'follow_up',
  'nota',
  'stage_change',
  'arquivo'
);

CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type activity_type NOT NULL,
  title TEXT,
  description TEXT,
  performed_by UUID REFERENCES profiles(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB, -- dados extras (ex: stage anterior/novo, arquivo url)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- FOLLOW-UPS
-- ============================================================
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL DEFAULT 1, -- 1, 2 ou 3
  type TEXT NOT NULL, -- email | whatsapp | ligacao
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | enviado | respondido | ignorado
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VISITS (visitas agendadas)
-- ============================================================
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  result TEXT, -- resultado da visita
  materials_sent BOOLEAN DEFAULT FALSE,
  assigned_to UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BRIEFINGS (formulário técnico de embalagens)
-- ============================================================
CREATE TABLE briefings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID UNIQUE NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dados do produto
  packaging_type TEXT, -- caixa dobra cola | caixinha | display | outro
  dimensions_l NUMERIC(8,2), -- largura cm
  dimensions_a NUMERIC(8,2), -- altura cm
  dimensions_p NUMERIC(8,2), -- profundidade cm
  grammage TEXT, -- gramatura do papel
  paper_type TEXT, -- tipo de papel
  quantity INTEGER,
  deadline_days INTEGER,
  
  -- Acabamentos (array)
  finishings TEXT[], -- verniz | laminação | hot stamping | relevo | janela | outro
  
  -- Referências
  reference_notes TEXT,
  reference_files TEXT[], -- URLs dos arquivos no storage
  
  -- Custos (preenchido após análise)
  cost_paper NUMERIC(12,2),
  cost_printing NUMERIC(12,2),
  cost_finishing NUMERIC(12,2),
  cost_cutting NUMERIC(12,2),
  cost_other NUMERIC(12,2),
  cost_total NUMERIC(12,2),
  margin_percent NUMERIC(5,2),
  sale_price NUMERIC(12,2),
  
  -- Status
  status TEXT DEFAULT 'rascunho', -- rascunho | aguardando_custo | orcamento_enviado
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- APPROVALS (processo de aprovação em 3 sub-etapas)
-- ============================================================
CREATE TYPE approval_step AS ENUM (
  'amostra_branca',
  'prova_cor',
  'mockup'
);

CREATE TYPE approval_status AS ENUM (
  'aguardando',
  'enviado',
  'aprovado',
  'reprovado'
);

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step approval_step NOT NULL,
  status approval_status NOT NULL DEFAULT 'aguardando',
  file_urls TEXT[], -- URLs dos arquivos enviados
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT, -- observações do cliente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(deal_id, step)
);

-- ============================================================
-- CLOSINGS (fechamentos)
-- ============================================================
CREATE TABLE closings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID UNIQUE NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  final_value NUMERIC(12,2) NOT NULL,
  payment_terms TEXT, -- condições de pagamento
  signed_at DATE,
  po_number TEXT, -- número do pedido
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- POST SALES (pós-vendas)
-- ============================================================
CREATE TABLE post_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  satisfaction_score INTEGER CHECK (satisfaction_score BETWEEN 1 AND 5),
  delivery_notes TEXT,
  reorder_opportunity BOOLEAN DEFAULT FALSE,
  next_contact_date DATE,
  notes TEXT,
  website TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_deals_tenant_stage ON deals(tenant_id, stage);
CREATE INDEX idx_deals_assigned_to ON deals(assigned_to);
CREATE INDEX idx_deals_contact ON deals(contact_id);
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_activities_deal ON deal_activities(deal_id);
CREATE INDEX idx_follow_ups_deal ON follow_ups(deal_id);
CREATE INDEX idx_follow_ups_scheduled ON follow_ups(scheduled_at) WHERE completed_at IS NULL;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_sales ENABLE ROW LEVEL SECURITY;

-- Política base: usuário só acessa dados do seu tenant
CREATE POLICY "tenant_isolation" ON contacts
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON deals
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON deal_activities
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON follow_ups
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON visits
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON briefings
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON approvals
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON closings
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_isolation" ON post_sales
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Profiles: usuário vê só seu tenant
CREATE POLICY "view_own_tenant_profiles" ON profiles
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_briefings_updated_at BEFORE UPDATE ON briefings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_approvals_updated_at BEFORE UPDATE ON approvals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_post_sales_updated_at BEFORE UPDATE ON post_sales FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 002 — Rastreamento de atividade do usuário (último acesso / localização)
--
-- A tela "Gestão de Equipe e Usuários" exibe as colunas "Último Acesso"
-- e "Última Localização", e o ActivityTracker envia um heartbeat a cada
-- 60s para /api/users (PATCH). Esse PATCH sempre falhou em produção com
-- "Could not find the 'last_seen_at' column of 'profiles' in the schema
-- cache" — as colunas nunca existiram no schema. O erro era engolido no
-- cliente, então os dois campos ficavam eternamente vazios na tela.
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_location TEXT;

-- Ordenar/filtrar a equipe por atividade recente é o uso natural da tela.
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen_at
  ON profiles (last_seen_at DESC NULLS LAST);

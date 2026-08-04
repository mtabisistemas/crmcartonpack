-- ============================================================
-- 003 — Contexto da captura de localização
--
-- "Última Localização" mostrava apenas "Não capturada", sem distinguir
-- entre o usuário ter negado a permissão, o aparelho não conseguir a
-- posição, ou a localização simplesmente ainda não ter sido coletada.
-- Também não havia como saber se o endereço exibido era de agora ou de
-- vários dias atrás.
--
-- last_location_at    -> quando aquele endereço foi capturado
-- last_location_status-> ok | denied | unavailable | timeout | unsupported
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_location_status TEXT;

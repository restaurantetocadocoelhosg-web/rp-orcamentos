-- =====================================================================
-- Migração Fase 2.5 — Inventário (contagem física)
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- Histórico das contagens. O ajuste em si usa a RPC registrar_movimento_estoque
-- (tipo 'ajuste', origem 'inventario') — só nos itens efetivamente contados.
-- =====================================================================

create table if not exists rp_inventarios (
  id uuid primary key default gen_random_uuid(),
  numero text,
  itens jsonb,                       -- [{product_id, nome, sistema, contado, diferenca}]
  total_itens int default 0,
  total_diferenca numeric(12,2) default 0,
  user_name text,
  created_at timestamptz default now()
);

alter table rp_inventarios enable row level security;
drop policy if exists rp_inventarios_all on rp_inventarios;
create policy rp_inventarios_all on rp_inventarios for all to anon, authenticated using (true) with check (true);
grant all on rp_inventarios to anon, authenticated;

notify pgrst, 'reload schema';

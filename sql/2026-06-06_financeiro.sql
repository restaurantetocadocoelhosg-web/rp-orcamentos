-- =====================================================================
-- Migração Fase 2.4 — Financeiro: Contas a Pagar / Receber
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- =====================================================================

create table if not exists rp_contas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,                 -- 'pagar' | 'receber'
  descricao text not null,
  parte text,                         -- fornecedor (pagar) ou cliente (receber)
  valor numeric(12,2) not null,
  vencimento date,
  pago boolean default false,
  pago_em date,
  categoria text,
  forma text,                         -- pix | dinheiro | cartao | boleto | transferencia
  origem text default 'manual',       -- manual | venda | pedido | os
  origem_id uuid,
  user_name text,
  created_at timestamptz default now()
);
create index if not exists idx_contas_tipo_venc on rp_contas(tipo, pago, vencimento);

alter table rp_contas enable row level security;
drop policy if exists rp_contas_all on rp_contas;
create policy rp_contas_all on rp_contas for all to anon, authenticated using (true) with check (true);
grant all on rp_contas to anon, authenticated;

notify pgrst, 'reload schema';

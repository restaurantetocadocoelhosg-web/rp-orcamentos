-- =====================================================================
-- Migração Fase 2.3 — Caixa: conferência de fechamento + sangria/suprimento
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- =====================================================================

-- Novos campos no fechamento do caixa
alter table rp_caixa add column if not exists valor_contado    numeric(12,2);
alter table rp_caixa add column if not exists diferenca        numeric(12,2);
alter table rp_caixa add column if not exists total_dinheiro   numeric(12,2) default 0;
alter table rp_caixa add column if not exists total_pix        numeric(12,2) default 0;
alter table rp_caixa add column if not exists total_cartao     numeric(12,2) default 0;
alter table rp_caixa add column if not exists total_sangria    numeric(12,2) default 0;
alter table rp_caixa add column if not exists total_suprimento numeric(12,2) default 0;

-- Movimentos de caixa (sangria = retirada, suprimento = reforço)
create table if not exists rp_caixa_mov (
  id uuid primary key default gen_random_uuid(),
  caixa_id uuid not null,
  tipo text not null,             -- 'sangria' | 'suprimento'
  valor numeric(12,2) not null,
  motivo text,
  user_name text,
  created_at timestamptz default now()
);
create index if not exists idx_caixamov_caixa on rp_caixa_mov(caixa_id, created_at);

-- RLS pública (mesmo padrão das outras tabelas rp_*)
alter table rp_caixa_mov enable row level security;
drop policy if exists rp_caixa_mov_all on rp_caixa_mov;
create policy rp_caixa_mov_all on rp_caixa_mov for all to anon, authenticated using (true) with check (true);
grant all on rp_caixa_mov to anon, authenticated;

notify pgrst, 'reload schema';

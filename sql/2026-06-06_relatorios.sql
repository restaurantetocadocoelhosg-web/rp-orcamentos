-- =====================================================================
-- Migração Fase 2.6 — Relatórios: RPC de resumo de estoque (server-side)
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- Evita baixar os ~3918 produtos no celular só p/ somar valor em estoque.
-- =====================================================================

create or replace function resumo_estoque()
returns table(valor_estoque numeric, itens_baixo bigint, total_itens bigint)
language sql stable
as $$
  select
    coalesce(sum(estoque_atual * custo_medio), 0)::numeric,
    count(*) filter (where coalesce(estoque_minimo,0) > 0 and coalesce(estoque_atual,0) <= estoque_minimo),
    count(*)
  from rp_products
  where ativo = true;
$$;

grant execute on function resumo_estoque() to anon, authenticated;
notify pgrst, 'reload schema';

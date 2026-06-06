-- =====================================================================
-- Migração Fase 2.1 — Estoque: kardex atômico + custo médio
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- Como rodar: Supabase → SQL Editor → cole tudo → Run. É idempotente.
-- Depois de rodar, o app passa AUTOMATICAMENTE a usar a baixa atômica
-- (o front detecta a RPC; até então usa o método antigo como fallback).
-- =====================================================================

-- 1) Colunas de custo em produtos
alter table rp_products
  add column if not exists preco_custo numeric(12,2) default 0,
  add column if not exists custo_medio numeric(12,4) default 0;

-- 2) Custo/origem no kardex
alter table rp_stock_moves
  add column if not exists custo_unit numeric(12,4) default 0,
  add column if not exists origem text,
  add column if not exists origem_id uuid;

-- 3) Índices
create index if not exists idx_moves_product on rp_stock_moves(product_id, created_at desc);

-- 4) RPC ATÔMICA: registra movimento + atualiza saldo e custo médio sob trava de linha.
--    SECURITY INVOKER (padrão): roda com a role do chamador; como a RLS de rp_products /
--    rp_stock_moves é public(true), a chave anon consegue executar. A atomicidade vem do
--    FOR UPDATE + transação implícita da função.
create or replace function registrar_movimento_estoque(
  p_product_id uuid,
  p_tipo text,                 -- 'entrada' | 'saida' | 'ajuste'
  p_quantidade numeric,        -- entrada/saida: delta (>0); ajuste: saldo final desejado
  p_custo_unit numeric default 0,
  p_motivo text default null,
  p_origem text default 'manual',
  p_origem_id uuid default null,
  p_user_name text default null,
  p_permitir_negativo boolean default true
) returns rp_stock_moves
language plpgsql
as $$
declare
  v_prod rp_products%rowtype;
  v_antes numeric;
  v_depois numeric;
  v_qtd_mov numeric;
  v_custo_medio numeric;
  v_move rp_stock_moves;
begin
  select * into v_prod from rp_products where id = p_product_id for update;
  if not found then raise exception 'Produto % inexistente', p_product_id; end if;

  v_antes := coalesce(v_prod.estoque_atual, 0);
  v_custo_medio := coalesce(v_prod.custo_medio, 0);

  if p_tipo = 'entrada' then
    v_qtd_mov := abs(p_quantidade);
    v_depois  := v_antes + v_qtd_mov;
    if v_depois > 0 and p_custo_unit > 0 then
      v_custo_medio := ((v_antes * v_custo_medio) + (v_qtd_mov * p_custo_unit)) / v_depois;
    end if;
  elsif p_tipo = 'saida' then
    v_qtd_mov := abs(p_quantidade);
    v_depois  := v_antes - v_qtd_mov;
    if v_depois < 0 and not p_permitir_negativo then
      raise exception 'Estoque insuficiente: saldo %, saida %', v_antes, v_qtd_mov;
    end if;
  elsif p_tipo = 'ajuste' then
    v_depois  := p_quantidade;
    v_qtd_mov := v_depois - v_antes;
  else
    raise exception 'Tipo invalido: %', p_tipo;
  end if;

  update rp_products
     set estoque_atual = v_depois,
         custo_medio   = v_custo_medio
   where id = p_product_id;

  insert into rp_stock_moves(
    product_id, product_nome, tipo, quantidade, estoque_antes, estoque_depois,
    custo_unit, motivo, origem, origem_id, user_name)
  values(
    p_product_id, v_prod.nome, p_tipo, v_qtd_mov, v_antes, v_depois,
    coalesce(nullif(p_custo_unit,0), v_custo_medio), p_motivo, p_origem, p_origem_id, p_user_name)
  returning * into v_move;

  return v_move;
end;
$$;

-- 5) Permissão de execução (anon = chave pública do app; authenticated p/ futuro)
grant execute on function registrar_movimento_estoque(uuid,text,numeric,numeric,text,text,uuid,text,boolean) to anon, authenticated;

-- 6) Recarrega o cache de schema do PostgREST p/ a RPC aparecer na API na hora
notify pgrst, 'reload schema';

-- =====================================================================
-- TESTE RÁPIDO (opcional) — troque o UUID por um produto real:
--   select * from registrar_movimento_estoque(
--     '00000000-0000-0000-0000-000000000000', 'entrada', 10, 2.00, 'teste', 'manual', null, 'admin');
-- =====================================================================

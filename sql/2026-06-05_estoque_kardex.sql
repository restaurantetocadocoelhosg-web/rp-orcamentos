-- =====================================================================
-- Migração Fase 2.1 — Estoque: kardex atômico + custo médio
-- Projeto Supabase: zuwdgyvbuaocbzckhhlm
-- RODAR EM 3 PASSOS SEPARADOS no SQL Editor (cole e Run um de cada vez).
-- O editor roda em transação única; em 3 passos, um erro não desfaz os outros.
-- =====================================================================


-- ----------------------------------------------------------------- PASSO 1
-- Colunas novas (idempotente). preco_custo já existe, então não mexemos nele.
alter table rp_products    add column if not exists custo_medio numeric(12,4) default 0;
alter table rp_stock_moves add column if not exists custo_unit  numeric(12,4) default 0;
alter table rp_stock_moves add column if not exists origem      text;
alter table rp_stock_moves add column if not exists origem_id   uuid;
create index if not exists idx_moves_product on rp_stock_moves(product_id, created_at desc);


-- ----------------------------------------------------------------- PASSO 2
-- RPC atômica (rode SÓ DEPOIS do Passo 1, pois ela usa as colunas novas).
create or replace function registrar_movimento_estoque(
  p_product_id uuid,
  p_tipo text,
  p_quantidade numeric,
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


-- ----------------------------------------------------------------- PASSO 3
-- Permissão + recarrega o cache da API (rode SÓ DEPOIS do Passo 2).
grant execute on function registrar_movimento_estoque(uuid,text,numeric,numeric,text,text,uuid,text,boolean) to anon, authenticated;
notify pgrst, 'reload schema';


-- ----------------------------------------------------------------- TESTE (opcional)
-- Troque o UUID por um produto real (pegue um id na aba Produtos):
--   select estoque_antes, estoque_depois, custo_unit
--   from registrar_movimento_estoque(
--     'COLE-UM-ID-AQUI'::uuid, 'entrada', 10, 2.00, 'teste', 'manual', null, 'admin');

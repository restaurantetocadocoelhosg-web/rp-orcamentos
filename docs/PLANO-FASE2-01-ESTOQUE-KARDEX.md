# Plano de Implementação — Fase 2.1: Estoque (Kardex atômico + Custo médio)

> Plano executável. **Constrói em cima** do módulo de estoque já existente
> (`rp_products`, `rp_stock_moves`), corrige a falha de concorrência e adiciona custo médio.
> Pré-requisito/alicerce das demais entregas da Fase 2 (PDV confiável, inventário, relatórios de lucro).

## 1. Diagnóstico do que já existe

**Tabelas em uso (Supabase)**
- `rp_products`: `id, codigo, nome, preco_venda, estoque_atual, estoque_minimo, ncm, unidade, ativo`.
- `rp_stock_moves`: `product_id, product_nome, tipo(entrada/saida/ajuste), quantidade, estoque_antes,
  estoque_depois, motivo, user_name, created_at`. ✅ Kardex já registrado.

**Onde está o problema (no código atual)**
- PDV (`pdvConfirmarPagamento`) e modal de estoque (`stock-form submit`) fazem **no front**:
  1. lêem `estoque_atual` (valor em memória/STATE),
  2. calculam `estoque_depois = antes ± qtd`,
  3. `sbPatch rp_products.estoque_atual` + `sbInsert rp_stock_moves`.
- ⚠️ **Race condition (read-modify-write):** duas operações concorrentes no mesmo produto sobrescrevem o
  saldo — venda some, contagem fica errada. Sem transação nem trava de linha.
- ⚠️ **Sem custo:** não há `preco_custo`/`custo_medio` → impossível calcular lucro bruto (relatório pedido).
- ⚠️ **Confiança no cliente:** a chave anon do front pode gravar saldo arbitrário (RLS public).

## 2. Objetivo

1. **Atomicidade:** todo movimento de estoque vira **uma transação no banco** (Postgres RPC) que trava a
   linha do produto, recalcula o saldo e grava o kardex — sem race.
2. **Custo médio móvel:** entradas atualizam `custo_medio`; saídas registram o custo do momento → base de lucro.
3. **Servidor como porta:** front chama **endpoint do Express**, que chama a RPC — o cliente não escreve mais
   saldo direto.
4. **Kardex como verdade:** `estoque_atual` passa a ser **resultado** dos movimentos (nunca editado à mão).

## 3. Migração de banco (SQL — rodar no Supabase)

```sql
-- 3.1 Colunas de custo em produtos
alter table rp_products
  add column if not exists preco_custo numeric(12,2) default 0,
  add column if not exists custo_medio numeric(12,4) default 0;

-- 3.2 Colunas de custo/origem no kardex
alter table rp_stock_moves
  add column if not exists custo_unit numeric(12,4) default 0,   -- custo no momento do movimento
  add column if not exists origem text,                          -- 'pdv'|'compra'|'inventario'|'manual'|'os'
  add column if not exists origem_id uuid;

-- 3.3 Índices p/ kardex e busca
create index if not exists idx_moves_product on rp_stock_moves(product_id, created_at desc);
create index if not exists idx_products_busca on rp_products using gin (to_tsvector('simple', coalesce(nome,'') || ' ' || coalesce(codigo,'')));

-- 3.4 RPC ATÔMICA: registra movimento + atualiza saldo e custo médio sob trava de linha
create or replace function registrar_movimento_estoque(
  p_product_id uuid,
  p_tipo text,                 -- 'entrada' | 'saida' | 'ajuste'
  p_quantidade numeric,        -- ajuste: valor ABSOLUTO desejado de saldo; entrada/saida: delta
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
  -- trava a linha do produto até o fim da transação (resolve a race)
  select * into v_prod from rp_products where id = p_product_id for update;
  if not found then raise exception 'Produto % inexistente', p_product_id; end if;

  v_antes := coalesce(v_prod.estoque_atual, 0);
  v_custo_medio := coalesce(v_prod.custo_medio, 0);

  if p_tipo = 'entrada' then
    v_qtd_mov := abs(p_quantidade);
    v_depois  := v_antes + v_qtd_mov;
    -- custo médio móvel: ponderado pela quantidade
    if v_depois > 0 and p_custo_unit > 0 then
      v_custo_medio := ((v_antes * v_custo_medio) + (v_qtd_mov * p_custo_unit)) / v_depois;
    end if;
  elsif p_tipo = 'saida' then
    v_qtd_mov := abs(p_quantidade);
    v_depois  := v_antes - v_qtd_mov;
    if v_depois < 0 and not p_permitir_negativo then
      raise exception 'Estoque insuficiente: saldo % , saída %', v_antes, v_qtd_mov;
    end if;
  elsif p_tipo = 'ajuste' then
    v_depois  := p_quantidade;                 -- ajuste define o saldo final
    v_qtd_mov := v_depois - v_antes;           -- delta (pode ser negativo)
  else
    raise exception 'Tipo inválido: %', p_tipo;
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
```

> **Observação de segurança:** idealmente revogar `update` direto em `rp_products.estoque_atual` para a role
> `anon` e permitir alteração de saldo **apenas via RPC** (chamada pelo servidor com a service key). Fase
> seguinte de endurecimento de RLS — não bloqueia esta entrega.

## 4. Backend (Express — `server.js`)

Adicionar endpoint que chama a RPC com a **service role key** (nunca expor no front):

```js
// env: SUPA_URL, SUPA_SERVICE (service_role key) — só no servidor
app.post('/api/estoque/movimento', requireAuth, async (req, res) => {
  const { product_id, tipo, quantidade, custo_unit, motivo, origem, origem_id, permitir_negativo } = req.body || {};
  if (!product_id || !['entrada','saida','ajuste'].includes(tipo) || quantidade == null)
    return res.status(400).json({ error: 'Dados inválidos.' });
  try {
    const r = await fetch(`${process.env.SUPA_URL}/rest/v1/rpc/registrar_movimento_estoque`, {
      method: 'POST',
      headers: { apikey: process.env.SUPA_SERVICE, Authorization: 'Bearer ' + process.env.SUPA_SERVICE, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_product_id: product_id, p_tipo: tipo, p_quantidade: Number(quantidade),
        p_custo_unit: Number(custo_unit) || 0, p_motivo: motivo || null,
        p_origem: origem || 'manual', p_origem_id: origem_id || null,
        p_user_name: (req.user && req.user.name) || null,
        p_permitir_negativo: permitir_negativo !== false
      })
    });
    const d = await r.json();
    if (!r.ok) return res.status(400).json({ error: (d && d.message) || 'Falha no movimento.' });
    res.json({ ok: true, move: d });
  } catch (e) { res.status(500).json({ error: 'Erro ao registrar movimento.' }); }
});
```

**Venda PDV:** para várias linhas, o endpoint pode receber um array e chamar a RPC item a item dentro de um
loop (cada chamada é atômica por produto). Evolução: uma RPC `registrar_venda(itens jsonb)` que faz tudo em
uma transação só — Fase 2.2 (vendas).

## 5. Front (`index.html`) — trocar read-modify-write por chamada ao endpoint

- **`pdvConfirmarPagamento`:** remover o par `sbPatch(rp_products,…estoque_atual)` + `sbInsert(rp_stock_moves)`.
  Para cada item do carrinho, chamar `POST /api/estoque/movimento` com
  `{product_id, tipo:'saida', quantidade: qty, origem:'pdv', origem_id: vendaId, motivo:'Venda '+numero}`.
  Atualizar `STATE.products[idx].estoque_atual` com o `estoque_depois` retornado.
- **Modal de estoque (`stock-form`):** idem — chamar o endpoint com `tipo` entrada/saida/ajuste; no ajuste,
  `quantidade` = saldo final desejado. Campo novo **Custo unit. (R$)** quando `tipo='entrada'`.
- **Fallback offline:** se o endpoint falhar (sem rede), enfileirar o movimento em `localStorage` e
  reprocessar ao reconectar (vendedor externo). Sinalizar "pendente de sincronizar".

## 6. Casos de teste (aceite)

1. **Concorrência:** dois `POST /movimento` saída simultâneos do mesmo produto (saldo 10, saída 6 e 6) →
   resultado final **−2** com 2 movimentos coerentes (ou bloqueio se `permitir_negativo=false`), **nunca** 4.
2. **Custo médio:** entra 10 @ R$2 (médio=2), entra 10 @ R$4 (médio=3,00). Saída registra `custo_unit=3,00`.
3. **Ajuste:** saldo 7 → ajuste para 5 grava movimento `ajuste`, `quantidade=-2`, saldo final 5.
4. **Kardex:** aba Estoque lista os movimentos em ordem; saldo de cada produto = último `estoque_depois`.
5. **Lucro:** relatório usa `preco_venda − custo_unit` por item vendido.

## 7. Passos de execução (ordem)

1. Rodar SQL da Seção 3 no Supabase (idempotente).
2. Adicionar `SUPA_SERVICE` (service_role key) nas envs do Railway. **Não** ir pro front.
3. Implementar `/api/estoque/movimento` (Seção 4) + `requireAuth`.
4. Refatorar `pdvConfirmarPagamento` e `stock-form` (Seção 5).
5. Adicionar campo **Custo unit.** no modal de estoque (entrada) e em produtos (`preco_custo`).
6. Testar os 5 casos (Seção 6) em produção controlada.
7. Bump SW (v20) + commit + push (auto-deploy).
8. (Opcional, endurecimento) revogar update direto de saldo p/ anon.

## 8. Sequência do restante da Fase 2 (próximos planos)

- **2.2 Vendas atômicas** — RPC `registrar_venda(itens jsonb)` (estoque + financeiro + caixa numa transação).
- **2.3 Caixa + fechamento** — `rp_caixas`, sangria/suprimento, conferência, trava retroativa.
- **2.4 Contas a pagar/receber** — `rp_contas`, baixa, vencimentos, cobrança WhatsApp, fluxo de caixa.
- **2.5 Inventário robusto** — usar a RPC de ajuste; "a verificar" sem zerar; reconstrução cronológica.
- **2.6 Comissões/metas + Auditoria** — `rp_logs` (insert-only) com antes/depois nas operações sensíveis.

---

*Plano executável da fundação de estoque. Próximo a detalhar: 2.2 (vendas atômicas) ou 2.3 (caixa).*

# RP Gestão — Casa RP Resistências · Resumo de Módulos e Versões

> Estado do sistema em **2026-06-06**. Versão atual: **v25**.
> App: PWA + Supabase (Postgres/REST) + Express (Railway) + jsPDF + IA (Claude).
> No ar: **Railway** https://rp-orcamentos-production.up.railway.app (completo, com IA e login)
> e **GitHub Pages** (estático, sem IA/login de servidor).

---

## 1. Módulos (todos funcionando)

| Módulo | O que faz | Acesso |
|---|---|---|
| **Orçamentos** | Criar (manual ou IA), PDF padrão Casa RP, enviar WhatsApp/e-mail, aprovar → vira pedido | Todos (perm. criar) |
| **Serviço / OS** | Ordem de serviço com agenda, prazo de entrega (+3 dias), atraso em vermelho | Todos |
| **Pedidos** | Acompanha aprovados: fabricação/estoque/pronto, recibo, marcar recebido, comissão | Todos |
| **Clientes** | Cadastro, busca, WhatsApp, histórico | Perm. ver_clientes |
| **Cobranças** | Orçamentos não aprovados por idade (7d/15d), cobrar no WhatsApp, lista pro dono | Todos |
| **Comissões** | Por vendedor, a pagar/pago (Pix), 1–20% por venda, devida quando o cliente paga | Perm. ver_comissoes |
| **🤖 IA** | Pergunta sobre orçamentos/pedidos em linguagem natural | Perm. usar_ia · só no Railway |
| **🛒 PDV / Balcão** | Carrinho, busca produto, desconto, pagamento (pix/dinheiro/cartão), troco, cupom | Todos |
| **🧾 Caixa** | Abertura, **sangria/suprimento**, **fechamento com conferência** (esperado × contado, diferença) | No PDV |
| **📦 Produtos (catálogo)** | ~3.918 itens (Shop9): CRUD, **categoria, margem, custo, código de barras**, estoque mínimo | Todos |
| **📊 Estoque** | Entrada/saída/ajuste **atômicos** (RPC), **custo médio**, alerta de baixo, **inventário** | Todos |
| **📋 Inventário** | Contagem física; ajusta só o contado — **nunca zera o não contado** | No Estoque |
| **💰 Financeiro** | Contas a **pagar/receber**, vencimentos, saldo previsto | **Só admin** |
| **📈 Relatórios** | Vendas por período, **lucro bruto**, forma de pagamento, mais vendidos, estoque | **Só admin** |
| **ADM** | Usuários, papéis e **permissões granulares** | **Só admin** |

> **Abas só de admin** (Financeiro, Relatórios, ADM): entre com o login **`casarp`** para vê-las.

---

## 2. Histórico de versões (Service Worker)

| Versão | Data | O que entrou |
|---|---|---|
| **v18** | base | Núcleo: orçamentos, serviço, pedidos, clientes, cobranças, comissões, IA, ADM, e o módulo **PDV/Produtos/Estoque** (catálogo Shop9, controle de estoque, caixa simples) |
| **v19** | 06-05 | **Redesign visual** — identidade navy `#1B3A6B` + âmbar `#F59E0B` (marca real), selo CSS, cabeçalho, abas, cards, login; saiu do marrom/creme antigo |
| **v20** | 06-06 | **Estoque atômico + custo médio** — RPC `registrar_movimento_estoque` (trava de linha; fim da race condition de venda simultânea) |
| **v21** | 06-06 | **Caixa** — sangria/suprimento + fechamento com conferência (quebra por forma de pagamento, esperado em dinheiro, diferença sobra/falta) |
| **v22** | 06-06 | **Financeiro** — contas a pagar/receber + saldo previsto |
| **v23** | 06-06 | **Inventário robusto** — contagem que ajusta só o contado, nunca zera o não contado |
| **v24** | 06-06 | **Relatórios** — lucro bruto, mais vendidos, forma de pagamento, estoque (RPC `resumo_estoque`) |
| **v25** | 06-06 | **Fix catálogo** — editar não zera mais custo/estoque; categoria, margem ao vivo, busca por código de barras |

---

## 3. Banco de dados (Supabase — projeto `zuwdgyvbuaocbzckhhlm`)

**Tabelas**
- `rp_quotes` · orçamentos · `rp_orders` · pedidos · `rp_services` · ordens de serviço
- `rp_clients` · clientes · `rp_users` · logins/papéis/permissões
- `rp_products` · catálogo (id, codigo, codigo_barras, nome, **categoria**, preco_venda, preco_custo, **custo_medio**, ncm, unidade, estoque_atual, estoque_minimo, ativo)
- `rp_stock_moves` · kardex (entrada/saida/ajuste, custo_unit, origem)
- `rp_pdv_vendas` · vendas do balcão · `rp_caixa` · caixas (abertura/fechamento/conferência) · `rp_caixa_mov` · sangria/suprimento
- `rp_contas` · contas a pagar/receber · `rp_inventarios` · histórico de inventários

**Funções (RPC)**
- `registrar_movimento_estoque(...)` — movimento de estoque **atômico** (FOR UPDATE) + custo médio móvel
- `resumo_estoque()` — soma valor em estoque / itens baixos no servidor

**Migrações aplicadas** (`/sql/`)
- `2026-06-05_estoque_kardex.sql` · `2026-06-06_caixa.sql` · `2026-06-06_financeiro.sql`
- `2026-06-06_inventario.sql` · `2026-06-06_relatorios.sql` · `2026-06-06_produtos_categoria.sql`

---

## 4. Regras de negócio já garantidas
- **Estoque em tempo real e atômico** — sem race condition em vendas simultâneas; todo movimento vira kardex.
- **Custo médio móvel** — entradas com custo atualizam o custo; base do lucro nos relatórios.
- **Inventário seguro** — item não contado **nunca** é zerado (lição dos "fantasmas").
- **Caixa conferido** — fechamento compara esperado × contado e mostra sobra/falta.
- **Comissão só quando o cliente paga** (Pix), 1–20% por venda.
- **Permissões** revalidadas no servidor; vendedor vê só o que é dele (salvo `ver_todos`).

## 5. Próximos passos sugeridos (ainda não feitos)
- **Auditoria/logs** — registrar quem cancelou/editou/excluiu (tabela `rp_logs` insert-only).
- **Alertas proativos** — estoque baixo / contas vencendo no WhatsApp (n8n/cron).
- **2.2 venda atômica** — endurecimento opcional (o PDV já é atômico por item).
- **Lançar custos** dos produtos para o lucro e o valor em estoque aparecerem nos relatórios.
- **Emissão fiscal (NF-e/NFC-e)** — via provedor homologado (Fase 3 do levantamento).

---

*Documentos relacionados: `REQUISITOS-SISTEMA-GESTAO.md` (levantamento completo) e os planos em `/docs`.*

# Levantamento de Requisitos — Sistema de Gestão Comercial "RP Gestão"

> **Documento técnico para desenvolvimento.** Especifica um ERP comercial **original** com
> funções *equivalentes* às de um sistema de gestão de varejo/indústria de pequeno porte.
> Nome de trabalho do produto: **RP Gestão** (substituível). Negócio-base: **Casa RP Resistências**
> (fabricação de resistências elétricas sob encomenda + venda de balcão de peças/produtos).

## Nota de originalidade (clean-room)
Este documento foi construído **somente** a partir de (a) conhecimento público sobre ERPs comerciais
brasileiros, (b) o fluxo de negócio do próprio cliente e (c) o app já existente (PWA + Supabase).
**Não** houve decompilação, extração de código, cópia de telas, layout, textos, banco de dados, ícones
ou identidade visual de qualquer software de terceiros. Onde uma função é comum a sistemas de mercado,
ela é descrita como **“função equivalente”** e reescrita como requisito próprio. O produto final terá
**marca, navegação, arquitetura e identidade visual próprias** (navy `#1B3A6B` + âmbar `#F59E0B`).

---

## 1. Visão geral do sistema

**Para que serve o app**
Plataforma única (PWA + mobile) para **gestão comercial completa** de uma micro/pequena empresa que
**fabrica sob encomenda e/ou revende**: do orçamento à venda, passando por estoque, financeiro, fiscal
e relatórios. Substitui planilhas, cadernos e múltiplos apps soltos por um sistema central.

**Objetivo principal**
Centralizar **venda + estoque + financeiro + fiscal** em tempo real, com **rastreabilidade** (quem fez o
quê), **mobilidade** (vendedor externo no celular) e **decisão por dados** (relatórios e IA assistiva),
mantendo simplicidade de uso para equipe não-técnica.

**Perfil de usuário**
| Perfil | Uso típico |
|---|---|
| **Administrador/Dono** | Vê tudo, configura, gerencia equipe, finanças, fecha caixa, aprova. |
| **Gerente** | Operação diária, relatórios, compras, sem dados sensíveis de folha. |
| **Vendedor interno (balcão)** | PDV, orçamentos, pedidos, consulta estoque. |
| **Vendedor externo (mobile)** | Orçamentos/pedidos em campo, vê só os próprios, comissões. |
| **Caixa/Financeiro** | Caixa, sangria/suprimento, contas a pagar/receber, conciliação. |
| **Estoquista** | Entradas, saídas, inventário, etiquetas. |

**Tipos de empresa que podem usar**
Lojas de varejo, oficinas e assistências, fabricantes sob encomenda (caso Casa RP), distribuidoras
pequenas, prestadores de serviço com venda de peças, comércios híbridos (produto + serviço).

---

## 2. Módulos principais

| # | Módulo | Prioridade |
|---|---|---|
| 1 | Dashboard inicial | Essencial |
| 2 | Cadastros (núcleo) | Essencial |
| 3 | Produtos | Essencial |
| 4 | Serviços / Ordens de Serviço | Essencial |
| 5 | Clientes | Essencial |
| 6 | Fornecedores | Importante |
| 7 | Funcionários | Importante |
| 8 | Usuários e permissões | Essencial |
| 9 | Vendas | Essencial |
| 10 | PDV / Balcão | Essencial |
| 11 | Orçamentos | Essencial |
| 12 | Pedidos | Essencial |
| 13 | Estoque | Essencial |
| 14 | Entrada de mercadorias | Importante |
| 15 | Saída de mercadorias | Importante |
| 16 | Inventário / Contagem | Importante |
| 17 | Compras | Importante |
| 18 | Contas a pagar | Importante |
| 19 | Contas a receber | Importante |
| 20 | Caixa | Essencial |
| 21 | Fluxo de caixa | Importante |
| 22 | Relatórios | Essencial → evolui |
| 23 | Emissão fiscal (NF-e/NFC-e) | Futura (Fase 3) |
| 24 | Integrações | Futura |
| 25 | Configurações gerais | Essencial |
| 26 | Backup | Importante |
| 27 | Auditoria e logs | Importante |
| 28 | Aplicativo mobile | Importante |

---

## 3. Detalhamento por módulo

> Formato por módulo: **Objetivo · Funções · Campos · Ações · Regras · Permissões · Relatórios · Integrações · Prioridade.**

### 3.1 Dashboard inicial
- **Objetivo:** visão imediata do dia/mês para decisão rápida.
- **Funções:** indicadores (vendas do dia/mês, ticket médio, a receber, a pagar, caixa atual), alertas
  (estoque baixo, contas vencendo, orçamentos a cobrar, OS atrasadas), atalhos rápidos, mini-gráficos.
- **Campos exibidos:** total vendido (período), nº de vendas, top 5 produtos, saldo de caixa, comissões a pagar.
- **Ações:** filtrar período, abrir atalho (nova venda, novo orçamento), clicar alerta → vai ao item.
- **Regras:** vendedor vê só os próprios números; admin vê consolidado.
- **Permissões:** todos (escopo conforme papel).
- **Relatórios:** resumo de vendas, fluxo de caixa simplificado.
- **Integrações:** WhatsApp (enviar resumo), IA (perguntas em linguagem natural).
- **Prioridade:** Essencial.

### 3.2 Cadastros (núcleo)
- **Objetivo:** ponto único para entidades-base (categorias, unidades, formas de pagamento, condições, NCM).
- **Funções:** CRUD de tabelas auxiliares; importação CSV; busca; ativar/inativar (nunca apagar histórico).
- **Campos:** nome, código, tipo, ativo, observação.
- **Regras:** registro usado em transação **não é excluído**, só inativado.
- **Permissões:** admin/gerente.
- **Prioridade:** Essencial.

### 3.3 Produtos
- **Objetivo:** catálogo central de itens vendáveis/fabricáveis/estocáveis.
- **Funções:** CRUD, busca por nome/código/código de barras, variações (grade), produto composto (kit/ficha
  técnica), preço de custo e venda, margem, estoque mínimo, foto, apelidos/aliases para busca inteligente.
- **Campos:** `código interno`, `código de barras (EAN)`, `descrição`, `categoria`, `unidade`, `NCM`,
  `preço custo`, `preço venda`, `margem`, `estoque atual`, `estoque mínimo`, `fornecedor padrão`, `foto`,
  `tipo (simples/composto/serviço/fabricado)`, `aliases[]`, `ativo`.
- **Ações:** novo, editar, inativar, duplicar, ajustar preço em lote, imprimir etiqueta, ver histórico.
- **Regras:** preço de venda ≥ custo (alerta se abaixo); composto calcula custo pela soma dos componentes;
  estoque ≤ mínimo dispara alerta; aliases evitam ambiguidade na busca/IA *(lição já vivida no app)*.
- **Permissões:** admin/gerente edita; vendedor consulta.
- **Relatórios:** mais vendidos, baixo estoque, por categoria, curva ABC.
- **Integrações:** leitor de código de barras, importação Shop9→CSV (migração de dados próprios).
- **Prioridade:** Essencial.

### 3.4 Serviços / Ordens de Serviço (OS)
- **Objetivo:** gerir trabalhos/fabricação sob encomenda (núcleo da Casa RP).
- **Funções:** abrir OS, agenda por data, prazo de entrega (padrão +3 dias, configurável), status
  (aberto/em fabricação/pronto/entregue), vínculo a cliente e vendedor, valor, anexos/foto.
- **Campos:** `nº OS`, `cliente`, `descrição`, `data serviço`, `data entrega`, `valor`, `status`, `vendedor`.
- **Ações:** criar, editar, marcar entregue/reabrir, avisar no WhatsApp, gerar PDF, excluir.
- **Regras:** OS atrasada (entrega < hoje e não entregue) destacada em vermelho; entrega gera baixa de
  insumos se houver ficha técnica.
- **Prioridade:** Essencial.

### 3.5 Clientes
- **Objetivo:** base de relacionamento e crédito.
- **Funções:** CRUD, busca multi-termo, histórico de compras/orçamentos, limite de crédito, indicações.
- **Campos:** `nome/razão`, `CPF/CNPJ`, `telefone/WhatsApp`, `e-mail`, `endereço`, `tipo (PF/PJ)`,
  `limite de crédito`, `indicado por`, `observações`, `ativo`.
- **Ações:** novo, editar, inativar, abrir WhatsApp, ver histórico, ver saldo devedor.
- **Regras:** telefone normalizado com DDI 55 p/ link wa.me *(bug já corrigido)*; CNPJ valida dígito.
- **Permissões:** conforme `ver_clientes`.
- **Relatórios:** clientes mais ativos, inadimplentes, aniversariantes.
- **Prioridade:** Essencial.

### 3.6 Fornecedores
- **Objetivo:** gestão de quem abastece a empresa.
- **Campos:** `razão`, `CNPJ`, `contato`, `telefone`, `e-mail`, `produtos fornecidos`, `prazo médio`, `ativo`.
- **Funções:** CRUD, vínculo a produtos e compras, histórico de preços.
- **Relatórios:** compras por fornecedor, melhor preço por item.
- **Prioridade:** Importante.

### 3.7 Funcionários
- **Objetivo:** dados de equipe, metas e comissões (distinto de "usuário do sistema").
- **Campos:** `nome`, `cargo`, `admissão`, `comissão padrão %`, `meta mensal`, `chave Pix`, `ativo`.
- **Funções:** CRUD, vínculo ao usuário de login, painel de metas/comissão.
- **Relatórios:** desempenho, comissões, metas atingidas.
- **Prioridade:** Importante.

### 3.8 Usuários e permissões
- **Objetivo:** controle de acesso seguro e granular.
- **Funções:** CRUD de logins, papéis (admin/gerente/vendedor/caixa/estoquista), **permissões por toggle**
  (criar/editar/excluir/aprovar/ver_comissões/ver_clientes/usar_ia/ver_todos…), ativar/desativar.
- **Campos:** `username`, `hash de senha (scrypt/bcrypt)`, `nome`, `papel`, `permissões (jsonb)`, `ativo`.
- **Regras:** senha nunca em texto; sessão assinada (HMAC); desativado → sessão invalida na hora; vendedor
  vê só os próprios registros salvo `ver_todos`.
- **Permissões:** só admin gerencia.
- **Prioridade:** Essencial *(já parcialmente implementado no app)*.

### 3.9 Vendas
- **Objetivo:** registro de toda saída comercial (balcão, orçamento aprovado, OS faturada).
- **Funções:** criar venda, itens, desconto, forma de pagamento, vínculo cliente/vendedor, status
  (aberta/finalizada/cancelada), gerar comprovante.
- **Campos:** `nº`, `data`, `cliente`, `vendedor`, `itens[]`, `subtotal`, `desconto`, `total`,
  `forma_pagamento`, `status`, `comissão %`.
- **Regras:** finalizar venda **baixa estoque** e **lança financeiro**; cancelamento exige permissão e
  **estorna estoque + financeiro** com log; desconto acima de X% pede aprovação.
- **Relatórios:** por período, vendedor, forma de pagamento, produto.
- **Prioridade:** Essencial.

### 3.10 PDV / Balcão
- **Objetivo:** venda rápida no balcão.
- **Funções:** busca de produto (código de barras/nome), carrinho, quantidade, desconto, múltiplas formas
  de pagamento, cálculo de troco, finalização, recibo/cupom, sangria/suprimento integrados ao caixa.
- **Ações:** adicionar/remover item, aplicar desconto, escolher pagamento, confirmar venda, imprimir/compartilhar.
- **Regras:** venda só com caixa **aberto**; baixa de estoque automática; bloqueio de item sem saldo (config).
- **Prioridade:** Essencial *(já existe módulo PDV no app — evoluir).*

### 3.11 Orçamentos
- **Objetivo:** proposta formal antes da venda (forte na Casa RP).
- **Funções:** criar (manual ou **preenchimento por IA**), itens, validade (15 dias), gerar PDF padronizado,
  enviar por WhatsApp/e-mail, aprovar → vira pedido/venda, cobrança por idade (7d/15d).
- **Campos:** `nº ORC`, `cliente`, `itens[]`, `total`, `validade`, `status`, `vendedor`, `comissão %`, `foto`.
- **Regras:** aprovar gera pedido com sinal 30%; orçamento não aprovado entra na régua de cobrança.
- **Prioridade:** Essencial *(já implementado — manter).*

### 3.12 Pedidos
- **Objetivo:** acompanhar o que foi aprovado até a entrega.
- **Funções:** status (fabricação/estoque/pronto/entregue), marcar "recebido/pago", recibo, comissão.
- **Regras:** "pago" libera comissão como "a pagar"; entrega encerra o ciclo.
- **Prioridade:** Essencial.

### 3.13 Estoque
- **Objetivo:** saldo em tempo real e rastreabilidade.
- **Funções:** saldo por produto, kardex (histórico de movimentos), alertas de mínimo, custo médio,
  multi-depósito (futuro), reserva por pedido.
- **Regras:** **todo movimento é log** (entrada/saída/ajuste); item não contado em inventário **nunca é
  zerado automaticamente** — é sinalizado p/ conferência *(lição crítica já vivida)*.
- **Prioridade:** Essencial.

### 3.14 Entrada de mercadorias
- **Objetivo:** registrar compras/recebimentos que aumentam estoque.
- **Funções:** entrada manual, por XML de NF-e (futuro), por compra; atualiza custo; vincula fornecedor.
- **Campos:** `produto`, `qtd`, `custo unit`, `fornecedor`, `documento`, `data`.
- **Prioridade:** Importante.

### 3.15 Saída de mercadorias
- **Objetivo:** saídas não-venda (perda, consumo, transferência, brinde).
- **Campos:** `produto`, `qtd`, `motivo`, `responsável`, `data`.
- **Regras:** exige motivo; gera log; afeta saldo.
- **Prioridade:** Importante.

### 3.16 Inventário / Contagem
- **Objetivo:** conciliar físico × sistema.
- **Funções:** abrir inventário, contagem por categoria/geral, comparativo, ajuste com justificativa,
  reconstrução cronológica de saldo, detecção de "fantasmas" (entrada sem saída).
- **Regras:** **não zerar automaticamente** o não contado; sempre marcar "a verificar" + alerta.
- **Prioridade:** Importante *(redesenho já entregue no app de estoque — reaproveitar lições).*

### 3.17 Compras
- **Objetivo:** ciclo de aquisição (cotação → pedido → recebimento).
- **Funções:** pedido de compra, cotação multi-fornecedor, aprovação, gera entrada + conta a pagar.
- **Prioridade:** Importante.

### 3.18 Contas a pagar
- **Campos:** `descrição`, `fornecedor`, `valor`, `vencimento`, `status`, `categoria`, `pagamento`.
- **Funções:** lançar, parcelar, baixar (pago), recorrência, alerta de vencimento.
- **Relatórios:** a pagar por período/fornecedor/categoria.
- **Prioridade:** Importante.

### 3.19 Contas a receber
- **Campos:** `cliente`, `origem (venda/OS)`, `valor`, `vencimento`, `status`, `forma`.
- **Funções:** gerar a partir de venda a prazo, baixar, cobrança WhatsApp, juros/multa (config).
- **Prioridade:** Importante.

### 3.20 Caixa
- **Objetivo:** controle do dinheiro do balcão por turno.
- **Funções:** abertura (fundo de troco), sangria, suprimento, fechamento com conferência, diferença.
- **Regras:** uma venda PDV exige caixa aberto; fechamento gera relatório e trava edição retroativa.
- **Prioridade:** Essencial.

### 3.21 Fluxo de caixa
- **Objetivo:** entradas × saídas projetadas e realizadas.
- **Funções:** visão diária/semanal/mensal, saldo projetado, categorias (DRE simplificado).
- **Prioridade:** Importante.

### 3.22 Relatórios
- Ver **Seção 8** (lista completa). Filtros por período/vendedor/categoria; exportar PDF/CSV; gráficos.
- **Prioridade:** Essencial (cresce por fase).

### 3.23 Emissão fiscal (NF-e / NFC-e)
- **Objetivo:** documento fiscal legal.
- **Funções:** emitir NF-e/NFC-e via provedor homologado (ex.: Focus NFe, NFe.io, PlugNotas — **API**, sem
  reimplementar SEFAZ), gestão de NCM/CFOP/CST, certificado A1, contingência, cancelamento, carta de correção.
- **Regras:** faturamento mínimo p/ NF (R$ 1.000 na Casa RP), NCM padrão 85168010, numeração/série controladas.
- **Prioridade:** **Futura (Fase 3)** — começa por integração, não por implementação própria do fisco.

### 3.24 Integrações
- Ver **Seção 9**. **Prioridade:** Futura.

### 3.25 Configurações gerais
- Dados da empresa, logo, condições padrão, alíquotas, formas de pagamento, numeração de documentos,
  parâmetros de estoque/desconto, usuários, tema. **Prioridade:** Essencial.

### 3.26 Backup
- **Funções:** backup automático do banco (Supabase PITR), export manual (CSV/JSON), restauração testada.
- **Regras:** backup diário; retenção configurável; export sob demanda do admin.
- **Prioridade:** Importante.

### 3.27 Auditoria e logs
- **Funções:** registro imutável de quem/quando/o quê (login, venda, cancelamento, ajuste de estoque,
  alteração de preço, exclusão). Filtro por usuário/entidade/data.
- **Prioridade:** Importante.

### 3.28 Aplicativo mobile
- **Funções:** PWA instalável (já existe) + foco offline-first para vendedor externo; sincroniza ao
  reconectar; câmera p/ foto de produto; leitura de código de barras.
- **Prioridade:** Importante.

---

## 4. Fluxos de uso (passo a passo)

**4.1 Cadastro de produto**
1. Produtos → "Novo" → 2. Preenche descrição, categoria, unidade, NCM → 3. Custo e preço (margem
auto) → 4. Estoque inicial e mínimo → 5. Foto/código de barras/aliases → 6. Salvar → log + disponível na busca.

**4.2 Cadastro de cliente**
1. Clientes → "Novo" → 2. Nome, CPF/CNPJ, telefone (normaliza 55) → 3. Endereço/e-mail → 4. (Opcional)
limite de crédito, "indicado por" → 5. Salvar → disponível em vendas/orçamentos.

**4.3 Entrada de nota/mercadoria**
1. Estoque → Entrada → 2. Seleciona fornecedor + documento → 3. Adiciona produtos (qtd, custo) → 4.
(Futuro) importa XML da NF-e → 5. Confirmar → saldo sobe, custo médio atualiza, gera Conta a Pagar (se a prazo).

**4.4 Venda no balcão (PDV)**
1. Abre caixa (fundo de troco) → 2. PDV → busca produto (código de barras) → 3. Carrinho (qtd/desconto)
→ 4. Forma de pagamento (troco se dinheiro) → 5. Confirmar → baixa estoque + lança recebimento + recibo → 6. Compartilha/imprime.

**4.5 Venda com orçamento**
1. Orçamentos → "Novo" (ou IA preenche) → 2. Itens + comissão + validade → 3. Gera PDF → envia WhatsApp/e-mail
→ 4. Cliente aceita → "Aprovar" → vira Pedido (sinal 30%) → 5. Fabricação/separação → 6. Entrega + "Recebido"
→ comissão "a pagar".

**4.6 Baixa de estoque**
- Automática na finalização de venda/PDV/entrega de OS com ficha técnica; ou manual (Saída) com motivo.
Cada baixa grava movimento no kardex.

**4.7 Fechamento de caixa**
1. Caixa → Fechar → 2. Sistema soma vendas por forma → 3. Operador informa contagem física → 4. Mostra
diferença (sobra/falta) → 5. Confirma → relatório de fechamento + caixa travado.

**4.8 Conta a pagar**
1. Financeiro → A Pagar → "Nova" → 2. Fornecedor, valor, vencimento, categoria, parcelas → 3. Salvar →
alerta no vencimento → 4. "Baixar" ao pagar → entra no fluxo de caixa.

**4.9 Conta a receber**
1. Gerada por venda a prazo (auto) ou manual → 2. Vencimento e forma → 3. Cobrança WhatsApp na régua →
4. "Receber" ao quitar → fluxo de caixa.

**4.10 Emissão de nota fiscal (Fase 3)**
1. Venda finalizada → "Emitir NF" → 2. Sistema valida NCM/CFOP/CST + faturamento mínimo → 3. Envia ao
provedor (API) → 4. Recebe XML+DANFE/autorização → 5. Compartilha com cliente; cancelamento/CC-e quando preciso.

**4.11 Relatório de vendas**
1. Relatórios → Vendas → 2. Filtra período/vendedor/forma → 3. Visualiza tabela+gráfico → 4. Exporta PDF/CSV
ou envia resumo no WhatsApp.

**4.12 Inventário de estoque**
1. Estoque → Inventário → "Abrir" → 2. Conta por categoria → 3. Sistema compara físico×sistema → 4. Não
contados → "a verificar" (**não zera**) → 5. Ajusta com justificativa → 6. Fecha inventário (log).

**4.13 Cadastro de funcionário**
1. Funcionários → "Novo" → 2. Cargo, admissão, comissão %, meta, Pix → 3. (Opcional) cria login vinculado
→ 4. Define permissões → 5. Salvar.

**4.14 Controle de metas e comissões**
1. Define meta mensal por funcionário → 2. Vendas/pedidos pagos acumulam → 3. Painel mostra %atingido e
comissão "a pagar" → 4. Admin marca "Pix pago" → vira "pago" (log).

**4.15 Uso por vendedor interno**
Login → Dashboard (seus números) → PDV/Orçamento → fecha venda → acompanha pedidos/comissões próprios.

**4.16 Uso por vendedor externo/mobile**
Login no PWA instalado → cria orçamento offline em campo → sincroniza ao reconectar → envia PDF por
WhatsApp → acompanha aprovação e comissão; vê **apenas os próprios** registros.

---

## 5. Banco de dados (proposta — PostgreSQL/Supabase)

> Convenções: `id uuid pk`, `created_at timestamptz default now()`, soft-delete via `ativo boolean`.
> RLS por empresa/usuário. Valores monetários `numeric(12,2)`.

### usuarios
| Campo | Tipo | Obs |
|---|---|---|
| id | uuid PK | |
| username | text unique | login |
| pass_hash | text | scrypt/bcrypt — **nunca** texto |
| nome | text | |
| papel | text | admin/gerente/vendedor/caixa/estoquista |
| funcionario_id | uuid FK→funcionarios | vínculo opcional |
| ativo | bool | desativado invalida sessão |
- **Rel.:** 1—N com vendas/orçamentos (vendedor). **Obs.:** auditoria referencia `usuario_id`.

### permissoes
| id uuid PK · usuario_id uuid FK · chave text · valor bool |
- Alternativa: coluna `perms jsonb` em `usuarios` (modelo atual do app). **Obs.:** granular por toggle.

### categorias
| id uuid PK · nome text · pai_id uuid FK(self) · ativo bool |
- **Rel.:** 1—N produtos. **Obs.:** hierarquia opcional.

### produtos
| id uuid PK · codigo text · ean text · descricao text · categoria_id FK · unidade text · ncm text ·
preco_custo numeric · preco_venda numeric · estoque_atual numeric · estoque_min numeric · fornecedor_id FK ·
tipo text(simples/composto/servico/fabricado) · foto text · aliases text[] · ativo bool |
- **Rel.:** N—1 categoria/fornecedor; N—N componentes (produto composto). **Obs.:** índice por `ean`/`codigo`/`aliases`.

### produto_componentes (ficha técnica / kit)
| id PK · produto_pai_id FK · produto_filho_id FK · quantidade numeric |
- **Obs.:** custo do composto = soma; baixa explode componentes.

### clientes
| id uuid PK · nome text · doc text(CPF/CNPJ) · tipo text(PF/PJ) · telefone text · email text · endereco jsonb ·
limite_credito numeric · indicado_por uuid FK(self) · obs text · ativo bool |
- **Rel.:** 1—N vendas/orçamentos/contas_receber. **Obs.:** telefone normalizado (55).

### fornecedores
| id uuid PK · razao text · cnpj text · contato text · telefone text · email text · prazo_medio int · ativo bool |
- **Rel.:** 1—N produtos/compras/contas_pagar.

### funcionarios
| id uuid PK · nome text · cargo text · admissao date · comissao_default numeric · meta_mensal numeric ·
pix text · usuario_id FK · ativo bool |

### vendas
| id uuid PK · numero text · tipo text(balcao/orcamento/os) · cliente_id FK · vendedor_id FK · data timestamptz ·
subtotal numeric · desconto numeric · total numeric · forma_pagamento text · status text(aberta/finalizada/cancelada) ·
comissao_pct numeric · caixa_id FK |
- **Rel.:** 1—N itens_venda/pagamentos; N—1 cliente/vendedor/caixa.

### itens_venda
| id uuid PK · venda_id FK · produto_id FK · descricao text · quantidade numeric · preco_unit numeric ·
desconto numeric · total numeric |
- **Obs.:** snapshot de descrição/preço (histórico imutável mesmo se produto mudar).

### estoque (saldo) / ou view derivada de movimentações
| produto_id PK FK · deposito_id FK · saldo numeric · custo_medio numeric · atualizado_em timestamptz |
- **Obs.:** saldo pode ser **materializado** a partir de `movimentacoes_estoque`.

### movimentacoes_estoque (kardex)
| id uuid PK · produto_id FK · tipo text(entrada/saida/ajuste) · quantidade numeric · saldo_apos numeric ·
origem text(venda/compra/inventario/manual) · origem_id uuid · motivo text · usuario_id FK · data timestamptz |
- **Obs.:** **fonte da verdade** do estoque; nunca editar, só inserir.

### compras
| id uuid PK · numero text · fornecedor_id FK · data date · status text(cotacao/pedido/recebido) · total numeric |
- **Rel.:** 1—N itens_compra; gera entrada + conta_pagar.

### contas_pagar
| id uuid PK · descricao text · fornecedor_id FK · valor numeric · vencimento date · pago bool · pago_em date ·
categoria text · compra_id FK · recorrencia text |

### contas_receber
| id uuid PK · cliente_id FK · origem text · origem_id uuid · valor numeric · vencimento date · recebido bool ·
recebido_em date · forma text |

### caixas
| id uuid PK · operador_id FK · abertura timestamptz · fundo_troco numeric · fechamento timestamptz ·
saldo_informado numeric · saldo_sistema numeric · diferenca numeric · status text(aberto/fechado) |
- **Rel.:** 1—N pagamentos/sangrias.

### caixa_movimentos (sangria/suprimento)
| id uuid PK · caixa_id FK · tipo text(sangria/suprimento) · valor numeric · motivo text · usuario_id FK · data |

### pagamentos
| id uuid PK · venda_id FK · caixa_id FK · forma text(dinheiro/pix/cartao/boleto) · valor numeric ·
troco numeric · data timestamptz |

### notas_fiscais
| id uuid PK · venda_id FK · modelo text(NFe/NFCe) · numero text · serie text · chave text(44) · status text ·
xml text · danfe_url text · emitida_em timestamptz |
- **Obs.:** integração via provedor; armazenar retorno, não reimplementar fisco.

### relatorios (configurações salvas / agendamentos)
| id uuid PK · nome text · tipo text · filtros jsonb · usuario_id FK · agendado bool |
- **Obs.:** relatórios são **gerados por query**; esta tabela guarda presets/agendas.

### logs (auditoria)
| id uuid PK · usuario_id FK · acao text · entidade text · entidade_id uuid · antes jsonb · depois jsonb ·
ip text · data timestamptz |
- **Obs.:** imutável (insert-only); base da Seção 6 (histórico de alterações).

---

## 6. Regras comerciais importantes

- **Estoque em tempo real:** todo movimento grava em `movimentacoes_estoque` e recalcula saldo; nada de
  edição direta de saldo. Venda finalizada baixa; cancelada estorna.
- **Grade/lote/série/variação:** variação como produto-filho com atributos (cor, tamanho, voltagem);
  lote/série em tabela própria com validade/garantia quando aplicável (resistências: voltagem/potência).
- **Produto simples × composto:** composto explode componentes na venda (baixa cada um); custo somado.
- **Venda com desconto:** percentual ou valor; acima do limite por papel → **aprovação**; desconto logado.
- **Venda cancelada:** exige permissão + motivo; estorna estoque e financeiro; mantém registro (não apaga).
- **Troca/devolução:** gera movimento de entrada (devolução) + crédito/estorno; vincula à venda original.
- **Comissão por vendedor:** % de 1–20% por orçamento/venda; **devida só quando o cliente paga**; pagamento
  via Pix; painel "a pagar/pago"; admin quita.
- **Metas por funcionário:** meta mensal; progresso por vendas pagas; alerta de atingimento.
- **Sangria/suprimento:** registrados no caixa com motivo e responsável; afetam saldo do turno.
- **Fechamento diário:** consolida vendas/recebimentos; trava edição retroativa; gera relatório.
- **Controle de permissões:** papel + toggles; servidor revalida a cada request (não confiar no front).
- **Histórico de alterações:** `logs` com antes/depois para entidades sensíveis (preço, estoque, venda, usuário).
- **Backup de segurança:** diário automático + export manual; restauração testada periodicamente.
- **Item não contado em inventário:** **nunca zerar** — marcar "a verificar" + alerta (lição já vivida).

---

## 7. Telas do aplicativo (UX própria)

> Identidade própria: navy `#1B3A6B` + âmbar `#F59E0B`, navegação por abas/segmento, cards arredondados,
> selo "CASA RP" em CSS. Mobile-first (PWA).

| Tela | Objetivo | Componentes | Ações | Dados | UX |
|---|---|---|---|---|---|
| **Login** | Acesso seguro | Selo, usuário, senha | Entrar | — | Fundo navy, erro inline |
| **Dashboard** | Visão do dia | Cards-indicador, alertas, atalhos, mini-gráfico | Filtrar período, abrir atalho | Vendas, a receber/pagar, caixa | Números grandes, alertas no topo |
| **Produtos** | Catálogo | Busca, lista, modal cadastro | Novo/editar/etiqueta | Código, preço, saldo | Busca instantânea, foto |
| **PDV/Balcão** | Venda rápida | Busca, carrinho, teclado pagamento | Add item, desconto, finalizar | Itens, total, troco | Botões grandes, 1 mão |
| **Orçamentos** | Propostas | Lista, modal (IA), PDF | Criar, aprovar, enviar | Cliente, total, validade | Atalho IA destacado |
| **Pedidos** | Acompanhamento | Lista com status | Mudar status, recibo, pago | Status, comissão | Cores por status |
| **Ordens de Serviço** | Fabricação | Agenda por data | Abrir, entregar, avisar | Prazo, status | Atrasado em vermelho |
| **Clientes** | Relacionamento | Busca, lista, histórico | Novo, WhatsApp, ver compras | Contato, saldo | Card com ações rápidas |
| **Estoque** | Saldo/kardex | Lista, alertas, histórico | Entrada/saída/ajuste | Saldo, mínimo, movimentos | Alerta de baixo destacado |
| **Inventário** | Contagem | Lista contagem, comparativo | Contar, ajustar, fechar | Físico×sistema | "A verificar" claro |
| **Financeiro** | Pagar/Receber | Abas, lista, vencimentos | Lançar, baixar, cobrar | Vencidos, totais | Vermelho p/ vencido |
| **Caixa** | Turno | Abertura, sangria, fechamento | Abrir/fechar, sangria | Saldo, diferença | Confirmar dupla |
| **Relatórios** | Análise | Filtros, tabela, gráficos | Gerar, exportar, enviar | Conforme relatório | Export PDF/CSV |
| **Comissões** | Metas/pagamento | Por vendedor, a pagar/pago | Marcar pago | Valor, status | Agrupado por pessoa |
| **IA/Assistente** | Perguntas | Campo, sugestões, resposta | Perguntar | Dados visíveis | Sugestões rápidas |
| **ADM/Usuários** | Equipe | Lista, modal, toggles perm. | Criar/editar/desativar | Papel, permissões | Checkboxes claros |
| **Configurações** | Parâmetros | Seções, formulários | Salvar | Empresa, alíquotas | Agrupado por tema |

---

## 8. Relatórios necessários

| Relatório | Filtros | Saída |
|---|---|---|
| Vendas por período | data, tipo | tabela + gráfico linha |
| Vendas por vendedor | período, vendedor | ranking |
| Vendas por forma de pagamento | período | pizza |
| Produtos mais vendidos | período, categoria | top-N + curva ABC |
| Produtos com baixo estoque | categoria | lista de reposição |
| Estoque por categoria | — | valor em estoque |
| Lucro bruto | período | receita − custo (margem) |
| Contas a pagar | período, status, fornecedor | agenda |
| Contas a receber | período, status, cliente | inadimplência |
| Fluxo de caixa | período | entradas×saídas, saldo projetado |
| Fechamento de caixa | data, operador | conferência |
| Comissão de vendedores | período | a pagar/pago |
| Desempenho por funcionário | período | meta×realizado |
| Clientes mais ativos | período | ranking |
| Fornecedores | período | compras por fornecedor |
| Compras por período | período | tabela |
| Fiscal / notas emitidas | período, status | livro auxiliar |

Todos: **exportar PDF/CSV** e **enviar resumo no WhatsApp**.

---

## 9. Integrações futuras

| Integração | Como (sem reimplementar terceiros) | Fase |
|---|---|---|
| **WhatsApp** | wa.me (links) + API (Evolution/Cloud API) p/ alertas/cobrança | 1–2 (parcial já existe) |
| **Emissão fiscal** | Provedor homologado via API (Focus NFe/PlugNotas/NFe.io) | 3 |
| **Meios de pagamento** | Gateway/Pix (Mercado Pago, PagBank, Stripe) — link/QR | 3 |
| **Marketplace** | Hub (Bling/Tiny-like) ou API direta — futuro | 5 |
| **E-commerce** | Sincronização de catálogo/estoque via API | 5 |
| **Backup em nuvem** | Supabase PITR + export agendado (Drive/S3) | 2 |
| **Contabilidade** | Export SPED/CSV p/ contador | 4 |
| **Leitor de código de barras** | Câmera (PWA) / leitor USB-HID | 1–2 |
| **Impressora térmica** | ESC/POS via Web Bluetooth/USB ou app ponte | 4 |
| **Balança** | Integração por etiqueta de peso (EAN-13 peso) | 5 |
| **App mobile** | PWA instalável (já) + push | 4 |
| **Delivery** | API de logística/iFood-like | 5 |

---

## 10. Roadmap de desenvolvimento

**Fase 1 — MVP essencial** *(grande parte já existe no app)*
Login + permissões · Produtos · Clientes · Orçamentos (PDF/IA) · Pedidos · PDV básico · Estoque básico ·
Caixa simples · Dashboard inicial · WhatsApp por link.

**Fase 2 — Gestão completa**
Estoque com kardex/custo médio · Inventário robusto · Entrada/Saída · Compras · Fornecedores · Contas a
pagar/receber · Fluxo de caixa · Sangria/suprimento/fechamento · Comissões e metas · Auditoria/logs · Backup.

**Fase 3 — Fiscal e integrações**
NF-e/NFC-e via provedor · Gateway de pagamento/Pix · Configuração fiscal (NCM/CFOP/CST) · Conciliação.

**Fase 4 — Mobile e automações**
Offline-first p/ vendedor externo · Push · Impressora térmica · Leitor de barras nativo · Robô de
cobrança/relatórios agendados (cron) · Export contábil.

**Fase 5 — Relatórios avançados e inteligência**
BI/curva ABC · Previsão de demanda · Sugestão de compra · Assistente IA avançado (consultas e insights) ·
Marketplace/e-commerce/delivery.

---

## 11. Entregáveis finais

### 11.1 Matriz de funcionalidades (resumo)
| Domínio | Essencial (F1) | Importante (F2) | Futura (F3+) |
|---|---|---|---|
| Vendas | PDV, orçamento, pedido | troca/devolução | NF-e, gateway |
| Estoque | saldo, baixa | kardex, inventário, custo médio | multi-depósito, previsão |
| Financeiro | caixa | pagar/receber, fluxo | conciliação, contábil |
| Cadastros | produto, cliente, usuário | fornecedor, funcionário | grade/lote/série |
| Gestão | dashboard, comissão | metas, auditoria, backup | BI, IA avançada |
| Mobile | PWA | offline | push, impressora, barras |

### 11.2 Lista de módulos
Ver Seção 2 (28 módulos).

### 11.3 User stories (amostra priorizada)
- *Como vendedor externo, quero criar um orçamento offline no celular e enviar por WhatsApp, para fechar em campo.*
- *Como caixa, quero abrir o caixa com fundo de troco e fechar com conferência, para controlar o dinheiro do dia.*
- *Como admin, quero ver comissões a pagar por vendedor e marcar "Pix pago", para acertar a equipe.*
- *Como estoquista, quero contar o estoque sem que itens não contados sejam zerados, para evitar erro de saldo.*
- *Como dono, quero um dashboard com vendas do dia e contas a vencer, para decidir rápido.*
- *Como vendedor, quero buscar produto por código de barras no PDV, para vender mais rápido.*
- *Como gerente, quero relatório de produtos mais vendidos por período, para planejar compras.*
- *(backlog completo derivável módulo a módulo da Seção 3).*

### 11.4 Regras de negócio
Ver Seção 6 (consolidadas).

### 11.5 Estrutura de banco
Ver Seção 5 (19 tabelas + auxiliares).

### 11.6 Fluxos operacionais
Ver Seção 4 (16 fluxos).

### 11.7 Telas sugeridas
Ver Seção 7 (17 telas, UX própria).

### 11.8 Backlog priorizado
F1 (MVP) → F2 (gestão) → F3 (fiscal) → F4 (mobile/automação) → F5 (BI/IA). Itens detalhados nas Seções 2, 3 e 10.

### 11.9 Plano técnico de desenvolvimento
- **Stack atual reaproveitada:** PWA (HTML/JS) + Supabase (Postgres/REST/RLS) + Express (Node) no Railway +
  jsPDF + IA (Claude). Mantém custo baixo e o que já roda.
- **Arquitetura:** front PWA offline-first → API Express (regra de negócio + auth assinada) → Supabase
  (dados + RLS por empresa). Integrações fiscais/pagamento via APIs de provedores.
- **Segurança:** senha com hash, sessão HMAC, RLS, revalidação no servidor, logs imutáveis, backup PITR.
- **Escalabilidade:** multi-empresa por `empresa_id` + RLS; saldo de estoque materializado; índices em
  busca de produto; paginação em listas grandes (catálogo de milhares de itens).
- **Qualidade:** numeração de documentos transacional, idempotência em finalização de venda, testes dos
  fluxos críticos (venda→estoque→financeiro→caixa).
- **Migração:** importar dados próprios (CSV) do sistema atual; nunca importar binário/proprietário.

---

*Documento original para desenvolvimento do RP Gestão. Funções equivalentes a ERPs comerciais de mercado,
sem reprodução de marca, código, telas ou material protegido de terceiros.*

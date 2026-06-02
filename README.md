# RP Orçamentos — Casa RP Resistências

App (PWA) de **Orçamentos, Pedidos e Clientes** da Casa RP Resistências.

## O que faz
- Cria orçamento (cliente + itens) e **gera PDF** com os dados da empresa.
- Orçamento aprovado vira **pedido** com status (Fabricação → Estoque → Pronto).
- Envio por **WhatsApp** (orçamento e cobrança).
- Lista de **clientes** com busca.
- Funciona **offline** e instala na **tela inicial** do celular.

## Como instalar no celular
Abra o link do app no navegador → menu → **"Adicionar à tela inicial"**.
- **iPhone (Safari):** botão Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Instalar app / Adicionar à tela inicial*.

## Recursos
- **IA** 🤖: descreva o pedido em texto e a IA monta os itens (descrição técnica) + identifica o cliente e sugere preço (você confere).
- **Cobranças** ⏰: aba que lista orçamentos pendentes por idade, com botão "Cobrar no WhatsApp".
- **Banco (Supabase):** orçamentos/pedidos/clientes sincronizam entre aparelhos + backup. Cache offline.
- **PDF** no modelo Casa RP (logo, tabela, condições, pagamento).

## Como hospedar no Railway (pra ativar a IA)
1. Railway → **New Project** → **Deploy from GitHub repo** → `rp-orcamentos`.
2. Detecta o Dockerfile automaticamente.
3. Em **Variables**, adicione: `ANTHROPIC_API_KEY` = sua chave `sk-ant-...` (a IA só funciona com ela).
4. **Settings → Networking → Generate Domain** → pronto, abra o link no celular.
> Sem o Railway o app roda no GitHub Pages, mas a **IA fica indisponível** (precisa do servidor pra guardar a chave).

## Técnico
- Servidor Express (`server.js`) serve o app + endpoint `POST /api/ia` (Claude). Estático também roda no GitHub Pages.
- Front fala direto com o Supabase (REST, chave anon) — tabelas `rp_quotes`, `rp_orders`, `rp_clients`.

Empresa: CASA RP RESISTÊNCIAS — Rubens R C P Da Silva Resistencias — CNPJ 40.037.362/0001-71 — Niterói/RJ.

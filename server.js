const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '8mb' }));
app.use(express.static(__dirname, { extensions: ['html'] }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYS_IA = `Você é o assistente da CASA RP RESISTÊNCIAS ELÉTRICAS (Niterói/RJ), fábrica de resistências elétricas e materiais elétricos para calor (uso doméstico, comercial, industrial, naval e hospitalar).
A partir do texto do lojista, monte os ITENS de um orçamento com descrição TÉCNICA padronizada (estilo ficha técnica) e identifique o CLIENTE (se citado).

Produtos típicos: resistência de imersão (tubo de cobre/inox, formato U/W/reta, niples de latão rosca BSP, potência em W, tensão V), resistência tubular, resistência coleira/abraçadeira (mica/cerâmica), resistência cartucho, resistência de estufa/forno/fogão, termostatos (bulbo capilar), arruelas e vedações, fios e cabos especiais. NCM padrão 85168010.

Modelo de descrição de item (siga esse padrão, completo): "Resistência elétrica para imersão, em tubo de cobre 8mmØ, formato U, comprimento 400mm, largura 250mm, pontas dobradas com niples de latão rosca 5/8\\", potência 2000W, tensão 220V".

PREÇO: sugira um valor unitário ESTIMADO em reais conforme o tipo/porte da peça (o lojista vai conferir e ajustar). Não invente preço alto; seja conservador. Se não der pra estimar, use 0.

Responda SOMENTE um JSON válido (sem crases, nada fora do JSON):
{"cliente":{"nome":"","telefone":""},"itens":[{"desc":"","qty":1,"price":0}]}
- telefone só dígitos (DDD+número). Sem cliente citado, deixe nome/telefone "".
- qty inteiro >=1. price número (estimativa em R$, ponto decimal).`;

app.post('/api/ia', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'IA não configurada. Defina ANTHROPIC_API_KEY nas variáveis do Railway.' });
  const texto = String((req.body && req.body.texto) || '').trim().slice(0, 4000);
  if (!texto) return res.status(400).json({ error: 'Descreva o pedido para a IA.' });
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYS_IA, messages: [{ role: 'user', content: texto }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Erro na IA: ' + (data && data.error && data.error.message || r.status) });
    let t = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    let parsed = null;
    try { let js = t.replace(/^```(json)?/i, '').replace(/```$/, '').trim(); const a = js.indexOf('{'), b = js.lastIndexOf('}'); if (a >= 0 && b > a) js = js.slice(a, b + 1); parsed = JSON.parse(js); } catch (e) {}
    if (!parsed || !Array.isArray(parsed.itens)) return res.status(502).json({ error: 'A IA não retornou no formato esperado. Tente de novo.' });
    res.json({ ok: true, cliente: parsed.cliente || {}, itens: parsed.itens });
  } catch (e) { res.status(503).json({ error: 'Falha ao contatar a IA: ' + e.message }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true, ia: !!ANTHROPIC_API_KEY }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log('RP Orçamentos rodando na porta ' + PORT + ' | IA: ' + (!!ANTHROPIC_API_KEY)));

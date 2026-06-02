const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '8mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const APP_USER = process.env.APP_USER || 'casarp';
const APP_PASSWORD = process.env.APP_PASSWORD;
// Token do cookie de sessão (derivado da senha). Só ativa login se APP_PASSWORD existir.
const AUTH_TOKEN = APP_PASSWORD ? crypto.createHash('sha256').update('rpv1:' + APP_USER + ':' + APP_PASSWORD).digest('hex') : null;

function getCookie(req, name) {
  const c = req.headers.cookie || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : '';
}

// Arquivos liberados SEM login — necessários p/ instalar o PWA e mostrar a tela de login.
function isPublic(p) {
  return p === '/manifest.json' || p === '/sw.js' || p === '/login' || p === '/api/login' || p === '/api/health' || p.startsWith('/icons/');
}

const LOGIN_HTML = `<!doctype html><html lang="pt-BR"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Entrar — Casa RP Resistências</title>
<link rel="manifest" href="manifest.json"><meta name="theme-color" content="#1B3A6B">
<style>
*{box-sizing:border-box;margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#FDF6E3;padding:24px}
.card{width:100%;max-width:360px;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.12);padding:28px 24px;text-align:center}
.logo{width:84px;height:84px;border-radius:50%;background:#1B3A6B;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.7rem;line-height:1.1;margin:0 auto 14px;padding:8px;text-align:center}
h1{font-size:1.1rem;color:#1B3A6B;margin-bottom:4px}
p.sub{font-size:.8rem;color:#777;margin-bottom:18px}
input{width:100%;padding:13px 14px;margin-bottom:12px;border:1px solid #ddd;border-radius:10px;font-size:1rem}
input:focus{outline:none;border-color:#1B3A6B}
button{width:100%;padding:13px;border:0;border-radius:10px;background:#1B3A6B;color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
button:disabled{opacity:.6}
.err{color:#c0392b;font-size:.85rem;min-height:18px;margin-bottom:8px}
</style></head><body>
<form class="card" id="f">
  <div class="logo">CASA RP<br>RESISTÊNCIAS</div>
  <h1>Orçamentos Casa RP</h1>
  <p class="sub">Entre para continuar</p>
  <div class="err" id="err"></div>
  <input id="u" name="user" placeholder="Usuário" autocapitalize="none" autocomplete="username" required>
  <input id="p" name="pass" type="password" placeholder="Senha" autocomplete="current-password" required>
  <button id="b" type="submit">Entrar</button>
</form>
<script>
const f=document.getElementById('f'),err=document.getElementById('err'),b=document.getElementById('b');
f.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';b.disabled=true;b.textContent='Entrando...';
 try{const r=await fetch('api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user:document.getElementById('u').value,pass:document.getElementById('p').value})});
  const d=await r.json();
  if(r.ok&&d.ok){location.replace('./');}else{err.textContent=d.error||'Usuário ou senha incorretos.';b.disabled=false;b.textContent='Entrar';}
 }catch(_){err.textContent='Erro de conexão. Tente de novo.';b.disabled=false;b.textContent='Entrar';}
});
</script></body></html>`;

// Gate de login (só se APP_PASSWORD definido). Libera assets do PWA + tela/endpoint de login.
if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    if (isPublic(req.path)) return next();
    if (getCookie(req, 'rp_auth') === AUTH_TOKEN) return next();
    if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sessão expirada. Faça login de novo.' });
    return res.redirect('/login');
  });
}

app.get('/login', (req, res) => res.type('html').send(LOGIN_HTML));
app.post('/api/login', (req, res) => {
  if (!AUTH_TOKEN) return res.json({ ok: true });
  const u = String((req.body && req.body.user) || '');
  const p = String((req.body && req.body.pass) || '');
  if (u === APP_USER && p === APP_PASSWORD) {
    res.set('Set-Cookie', `rp_auth=${AUTH_TOKEN}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
});

app.use(express.static(__dirname, { extensions: ['html'] }));

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

app.get('/api/health', (req, res) => res.json({ ok: true, ia: !!ANTHROPIC_API_KEY, login: !!AUTH_TOKEN }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log('RP Orçamentos rodando na porta ' + PORT + ' | IA: ' + (!!ANTHROPIC_API_KEY) + ' | Login: ' + (!!AUTH_TOKEN)));

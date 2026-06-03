const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '8mb' }));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SECRET = process.env.RP_SECRET || 'rp-dev-secret-trocar';
const SUPA_URL = process.env.SUPA_URL || 'https://zuwdgyvbuaocbzckhhlm.supabase.co';
const SUPA_ANON = process.env.SUPA_ANON || '';
const SB_H = { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' };

// ---------- Usuários (Supabase rp_users) ----------
async function sbUsers(qs) { try { const r = await fetch(`${SUPA_URL}/rest/v1/rp_users?${qs}`, { headers: SB_H }); return r.ok ? await r.json() : []; } catch (e) { return []; } }
async function sbUserInsert(obj) { try { const r = await fetch(`${SUPA_URL}/rest/v1/rp_users`, { method: 'POST', headers: { ...SB_H, Prefer: 'return=representation' }, body: JSON.stringify(obj) }); return r.ok ? (await r.json())[0] : null; } catch (e) { return null; } }
async function sbUserPatch(id, obj) { try { const r = await fetch(`${SUPA_URL}/rest/v1/rp_users?id=eq.${id}`, { method: 'PATCH', headers: { ...SB_H, Prefer: 'return=representation' }, body: JSON.stringify(obj) }); return r.ok ? (await r.json())[0] : null; } catch (e) { return null; } }
async function sbUserDelete(id) { try { await fetch(`${SUPA_URL}/rest/v1/rp_users?id=eq.${id}`, { method: 'DELETE', headers: { ...SB_H, Prefer: 'return=minimal' } }); } catch (e) {} }

// ---------- Senha (scrypt) e cookie assinado (HMAC) ----------
function hashPass(p) { const salt = crypto.randomBytes(16).toString('hex'); const h = crypto.scryptSync(String(p), salt, 64).toString('hex'); return `scrypt$${salt}$${h}`; }
function verifyPass(p, stored) { try { const parts = String(stored).split('$'); const salt = parts[1], h = parts[2]; const calc = crypto.scryptSync(String(p), salt, 64).toString('hex'); return crypto.timingSafeEqual(Buffer.from(calc, 'hex'), Buffer.from(h, 'hex')); } catch (e) { return false; } }
function clampPct(v, def) { let n = Number(v); if (!isFinite(n)) n = def; return Math.min(20, Math.max(1, Math.round(n))); }
const PERM_KEYS = ['criar_orcamento', 'editar', 'excluir', 'aprovar', 'ver_comissoes', 'ver_clientes', 'usar_ia', 'ver_todos'];
const DEFAULT_PERMS = { criar_orcamento: true, editar: false, excluir: false, aprovar: false, ver_comissoes: true, ver_clientes: true, usar_ia: true, ver_todos: false };
function allPerms() { const o = {}; PERM_KEYS.forEach(k => o[k] = true); return o; }
function effPerms(usr) { if (usr.role === 'admin') return allPerms(); const base = Object.assign({}, DEFAULT_PERMS); const p = usr.perms || {}; PERM_KEYS.forEach(k => { if (k in p) base[k] = !!p[k]; }); return base; }
function cleanPerms(input) { const o = {}; PERM_KEYS.forEach(k => { o[k] = !!(input && input[k]); }); return o; }
function sign(obj) { const data = Buffer.from(JSON.stringify(obj)).toString('base64url'); const mac = crypto.createHmac('sha256', SECRET).update(data).digest('base64url'); return data + '.' + mac; }
function verifyToken(token) {
  if (!token) return null;
  const i = token.indexOf('.'); if (i < 0) return null;
  const data = token.slice(0, i), mac = token.slice(i + 1);
  const exp = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  try { if (mac.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(exp))) return null; } catch (e) { return null; }
  try { return JSON.parse(Buffer.from(data, 'base64url').toString()); } catch (e) { return null; }
}
function getCookie(req, name) { const c = req.headers.cookie || ''; const m = c.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? decodeURIComponent(m[1]) : ''; }
function isPublic(p) { return p === '/manifest.json' || p === '/sw.js' || p === '/login' || p === '/api/login' || p === '/api/health' || p.startsWith('/icons/'); }

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

// ---------- Gate de login ----------
app.use((req, res, next) => {
  if (isPublic(req.path)) return next();
  const u = verifyToken(getCookie(req, 'rp_sess'));
  if (u) { req.user = u; return next(); }
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Sessão expirada. Faça login de novo.' });
  return res.redirect('/login');
});

app.get('/login', (req, res) => res.type('html').send(LOGIN_HTML));

app.post('/api/login', async (req, res) => {
  const u = String((req.body && req.body.user) || '').trim().toLowerCase();
  const p = String((req.body && req.body.pass) || '');
  if (!u || !p) return res.status(400).json({ error: 'Informe usuário e senha.' });
  const rows = await sbUsers(`username=eq.${encodeURIComponent(u)}&limit=1`);
  const usr = rows[0];
  if (!usr || usr.active === false || !verifyPass(p, usr.pass)) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  const sess = { id: usr.id, u: usr.username, name: usr.name || usr.username, role: usr.role, com: Number(usr.commission_default) || 5 };
  res.set('Set-Cookie', `rp_sess=${sign(sess)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);
  res.json({ ok: true, user: { u: sess.u, name: sess.name, role: sess.role, com: sess.com } });
});

app.post('/api/logout', (req, res) => { res.set('Set-Cookie', 'rp_sess=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); res.json({ ok: true }); });
app.get('/api/me', async (req, res) => {
  const usr = (await sbUsers(`id=eq.${req.user.id}&limit=1`))[0];
  if (!usr || usr.active === false) { res.set('Set-Cookie', 'rp_sess=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'); return res.status(401).json({ error: 'Usuário inativo.' }); }
  res.json({ user: { u: usr.username, name: usr.name || usr.username, role: usr.role, com: Number(usr.commission_default) || 5, perms: effPerms(usr) } });
});

// ---------- Admin: gestão de usuários ----------
function requireAdmin(req, res, next) { if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Apenas o admin pode gerenciar usuários.' }); next(); }
app.get('/api/users', requireAdmin, async (req, res) => { res.json({ users: await sbUsers('select=id,username,name,role,commission_default,active,perms,created_at&order=created_at.asc') }); });
app.post('/api/users', requireAdmin, async (req, res) => {
  const b = req.body || {}; const username = String(b.username || '').trim().toLowerCase();
  if (!username || !b.pass) return res.status(400).json({ error: 'Login e senha são obrigatórios.' });
  if ((await sbUsers(`username=eq.${encodeURIComponent(username)}&limit=1`))[0]) return res.status(409).json({ error: 'Esse login já existe.' });
  const row = await sbUserInsert({ username, pass: hashPass(b.pass), name: b.name || username, role: b.role === 'admin' ? 'admin' : 'vendedor', commission_default: clampPct(b.commission_default, 5), active: true, perms: cleanPerms(b.perms || DEFAULT_PERMS) });
  res.json({ ok: !!row });
});
app.patch('/api/users/:id', requireAdmin, async (req, res) => {
  const b = req.body || {}; const upd = {};
  if (b.name != null) upd.name = String(b.name);
  if (b.role != null) upd.role = b.role === 'admin' ? 'admin' : 'vendedor';
  if (b.commission_default != null) upd.commission_default = clampPct(b.commission_default, 5);
  if (b.active != null) upd.active = !!b.active;
  if (b.pass) upd.pass = hashPass(b.pass);
  if (b.perms != null) upd.perms = cleanPerms(b.perms);
  res.json({ ok: !!(await sbUserPatch(req.params.id, upd)) });
});
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Você não pode excluir o próprio usuário.' });
  await sbUserDelete(req.params.id); res.json({ ok: true });
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

app.post('/api/assist', async (req, res) => {
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'IA não configurada. Defina ANTHROPIC_API_KEY.' });
  const pergunta = String((req.body && req.body.pergunta) || '').trim().slice(0, 800);
  if (!pergunta) return res.status(400).json({ error: 'Faça uma pergunta.' });
  const dados = (req.body && req.body.dados) || {};
  const hoje = new Date().toISOString().slice(0, 10);
  const sys = `Você é o assistente analítico da CASA RP RESISTÊNCIAS. Hoje é ${hoje}. Responda em português do Brasil, OBJETIVO e amigável, com base EXCLUSIVAMENTE nos dados (JSON) fornecidos. Os dados têm "orcamentos" (status EM_ANALISE = em aberto/não fechado; APROVADO = fechou, virou pedido) e "pedidos" (status de fabricação; pago=true quando o cliente pagou; vendedor = quem fez). Datas em ISO (YYYY-MM-DD). "Quem fechou" = orçamentos APROVADO / pedidos. "Em aberto / não fechou" = orçamentos com status diferente de APROVADO. Para listas use marcadores curtos: cliente — nº — R$ valor — data. Some valores e conte quando fizer sentido. Se não houver dados, diga que não encontrou. NÃO invente nada além do JSON.`;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1200, system: sys, messages: [{ role: 'user', content: `DADOS (JSON):\n${JSON.stringify(dados).slice(0, 80000)}\n\nPERGUNTA: ${pergunta}` }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'Erro na IA: ' + ((data && data.error && data.error.message) || r.status) });
    const t = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    res.json({ ok: true, resposta: t || 'Não consegui responder.' });
  } catch (e) { res.status(503).json({ error: 'Falha ao contatar a IA: ' + e.message }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true, ia: !!ANTHROPIC_API_KEY }));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, () => console.log('RP Orçamentos na porta ' + PORT + ' | IA: ' + (!!ANTHROPIC_API_KEY)));

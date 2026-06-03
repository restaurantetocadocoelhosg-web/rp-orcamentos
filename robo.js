// Robô de e-mail da Casa RP: lê o Gmail 2x/dia (10h/16h), cria orçamento (rascunho) via IA, e manda alerta.
const crypto = require('crypto');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;           // senha de app do Gmail
const ALERT_TO = process.env.ALERT_TO || GMAIL_USER;  // p/ quem mandar o alerta
const SUPA_URL = process.env.SUPA_URL || 'https://zuwdgyvbuaocbzckhhlm.supabase.co';
const SUPA_ANON = process.env.SUPA_ANON || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SB_H = { apikey: SUPA_ANON, Authorization: 'Bearer ' + SUPA_ANON, 'Content-Type': 'application/json' };
const KEY_RE = /or[çc]amento|resist[êe]ncia|pre[çc]o|cota[çc][ãa]o|niple|tubular|imers[ãa]o/i;

function ready() { return !!(GMAIL_USER && GMAIL_PASS); }
function log(...a) { console.log('[robo]', ...a); }

let ImapFlow, simpleParser, nodemailer, cron;
try {
  ImapFlow = require('imapflow').ImapFlow;
  simpleParser = require('mailparser').simpleParser;
  nodemailer = require('nodemailer');
  cron = require('node-cron');
} catch (e) { log('deps indisponíveis:', e.message); }

async function sbQuotes(qs) { try { const r = await fetch(`${SUPA_URL}/rest/v1/rp_quotes?${qs}`, { headers: SB_H }); return r.ok ? await r.json() : []; } catch (e) { return []; } }
async function sbInsertQuote(obj) { try { const r = await fetch(`${SUPA_URL}/rest/v1/rp_quotes`, { method: 'POST', headers: { ...SB_H, Prefer: 'return=minimal' }, body: JSON.stringify(obj) }); return r.ok; } catch (e) { return false; } }

async function nextNumber() {
  const year = new Date().getFullYear();
  const rows = await sbQuotes('select=number');
  const n = (rows || []).filter(r => String(r.number || '').startsWith('ORC-' + year)).length + 1;
  return `ORC-${year}-${String(n).padStart(4, '0')}`;
}

const SYS = `Você é o assistente da CASA RP RESISTÊNCIAS ELÉTRICAS. Recebe o texto de um E-MAIL. Decida se é um PEDIDO DE ORÇAMENTO de resistências/materiais elétricos. Se NÃO for, responda {"orcamento":false}. Se FOR, extraia o cliente e monte os itens com descrição técnica padronizada e preço unitário ESTIMADO conservador (R$, 0 se não der). Responda SOMENTE JSON: {"orcamento":true,"cliente":{"nome":"","telefone":""},"itens":[{"desc":"","qty":1,"price":0}]} (telefone só dígitos).`;

async function parseEmail(texto) {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYS, messages: [{ role: 'user', content: texto.slice(0, 6000) }] })
    });
    const data = await r.json(); if (!r.ok) return null;
    let t = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
    const a = t.indexOf('{'), b = t.lastIndexOf('}'); if (a >= 0 && b > a) t = t.slice(a, b + 1);
    const p = JSON.parse(t);
    return (p && p.orcamento && Array.isArray(p.itens) && p.itens.length) ? p : null;
  } catch (e) { log('parse erro:', e.message); return null; }
}

async function criarOrcamento(p, fromText) {
  const itens = (p.itens || []).map(it => { const qty = parseInt(it.qty) || 1, price = parseFloat(it.price) || 0; return { desc: String(it.desc || ''), qty, price, total: qty * price }; });
  const total = itens.reduce((s, i) => s + i.total, 0);
  const number = await nextNumber();
  const id = crypto.randomUUID();
  const quote = {
    id, number,
    client: { name: (p.cliente && p.cliente.nome) || fromText || '(via e-mail)', phone: String((p.cliente && p.cliente.telefone) || '').replace(/\D/g, '') },
    items: itens, total, status: 'EM_ANALISE', date: new Date().toISOString(),
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
    seller: { u: 'robo', name: 'Robô (e-mail)' }, commissionPct: 5, origem: 'email', remetente: fromText || ''
  };
  const ok = await sbInsertQuote({ id, number, data: quote });
  if (ok) log('orçamento criado:', number, quote.client.name);
  return ok ? number : null;
}

async function pollInbox() {
  if (!ready() || !ImapFlow) return { ok: false, created: 0, msg: 'sem credenciais/deps' };
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS }, logger: false });
  let created = 0, vistos = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      const uids = await client.search({ seen: false }, { uid: true });
      for (const uid of (uids || []).slice(-40)) {
        let subj = '';
        try { const h = await client.fetchOne(uid, { envelope: true }, { uid: true }); subj = (h && h.envelope && h.envelope.subject) || ''; } catch (e) { continue; }
        if (!KEY_RE.test(subj)) continue;
        vistos++;
        let parsed; try { const full = await client.fetchOne(uid, { source: true }, { uid: true }); parsed = await simpleParser(full.source); } catch (e) { continue; }
        const fromText = (parsed.from && parsed.from.text) || '';
        const texto = `Assunto: ${parsed.subject || ''}\nDe: ${fromText}\n\n${parsed.text || (parsed.html || '').replace(/<[^>]+>/g, ' ') || ''}`;
        const p = await parseEmail(texto);
        if (p) { const num = await criarOrcamento(p, fromText); if (num) { created++; try { await client.messageFlagsAdd(uid, ['\\Seen'], { uid: true }); } catch (e) {} } }
      }
    } finally { lock.release(); }
  } catch (e) { log('inbox erro:', e.message); } finally { try { await client.logout(); } catch (e) {} }
  log(`poll: assuntos candidatos=${vistos}, orçamentos criados=${created}`);
  return { ok: true, created, candidatos: vistos };
}

async function sendAlert() {
  if (!ready() || !nodemailer) return { ok: false, msg: 'sem credenciais/deps' };
  const rows = await sbQuotes('select=data&order=created_at.asc');
  const abertos = (rows || []).map(r => r.data).filter(q => q && q.status !== 'APROVADO');
  let texto;
  if (!abertos.length) texto = 'Nenhum orçamento em aberto no momento. 🎉';
  else {
    abertos.sort((a, b) => new Date(a.date) - new Date(b.date));
    texto = `Casa RP — ${abertos.length} orçamento(s) em aberto:\n\n` + abertos.map(q => {
      const dias = Math.floor((Date.now() - new Date(q.date).getTime()) / 86400000);
      return `• ${(q.client && q.client.name) || '(sem nome)'} — ${(q.client && q.client.phone) || 'sem tel'} — ${q.number} — R$ ${(q.total || 0).toFixed(2)} — ${dias} dia(s)`;
    }).join('\n');
  }
  try {
    const tx = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000 });
    await tx.sendMail({ from: `Casa RP Orçamentos <${GMAIL_USER}>`, to: ALERT_TO, subject: `Casa RP — orçamentos em aberto (${abertos.length})`, text: texto });
    log('alerta enviado p/', ALERT_TO);
    return { ok: true, abertos: abertos.length };
  } catch (e) { log('alerta erro:', e.message); return { ok: false, msg: e.message }; }
}

async function runOnce() { const a = await pollInbox(); const b = await sendAlert(); return { poll: a, alerta: b }; }

function init() {
  if (!ready()) { log('desativado (defina GMAIL_USER e GMAIL_PASS).'); return; }
  if (!cron) { log('node-cron indisponível.'); return; }
  // 10h e 16h, horário de Brasília
  cron.schedule('0 10,16 * * *', () => { log('cron disparou'); runOnce().catch(e => log('run erro:', e.message)); }, { timezone: 'America/Sao_Paulo' });
  log('agendado p/ 10h e 16h (America/Sao_Paulo). Alerta p/', ALERT_TO);
}

module.exports = { init, runOnce, pollInbox, sendAlert, ready };

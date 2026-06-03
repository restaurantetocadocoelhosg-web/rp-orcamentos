// Robô de e-mail da Casa RP: lê o Gmail 2x/dia (10h/16h), cria orçamento (rascunho) via IA, e manda alerta.
const crypto = require('crypto');

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;           // senha de app do Gmail
const ALERT_TO = process.env.ALERT_TO || GMAIL_USER;  // p/ quem mandar o alerta
const SUPA_URL = process.env.SUPA_URL || 'https://zuwdgyvbuaocbzckhhlm.supabase.co';
const SUPA_ANON = process.env.SUPA_ANON || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MAILBOX = process.env.ROBO_MAILBOX || 'INBOX';   // marcador/pasta que o robô lê (ex.: "Casa RP")
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_KEY = process.env.EVOLUTION_KEY;
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'CASA RP RESISTENCIAS';
const ALERT_WHATSAPP = process.env.ALERT_WHATSAPP;
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

async function criarOrcamento(p, fromText, msgId) {
  const itens = (p.itens || []).map(it => { const qty = parseInt(it.qty) || 1, price = parseFloat(it.price) || 0; return { desc: String(it.desc || ''), qty, price, total: qty * price }; });
  const total = itens.reduce((s, i) => s + i.total, 0);
  const number = await nextNumber();
  const id = crypto.randomUUID();
  const quote = {
    id, number,
    client: { name: (p.cliente && p.cliente.nome) || fromText || '(via e-mail)', phone: String((p.cliente && p.cliente.telefone) || '').replace(/\D/g, '') },
    items: itens, total, status: 'EM_ANALISE', date: new Date().toISOString(),
    validUntil: new Date(Date.now() + 15 * 86400000).toISOString(),
    seller: { u: 'robo', name: 'Robô (e-mail)' }, commissionPct: 5, origem: 'email', remetente: fromText || '', emailMsgId: msgId || ''
  };
  const ok = await sbInsertQuote({ id, number, data: quote });
  if (ok) log('orçamento criado:', number, quote.client.name);
  return ok ? number : null;
}

async function pollInbox() {
  if (!ready() || !ImapFlow) return { ok: false, created: 0, msg: 'sem credenciais/deps' };
  // dedup por Message-ID dos orçamentos já criados
  const existentes = new Set((await sbQuotes('select=data')).map(r => r.data && r.data.emailMsgId).filter(Boolean));
  const client = new ImapFlow({ host: 'imap.gmail.com', port: 993, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_PASS }, logger: false });
  let created = 0, candidatos = 0;
  await client.connect();
  try {
    const lock = await client.getMailboxLock(MAILBOX);
    try {
      // Lê os últimos e-mails da pasta/marcador (lido ou não). Em INBOX filtra o assunto por palavra-chave (caixa grande);
      // num marcador dedicado (ex.: "Casa RP") processa todos e deixa a IA decidir se é orçamento.
      const useKey = MAILBOX.toUpperCase() === 'INBOX';
      const total = client.mailbox.exists || 0;
      const start = Math.max(1, total - (useKey ? 119 : 49));
      const uids = [];
      try { for await (const msg of client.fetch(`${start}:*`, { envelope: true })) { const subj = (msg.envelope && msg.envelope.subject) || ''; if (!useKey || KEY_RE.test(subj)) uids.push(msg.uid); } } catch (e) { log('fetch erro:', e.message); }
      candidatos = uids.length;
      for (const uid of uids.slice(-15)) {
        let parsed; try { const full = await client.fetchOne(uid, { source: true }, { uid: true }); parsed = await simpleParser(full.source); } catch (e) { continue; }
        const msgId = parsed.messageId || ('uid:' + uid);
        if (existentes.has(msgId)) continue;
        const fromText = (parsed.from && parsed.from.text) || '';
        const texto = `Assunto: ${parsed.subject || ''}\nDe: ${fromText}\n\n${parsed.text || (parsed.html || '').replace(/<[^>]+>/g, ' ') || ''}`;
        const p = await parseEmail(texto);
        if (p) { const num = await criarOrcamento(p, fromText, msgId); if (num) { created++; existentes.add(msgId); } }
      }
    } finally { lock.release(); }
  } catch (e) { log('inbox erro:', e.message); } finally { try { await client.logout(); } catch (e) {} }
  log(`poll: candidatos=${candidatos}, criados=${created}`);
  return { ok: true, created, candidatos };
}

// Alerta via WhatsApp (Evolution API) — o Railway bloqueia SMTP, então não usamos e-mail aqui.
async function sendAlert() {
  const rows = await sbQuotes('select=data&order=created_at.asc');
  const abertos = (rows || []).map(r => r.data).filter(q => q && q.status !== 'APROVADO');
  let texto;
  if (!abertos.length) texto = '🟢 *Casa RP* — nenhum orçamento em aberto agora. 🎉';
  else {
    abertos.sort((a, b) => new Date(a.date) - new Date(b.date));
    texto = `📋 *Casa RP — ${abertos.length} orçamento(s) em aberto:*\n\n` + abertos.map(q => {
      const dias = Math.floor((Date.now() - new Date(q.date).getTime()) / 86400000);
      return `• ${(q.client && q.client.name) || '(sem nome)'} — ${(q.client && q.client.phone) || 'sem tel'} — ${q.number} — R$ ${(q.total || 0).toFixed(2)} — ${dias} dia(s)`;
    }).join('\n');
  }
  if (!(EVOLUTION_URL && EVOLUTION_KEY && ALERT_WHATSAPP)) return { ok: false, msg: 'WhatsApp do alerta não configurado' };
  try {
    const r = await fetch(`${EVOLUTION_URL}/message/sendText/${encodeURIComponent(EVOLUTION_INSTANCE)}`, {
      method: 'POST', headers: { apikey: EVOLUTION_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: ALERT_WHATSAPP, text: texto })
    });
    if (r.ok) { log('alerta WhatsApp enviado p/', ALERT_WHATSAPP); return { ok: true, canal: 'whatsapp', abertos: abertos.length }; }
    log('alerta whatsapp http', r.status); return { ok: false, msg: 'evolution http ' + r.status };
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

// Modulo principal NF-e — orquestra XML, assinatura, SEFAZ e DANFE
const fs = require('fs');
const path = require('path');
const { buildNFeXml } = require('./xml-builder');
const { signNFe } = require('./signer');
const { autorizarNFe } = require('./sefaz');
const { gerarDanfe } = require('./danfe');
const { proximo, voltar } = require('./numero');

const DATA_NFE = path.join(__dirname, '..', 'data', 'nfe');
const DATA_DANFE = path.join(__dirname, '..', 'data', 'danfe');
// Cache em memoria para DANFE (funciona em Railway onde o disco e efemero)
const _danfeCache = new Map();
try { fs.mkdirSync(DATA_NFE,   { recursive: true }); } catch {}
try { fs.mkdirSync(DATA_DANFE, { recursive: true }); } catch {}
function getDanfe(chave) { return _danfeCache.get(chave) || null; }
module.exports.getDanfe = getDanfe;

const CERT_PATH = process.env.NFE_CERT_PATH;
const CERT_PASS = process.env.NFE_CERT_PASS;
const TP_AMB = parseInt(process.env.NFE_AMBIENTE || '2'); // 2=hom, 1=prod

async function emitir(dados) {
  // 1. Pega proximo numero
  const nNF = proximo(TP_AMB);
  const tpAmb = TP_AMB;

  try {
    // 2. Monta XML
    const { xml: xmlSemAssinatura, chave } = buildNFeXml({ ...dados, nNF, tpAmb });

    // 3. Assina XML
    const xmlAssinado = signNFe(xmlSemAssinatura, CERT_PATH, CERT_PASS);

    // 4. Envia para SEFAZ
    const resp = await autorizarNFe(xmlAssinado, tpAmb);

    if (!resp.ok) {
      voltar(tpAmb); // devolve o numero se SEFAZ rejeitou
      return { ok: false, erro: `SEFAZ ${resp.cStat}: ${resp.xMotivo}`, cStat: resp.cStat };
    }

    // 5. Salva XML autorizado (best-effort — pode falhar em filesystem efemero)
    const xmlFinal = xmlAssinado;
    const nomeXml = `${chave}-nfe.xml`;
    try { fs.writeFileSync(path.join(DATA_NFE, nomeXml), xmlFinal, 'utf8'); } catch {}

    // 6. Gera DANFE e guarda em memoria + disco
    const pdfBuffer = await gerarDanfe({
      ...dados, chave, nNF, serie: dados.serie || 1,
      tpAmb, nProt: resp.nProt, vNF: calcTotal(dados.itens)
    });
    const nomePdf = `${chave}-danfe.pdf`;
    _danfeCache.set(chave, pdfBuffer); // sempre em memoria
    try { fs.writeFileSync(path.join(DATA_DANFE, nomePdf), pdfBuffer); } catch {}

    return {
      ok: true,
      nNF,
      chave,
      nProt: resp.nProt,
      ambiente: tpAmb === 1 ? 'PRODUCAO' : 'HOMOLOGACAO',
      xmlFile: nomeXml,
      pdfFile: nomePdf
    };
  } catch (e) {
    voltar(tpAmb);
    throw e;
  }
}

function calcTotal(itens) {
  return itens.reduce((s, it) => s + (it.qCom * it.vUnCom), 0).toFixed(2);
}

module.exports = { emitir, TP_AMB };

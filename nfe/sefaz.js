// Comunicacao SOAP com SEFAZ para NF-e v4.00
const https = require('https');
const { SEFAZ } = require('./config');

function getUrls(tpAmb) {
  return tpAmb === 1 ? SEFAZ.prod : SEFAZ.hom;
}

function soapRequest(url, action, body) {
  return new Promise((resolve, reject) => {
    const envelope = `<?xml version="1.0" encoding="UTF-8"?>` +
      `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
      `xmlns:xsd="http://www.w3.org/2001/XMLSchema" ` +
      `xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">` +
      `<soap12:Header>` +
      `<nfeCabecMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${action}">` +
      `<cUF>${SEFAZ.cUF}</cUF><versaoDados>4.00</versaoDados>` +
      `</nfeCabecMsg>` +
      `</soap12:Header>` +
      `<soap12:Body>` +
      `<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/${action}">` +
      body +
      `</nfeDadosMsg>` +
      `</soap12:Body>` +
      `</soap12:Envelope>`;

    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/soap+xml; charset=UTF-8',
        'Content-Length': Buffer.byteLength(envelope, 'utf8')
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Timeout SEFAZ')); });
    req.write(envelope);
    req.end();
  });
}

// Envia NF-e para autorizacao sincrona (indSinc=1)
async function autorizarNFe(nfeSignedXml, tpAmb) {
  const urls = getUrls(tpAmb);
  const lote = String(Date.now()).slice(-15).padStart(15, '0');
  const body =
    `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">` +
    `<idLote>${lote}</idLote>` +
    `<indSinc>1</indSinc>` +
    nfeSignedXml +
    `</enviNFe>`;

  const resposta = await soapRequest(urls.autorizacao, 'NFeAutorizacao4', body);
  return parseResposta(resposta);
}

// Cancela NF-e via evento
async function cancelarNFe(chave, nProt, justificativa, tpAmb) {
  const urls = getUrls(tpAmb);
  const dhEvento = new Date().toISOString().slice(0, 19) + '-03:00';
  const cOrgao = '33'; // RJ
  const tpEvento = '110111';
  const nSeqEvento = '1';
  const idEvento = `ID${tpEvento}${chave}${nSeqEvento.padStart(2,'0')}`;

  const infEvento =
    `<infEvento Id="${idEvento}" versao="1.00">` +
    `<cOrgao>${cOrgao}</cOrgao>` +
    `<tpAmb>${tpAmb}</tpAmb>` +
    `<CNPJ>${require('./config').EMIT.CNPJ}</CNPJ>` +
    `<chNFe>${chave}</chNFe>` +
    `<dhEvento>${dhEvento}</dhEvento>` +
    `<tpEvento>${tpEvento}</tpEvento>` +
    `<nSeqEvento>${nSeqEvento}</nSeqEvento>` +
    `<verEvento>1.00</verEvento>` +
    `<detEvento versao="1.00">` +
    `<descEvento>Cancelamento</descEvento>` +
    `<nProt>${nProt}</nProt>` +
    `<xJust>${justificativa}</xJust>` +
    `</detEvento>` +
    `</infEvento>`;

  // Evento precisa ser assinado tambem — por agora retornamos instrucao manual
  return { ok: false, msg: 'Cancelamento via SIPA por enquanto. Em breve disponivel no app.' };
}

// Parseia o retorno SEFAZ (XML) e extrai cStat, xMotivo, nProt, chNFe
function parseResposta(xml) {
  const get = (tag) => { const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`)); return m ? m[1] : ''; };
  const cStat = get('cStat');
  const xMotivo = get('xMotivo');
  const nProt = get('nProt');
  const chNFe = get('chNFe');
  const dhRecbto = get('dhRecbto');

  const autorizado = cStat === '100';
  const lote_ok = cStat === '103' || cStat === '104'; // em processamento

  return { ok: autorizado, cStat, xMotivo, nProt, chNFe, dhRecbto, xml };
}

module.exports = { autorizarNFe, cancelarNFe };

// Construtor XML NF-e v4.00 — baseado no schema oficial SEFAZ
// Configurado para Casa RP: CRT=1 (Simples Nacional), ICMSSN, PIS/COFINS NT
const { EMIT } = require('./config');

function pad(n, len) { return String(n).padStart(len, '0'); }
function fmtVal(n, dec) { return Number(n).toFixed(dec || 2); }

// Calculo do digito verificador da chave (modulo 11)
function calcDV(chave43) {
  let sum = 0, mult = 2;
  for (let i = chave43.length - 1; i >= 0; i--) {
    sum += parseInt(chave43[i]) * mult;
    mult = mult >= 9 ? 2 : mult + 1;
  }
  const rem = sum % 11;
  return rem < 2 ? 0 : 11 - rem;
}

function buildChave(serie, nNF, tpAmb, dhEmi) {
  const d = new Date(dhEmi);
  const aa = String(d.getFullYear()).slice(2);
  const mm = pad(d.getMonth() + 1, 2);
  const cNF = pad(Math.floor(Math.random() * 90000000 + 10000000), 8);
  const c43 = `33${aa}${mm}${EMIT.CNPJ}55${pad(serie, 3)}${pad(nNF, 9)}1${cNF}`;
  const dv = calcDV(c43);
  return { chave: `${c43}${dv}`, cNF, cDV: String(dv) };
}

// Determina CFOP e idDest com base na UF do destinatario
function getCFOP(ufDest) {
  if (!ufDest || ufDest.toUpperCase() === 'RJ') return { cfop: '5102', idDest: '1' };
  return { cfop: '6102', idDest: '2' };
}

function buildNFeXml(dados) {
  /*
    dados = {
      nNF: number,
      tpAmb: 1|2,
      dhEmi: ISO string,
      serie: number (default 1),
      dest: { CPF|CNPJ, xNome, enderDest: { xLgr, nro, xBairro, cMun, xMun, UF, CEP }, indIEDest, IE? },
      itens: [{ cProd, xProd, NCM, CFOP?, uCom, qCom, vUnCom, vProd, CSOSN? }],
      tpPag: '01'|'03'|'04'|'15'|'17' (dinheiro|credito|debito|boleto|pix),
      vPag: number,
      infCpl?: string,
      natOp?: string,
      indFinal: 0|1
    }
  */
  const { nNF, tpAmb, serie = 1, dest, itens, tpPag = '17', vPag, infCpl = '', natOp = 'VENDA', indFinal = 0 } = dados;
  const dhEmi = dados.dhEmi || new Date().toISOString().slice(0, 19) + '-03:00';
  const { chave, cNF, cDV } = buildChave(serie, nNF, tpAmb, dhEmi);
  const { cfop: cfopDefault, idDest } = getCFOP(dest && dest.enderDest && dest.enderDest.UF);

  // Calcula totais
  let vTotProd = 0;
  for (const it of itens) {
    it.vProd = fmtVal(it.qCom * it.vUnCom);
    vTotProd += parseFloat(it.vProd);
  }
  const vNF = fmtVal(vTotProd);

  // Monta XML sem assinatura
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">`,
    `<infNFe Id="NFe${chave}" versao="4.00">`,

    // ide
    `<ide>`,
    `<cUF>33</cUF>`,
    `<cNF>${cNF}</cNF>`,
    `<natOp>${natOp}</natOp>`,
    `<mod>55</mod>`,
    `<serie>${serie}</serie>`,
    `<nNF>${nNF}</nNF>`,
    `<dhEmi>${dhEmi}</dhEmi>`,
    `<dhSaiEnt>${dhEmi}</dhSaiEnt>`,
    `<tpNF>1</tpNF>`,
    `<idDest>${idDest}</idDest>`,
    `<cMunFG>3303302</cMunFG>`,
    `<tpImp>1</tpImp>`,
    `<tpEmis>1</tpEmis>`,
    `<cDV>${cDV}</cDV>`,
    `<tpAmb>${tpAmb}</tpAmb>`,
    `<finNFe>1</finNFe>`,
    `<indFinal>${indFinal}</indFinal>`,
    `<indPres>0</indPres>`,
    `<procEmi>0</procEmi>`,
    `<verProc>CasaRP-1.0</verProc>`,
    `</ide>`,

    // emit
    `<emit>`,
    `<CNPJ>${EMIT.CNPJ}</CNPJ>`,
    `<xNome>${EMIT.xNome}</xNome>`,
    `<xFant>${EMIT.xFant}</xFant>`,
    `<enderEmit>`,
    `<xLgr>${EMIT.xLgr}</xLgr>`,
    `<nro>${EMIT.nro}</nro>`,
    `<xCpl>${EMIT.xCpl}</xCpl>`,
    `<xBairro>${EMIT.xBairro}</xBairro>`,
    `<cMun>${EMIT.cMun}</cMun>`,
    `<xMun>${EMIT.xMun}</xMun>`,
    `<UF>${EMIT.UF}</UF>`,
    `<CEP>${EMIT.CEP}</CEP>`,
    `<cPais>${EMIT.cPais}</cPais>`,
    `<xPais>${EMIT.xPais}</xPais>`,
    `<fone>${EMIT.fone}</fone>`,
    `</enderEmit>`,
    `<IE>${EMIT.IE}</IE>`,
    `<CRT>${EMIT.CRT}</CRT>`,
    `</emit>`,

    // dest
    buildDest(dest),

    // det (itens)
    ...itens.map((it, i) => buildItem(it, i + 1, cfopDefault)),

    // total
    `<total>`,
    `<ICMSTot>`,
    `<vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson>`,
    `<vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>0.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet>`,
    `<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>`,
    `<qBCMono>0.00</qBCMono><vICMSMono>0.00</vICMSMono><qBCMonoReten>0.00</qBCMonoReten>`,
    `<vICMSMonoReten>0.00</vICMSMonoReten><qBCMonoRet>0.00</qBCMonoRet><vICMSMonoRet>0.00</vICMSMonoRet>`,
    `<vProd>${vNF}</vProd>`,
    `<vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII>`,
    `<vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS>`,
    `<vOutro>0.00</vOutro>`,
    `<vNF>${vNF}</vNF>`,
    `<vTotTrib>0.00</vTotTrib>`,
    `</ICMSTot>`,
    `</total>`,

    // transp
    `<transp><modFrete>0</modFrete></transp>`,

    // pag
    `<pag>`,
    `<detPag>`,
    `<indPag>0</indPag>`,
    `<tPag>${tpPag}</tPag>`,
    `<vPag>${fmtVal(vPag || vTotProd)}</vPag>`,
    `</detPag>`,
    `</pag>`,

    // infAdic
    `<infAdic>`,
    `<infAdFisco>DOCUMENTO EMITIDO POR ME OU EPP SIMPLES NACIONAL. NAO GERA CREDITO DE IPI NOS TERMOS DO ARTIGO 23 DA LC 123/2006.</infAdFisco>`,
    infCpl ? `<infCpl>${infCpl}</infCpl>` : '',
    `</infAdic>`,

    `</infNFe>`,
    `</NFe>`
  ].filter(l => l !== '').join('');

  return { xml, chave };
}

function buildDest(dest) {
  if (!dest) return '';
  const doc = dest.CNPJ
    ? `<CNPJ>${dest.CNPJ}</CNPJ>`
    : `<CPF>${dest.CPF || ''}</CPF>`;
  const end = dest.enderDest;
  const enderXml = end ? [
    `<enderDest>`,
    `<xLgr>${end.xLgr || ''}</xLgr>`,
    `<nro>${end.nro || 'SN'}</nro>`,
    end.xCpl ? `<xCpl>${end.xCpl}</xCpl>` : '',
    `<xBairro>${end.xBairro || ''}</xBairro>`,
    `<cMun>${end.cMun || '3303302'}</cMun>`,
    `<xMun>${end.xMun || 'Niteroi'}</xMun>`,
    `<UF>${end.UF || 'RJ'}</UF>`,
    `<CEP>${(end.CEP || '').replace(/\D/g,'')}</CEP>`,
    `<cPais>1058</cPais><xPais>BRASIL</xPais>`,
    `</enderDest>`
  ].filter(Boolean).join('') : '';
  return [
    `<dest>`,
    doc,
    `<xNome>${dest.xNome || 'CONSUMIDOR FINAL'}</xNome>`,
    enderXml,
    `<indIEDest>${dest.indIEDest || '9'}</indIEDest>`,
    dest.IE ? `<IE>${dest.IE}</IE>` : '',
    `</dest>`
  ].filter(Boolean).join('');
}

function buildItem(it, nItem, cfopDefault) {
  const cfop = it.CFOP || cfopDefault;
  const csosn = it.CSOSN || '400'; // 400=SN nao tributado, 500=SN com ST anterior
  const qCom = fmtVal(it.qCom, 4);
  const vUnCom = fmtVal(it.vUnCom, 10);
  const vProd = fmtVal(it.qCom * it.vUnCom);
  return [
    `<det nItem="${nItem}">`,
    `<prod>`,
    `<cProd>${it.cProd || String(nItem)}</cProd>`,
    `<cEAN>SEM GTIN</cEAN>`,
    `<xProd>${it.xProd}</xProd>`,
    `<NCM>${it.NCM || '85168010'}</NCM>`,
    `<CFOP>${cfop}</CFOP>`,
    `<uCom>${it.uCom || 'UN'}</uCom>`,
    `<qCom>${qCom}</qCom>`,
    `<vUnCom>${vUnCom}</vUnCom>`,
    `<vProd>${vProd}</vProd>`,
    `<cEANTrib>SEM GTIN</cEANTrib>`,
    `<uTrib>${it.uCom || 'UN'}</uTrib>`,
    `<qTrib>${qCom}</qTrib>`,
    `<vUnTrib>${vUnCom}</vUnTrib>`,
    `<indTot>1</indTot>`,
    `</prod>`,
    `<imposto>`,
    `<ICMS><ICMSSN${csosn}><orig>0</orig><CSOSN>${csosn}</CSOSN></ICMSSN${csosn}></ICMS>`,
    `<PIS><PISNT><CST>07</CST></PISNT></PIS>`,
    `<COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>`,
    `</imposto>`,
    `</det>`
  ].join('');
}

module.exports = { buildNFeXml };

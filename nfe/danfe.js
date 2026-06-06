// Gerador DANFE (NF-e modelo 55) — layout retrato A4
const PDFDocument = require('pdfkit');
const { EMIT } = require('./config');

function fmtCNPJ(s) { s = String(s).replace(/\D/g,''); return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12)}`; }
function fmtMoeda(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function fmtChave(c) { return c.replace(/(\d{4})/g,'$1 ').trim(); }
function fmtData(s) { try { const d = new Date(s); return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`; } catch { return s; } }

function gerarDanfe(dados) {
  /*
    dados = { chave, nNF, serie, dhEmi, tpAmb, nProt, dest, itens, vNF, tpPag, vPag, natOp, infCpl }
  */
  const { chave, nNF, serie, dhEmi, tpAmb, nProt, dest, itens, vNF, natOp, infCpl } = dados;

  const buffers = [];
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.on('data', b => buffers.push(b));

  const W = 595, H = 842;
  const M = 14;
  const bx = M; // border x
  let y = M;

  function box(x, bY, w, h, fill) {
    if (fill) doc.rect(x, bY, w, h).fillAndStroke(fill, '#000');
    else doc.rect(x, bY, w, h).stroke('#000');
  }
  function hLine(lY) { doc.moveTo(bx, lY).lineTo(W - M, lY).stroke('#000'); }
  function vLine(lX, y1, y2) { doc.moveTo(lX, y1).lineTo(lX, y2).stroke('#000'); }
  function label(text, x, lY, opts = {}) {
    doc.fontSize(opts.size || 6).font('Helvetica').fillColor('#333').text(text, x, lY, { width: opts.w || 200, lineBreak: false });
  }
  function value(text, x, lY, opts = {}) {
    doc.fontSize(opts.size || 9).font('Helvetica-Bold').fillColor('#000').text(String(text), x, lY, { width: opts.w || 200, lineBreak: false, align: opts.align || 'left' });
  }

  // ===== BLOCO 1: Cabecalho =====
  const H1 = 80;
  box(bx, y, W - 2 * M, H1);
  vLine(bx + 160, y, y + H1);
  vLine(bx + 320, y, y + H1);

  // Emitente
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#000')
    .text(EMIT.xFant, bx + 4, y + 4, { width: 155 });
  doc.fontSize(6).font('Helvetica').fillColor('#333')
    .text(EMIT.xNome, bx + 4, y + 16, { width: 155 })
    .text(`${EMIT.xLgr}, ${EMIT.nro} ${EMIT.xCpl}`, bx + 4, y + 24, { width: 155 })
    .text(`${EMIT.xBairro} - ${EMIT.xMun}/${EMIT.UF} - CEP ${EMIT.CEP}`, bx + 4, y + 31, { width: 155 })
    .text(`CNPJ: ${fmtCNPJ(EMIT.CNPJ)}  IE: ${EMIT.IE}`, bx + 4, y + 38, { width: 155 })
    .text(`Tel: ${EMIT.fone}`, bx + 4, y + 45, { width: 155 });

  // DANFE centro
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
    .text('DANFE', bx + 163, y + 4, { width: 155, align: 'center' });
  doc.fontSize(7).font('Helvetica').fillColor('#333')
    .text('Documento Auxiliar da Nota Fiscal Eletrônica', bx + 163, y + 20, { width: 155, align: 'center' })
    .text('0 - ENTRADA   1 - SAÍDA', bx + 163, y + 30, { width: 155, align: 'center' });
  doc.fontSize(20).font('Helvetica-Bold').fillColor('#000')
    .text('1', bx + 213, y + 38, { width: 55, align: 'center' });
  doc.fontSize(7).font('Helvetica').fillColor('#333')
    .text(`Série: ${String(serie).padStart(3,'0')}   Nº ${String(nNF).padStart(9,'0')}`, bx + 163, y + 60, { width: 155, align: 'center' });

  // Chave e protocolo
  label('CHAVE DE ACESSO', bx + 323, y + 4, { w: W - bx - 323 - M });
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#000')
    .text(fmtChave(chave), bx + 323, y + 13, { width: W - bx - 323 - M - 4, align: 'center' });
  label('PROTOCOLO DE AUTORIZAÇÃO', bx + 323, y + 38, { w: W - bx - 323 - M });
  doc.fontSize(7).font('Helvetica').fillColor('#000')
    .text(nProt || '(pendente)', bx + 323, y + 47, { width: W - bx - 323 - M - 4, align: 'center' });
  label('DATA/HORA EMISSÃO', bx + 323, y + 58, { w: W - bx - 323 - M });
  doc.fontSize(7).font('Helvetica').fillColor('#000')
    .text(fmtData(dhEmi), bx + 323, y + 67, { width: W - bx - 323 - M - 4 });

  if (tpAmb === 2) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#cc0000')
      .text('HOMOLOGAÇÃO – SEM VALOR FISCAL', bx + 163, y + 43, { width: 155, align: 'center' });
  }

  y += H1 + 2;

  // Natureza da Operacao
  box(bx, y, W - 2 * M, 20);
  vLine(bx + 270, y, y + 20);
  label('NATUREZA DA OPERAÇÃO', bx + 2, y + 2, { w: 265 });
  value(natOp, bx + 2, y + 10, { w: 265 });
  label('INSCRIÇÃO ESTADUAL', bx + 274, y + 2, { w: 120 });
  value(EMIT.IE, bx + 274, y + 10);

  y += 22;

  // ===== BLOCO 2: Destinatario =====
  box(bx, y, W - 2 * M, 44);
  label('DESTINATÁRIO / REMETENTE', bx + 2, y + 2, { size: 7 });
  y += 8;

  const destNome = dest ? dest.xNome : 'CONSUMIDOR FINAL';
  const docDest = dest ? (dest.CNPJ ? fmtCNPJ(dest.CNPJ) : (dest.CPF || '')) : '';
  const ufDest = dest && dest.enderDest ? dest.enderDest.UF : '';

  vLine(bx + 340, y, y + 12); vLine(bx + 470, y, y + 12);
  label('NOME / RAZÃO SOCIAL', bx + 2, y, { w: 335 });
  label('CPF / CNPJ', bx + 342, y, { w: 125 });
  label('DATA EMISSÃO', bx + 472, y, { w: 100 });
  y += 7;
  value(destNome.slice(0, 48), bx + 2, y, { w: 335, size: 8 });
  value(docDest, bx + 342, y, { w: 125, size: 8 });
  value(fmtData(dhEmi), bx + 472, y, { w: 100, size: 8 });
  y += 10;

  const endDest = dest && dest.enderDest ? `${dest.enderDest.xLgr || ''}, ${dest.enderDest.nro || ''}` : '';
  vLine(bx + 270, y, y + 12); vLine(bx + 400, y, y + 12); vLine(bx + 470, y, y + 12);
  label('ENDEREÇO', bx + 2, y, { w: 265 });
  label('BAIRRO', bx + 272, y, { w: 125 });
  label('UF', bx + 402, y, { w: 65 });
  label('CEP', bx + 472, y, { w: 100 });
  y += 7;
  value(endDest.slice(0,40), bx + 2, y, { w: 265, size: 8 });
  value((dest && dest.enderDest && dest.enderDest.xBairro) || '', bx + 272, y, { w: 125, size: 8 });
  value(ufDest, bx + 402, y, { w: 65, size: 8 });
  value((dest && dest.enderDest && dest.enderDest.CEP) || '', bx + 472, y, { w: 100, size: 8 });
  y += 12;

  // ===== BLOCO 3: Tabela de Produtos =====
  const cols = [
    { label: 'CÓDIGO', w: 45 },
    { label: 'DESCRIÇÃO DO PRODUTO / SERVIÇO', w: 170 },
    { label: 'NCM', w: 45 },
    { label: 'CFOP', w: 30 },
    { label: 'UN', w: 22 },
    { label: 'QTD', w: 35 },
    { label: 'VL. UNIT', w: 50 },
    { label: 'VL. TOTAL', w: 55 }
  ];
  const tableW = W - 2 * M;
  box(bx, y, tableW, 12, '#e0e0e0');
  let cx = bx;
  for (const c of cols) {
    doc.fontSize(5.5).font('Helvetica-Bold').fillColor('#000')
      .text(c.label, cx + 2, y + 3, { width: c.w - 4, align: 'center', lineBreak: false });
    cx += c.w;
  }
  y += 12;

  for (const it of itens) {
    box(bx, y, tableW, 14);
    cx = bx;
    const rowVals = [
      it.cProd || '',
      it.xProd || '',
      it.NCM || '',
      it.CFOP || '5102',
      it.uCom || 'UN',
      Number(it.qCom).toFixed(2),
      Number(it.vUnCom).toFixed(2),
      Number(it.qCom * it.vUnCom).toFixed(2)
    ];
    for (let i = 0; i < cols.length; i++) {
      doc.fontSize(7).font('Helvetica').fillColor('#000')
        .text(rowVals[i].slice(0, i === 1 ? 35 : 20), cx + 2, y + 4,
          { width: cols[i].w - 4, align: i >= 5 ? 'right' : 'left', lineBreak: false });
      cx += cols[i].w;
    }
    y += 14;
  }

  // ===== BLOCO 4: Totais =====
  y += 4;
  box(bx, y, tableW, 22);
  vLine(bx + 370, y, y + 22);
  vLine(bx + 470, y, y + 22);
  label('INFORMAÇÕES ADICIONAIS', bx + 2, y + 2, { w: 365 });
  doc.fontSize(6.5).font('Helvetica').fillColor('#333')
    .text('Simples Nacional. Não gera crédito de IPI (LC 123/2006).', bx + 2, y + 9, { width: 365 });
  if (infCpl) doc.fontSize(6).text(infCpl.slice(0, 120), bx + 2, y + 15, { width: 365 });
  label('VALOR TOTAL NF', bx + 372, y + 2, { w: 95 });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
    .text(fmtMoeda(vNF), bx + 372, y + 10, { width: 95, align: 'right' });
  label('BASE CÁLCULO ICMS', bx + 472, y + 2, { w: W - bx - 472 - M });
  value('R$ 0,00', bx + 472, y + 10, { w: W - bx - 472 - M });

  y += 26;

  // ===== BLOCO 5: Rodape DANFE =====
  box(bx, y, tableW, 14, '#f0f0f0');
  doc.fontSize(6).font('Helvetica').fillColor('#444')
    .text(
      'Consulte a autenticidade desta NF-e em: https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx',
      bx + 4, y + 4, { width: tableW - 8, align: 'center' }
    );

  doc.end();

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
  });
}

module.exports = { gerarDanfe };

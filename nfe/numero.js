// Gerenciador de sequencia de numero NF-e
// Em homologacao: sequencia independente (comeca do 1, nao afeta producao)
// Em producao: continua a partir do ultimo numero do SIPA (1677 -> proximo 1678)
const fs = require('fs');
const path = require('path');

const SEQ_FILE = path.join(__dirname, '..', 'data', 'nfe-seq.json');

function loadSeq() {
  try {
    return JSON.parse(fs.readFileSync(SEQ_FILE, 'utf8'));
  } catch {
    return { hom: 0, prod: 1677 }; // prod começa em 1677 (ultimo do SIPA)
  }
}

function saveSeq(seq) {
  fs.writeFileSync(SEQ_FILE, JSON.stringify(seq, null, 2));
}

function proximo(tpAmb) {
  const seq = loadSeq();
  const key = tpAmb === 1 ? 'prod' : 'hom';
  seq[key] += 1;
  saveSeq(seq);
  return seq[key];
}

function atual(tpAmb) {
  const seq = loadSeq();
  return tpAmb === 1 ? seq.prod : seq.hom;
}

function voltar(tpAmb) {
  // Desfaz o ultimo incremento (usado quando SEFAZ rejeita)
  const seq = loadSeq();
  const key = tpAmb === 1 ? 'prod' : 'hom';
  if (seq[key] > 0) seq[key] -= 1;
  saveSeq(seq);
}

module.exports = { proximo, atual, voltar };

// Configuracoes NF-e Casa RP Resistencias
const EMIT = {
  CNPJ:    '40037362000171',
  xNome:   'RUBENS R C P DA SILVA RESISTENCIAS',
  xFant:   'CASA RP RESISTENCIAS',
  IE:      '11917356',
  CRT:     '1',           // Simples Nacional
  cMun:    '3303302',     // Niteroi/RJ
  xMun:    'Niteroi',
  UF:      'RJ',
  CEP:     '24030073',
  xLgr:   'RUA VISCONDE DO URUGUAI',
  nro:    '264',
  xCpl:   'LOJA',
  xBairro:'CENTRO',
  fone:   '2126208167',
  cPais:  '1058',
  xPais:  'BRASIL'
};

const SEFAZ = {
  cUF: '33',  // RJ
  // Homologacao (tpAmb=2): usa SVRS
  hom: {
    autorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx',
    retAutorizacao: 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx',
    evento: 'https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx'
  },
  // Producao (tpAmb=1): usa SEFAZ-RJ propria
  prod: {
    autorizacao: 'https://nfe.fazenda.rj.gov.br/nfeweb/services/NFeAutorizacao4.asmx',
    retAutorizacao: 'https://nfe.fazenda.rj.gov.br/nfeweb/services/NFeRetAutorizacao4.asmx',
    evento: 'https://nfe.fazenda.rj.gov.br/nfeweb/services/NFeRecepcaoEvento4.asmx'
  }
};

// Ultimo numero em PRODUCAO (nao alterar sem verificar!)
// Ultima nota emitida pelo SIPA em producao: 1677 (05/06/2026)
// Ao ir para producao: usar PROXIMO_NFE_PROD = 1678
const ULTIMO_NFE_SIPA = 1677;

module.exports = { EMIT, SEFAZ, ULTIMO_NFE_SIPA };

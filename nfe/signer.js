// Assinatura digital XML NF-e — RSA-SHA1 + C14N (xmldsig)
// Usa node-forge para ler PFX e Node.js crypto para assinar
const forge = require('node-forge');
const crypto = require('crypto');
const fs = require('fs');

let _key = null, _certB64 = null;

function loadCert(pfxPath, pfxPass) {
  if (_key) return;
  // Railway: certificado como base64 via env var (NFE_CERT_B64)
  // Local: lê do arquivo
  const pfxDer = process.env.NFE_CERT_B64
    ? Buffer.from(process.env.NFE_CERT_B64, 'base64')
    : fs.readFileSync(pfxPath);
  const asn1 = forge.asn1.fromDer(pfxDer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPass);

  // Extrai chave privada
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const bag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
  _key = forge.pki.privateKeyToPem(bag.key);

  // Extrai certificado (pega o da empresa, nao a cadeia CA)
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = certBags[forge.pki.oids.certBag];
  // O certificado final (end-entity) e o que nao e CA
  const endCert = certs.find(b => !b.cert.basicConstraints || !b.cert.basicConstraints.cA) || certs[0];
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(endCert.cert)).getBytes();
  _certB64 = Buffer.from(certDer, 'binary').toString('base64');
}

// Canonicalizacao simples C14N para o infNFe (o NFe so tem um namespace)
// Extrai o elemento infNFe do XML e adiciona o xmlns do NFe para C14N correto
function extractAndC14N(xmlStr) {
  const start = xmlStr.indexOf('<infNFe ');
  const end = xmlStr.indexOf('</infNFe>') + '</infNFe>'.length;
  let chunk = xmlStr.slice(start, end);
  // Adiciona namespace herdado do elemento pai <NFe xmlns="...">
  // que e requerido pelo C14N ao extrair o subset
  if (!chunk.includes('xmlns=')) {
    chunk = chunk.replace('<infNFe ', '<infNFe xmlns="http://www.portalfiscal.inf.br/nfe" ');
  }
  return chunk;
}

function sha1B64(data) {
  return crypto.createHash('sha1').update(data, 'utf8').digest('base64');
}

function rsaSha1Sign(pemKey, data) {
  const sign = crypto.createSign('RSA-SHA1');
  sign.update(data, 'utf8');
  return sign.sign(pemKey, 'base64');
}

function signNFe(xmlStr, pfxPath, pfxPass) {
  loadCert(pfxPath, pfxPass);

  // Encontra o Id de referencia
  const idMatch = xmlStr.match(/infNFe[^>]*Id="([^"]+)"/);
  if (!idMatch) throw new Error('Id da infNFe nao encontrado no XML');
  const refId = idMatch[1];

  // Canonicaliza e calcula digest do infNFe
  const c14nInfNFe = extractAndC14N(xmlStr);
  const digestValue = sha1B64(c14nInfNFe);

  // Monta SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
    `<Reference URI="#${refId}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  // Assina o SignedInfo com RSA-SHA1
  const signatureValue = rsaSha1Sign(_key, signedInfo);

  // Monta elemento Signature completo
  const signature =
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${_certB64}</X509Certificate></X509Data></KeyInfo>` +
    `</Signature>`;

  // Insere a assinatura ANTES do </NFe>
  return xmlStr.replace('</NFe>', `${signature}</NFe>`);
}

module.exports = { signNFe };

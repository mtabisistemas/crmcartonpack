const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function norm(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function main() {
  const cnpjs = [
    '10302439000122',
    '07397080000100',
    '07844254000135',
    '08975277000141',
    '12265105000151',
    '01295496000130',
    '94402955000119',
    '42774247000105',
    '24483533000130',
    '56055082000126'
  ];

  const cityNorm = 'esteio';
  const targetSector = 'restaurante';

  for (const cnpj of cnpjs) {
    const data = await fetchJson(`https://api.opencnpj.org/${cnpj}`);
    if (data) {
      const cityMatch = norm(data.municipio).includes(cityNorm);
      const cnaeText = data.cnaes?.map(c => `${c.codigo} ${c.descricao}`).join(' ') || '';
      const sectorMatch = norm(cnaeText).includes(targetSector) || norm(data.razao_social).includes(targetSector) || norm(data.nome_fantasia).includes(targetSector);
      console.log(`CNPJ ${cnpj} (${data.nome_fantasia || data.razao_social}): Cidade=${data.municipio} (Match=${cityMatch}) | SetorMatch=${sectorMatch}`);
    } else {
      console.log(`CNPJ ${cnpj}: Failed OpenCNPJ`);
    }
  }
}

main().catch(console.error);

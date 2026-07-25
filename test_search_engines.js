const https = require('https');

function fetchHtml(url, headers = {}) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', () => resolve(''));
  });
}

function extractCnpjs(text) {
  const cnpjs = new Set();
  const formattedMatches = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) || [];
  formattedMatches.forEach(c => cnpjs.add(c.replace(/\D/g, '')));
  const rawUrlMatches = text.match(/(?:office\/|cnpj\/|biz\/|empresa\/|solucao\/|\D)(\d{14})(?:\D|$)/g) || [];
  rawUrlMatches.forEach(m => {
    const digits = m.replace(/\D/g, '');
    if (digits.length === 14) cnpjs.add(digits);
  });
  return [...cnpjs];
}

async function main() {
  const query = 'restaurante esteio RS CNPJ';
  console.log("=== 1. DUCKDUCKGO ===");
  const ddg = await fetchHtml(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
  console.log("DDG CNPJs:", extractCnpjs(ddg));

  console.log("\n=== 2. YAHOO ===");
  const yahoo = await fetchHtml(`https://br.search.yahoo.com/search?p=${encodeURIComponent(query)}`);
  console.log("Yahoo CNPJs:", extractCnpjs(yahoo));

  console.log("\n=== 3. BING ===");
  const bing = await fetchHtml(`https://www.bing.com/search?q=${encodeURIComponent(query)}`);
  console.log("Bing CNPJs:", extractCnpjs(bing));
}

main().catch(console.error);

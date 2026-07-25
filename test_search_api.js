const https = require('https');

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

async function main() {
  const url = 'https://crmcartonpack.vercel.app/api/prospecting/search?setor=Restaurante&cidade=Esteio&estado=RS&porte=todos&page=1';
  console.log("=== TESTING LIVE API SEARCH FOR ESTEIO RS ===");
  const res = await fetchJson(url);
  console.log("API Response:", JSON.stringify(res, null, 2));
}

main().catch(console.error);

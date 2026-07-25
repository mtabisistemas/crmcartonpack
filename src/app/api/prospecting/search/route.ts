/**
 * API Route: /api/prospecting/search
 * Motor de busca B2B server-side — sem restrição CORS.
 * Fluxo: Busca no DuckDuckGo → extrai CNPJs → enriquece via minhareceita.org → filtra por cidade/UF/CNAE
 */
import { NextRequest, NextResponse } from 'next/server'
import { generateDynamicB2bLeads } from '@/services/prospecting-service'

// ─── Normalização sem acentos ─────────────────────────────────────────────────
function norm(s: string) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

// ─── Extrai CNPJs únicos (formatados ou 14 dígitos sequenciais de URLs) ──────
function extractCnpjs(text: string): string[] {
  const cnpjs = new Set<string>()
  
  // 1. CNPJs formatados: XX.XXX.XXX/XXXX-XX
  const formattedMatches = text.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g) || []
  formattedMatches.forEach(c => cnpjs.add(c.replace(/\D/g, '')))

  // 2. CNPJs não-formatados de 14 dígitos (presentes em URLs do cnpj.biz, casadosdados, cnpja, etc.)
  const rawMatches = text.match(/\b\d{14}\b/g) || []
  rawMatches.forEach(c => cnpjs.add(c))

  return [...cnpjs]
}

// ─── Enriquece um CNPJ via OpenCNPJ (fallbacks: minhareceita.org & publica.cnpj.ws) ─────
async function enrichCnpj(cnpj: string): Promise<Record<string, string> | null> {
  const clean = cnpj.replace(/\D/g, '')
  if (clean.length !== 14) return null

  // 1. Tenta OpenCNPJ (api.opencnpj.org) primeiro — oficial, gratuito e sem rate-limit
  try {
    const r = await fetch(`https://api.opencnpj.org/${clean}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) {
      const d = await r.json()
      if (d && d.razao_social) {
        const primaryCnae = d.cnaes?.find((c: any) => c.is_principal) || d.cnaes?.[0] || {}
        const cnaeCode = primaryCnae.codigo || d.cnae_principal || ''
        const cnaeDesc = primaryCnae.descricao || ''
        const phoneObj = d.telefones?.[0]
        const tel = phoneObj ? `${phoneObj.ddd}${phoneObj.numero}` : ''
        const log = [d.tipo_logradouro, d.logradouro].filter(Boolean).join(' ')

        const allCnaesText = Array.isArray(d.cnaes)
          ? d.cnaes.map((c: any) => `${c.codigo} ${c.descricao}`).join(' ')
          : ''
        const allCnaeDigits = Array.isArray(d.cnaes)
          ? d.cnaes.map((c: any) => String(c.codigo || '').replace(/\D/g, '')).join(' ')
          : cnaeCode

        return {
          razao_social: d.razao_social,
          nome_fantasia: d.nome_fantasia || d.razao_social,
          municipio: d.municipio || '',
          uf: d.uf || '',
          cep: d.cep || '',
          logradouro: log,
          numero: d.numero || '',
          bairro: d.bairro || '',
          ddd_telefone_1: tel,
          email: d.email || '',
          cnae_fiscal: cnaeCode,
          cnae_fiscal_descricao: cnaeDesc,
          all_cnaes_text: allCnaesText,
          all_cnae_digits: allCnaeDigits,
          situacao_cadastral: d.situacao_cadastral || 'ATIVA',
          data_inicio_atividade: d.data_inicio_atividade || '',
          natureza_juridica: d.natureza_juridica || '',
          capital_social: d.capital_social || '0',
          porte: d.porte_empresa || '',
          opcao_pelo_simples: d.opcao_simples ? 'true' : 'false',
          opcao_pelo_mei: d.opcao_mei ? 'true' : 'false',
        }
      }
    }
  } catch { /* continua para fallbacks */ }

  // 2. Fallback: minhareceita.org
  try {
    const r = await fetch(`https://minhareceita.org/${clean}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) {
      const d = await r.json()
      if (d && d.razao_social) return d
    }
  } catch { /* continua para fallback 3 */ }

  // 3. Fallback: publica.cnpj.ws
  try {
    const r = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`, {
      signal: AbortSignal.timeout(6000),
    })
    if (r.ok) {
      const d = await r.json()
      if (d && d.razao_social) {
        return {
          razao_social: d.razao_social,
          nome_fantasia: d.estabelecimento?.nome_fantasia || '',
          municipio: d.estabelecimento?.cidade?.nome || '',
          uf: d.estabelecimento?.estado?.sigla || '',
          cep: d.estabelecimento?.cep || '',
          logradouro: d.estabelecimento?.logradouro || '',
          numero: d.estabelecimento?.numero || '',
          bairro: d.estabelecimento?.bairro || '',
          ddd_telefone_1: d.estabelecimento?.ddd1
            ? `${d.estabelecimento.ddd1}${d.estabelecimento.telefone1}`
            : '',
          email: d.estabelecimento?.email || '',
          cnae_fiscal: d.estabelecimento?.atividade_principal?.subclasse || '',
          cnae_fiscal_descricao: d.estabelecimento?.atividade_principal?.descricao || '',
          situacao_cadastral: d.estabelecimento?.situacao_cadastral || 'ATIVA',
          data_inicio_atividade: d.estabelecimento?.data_inicio_atividade || '',
          natureza_juridica: d.natureza_juridica?.descricao || '',
          capital_social: d.capital_social || '0',
          porte: d.porte?.descricao || '',
          opcao_pelo_simples: d.simples?.optante ? 'true' : 'false',
          opcao_pelo_mei: d.simples?.mei ? 'true' : 'false',
        }
      }
    }
  } catch { /* sem dados */ }

  return null
}

// ─── Busca CNPJs no Yahoo Search (resiliente em IPs serverless Vercel) ───────
async function searchYahoo(query: string): Promise<string[]> {
  try {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`
    const r = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
    })
    if (!r.ok) return []
    const html = await r.text()
    return extractCnpjs(html)
  } catch {
    return []
  }
}

// ─── Busca CNPJs no DuckDuckGo (server-side, sem CORS) ───────────────────────
async function searchDuckDuckGo(query: string): Promise<string[]> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`
    const r = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
    })
    if (!r.ok) return []
    const html = await r.text()
    return extractCnpjs(html)
  } catch {
    return []
  }
}

// ─── Busca CNPJs via Bing (alternativa ao DuckDuckGo) ────────────────────────
async function searchBing(query: string): Promise<string[]> {
  try {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&cc=BR&setlang=pt-BR`
    const r = await fetch(url, {
      headers: {
        Accept: 'text/html',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
    })
    if (!r.ok) return []
    const html = await r.text()
    return extractCnpjs(html)
  } catch {
    return []
  }
}

// ─── Monta lead formatado a partir dos dados da RFB ─────────────────────────
function buildLead(cnpj: string, d: Record<string, string>) {
  const cnpjFormatted = cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  )

  const rawCnae = String(d.cnae_fiscal || '').replace(/\D/g, '')
  let cnaeFmt = rawCnae
  if (rawCnae.length === 7) {
    cnaeFmt = `${rawCnae.slice(0, 4)}-${rawCnae.slice(4, 5)}/${rawCnae.slice(5, 7)}`
  }

  const capFloat = parseFloat(d.capital_social || '0')
  const capFormatted = capFloat
    ? capFloat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    : 'R$ 100.000,00'

  const porteStr = (d.porte || '').toUpperCase()
  let porte: string = 'Pequena'
  if (porteStr.includes('MEI')) porte = 'MEI'
  else if (porteStr.includes('GRANDE')) porte = 'Grande'
  else if (porteStr.includes('MEDIA') || porteStr.includes('MÉDIA')) porte = 'Média'

  const endParts = [d.logradouro, d.numero, d.bairro].filter(Boolean).join(', ')
  const cidade = d.municipio
    ? d.municipio.charAt(0).toUpperCase() + d.municipio.slice(1).toLowerCase()
    : ''

  const tel = d.ddd_telefone_1
    ? `(${d.ddd_telefone_1.slice(0, 2)}) ${d.ddd_telefone_1.slice(2)}`
    : ''

  return {
    cnpj: cnpjFormatted,
    razao_social: d.razao_social || '',
    nome_fantasia: d.nome_fantasia || d.razao_social || '',
    cnae_codigo: cnaeFmt,
    cnae_descricao: d.cnae_fiscal_descricao || '',
    setor: d.cnae_fiscal_descricao || '',
    cidade,
    estado: d.uf || '',
    cep: d.cep ? `${d.cep.slice(0, 5)}-${d.cep.slice(5)}` : '',
    logradouro: endParts || '',
    porte,
    telefone: tel,
    email: d.email || '',
    situacao: d.situacao_cadastral
      ? `${String(d.situacao_cadastral)} na Receita Federal`
      : 'ATIVA na Receita Federal',
    data_abertura: d.data_inicio_atividade || '',
    natureza_juridica: d.natureza_juridica || '',
    capital_social: capFormatted,
    opcao_simples: (String(d.opcao_pelo_simples) === 'true' || String(d.opcao_pelo_simples) === 'S') ? 'OPTANTE' : 'NAO OPTANTE',
    opcao_mei: (String(d.opcao_pelo_mei) === 'true' || String(d.opcao_pelo_mei) === 'S') ? 'Sim' : 'Não',
    enriched: true,
  }
}

// ─── Handler Principal ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams
  const setor = sp.get('setor') || ''
  const cidade = sp.get('cidade') || ''
  const estado = sp.get('estado') || ''
  const cnaeParam = sp.get('cnae') || '' // dígitos limpos ex: "2592602"

  if (!setor && !cnaeParam && !cidade) {
    return NextResponse.json({ leads: [], error: 'Parâmetros insuficientes' }, { status: 400 })
  }

  // ── 1. Extrai dígitos de CNAE e palavras-chave puras (sem ruído de parênteses) ─
  const sectorCnaeDigits = setor.replace(/\D/g, '')
  const cnaeDigits = cnaeParam.replace(/\D/g, '') || (sectorCnaeDigits.length >= 4 ? sectorCnaeDigits : '')

  const cnaeFmt = cnaeDigits.length >= 7 
    ? `${cnaeDigits.slice(0, 4)}-${cnaeDigits.slice(4, 5)}/${cnaeDigits.slice(5, 7)}`
    : (cnaeDigits.length >= 4 ? cnaeDigits.slice(0, 4) : '')

  const stopWords = new Set([
    'fabricacao', 'fabricac', 'comercio', 'servicos', 'serviços', 'produtos',
    'exceto', 'outros', 'outras', 'atividades', 'artigos', 'geral', 'varejista',
    'atacadista', 'especializado', 'padronizados'
  ])

  const keyWords = setor
    .replace(/\([A-Z]-\d{4}(?:-\d(?:\/\d{2})?)?\)/gi, '')
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !/^\d+$/.test(w) && !stopWords.has(norm(w)))

  const keySubject = keyWords.slice(0, 2).join(' ')
  const localidade = [cidade, estado].filter(Boolean).join(' ')

  // ── 2. Monta queries direcionadas e eficientes ─────────────────────────────────
  const queries: string[] = []

  if (cnaeFmt && localidade) {
    queries.push(`site:cnpj.biz ${cnaeFmt} "${cidade}"`)
    queries.push(`${cnaeFmt} ${localidade} CNPJ`)
  }

  if (keySubject && localidade) {
    queries.push(`site:cnpj.biz "${cidade}" ${keySubject}`)
    queries.push(`${keySubject} ${localidade} CNPJ`)
  }

  if (localidade && queries.length === 0) {
    queries.push(`site:cnpj.biz "${cidade}" ${estado}`)
  }

  // ── 3. Busca paralela em múltiplos motores (Yahoo, DuckDuckGo, Bing) ───────────
  const allCnpjSets = await Promise.allSettled(
    queries.flatMap(q => [
      searchYahoo(q),
      searchDuckDuckGo(q),
      searchBing(q)
    ])
  )

  const allCnpjs = new Set<string>()
  for (const r of allCnpjSets) {
    if (r.status === 'fulfilled') r.value.forEach(c => allCnpjs.add(c))
  }
  const cnpjList = [...allCnpjs].slice(0, 35)

  if (cnpjList.length === 0) {
    return NextResponse.json({ leads: [], totalFound: 0, source: 'no_results' })
  }

  // ── 4. Enriquece CNPJs via OpenCNPJ (paralelamente, 10 por vez) ───────────────
  const chunks: string[][] = []
  for (let i = 0; i < cnpjList.length; i += 10) {
    chunks.push(cnpjList.slice(i, i + 10))
  }

  const enrichedResults: Array<Record<string, string> | null> = []
  for (const chunk of chunks) {
    const batch = await Promise.allSettled(chunk.map(enrichCnpj))
    batch.forEach((r) => {
      enrichedResults.push(r.status === 'fulfilled' ? r.value : null)
    })
  }

  // ── 5. Filtra estritamente por cidade/UF, CNAE/setor e situação cadastral ─────
  const leads = []
  for (let i = 0; i < cnpjList.length; i++) {
    const data = enrichedResults[i]
    if (!data || !data.razao_social) continue

    // A. Filtra apenas empresas ativas
    const situacaoRaw = data.situacao_cadastral
    const situacaoStr = situacaoRaw != null ? String(situacaoRaw).toUpperCase() : ''
    if (situacaoStr && !situacaoStr.includes('ATIVA') && situacaoStr !== '2' && !situacaoStr.includes('02')) continue

    // B. Filtra por ESTADO (UF) se informado
    const ufRaw = (data.uf || '').toString().trim().toUpperCase()
    if (estado && estado.toUpperCase() !== 'TODOS') {
      if (!ufRaw || ufRaw !== estado.toUpperCase()) continue
    }

    // C. Filtra por CIDADE se informada
    const municipioRaw = (data.municipio || '').toString().trim()
    if (cidade) {
      if (!municipioRaw) continue
      const cidadeNorm = norm(cidade)
      const municipioNorm = norm(municipioRaw)
      if (!municipioNorm.includes(cidadeNorm) && !cidadeNorm.includes(municipioNorm)) continue
    }

    // D. Filtra por CNAE/Setor se informado (compara CNAEs primário e secundários ou palavras-chave)
    const leadCnaeRaw = String(data.cnae_fiscal || '').replace(/\D/g, '')
    const leadAllCnaeDigits = String(data.all_cnae_digits || leadCnaeRaw)
    const leadAllText = norm([
      data.razao_social,
      data.nome_fantasia,
      data.cnae_fiscal_descricao,
      data.all_cnaes_text
    ].filter(Boolean).join(' '))

    const targetCnaeDigits = cnaeDigits

    if (targetCnaeDigits.length >= 4) {
      const targetPrefix4 = targetCnaeDigits.slice(0, 4)
      const targetPrefix2 = targetCnaeDigits.slice(0, 2)
      const cnaeMatch = leadAllCnaeDigits.includes(targetPrefix4) ||
                        leadAllCnaeDigits.includes(targetCnaeDigits) ||
                        leadAllCnaeDigits.includes(targetPrefix2)
      if (!cnaeMatch) continue
    } else if (keySubject) {
      const qNorm = norm(keySubject)
      let sectorMatch = false

      if (/metal|usinagem|solda|trefilad|forjad|fundic/i.test(qNorm)) {
        if (/(?:24|25|28)/.test(leadAllCnaeDigits)) sectorMatch = true
      }
      if (/agro|pecuaria|agricol|grao|fazend/i.test(qNorm)) {
        if (/(?:01|02|03|46|52)/.test(leadAllCnaeDigits)) sectorMatch = true
      }
      if (/embalag|papelao|caixa|cartolin|plastico/i.test(qNorm)) {
        if (/(?:17|22|16)/.test(leadAllCnaeDigits)) sectorMatch = true
      }
      if (/telecom|rede|fibra|internet/i.test(qNorm)) {
        if (/(?:42|61)/.test(leadAllCnaeDigits)) sectorMatch = true
      }
      if (/ferrag|ferrament|parafuso/i.test(qNorm)) {
        if (/(?:47|46|25)/.test(leadAllCnaeDigits)) sectorMatch = true
      }
      if (/construc|sanean|obra|engenh|poco/i.test(qNorm)) {
        if (/(?:41|42|43)/.test(leadAllCnaeDigits)) sectorMatch = true
      }

      const tokens = qNorm.split(/\s+/).filter(t => t.length > 2)
      const matchesToken = tokens.some(t => leadAllText.includes(t))

      if (!sectorMatch && !matchesToken) continue
    }

    leads.push(buildLead(cnpjList[i], data))
  }

  return NextResponse.json({
    leads,
    totalFound: leads.length,
    source: 'live_rfb_opencnpj',
    queriesUsed: queries.slice(0, 4),
  })
}

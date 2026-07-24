import { NextResponse } from 'next/server'

// Domínios de e-mail genéricos a ignorar na inferência de site
const GENERIC_EMAIL_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 
  'bol.com.br', 'uol.com.br', 'terra.com.br', 'ig.com.br', 'icloud.com',
  'live.com', 'msn.com', 'aol.com', 'protonmail.com'
]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { cnpj, companyName, tradeName, email, city, state } = body

    let website = ''
    let instagram = ''
    let linkedin = ''
    let facebook = ''

    // 1. Inferência Direta de Website por E-mail Corporativo (100% Preciso & Grátis)
    if (email && email.includes('@')) {
      const emailDomain = email.split('@')[1]?.toLowerCase().trim()
      if (emailDomain && !GENERIC_EMAIL_DOMAINS.includes(emailDomain)) {
        website = `https://www.${emailDomain}`
      }
    }

    // Nome de busca prioritário
    const searchTarget = (tradeName || companyName || '').trim()
    const cleanLocation = [city, state].filter(Boolean).join(' ')

    if (searchTarget) {
      // 2. Busca Gratuita via HTML Scraping de Motores de Busca com AbortController
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const query = encodeURIComponent(`"${searchTarget}" ${cleanLocation} site:instagram.com OR site:linkedin.com OR site:facebook.com`)
        const res = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          },
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (res.ok) {
          const html = await res.text()
          
          // Extrair links do Instagram
          const instaMatch = html.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_\.]+\/?/i)
          if (instaMatch && !instaMatch[0].includes('/p/') && !instaMatch[0].includes('/reels/')) {
            const rawInsta = instaMatch[0].replace(/\/$/, '')
            if (!rawInsta.includes('instagram.com/accounts') && !rawInsta.includes('instagram.com/explore')) {
              instagram = rawInsta
            }
          }

          // Extrair links do LinkedIn Company
          const linkedinMatch = html.match(/https?:\/\/(www\.)?linkedin\.com\/company\/[a-zA-Z0-9_-]+\/?/i)
          if (linkedinMatch) {
            linkedin = linkedinMatch[0].replace(/\/$/, '')
          }

          // Extrair links do Facebook
          const fbMatch = html.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9_\.-]+\/?/i)
          if (fbMatch && !fbMatch[0].includes('/sharer') && !fbMatch[0].includes('/dialog')) {
            const rawFb = fbMatch[0].replace(/\/$/, '')
            if (!rawFb.includes('facebook.com/public') && !rawFb.includes('facebook.com/events')) {
              facebook = rawFb
            }
          }

          // Se website ainda não foi inferido pelo e-mail, tentar encontrar no HTML se houver link oficial
          if (!website) {
            const siteMatch = html.match(/https?:\/\/(www\.)?([a-zA-Z0-9-]+\.com\.br|[a-zA-Z0-9-]+\.com)\/?/i)
            if (siteMatch) {
              const domain = siteMatch[0].toLowerCase()
              if (!domain.includes('instagram.com') && !domain.includes('linkedin.com') && !domain.includes('facebook.com') && !domain.includes('duckduckgo.com')) {
                website = domain.replace(/\/$/, '')
              }
            }
          }
        }
      } catch (err) {
        console.warn('Erro ou timeout na busca externa de redes sociais:', err)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        website,
        instagram,
        linkedin,
        facebook
      }
    })
  } catch (error: any) {
    console.error('Erro na API de enriquecimento social:', error)
    return NextResponse.json({
      success: false,
      data: { website: '', instagram: '', linkedin: '', facebook: '' },
      error: error.message
    }, { status: 500 })
  }
}

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value?: number | null): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function parseFlexibleDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null
  const s = String(dateStr).trim()
  if (!s) return null

  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(s)) {
    const parts = s.split(/[\sT]+/)
    const dmy = parts[0].split('/')
    const day = parseInt(dmy[0], 10)
    const month = parseInt(dmy[1], 10) - 1
    const year = parseInt(dmy[2], 10)
    let hours = 12, minutes = 0, seconds = 0
    if (parts[1]) {
      const hms = parts[1].split(':')
      hours = parseInt(hms[0], 10) || 0
      minutes = parseInt(hms[1], 10) || 0
      seconds = parseInt(hms[2], 10) || 0
    }
    const dt = new Date(year, month, day, hours, minutes, seconds)
    return isNaN(dt.getTime()) ? null : dt
  }

  const dt = new Date(s)
  return isNaN(dt.getTime()) ? null : dt
}

export function formatDate(date?: string | null): string {
  if (!date) return '—'
  const parsed = parseFlexibleDate(date)
  if (!parsed) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed)
}

export function formatDateTime(date?: string | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date()
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function whatsappLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '')
  const msg = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/55${clean}${msg}`
}

/**
 * Formata qualquer código CNAE no padrão oficial da Receita Federal / IBGE:
 * 7 dígitos: 7112000 -> 7112-0/00
 * 5 dígitos: 71120 -> 7112-0
 * Caso já esteja no padrão (ex: 7112-0/00), mantém inalterado.
 */
export function formatCnaeCode(raw: string | number | undefined | null): string {
  if (!raw) return ''
  const str = String(raw).trim()
  const matchPrefix = str.match(/^([A-Z]-)/i)
  const prefix = matchPrefix ? matchPrefix[1].toUpperCase() : ''
  const cleanStr = str.replace(/^[A-Z]-/i, '')
  const digits = cleanStr.replace(/\D/g, '')

  if (digits.length === 7) {
    return `${prefix}${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5, 7)}`
  }
  if (digits.length === 5) {
    return `${prefix}${digits.slice(0, 4)}-${digits.slice(4, 5)}`
  }
  if (digits.length === 4) {
    return `${prefix}${digits.slice(0, 4)}`
  }
  return str
}

export function formatCnaeFullString(raw: string | undefined | null): string {
  if (!raw) return ''
  const str = String(raw).trim()
  if (str.includes(' - ')) {
    const parts = str.split(' - ')
    const formattedCode = formatCnaeCode(parts[0])
    return `${formattedCode} - ${parts.slice(1).join(' - ')}`
  }
  return formatCnaeCode(str)
}

/**
 * Normaliza o nome do representante removendo acentos, duplicidades de hífens,
 * sufixos e convertendo para minúsculas para agrupamento e comparação perfeita.
 */
export function normalizeRepKey(repStr?: string | null): string {
  if (!repStr) return ''
  let cleaned = String(repStr).trim()
  if (cleaned.includes(' - ')) {
    cleaned = cleaned.split(' - ')[0].trim()
  }
  return cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retorna o nome canônico formatado de forma limpa e padronizada com Primeira Letra Maiúscula (ex: "Bottega Representações Ltda")
 */
export function formatCanonicalRepName(repStr?: string | null): string {
  if (!repStr) return ''
  let cleaned = String(repStr).trim()
  if (cleaned.includes(' - ')) {
    cleaned = cleaned.split(' - ')[0].trim()
  }
  if (!cleaned) return ''

  const words = cleaned.split(/\s+/)
  return words.map((w, idx) => {
    if (!w) return ''
    const lower = w.toLowerCase()
    if (['de', 'da', 'do', 'dos', 'das', 'e'].includes(lower) && idx > 0 && idx < words.length - 1) {
      return lower
    }
    return w.replace(/([a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+)/g, (match) => {
      return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()
    })
  }).join(' ')
}

/**
 * Verifica se o nome ou e-mail corresponde ao Usuário Master (Maurício Maciel).
 */
export function isMasterUser(nameOrEmail?: string | null): boolean {
  if (!nameOrEmail) return false
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
  const clean = norm(nameOrEmail)
  return clean.includes('mauricio maciel') || 
         clean.includes('mauricio.maciel') || 
         clean.includes('mauricio.admin') || 
         (clean.includes('mauricio') && clean.includes('maciel'))
}

/**
 * Agrupa, desduplica e ordena os nomes de representantes comerciais a partir de uma lista bruta.
 * Funde nomes em maiúsculas/minúsculas/acentuados em um único nome canônico limpo.
 */
export function getUniqueCanonicalRepresentatives(rawReps: (string | undefined | null)[]): string[] {
  const map = new Map<string, string>()
  
  for (const raw of rawReps) {
    if (!raw) continue
    if (isMasterUser(raw)) continue // Oculta o usuario Master Maurício Maciel dos filtros
    const key = normalizeRepKey(raw)
    if (!key) continue
    
    if (!map.has(key)) {
      map.set(key, formatCanonicalRepName(raw))
    }
  }
  
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * Compara se dois representantes correspondem à mesma entidade (insensível a maiúsculas/acentos).
 */
export function isSameRepresentative(repA?: string | null, repB?: string | null): boolean {
  if (!repA || !repB) return false
  const keyA = normalizeRepKey(repA)
  const keyB = normalizeRepKey(repB)
  if (!keyA || !keyB) return false
  return keyA === keyB
}


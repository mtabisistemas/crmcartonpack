'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sun, Moon } from 'lucide-react'
import { CartonPackLogo } from '../CartonPackLogo'

// Map of pathnames to page titles
const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline',
  '/contacts': 'Carteira de Clientes',
  '/users': 'Usuários',
  '/briefings': 'Orçamentos',
  '/ai-chat': 'IA Assistente',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
  '/rotas': 'Rotas',
  '/roi-simulator': 'Simulador ROI',
}

export function MobileTopBar() {
  const pathname = usePathname()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      setTheme(activeTheme)
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  // Representatives have their own header built into dashboard/page.tsx
  if (currentUser?.role === 'representante' || currentUser?.role === 'vendedor') return null

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cp_crm_theme', newTheme)
    localStorage.setItem('theme', newTheme)
    document.cookie = `cp_crm_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
  }

  const title = PAGE_TITLES[pathname] ?? 'CRM CartonPack'

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#161718]/95 backdrop-blur-xl border-b border-[var(--line)] px-4 h-14 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      {/* Page Title */}
      <h1 className="font-display text-base text-[var(--white)] font-bold tracking-tight truncate">
        {title}
      </h1>

      {/* Theme Toggle Icon */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        className="p-2 rounded-xl text-[var(--gray2)] hover:text-[var(--white)] hover:bg-[var(--charcoal)] transition-all bg-transparent border border-[var(--line)] cursor-pointer shrink-0"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  )
}

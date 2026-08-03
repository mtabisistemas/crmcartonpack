'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sun, Moon, LogOut } from 'lucide-react'
import { CartonPackLogo } from '../CartonPackLogo'
import { InstallPWAButton } from '../InstallPWA'

// Map of pathnames to page titles
const PAGE_TITLES: Record<string, string> = {
  '/diario-de-bordo': 'Diário de Bordo',
  '/dashboard': 'Dashboard',
  '/pipeline': 'Pipeline',
  '/contacts': 'Carteira de Clientes',
  '/users': 'Usuários',
  '/metas': 'Metas & Parâmetros',
  '/briefings': 'Orçamentos',
  '/ai-chat': 'IA Assistente',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
  '/rotas': 'Rotas',
  '/roi-simulator': 'Simulador ROI',
}

export function MobileTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      setTheme(activeTheme)
    }
  }, [])

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cp_crm_theme', newTheme)
    localStorage.setItem('theme', newTheme)
    document.cookie = `cp_crm_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
  }

  function handleLogout() {
    localStorage.removeItem('crm_current_user')
    document.cookie = 'cp_crm_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/login')
    router.refresh()
  }

  const title = PAGE_TITLES[pathname] ?? 'CRM CartonPack'

  return (
    <header className="mobile-topbar lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#161718]/95 backdrop-blur-xl border-b border-[var(--line)] px-4 h-14 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      {/* Page Title */}
      <h1 className="font-display text-base text-[var(--white)] font-bold tracking-tight truncate">
        {title}
      </h1>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <InstallPWAButton variant="mobile_header" />
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          className="p-2 rounded-xl text-[var(--gray2)] hover:text-[var(--white)] hover:bg-[var(--charcoal)] transition-all bg-transparent border border-[var(--line)] cursor-pointer shrink-0"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={handleLogout}
          aria-label="Sair"
          title="Sair"
          className="p-2 rounded-xl text-[var(--gray2)] hover:text-red-400 hover:bg-[var(--charcoal)] transition-all bg-transparent border border-[var(--line)] cursor-pointer shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}

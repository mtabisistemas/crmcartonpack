'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Sun,
  Moon,
  UserCog,
  MapPin,
  User,
} from 'lucide-react'

import { CartonPackLogo } from '../CartonPackLogo'
import { InstallPWAButton } from '../InstallPWA'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',     icon: KanbanSquare },
  { href: '/contacts',   label: 'Contatos',     icon: Users },
  { href: '/users',      label: 'Usuários',     icon: UserCog },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const router = useRouter()
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

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('cp_crm_theme', newTheme)
    localStorage.setItem('theme', newTheme)
    document.cookie = `cp_crm_theme=${newTheme}; path=/; max-age=31536000; SameSite=Lax`
  }

  async function handleLogout() {
    localStorage.removeItem('crm_current_user')
    document.cookie = 'cp_crm_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    router.replace('/login')
    router.refresh()
  }

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'

  const repNavItems = [
    { href: '/dashboard?tab=dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/dashboard?tab=painel', label: 'Painel do Rep', icon: LayoutDashboard },
    { href: '/contacts', label: 'Clientes', icon: Users },
    { href: '/dashboard?tab=mapa', label: 'Mapa de Clientes', icon: MapPin },
  ]

  const adminNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Contatos', icon: Users },
    { href: '/users', label: 'Usuários', icon: UserCog },
  ]

  const items = isRep ? repNavItems : adminNavItems

  return (
    <aside className="sidebar hidden lg:flex">
      {/* Logo Oficial Carton Pack com troca de tema */}
      <div className="px-5 py-5 border-b border-[var(--line)] flex flex-col gap-1 select-none">
        <Link href="/dashboard" className="flex items-center gap-2">
          <CartonPackLogo height={28} />
        </Link>
        <span className="text-[10px] font-mono text-[var(--gray2)] tracking-widest uppercase pl-0.5">
          CRM Comercial & Operacional
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="sidebar-section">
          {items.map(({ href, label, icon: Icon }) => {
            let active = false
            if (href.includes('?tab=')) {
              const targetTab = href.split('?tab=')[1]
              active = pathname === '/dashboard' && (tabParam === targetTab || (!tabParam && targetTab === 'dashboard'))
            } else {
              active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
            }

            return (
              <Link
                key={href}
                href={href}
                className={`nav-item${active ? ' active' : ''}`}
              >
                <div className="nav-item-icon">
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span>{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Logged in User Profile Card */}
      {currentUser && (
        <div className="px-4 py-3 border-t border-[var(--line)] flex items-center gap-3 bg-[var(--charcoal)]/40 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-lime-500/10 text-[var(--lime)] font-mono font-bold flex items-center justify-center border border-lime-500/20 shrink-0">
            <User size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-[var(--white)] block truncate">{currentUser.name}</span>
            <span className="text-[10px] font-mono text-[var(--gray2)] uppercase block truncate">{currentUser.role || 'Usuário'}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <InstallPWAButton variant="sidebar" />

        <button
          onClick={toggleTheme}
          className="nav-item text-left border-none bg-none cursor-pointer w-full mb-1"
        >
          <div className="nav-item-icon">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </div>
          <span>Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
        </button>

        <button
          onClick={handleLogout}
          className="nav-item text-left border-none bg-none cursor-pointer w-full"
        >
          <div className="nav-item-icon">
            <LogOut size={18} />
          </div>
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )
}

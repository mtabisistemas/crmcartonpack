'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
} from 'lucide-react'

import { CartonPackLogo } from '../CartonPackLogo'

const navItems = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/pipeline',   label: 'Pipeline',     icon: KanbanSquare },
  { href: '/contacts',   label: 'Contatos',     icon: Users },
  { href: '/users',      label: 'Usuários',     icon: UserCog },
  { href: '/briefings',  label: 'Orçamentos',   icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
    setTheme(activeTheme)
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
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
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

      {/* Footer */}
      <div className="sidebar-footer">
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

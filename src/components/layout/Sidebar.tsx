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
  Target,
  Compass,
  BookOpen,
  HelpCircle,
  Calendar,
  Plus,
  CheckCircle2,
} from 'lucide-react'

import { CartonPackLogo } from '../CartonPackLogo'
import { InstallPWAButton } from '../InstallPWA'
import { RegisterActivityModal } from '../RegisterActivityModal'

const navItems = [
  { href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
  { href: '/contacts', label: 'Contatos', icon: Users },
  { href: '/agenda', label: 'Agenda', icon: Calendar },
  { href: '/users', label: 'Usuários', icon: UserCog },
  { href: '/guia', label: 'Manual do Sistema', icon: BookOpen },
]

export function Sidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const router = useRouter()
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [contactsList, setContactsList] = useState<any[]>([])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const loadContacts = () => {
        const raw = localStorage.getItem('crm_contacts')
        if (raw) {
          try {
            setContactsList(JSON.parse(raw))
          } catch (e) {}
        }
      }
      loadContacts()
      window.addEventListener('storage-contacts-changed', loadContacts)
      return () => window.removeEventListener('storage-contacts-changed', loadContacts)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      setTheme(activeTheme)
      if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }

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
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
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

  const repNavItems = [
    { href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Clientes', icon: Users },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/guia', label: 'Manual do Sistema', icon: BookOpen },
  ]

  const vendedorNavItems = [
    { href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Clientes', icon: Users },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/guia', label: 'Manual do Sistema', icon: BookOpen },
  ]

  const adminNavItems = [
    { href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Contatos', icon: Users },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/users', label: 'Usuários', icon: UserCog },
    { href: '/metas', label: 'Metas & Parâmetros', icon: Target },
    { href: '/guia', label: 'Manual do Sistema', icon: BookOpen },
  ]

  const items = currentUser?.role === 'representante'
    ? repNavItems
    : currentUser?.role === 'vendedor'
    ? vendedorNavItems
    : adminNavItems

  return (
    <aside className="sidebar hidden lg:flex">
      {/* Logo Oficial Carton Pack com troca de tema */}
      <div className="px-5 py-5 border-b border-[var(--line)] flex flex-col gap-1 select-none">
        <Link href="/diario-de-bordo" className="flex items-center gap-2">
          <CartonPackLogo height={28} isLightMode={false} />
        </Link>
        <span className="text-[10px] font-mono text-[var(--gray2)] tracking-widest uppercase pl-0.5">
          CRM Comercial & Operacional
        </span>
      </div>

      {/* Botão Global de Destaque "+ REGISTRAR ATIVIDADE" (Sempre Visível no Desktop) */}
      <div className="px-4 py-3 border-b border-[var(--line)] shrink-0">
        <button
          type="button"
          onClick={() => setShowActivityModal(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-[var(--lime)] hover:brightness-110 text-black text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[rgba(180,217,50,0.15)] transition-all cursor-pointer active:scale-95"
        >
          <Plus size={15} strokeWidth={3} />
          <span>Registrar Atividade</span>
        </button>
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
      <RegisterActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        contactsList={contactsList}
      />
    </aside>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Users, 
  FileText, 
  Menu, 
  UserCog, 
  BarChart3, 
  Settings, 
  Sun, 
  Moon, 
  LogOut,
  X
} from 'lucide-react'

export function MobileNavBar() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {
          console.error(e)
        }
      }
      const activeTheme = (document.documentElement.getAttribute('data-theme') || 'dark') as 'dark' | 'light'
      setTheme(activeTheme)
    }
  }, [])

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'

  function toggleTheme() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  function handleLogout() {
    localStorage.removeItem('crm_current_user')
    router.push('/login')
  }

  const primaryItems = isRep ? [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Clientes', icon: Users },
  ] : [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pipeline', label: 'Pipeline', icon: KanbanSquare },
    { href: '/contacts', label: 'Contatos', icon: Users },
    { href: '/users', label: 'Usuários', icon: UserCog },
  ]

  const moreItems: any[] = []

  return (
    <>
      {/* Bottom Nav Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#161718]/95 backdrop-blur-xl border-t border-[var(--line)] flex justify-around items-center px-2 py-2 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                active 
                  ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
                  : 'text-[var(--gray2)] hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider">{label}</span>
            </Link>
          )
        })}

        {/* More Button */}
        <button
          onClick={() => setShowMoreMenu(true)}
          className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 cursor-pointer ${
            showMoreMenu 
              ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)] scale-105' 
              : 'text-[var(--gray2)] hover:text-white'
          }`}
        >
          <Menu size={18} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Mais</span>
        </button>
      </div>

      {/* Floating More Bottom Sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 bg-black/80 z-50 lg:hidden flex flex-col justify-end" onClick={() => setShowMoreMenu(false)}>
          <div 
            className="bg-[var(--charcoal)] border-t border-[var(--line)] rounded-t-3xl p-5 flex flex-col gap-4 animate-fade-up max-w-md mx-auto w-full pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
              <span className="text-xs font-mono font-bold text-[var(--lime)] uppercase tracking-wider">Outros Módulos</span>
              <button 
                onClick={() => setShowMoreMenu(false)}
                className="p-1 rounded-lg bg-black/20 text-[var(--gray)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {moreItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--lime)]/30 transition-all ${active ? 'border-[var(--lime)]/50 text-[var(--lime)]' : 'text-[var(--white)]'}`}
                  >
                    <Icon size={18} className={active ? 'text-[var(--lime)]' : 'text-[var(--gray)]'} />
                    <span className="text-xs font-bold font-display">{label}</span>
                  </Link>
                )
              })}

              <div className="grid grid-cols-2 gap-3 mt-2 border-t border-[var(--line)] pt-4">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:border-[var(--lime)]/30 text-[var(--white)] text-xs font-bold bg-transparent"
                >
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>Modo {theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-950/20 hover:bg-red-900/20 text-red-400 text-xs font-bold"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

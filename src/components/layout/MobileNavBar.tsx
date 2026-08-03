'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Target,
  Compass,
  CheckCircle,
  Calendar,
} from 'lucide-react'
import { RegisterActivityModal } from '@/components/RegisterActivityModal'
import { PipelineCalendarModal } from '@/components/pipeline/PipelineCalendarModal'

type NavItem =
  | { type: 'link'; href: string; label: string; icon: any }
  | { type: 'action'; action: 'agenda'; label: string; icon: any }

export function MobileNavBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showCalendarModal, setShowCalendarModal] = useState(false)
  const [contactsList, setContactsList] = useState<any[]>([])

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

  const repItems: NavItem[] = [
    { type: 'link', href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { type: 'link', href: '/dashboard?tab=painel', label: 'Painel do Rep', icon: Target },
    { type: 'link', href: '/contacts', label: 'Clientes', icon: Users },
    { type: 'action', action: 'agenda', label: 'Agenda', icon: Calendar },
  ]

  const vendedorItems: NavItem[] = [
    { type: 'link', href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'link', href: '/contacts', label: 'Clientes', icon: Users },
    { type: 'action', action: 'agenda', label: 'Agenda', icon: Calendar },
  ]

  const adminItems: NavItem[] = [
    { type: 'link', href: '/diario-de-bordo', label: 'Diário de Bordo', icon: Compass },
    { type: 'link', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { type: 'link', href: '/contacts', label: 'Contatos', icon: Users },
    { type: 'link', href: '/users', label: 'Usuários', icon: UserCog },
  ]

  const items: NavItem[] = currentUser?.role === 'representante'
    ? repItems
    : currentUser?.role === 'vendedor'
    ? vendedorItems
    : adminItems

  const splitAt = Math.ceil(items.length / 2)
  const leftItems = items.slice(0, splitAt)
  const rightItems = items.slice(splitAt)

  // Representatives have their own header built into dashboard/page.tsx
  if (currentUser?.role === 'representante' && pathname === '/dashboard') {
    return null
  }

  function isActive(href: string) {
    if (href.includes('?tab=')) {
      const targetTab = href.split('?tab=')[1]
      return pathname === '/dashboard' && tabParam === targetTab
    }
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  function renderItem(item: NavItem) {
    const Icon = item.icon

    if (item.type === 'action') {
      return (
        <button
          key={item.action}
          type="button"
          onClick={() => {
            if (item.action === 'agenda') setShowCalendarModal(true)
          }}
          aria-label={item.label}
          title={item.label}
          className="flex-1 flex items-center justify-center py-2 rounded-2xl transition-all duration-200 cursor-pointer text-[var(--gray2)] hover:text-white border border-transparent"
        >
          <Icon size={20} strokeWidth={2} />
        </button>
      )
    }

    const active = isActive(item.href)
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-label={item.label}
        title={item.label}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex items-center justify-center py-2 rounded-2xl transition-all duration-200 ${
          active
            ? 'text-[var(--lime)] bg-lime-500/10 border border-lime-500/25 shadow-[0_0_15px_rgba(180,217,50,0.15)]'
            : 'text-[var(--gray2)] hover:text-white border border-transparent'
        }`}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </Link>
    )
  }

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#161718]/95 backdrop-blur-xl border-t border-[var(--line)] flex items-stretch px-1 py-1.5 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="flex-1 flex items-stretch justify-around">
          {leftItems.map(renderItem)}
        </div>

        <div className="w-16 shrink-0" aria-hidden="true" />

        <div className="flex-1 flex items-stretch justify-around">
          {rightItems.map(renderItem)}
        </div>

        <button
          type="button"
          onClick={() => setShowActivityModal(true)}
          aria-label="Registrar Atividade"
          title="Registrar Atividade"
          className="absolute left-1/2 -translate-x-1/2 -top-4 w-14 h-14 rounded-full bg-[var(--lime)] text-[#060606] shadow-[0_4px_20px_rgba(180,217,50,0.5)] flex items-center justify-center border-4 border-[#161718] cursor-pointer active:scale-95 transition-transform"
        >
          <CheckCircle size={24} strokeWidth={2.3} />
        </button>
      </nav>

      <RegisterActivityModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        contactsList={contactsList}
        onSuccess={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('storage-deals-changed'))
          }
        }}
      />

      <PipelineCalendarModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
      />
    </>
  )
}

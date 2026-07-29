'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileNavBar } from '@/components/layout/MobileNavBar'
import { MobileTopBar } from '@/components/layout/MobileTopBar'
import { Loader2 } from 'lucide-react'

import { ToastContainer } from '@/components/ToastContainer'

import ActivityTracker from '@/components/ActivityTracker'

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [currentUser, setCurrentUser] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          setCurrentUser(JSON.parse(session))
        } catch (e) {}
      }
    }
  }, [])

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'

  useEffect(() => {
    function checkAuth() {
      if (typeof window === 'undefined') return

      const userSession = localStorage.getItem('crm_current_user')
      if (!userSession) {
        setIsAuthenticated(false)
        router.replace('/login')
        return
      }

      try {
        const user = JSON.parse(userSession)
        if (!user || !user.id || user.status === 'inativo') {
          localStorage.removeItem('crm_current_user')
          document.cookie = 'cp_crm_session=; path=/; max-age=0'
          setIsAuthenticated(false)
          router.replace('/login?error=inactive')
          return
        }

        // Live check against saved user accounts
        const keysToSearch = ['crm_users', 'cp_crm_v7_official_users']
        for (const key of keysToSearch) {
          const raw = localStorage.getItem(key)
          if (raw) {
            try {
              const list = JSON.parse(raw)
              if (Array.isArray(list)) {
                const match = list.find((u: any) => 
                  u.id === user.id || 
                  (u.email && user.email && u.email.toLowerCase() === user.email.toLowerCase()) ||
                  (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase())
                )
                if (match && match.status === 'inativo') {
                  localStorage.removeItem('crm_current_user')
                  document.cookie = 'cp_crm_session=; path=/; max-age=0'
                  setIsAuthenticated(false)
                  router.replace('/login?error=inactive')
                  return
                }
              }
            } catch (e) {}
          }
        }

        setIsAuthenticated(true)
      } catch (e) {
        localStorage.removeItem('crm_current_user')
        setIsAuthenticated(false)
        router.replace('/login')
      }
    }

    checkAuth()
  }, [pathname, router])

  if (isAuthenticated === null || isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/30 text-[var(--lime)] flex items-center justify-center mb-4">
          <Loader2 size={24} className="animate-spin text-[var(--lime)]" />
        </div>
        <h2 className="text-sm font-bold font-display text-white uppercase tracking-wider">
          Verificando Autenticação Segura...
        </h2>
        <p className="text-xs font-mono text-zinc-500 mt-1">
          Acesso restrito. Redirecionando para login...
        </p>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <ToastContainer />
      <ActivityTracker />
      <Sidebar />
      {/* Mobile Top Header Bar (admin/manager only — reps have their own header) */}
      <MobileTopBar />
      <main className={`main-content lg:pt-0 ${isRep ? 'pt-2' : 'pt-14'}`}>
        {children}
      </main>
      <MobileNavBar />
    </div>
  )
}

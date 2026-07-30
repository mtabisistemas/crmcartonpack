'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export function StagingBanner() {
  const [isStaging, setIsStaging] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const env = process.env.NEXT_PUBLIC_ENVIRONMENT || ''
      const host = window.location.hostname.toLowerCase()
      
      const isStagingEnv = 
        env === 'staging' ||
        env === 'homologacao' ||
        host.includes('staging') ||
        host.includes('homologacao') ||
        host.includes('preview')

      setIsStaging(isStagingEnv)
    }
  }, [])

  if (!isStaging) return null

  return (
    <div className="w-full bg-amber-500 text-black px-4 py-1.5 text-center font-mono text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shrink-0 border-b border-amber-600 z-[99999] select-none">
      <AlertTriangle size={14} className="animate-pulse text-black shrink-0" />
      <span>⚠️ AMBIENTE DE HOMOLOGAÇÃO & TESTES — Alterações nesta área não afetam a Produção</span>
      <span className="bg-black text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-400/40 ml-1 shrink-0">
        STAGING
      </span>
    </div>
  )
}

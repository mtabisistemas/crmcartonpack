'use client'

import { useState, useEffect } from 'react'
import { Download, Smartphone, X, Share } from 'lucide-react'

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(true) // default to true until checked
  const [isIOS, setIsIOS] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // 1. Check if already running in standalone mode (installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('cp_crm_app_installed') === 'true'

    if (isStandalone) {
      setIsInstalled(true)
      localStorage.setItem('cp_crm_app_installed', 'true')
      return
    }

    // App is not installed yet
    setIsInstalled(false)

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(ua)
    setIsIOS(ios)

    // Listen for Chrome/Edge/Android beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    // Listen for successful installation event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      localStorage.setItem('cp_crm_app_installed', 'true')
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsInstalled(true)
        localStorage.setItem('cp_crm_app_installed', 'true')
      }
      setDeferredPrompt(null)
    }
  }

  return {
    isInstalled,
    deferredPrompt,
    isIOS,
    promptInstall
  }
}

export function InstallPWAButton({ 
  variant = 'sidebar',
  className = '' 
}: { 
  variant?: 'sidebar' | 'header' | 'mobile_header'
  className?: string 
}) {
  const { isInstalled, isIOS, promptInstall, deferredPrompt } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  // If already installed, hide completely!
  if (isInstalled) return null

  const handleClick = () => {
    if (isIOS) {
      setShowIOSModal(true)
    } else if (deferredPrompt) {
      promptInstall()
    } else {
      // Fallback for browsers without direct prompt API
      promptInstall()
    }
  }

  return (
    <>
      {variant === 'sidebar' && (
        <button
          onClick={handleClick}
          title="Baixar Aplicativo no seu dispositivo"
          className={`nav-item text-left border-none bg-none cursor-pointer w-full text-[var(--lime)] hover:text-white font-bold transition-all ${className}`}
        >
          <div className="nav-item-icon text-[var(--lime)]">
            <Download size={18} />
          </div>
          <span>Baixar App</span>
        </button>
      )}

      {variant === 'header' && (
        <button
          onClick={handleClick}
          title="Baixar Aplicativo (PWA)"
          className={`btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-2 cursor-pointer text-[var(--lime)] border-[var(--lime)]/40 hover:border-[var(--lime)] font-bold shadow-lg ${className}`}
        >
          <Download size={14} />
          <span>Baixar App</span>
        </button>
      )}

      {variant === 'mobile_header' && (
        <button
          onClick={handleClick}
          title="Baixar Aplicativo (PWA)"
          className={`p-2 rounded-xl text-[var(--lime)] bg-[var(--lime)]/10 hover:bg-[var(--lime)]/20 transition-all border border-[var(--lime)]/30 cursor-pointer shrink-0 flex items-center gap-1 text-[11px] font-mono font-bold ${className}`}
        >
          <Download size={15} />
          <span className="hidden sm:inline">Baixar App</span>
        </button>
      )}

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-3xl p-6 max-w-sm w-full flex flex-col gap-4 animate-fade-in shadow-2xl">
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2 text-[var(--lime)]">
                <Smartphone size={20} />
                <h3 className="font-display text-sm font-bold text-white">Instalar no iPhone / iPad</h3>
              </div>
              <button 
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-lg bg-black/30 text-[var(--gray)] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs text-[var(--gray)] font-mono leading-relaxed">
              <p>Siga os passos abaixo no Safari para instalar o app:</p>
              <div className="flex items-center gap-2 p-2.5 bg-black/40 rounded-xl border border-[var(--line)]">
                <Share size={16} className="text-[var(--lime)] shrink-0" />
                <span>1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-black/40 rounded-xl border border-[var(--line)]">
                <Smartphone size={16} className="text-[var(--lime)] shrink-0" />
                <span>2. Role para baixo e escolha <strong>Adicionar à Tela de Início</strong>.</span>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="btn btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-black mt-2"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}

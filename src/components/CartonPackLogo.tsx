'use client'

import React, { useState, useEffect } from 'react'

interface CartonPackLogoProps {
  height?: number
  className?: string
  isLightMode?: boolean
}

export function CartonPackLogo({ height = 40, className = '', isLightMode }: CartonPackLogoProps) {
  const [activeTheme, setActiveTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    if (typeof isLightMode === 'boolean') {
      setActiveTheme(isLightMode ? 'light' : 'dark')
      return
    }

    const checkTheme = () => {
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
      setActiveTheme(current)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [isLightMode])

  const logoSrc = activeTheme === 'light' ? '/cartonpack-logo-light.png' : '/cartonpack-logo.png'

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={logoSrc}
        alt="CARTON PACK®"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
        className="brightness-105 drop-shadow-[0_2px_10px_rgba(180,217,50,0.25)] transition-all duration-200"
      />
    </div>
  )
}

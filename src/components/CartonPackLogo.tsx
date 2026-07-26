import React from 'react'

interface CartonPackLogoProps {
  height?: number
  className?: string
}

export function CartonPackLogo({ height = 40, className = '' }: CartonPackLogoProps) {
  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/cartonpack-logo.png"
        alt="CARTON PACK®"
        style={{ height: `${height}px`, width: 'auto', objectFit: 'contain' }}
        className="brightness-110 drop-shadow-[0_4px_16px_rgba(180,217,50,0.25)]"
      />
    </div>
  )
}

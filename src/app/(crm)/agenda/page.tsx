'use client'

import { useState } from 'react'
import { PipelineCalendarModal } from '@/components/pipeline/PipelineCalendarModal'
import { useRouter } from 'next/navigation'

export default function AgendaPage() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(true)

  const handleClose = () => {
    setIsOpen(false)
    router.push('/pipeline')
  }

  return (
    <div className="page-content w-full h-full flex flex-col items-center justify-center relative min-h-[600px]">
      <PipelineCalendarModal
        isOpen={isOpen}
        onClose={handleClose}
      />
    </div>
  )
}

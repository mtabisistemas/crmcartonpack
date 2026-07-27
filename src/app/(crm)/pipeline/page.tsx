import type { Metadata } from 'next'
import { PipelineBoard } from '@/components/pipeline/PipelineBoard'

export const metadata: Metadata = { title: 'Carton Pack CRM' }

export default function PipelinePage() {
  return <PipelineBoard />
}

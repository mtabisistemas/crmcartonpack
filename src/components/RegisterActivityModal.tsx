'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Mic, MicOff, Camera, CheckCircle2, Phone, MessageSquare, Mail, Video, MapPin, Target, FileText, Package, Briefcase, Trophy, RefreshCw, Handshake, AlertCircle, Building2 } from 'lucide-react'
import { DealStage } from '@/types'
import { supabase } from '@/services/supabase-client'

export interface RegisterActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  contactsList: Array<{ id: string; name: string; company: string; city?: string; state?: string; phone?: string; representative?: string }>
  preselectedContactId?: string
}

export const CHANNEL_OPTIONS = [
  { id: 'visita', label: 'Reunião Presencial (Visita)', icon: MapPin, color: 'text-cyan-400' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-400' },
  { id: 'ligacao', label: 'Ligação Telefônica', icon: Phone, color: 'text-amber-400' },
  { id: 'email', label: 'E-mail', icon: Mail, color: 'text-indigo-400' },
  { id: 'reuniao_online', label: 'Reunião Online (Video)', icon: Video, color: 'text-purple-400' },
]

export const ACTION_OPTIONS: Array<{
  id: string
  label: string
  stage: DealStage
  icon: any
  description: string
}> = [
  { id: 'prospeccao', label: 'Prospecção / 1º Contato', stage: 'prospect', icon: Target, description: 'Apresentação inicial ou prospecção ativa' },
  { id: 'briefing', label: 'Orçamento / Solicitou Briefing', stage: 'briefing', icon: FileText, description: 'Cliente solicitou cotação de embalagem' },
  { id: 'amostra', label: 'Envio de Amostra / Layout', stage: 'aprovacao', icon: Package, description: 'Amostra física ou mockup em aprovação' },
  { id: 'negociacao', label: 'Negociação / Proposta', stage: 'potencial', icon: Briefcase, description: 'Apresentação de proposta comercial ou negociação' },
  { id: 'visita_relato', label: 'Reunião / Acompanhamento', stage: 'visita', icon: MapPin, description: 'Reunião técnica ou alinhamento comercial' },
  { id: 'fechamento', label: 'Fechamento de Venda', stage: 'fechamento', icon: Trophy, description: 'Pedido fechado e venda realizada' },
  { id: 'pos_venda', label: 'Pós-Venda / Atendimento', stage: 'pos_venda', icon: Handshake, description: 'Manutenção de carteira e acompanhamento' },
  { id: 'reativacao', label: 'Reativação de Inativo', stage: 'dinamica', icon: RefreshCw, description: 'Contato para reativar cliente sem compra' },
  { id: 'perdido', label: 'Sem Interesse / Perdido', stage: 'perdido', icon: AlertCircle, description: 'Cliente declinou a proposta ou sem interesse' },
]

export function RegisterActivityModal({
  isOpen,
  onClose,
  onSuccess,
  contactsList,
  preselectedContactId = ''
}: RegisterActivityModalProps) {
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [selectedContactId, setSelectedContactId] = useState(preselectedContactId)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)

  const [channel, setChannel] = useState('visita')
  const [actionId, setActionId] = useState('prospeccao')
  const [description, setDescription] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isSavedToast, setIsSavedToast] = useState(false)

  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<any>(null)
  const finalTranscriptRef = useRef<string>('')
  const initialTextRef = useRef<string>('')
  const isRecordingRef = useRef<boolean>(false)

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

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target as Node)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (preselectedContactId) {
      const found = contactsList.find(c => 
        c.id === preselectedContactId ||
        (c.company && c.company.toLowerCase().trim() === preselectedContactId.toLowerCase().trim()) ||
        (c.name && c.name.toLowerCase().trim() === preselectedContactId.toLowerCase().trim())
      )
      if (found) {
        setSelectedContactId(found.id)
        setClientSearchTerm(found.company || found.name)
      } else {
        setSelectedContactId(preselectedContactId)
      }
    }
  }, [preselectedContactId, contactsList])

  useEffect(() => {
    if (selectedContactId) {
      const found = contactsList.find(c => c.id === selectedContactId)
      if (found) {
        setClientSearchTerm(found.company || found.name)
      }
    } else if (!preselectedContactId) {
      setClientSearchTerm('')
    }
  }, [selectedContactId, contactsList, preselectedContactId])

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingTime(0)
    }
    return () => clearInterval(timerRef.current)
  }, [isRecording])

  if (!isOpen) return null

  // Helper to deduplicate repeating word/phrase cascades from speech engines (e.g. Chrome Android)
  const cleanTranscribedText = (text: string): string => {
    if (!text) return ''
    const cleaned = text.replace(/\s+/g, ' ').trim()
    const words = cleaned.split(' ')
    const result: string[] = []

    for (let i = 0; i < words.length; i++) {
      let isDup = false

      // Check for phrase repeats ranging from 1 to 8 words long
      for (let len = 1; len <= 8; len++) {
        if (result.length >= len) {
          const prevPhrase = result.slice(result.length - len).join(' ').toLowerCase()
          const nextPhrase = words.slice(i, i + len).join(' ').toLowerCase()

          if (prevPhrase === nextPhrase && nextPhrase.length > 0) {
            isDup = true
            i += len - 1 // Skip the duplicate phrase block
            break
          }
        }
      }

      if (!isDup) {
        result.push(words[i])
      }
    }

    return result.join(' ').replace(/\s+/g, ' ').trim()
  }

  const handleStartRecording = () => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      try {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()
        // continuous = false prevents Chrome Android cumulative stream duplication bugs
        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = 'pt-BR'

        initialTextRef.current = description ? description.trim() : ''
        isRecordingRef.current = true

        recognition.onresult = (event: any) => {
          let interimTranscript = ''
          let finalTranscript = ''

          for (let i = 0; i < event.results.length; i++) {
            const transcript = event.results[i][0]?.transcript || ''
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' '
            } else {
              interimTranscript += transcript
            }
          }

          if (finalTranscript) {
            const base = initialTextRef.current ? initialTextRef.current + ' ' : ''
            const newBase = cleanTranscribedText(base + finalTranscript)
            initialTextRef.current = newBase
            setDescription(newBase)
          } else {
            const base = initialTextRef.current ? initialTextRef.current + ' ' : ''
            const rawText = base + interimTranscript
            const cleanedText = cleanTranscribedText(rawText)
            setDescription(cleanedText)
          }
        }

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error)
          if (event.error === 'no-speech' || event.error === 'audio-capture') {
            // Silence restart
            if (isRecordingRef.current) {
              try { recognition.start() } catch (e) {}
            } else {
              setIsRecording(false)
            }
          } else {
            isRecordingRef.current = false
            setIsRecording(false)
          }
        }

        recognition.onend = () => {
          // Auto-restart while recording is active to capture continuous discrete sentences cleanly
          if (isRecordingRef.current) {
            try {
              recognition.start()
            } catch (e) {
              isRecordingRef.current = false
              setIsRecording(false)
            }
          } else {
            setIsRecording(false)
          }
        }

        recognitionRef.current = recognition
        recognition.start()
        setIsRecording(true)
      } catch (e) {
        console.error('Speech recognition start failed:', e)
        isRecordingRef.current = false
        setIsRecording(true)
      }
    } else {
      isRecordingRef.current = false
      setIsRecording(true)
    }
  }

  const handleStopRecording = () => {
    isRecordingRef.current = false
    setIsRecording(false)
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const formatTimer = (s: number) => {
    const min = Math.floor(s / 60)
    const sec = s % 60
    return `${min}:${sec < 10 ? '0' : ''}${sec}`
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedContactId) return

    const selectedContact = contactsList.find(c => c.id === selectedContactId)
    if (!selectedContact) return

    const selectedActionObj = ACTION_OPTIONS.find(a => a.id === actionId) || ACTION_OPTIONS[0]
    const selectedChannelObj = CHANNEL_OPTIONS.find(c => c.id === channel) || CHANNEL_OPTIONS[0]

    const now = new Date()
    const timestampStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    const authorName = currentUser?.name || currentUser?.nome || 'Usuário'

    const newActivity = {
      id: `act_${Date.now()}`,
      type: channel === 'visita' ? 'reuniao' : channel === 'whatsapp' ? 'whatsapp' : channel === 'ligacao' ? 'ligacao' : channel === 'email' ? 'email' : 'nota',
      content: `[${selectedActionObj.label} - ${selectedChannelObj.label}] ${description || 'Atividade registrada.'}`,
      title: `Registro: ${selectedActionObj.label} (${selectedChannelObj.label})`,
      description: description || `Atividade de ${selectedActionObj.label} via ${selectedChannelObj.label}.`,
      channel: channel,
      actionId: actionId,
      stage: selectedActionObj.stage,
      hasAudio: isRecording || !!description,
      photoUrl: photoUrl || null,
      timestamp: timestampStr,
      user_name: authorName,
      userName: authorName,
      author: authorName
    }

    // Update contacts in localStorage
    if (typeof window !== 'undefined') {
      const savedContacts = localStorage.getItem('crm_contacts')
      if (savedContacts) {
        try {
          const contacts = JSON.parse(savedContacts)
          const updatedContacts = contacts.map((c: any) => {
            const matchesId = c.id === selectedContactId
            const matchesComp = selectedContact.company && c.company && c.company.toLowerCase().trim() === selectedContact.company.toLowerCase().trim()
            const matchesName = selectedContact.name && c.name && c.name.toLowerCase().trim() === selectedContact.name.toLowerCase().trim()
            if (matchesId || matchesComp || matchesName) {
              const isFinal = c.pipelineStage === 'fechamento' || c.pipelineStage === 'pos_venda' || c.pipelineStage === 'perdido'
              const preservedStage = isFinal ? c.pipelineStage : (c.pipelineStage || selectedActionObj.stage)

              return {
                ...c,
                status: (selectedActionObj.stage === 'perdido' || c.status === 'inativo') ? 'inativo' : 'ativo',
                pipelineStage: preservedStage,
                lastPurchaseDays: 1,
                activities: [newActivity, ...(c.activities || [])]
              }
            }
            return c
          })
          localStorage.setItem('crm_contacts', JSON.stringify(updatedContacts))
          
          // Also sync to Supabase if available
          if (supabase) {
            const targetContact = updatedContacts.find((c: any) => c.id === selectedContactId)
            if (targetContact) {
              const payload = {
                status: targetContact.status,
                activities: JSON.stringify(targetContact.activities || []),
                updated_at: new Date().toISOString()
              }
              if (selectedContactId && !selectedContactId.startsWith('c-')) {
                supabase.from('contacts').update(payload).eq('id', selectedContactId).then(() => {})
              } else if (selectedContact.company) {
                supabase.from('contacts').update(payload).ilike('company', selectedContact.company).then(() => {})
              }
            }
          }

          window.dispatchEvent(new Event('storage-contacts-changed'))
        } catch (e) {
          console.error(e)
        }
      }

      // Update deals in pipeline if stored (SEM alterar etapas fechadas/perdedoras e SEM criar cards duplicados)
      const rawDeals = localStorage.getItem('cp_crm_pipeline_deals')
      if (rawDeals) {
        try {
          const deals = JSON.parse(rawDeals)
          const updatedDeals = deals.map((d: any) => {
            const matchesId = d.contact_id === selectedContactId
            const matchesComp = selectedContact.company && (d.contact?.company || d.title) && (d.contact?.company || d.title).toLowerCase().trim() === selectedContact.company.toLowerCase().trim()
            if (matchesId || matchesComp) {
              // REGRA ESSENCIAL: Se o negócio já estiver em 'fechamento', 'pos_venda' ou 'perdido', ele NUNCA sai dessa etapa.
              // O lançamento de atividade apenas adiciona o histórico à timeline sem alterar a etapa d.stage.
              return { 
                ...d, 
                stage: d.stage || selectedActionObj.stage, 
                updated_at: new Date().toISOString(),
                activities: [newActivity, ...(d.activities || [])]
              }
            }
            return d
          })

          localStorage.setItem('cp_crm_pipeline_deals', JSON.stringify(updatedDeals))
          window.dispatchEvent(new Event('storage-deals-changed'))
        } catch (e) {
          console.error(e)
        }
      }
    }

    setIsSavedToast(true)
    setTimeout(() => {
      setIsSavedToast(false)
      if (onSuccess) onSuccess()
      onClose()
    }, 1000)
  }

  const isRep = currentUser?.role === 'representante' || currentUser?.role === 'vendedor'
  const availableContacts = isRep && currentUser?.name 
    ? contactsList.filter(c => c.representative === currentUser.name)
    : contactsList

  const filteredAutocompleteContacts = availableContacts.filter(c => {
    const q = clientSearchTerm.toLowerCase().trim()
    if (!q) return true
    const company = (c.company || '').toLowerCase()
    const name = (c.name || '').toLowerCase()
    const city = (c.city || '').toLowerCase()
    const cnpj = ((c as any).cnpj || '').replace(/\D/g, '')
    return company.includes(q) || name.includes(q) || city.includes(q) || cnpj.includes(q)
  })

  const handleSelectAutocompleteContact = (c: { id: string; name: string; company: string; city?: string; state?: string; cnpj?: string }) => {
    setSelectedContactId(c.id)
    setClientSearchTerm(c.company || c.name)
    setShowClientDropdown(false)
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[999999] flex flex-col justify-start lg:justify-center lg:items-center p-0 lg:p-4">
      <div className="bg-[var(--charcoal)] border-0 lg:border border-[var(--line)] rounded-none lg:rounded-3xl flex flex-col animate-fade-in max-w-lg lg:max-w-4xl mx-auto w-full h-full lg:h-auto lg:max-h-[92vh] shadow-2xl overflow-hidden">
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Modal Header */}
          <div className="flex justify-between items-center border-b border-[var(--line)] p-4 sm:p-5 shrink-0 bg-[var(--card)]">
            <div>
              <h3 className="font-display text-base text-[var(--white)] font-bold tracking-tight">
                Registrar Atividade Comercial
              </h3>
              <p className="text-[11px] text-[var(--gray)] font-mono mt-0.5">
                Informe a ação efetuada, o canal de contato e o relato detalhado
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 px-3 rounded-lg bg-black/40 text-[var(--gray)] hover:text-white text-[10px] font-bold font-mono uppercase tracking-wider border border-[var(--line)] cursor-pointer"
            >
              Fechar
            </button>
          </div>

          {/* Form Fields Body: Single column on Mobile, 2 Columns Horizontal on Desktop */}
          <div className="flex-1 overflow-y-auto lg:overflow-visible p-4 sm:p-6 space-y-4 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-6 items-stretch">
            
            {/* Success Toast Banner */}
            {isSavedToast && (
              <div className="lg:col-span-12 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-bold flex items-center gap-2.5 animate-fade-in shadow-lg mb-2">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <span>Atividade registrada e oportunidade atualizada com sucesso!</span>
              </div>
            )}

            {/* ── COLUNA ESQUERDA: DADOS DO CONTATO & AÇÃO (5 cols no Desktop) ── */}
            <div className="lg:col-span-5 flex flex-col gap-3.5 justify-between">
              
              {/* 1. Cliente / Oportunidade — Busca Autocomplete Elegante */}
              <div className="flex flex-col gap-1.5 relative" ref={clientDropdownRef}>
                <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                  Cliente / Oportunidade *
                </label>
                <div className="relative flex items-center">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gray2)] z-10 pointer-events-none" />
                  <input 
                    type="text" 
                    required
                    style={{ paddingLeft: '2.5rem' }}
                    className="input font-bold w-full bg-[var(--black)] border border-[var(--line)] rounded-xl py-2.5 pr-3 text-xs text-white outline-none focus:border-[var(--lime)]/50 uppercase" 
                    placeholder="Digite para buscar um cliente..."
                    value={clientSearchTerm} 
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value.toUpperCase())
                      setSelectedContactId('')
                      setShowClientDropdown(true)
                    }}
                    onFocus={() => setShowClientDropdown(true)}
                  />
                </div>

                {/* Autocomplete Dropdown List */}
                {showClientDropdown && filteredAutocompleteContacts.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-50 max-h-52 overflow-y-auto bg-[#141416] border border-[var(--line)] rounded-xl shadow-2xl divide-y divide-[var(--line)] animate-fade-in">
                    <div className="px-3 py-1.5 text-[10px] font-mono text-[var(--gray2)] uppercase tracking-wider bg-[var(--charcoal)] sticky top-0">
                      Selecione um Cliente Salvo ({filteredAutocompleteContacts.length})
                    </div>
                    {filteredAutocompleteContacts.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        onClick={() => handleSelectAutocompleteContact(c)}
                        className="p-3 hover:bg-[var(--lime)]/10 cursor-pointer transition-colors flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white group-hover:text-[var(--lime)] transition-colors truncate">
                            {c.company || c.name}
                          </div>
                          <div className="text-[10px] text-[var(--gray)] font-mono truncate mt-0.5">
                            {(c as any).cnpj ? `${(c as any).cnpj} ` : ''}{c.city ? `• ${c.city}${c.state ? `/${c.state}` : ''}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-[var(--lime)] bg-[var(--lime)]/10 px-2 py-0.5 rounded border border-[var(--lime)]/20 shrink-0 opacity-80 group-hover:opacity-100">
                          Selecionar
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Meio / Canal */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                  Como o Contato foi Feito? (Canal) *
                </label>
                <select
                  className="input w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--lime)]/50 cursor-pointer"
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  {CHANNEL_OPTIONS.map(ch => (
                    <option key={ch.id} value={ch.id} className="bg-[var(--charcoal)]">
                      {ch.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Ação Comercial Efetiva */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">
                  Qual Ação Comercial foi Realizada? *
                </label>
                <select
                  className="input w-full bg-[var(--black)] border border-[var(--line)] rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-[var(--lime)]/50 cursor-pointer"
                  required
                  value={actionId}
                  onChange={(e) => setActionId(e.target.value)}
                >
                  {ACTION_OPTIONS.map(act => (
                    <option key={act.id} value={act.id} className="bg-[var(--charcoal)]">
                      {act.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Foto / Anexo (Opcional) */}
              <div className="flex flex-col gap-1.5 border border-[var(--line)] rounded-xl p-3 bg-black/20 mt-auto">
                <label className="text-[10px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider flex items-center justify-between">
                  <span>Foto ou Anexo (Opcional)</span>
                  <span className="text-[9px] text-[var(--gray)] font-normal font-sans">Fachada, cartão ou imagem</span>
                </label>
                
                <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-[var(--line)] hover:border-[var(--lime)]/50 rounded-xl cursor-pointer bg-black/30 transition-colors">
                  <Camera size={15} className="text-[var(--lime)]" />
                  <span className="text-xs font-mono text-[var(--white)]">
                    {photoUrl ? '✓ Imagem Selecionada (Alterar)' : 'Tirar Foto ou Carregar Arquivo'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>

                {photoUrl && (
                  <div className="mt-1 rounded-xl overflow-hidden border border-[var(--line)] h-20 relative bg-black">
                    <img src={photoUrl} alt="Anexo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

            </div>

            {/* ── COLUNA DIREITA: RELATO DA INTERAÇÃO E VOZ (7 cols no Desktop com Campo Taller) ── */}
            <div className="lg:col-span-7 flex flex-col gap-2 border border-[var(--line)] rounded-2xl p-4 bg-black/20 h-full justify-between">
              
              <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-2">
                <label className="text-[10px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider flex items-center gap-2">
                  <span>Relato Comercial da Interação</span>
                </label>
                {isRecording && <span className="text-[var(--red)] animate-pulse font-mono text-[10px] font-bold">Gravando... {formatTimer(recordingTime)}</span>}
              </div>
              
              <div className="flex flex-col sm:flex-row items-center justify-between py-1 px-3 gap-3 bg-[var(--charcoal)] border border-[var(--line)]/50 rounded-xl">
                <div className="text-[11px] text-[var(--gray2)] font-mono text-center sm:text-left flex-1">
                  Digite seu relato abaixo ou use o botão para gravar por voz em tempo real.
                </div>

                {isRecording && (
                  <div className="flex items-center gap-1 justify-center h-6 shrink-0">
                    {[...Array(7)].map((_, i) => (
                      <div 
                        key={i} 
                        className="w-1 bg-[var(--lime)] rounded-full animate-pulse"
                        style={{
                          animationDelay: `${i * 0.1}s`,
                          height: `${Math.floor(8 + Math.random() * 18)}px`
                        }}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 cursor-pointer shrink-0 ${
                    isRecording 
                      ? 'bg-[var(--red)] text-white hover:bg-[#ef4444] animate-pulse' 
                      : 'bg-[var(--lime)] text-black hover:scale-105'
                  }`}
                >
                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              <textarea
                className="input w-full flex-1 min-h-[120px] lg:min-h-[220px] text-xs font-mono bg-[var(--black)] border border-[var(--line)] rounded-xl p-3.5 text-white outline-none focus:border-[var(--lime)]/50 leading-relaxed resize-none"
                placeholder="Escreva seu relato detalhado do contato comercial aqui ou use a gravação por voz..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

          </div>

          {/* Actions Footer */}
          <div className="p-3 sm:px-6 bg-[var(--card)] border-t border-[var(--line)] flex justify-end gap-3 shrink-0 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary py-2.5 px-6 text-xs font-bold uppercase tracking-wider cursor-pointer rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavedToast}
              className="btn btn-primary py-2.5 px-8 text-xs font-black uppercase tracking-wider text-black cursor-pointer shadow-lg shadow-[rgba(180,217,50,0.2)] bg-[var(--lime)] hover:brightness-110 rounded-xl"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

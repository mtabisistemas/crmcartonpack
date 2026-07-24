'use client'

import { useState, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Phone, 
  User, 
  Building2, 
  AlertCircle, 
  MapPin, 
  Plus, 
  X, 
  Send, 
  FileText,
  Mail,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  Percent,
  FileSpreadsheet,
  ExternalLink,
  Clock,
  UserPlus
} from 'lucide-react'
import { whatsappLink, formatCurrency, formatCnaeCode, formatCnaeFullString } from '@/lib/utils'
import { ProspeccaoModal } from '@/components/ProspeccaoModal'

export interface MockContact {
  id: string
  name: string
  company: string
  cnpj: string
  curve: 'A' | 'B' | 'C' | 'D'
  representative: string
  lastPurchaseDays: number
  phone: string
  city: string
  state: string
  status: 'ativo' | 'inativo' | 'prospeccao'
  email?: string
  // Expanded fields
  tradeName?: string
  registrationStatus?: string
  mainCnae?: string
  address?: string
  bairro?: string
  cep?: string
  taxRegime?: 'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'
  specialSituation?: string
  specialSituationDate?: string
  stateRegistration?: string // Inscrição Estadual
  sideActivities?: {id: string; text: string}[]
}

interface Activity {
  id: string
  type: 'nota' | 'whatsapp' | 'ligacao' | 'email' | 'reuniao'
  content: string
  timestamp: string
}

const MOCK_CONTACTS: MockContact[] = []
function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

function formatPhoneBr(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
}

function formatDateBr(isoDateStr: string | null | undefined) {
  if (!isoDateStr || isoDateStr === '-' || isoDateStr === 'Nenhuma') return '-'
  const clean = isoDateStr.split('T')[0] // remove time if any
  const parts = clean.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    return `${day}/${month}/${year}`
  }
  return isoDateStr
}

function capitalizeString(str: string) {
  return str.toLowerCase().replace(/(^\w|\s\w)/g, m => m.toUpperCase())
}

// Helper to construct full address
function buildAddress(d: any) {
  const parts = []
  if (d.descricao_tipo_de_logradouro || d.logradouro) {
    parts.push(`${d.descricao_tipo_de_logradouro || ''} ${d.logradouro || ''}`.trim())
  }
  if (d.numero) parts.push(d.numero)
  if (d.complemento) parts.push(d.complemento)
  let addr = parts.join(', ')
  if (d.bairro) addr += ` - ${d.bairro}`
  if (d.cep) {
    const formattedCep = d.cep.replace(/^(\d{5})(\d{3})/, '$1-$2')
    addr += ` - CEP: ${formattedCep}`
  }
  return addr
}

// ─── Contact Drawer Component ──────────────────────────────────
function ContactDrawer({ 
  contact, 
  onClose, 
  onUpdateContact,
  representatives = []
}: { 
  contact: MockContact | null
  onClose: () => void
  onUpdateContact: (contact: MockContact) => void
  representatives?: string[]
}) {
  const representativesList = representatives.length > 0 
    ? representatives 
    : ['Diéssica Hartmann', 'Josimar Soares', 'Elci Alcantara']
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'geral' | 'historico'>('geral')

  // Form states
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')
  const [representative, setRepresentative] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [status, setStatus] = useState<'ativo' | 'inativo' | 'prospeccao'>('ativo')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [sideActivities, setSideActivities] = useState<{id: string; text: string}[]>([])
  const [showSideActivities, setShowSideActivities] = useState(false)
  
  // Expanded fields
  const [registrationStatus, setRegistrationStatus] = useState('')
  const [mainCnae, setMainCnae] = useState('')
  const [address, setAddress] = useState('')
  const [taxRegime, setTaxRegime] = useState<'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'>('Simples Nacional')
  const [specialSituation, setSpecialSituation] = useState('')
  const [specialSituationDate, setSpecialSituationDate] = useState('')
  const [stateRegistration, setStateRegistration] = useState('')

  // History states
  const [activities, setActivities] = useState<Activity[]>([])
  const [newNote, setNewNote] = useState('')
  const [activityType, setActivityType] = useState<Activity['type']>('nota')

  useEffect(() => {
    if (contact) {
      setIsOpen(true)
      setName(contact.name)
      setCompany(contact.company)
      setTradeName(contact.tradeName ?? '')
      setCnpj(contact.cnpj)
      setCurve(contact.curve)
      setRepresentative(contact.representative)
      setPhone(contact.phone)
      setEmail(contact.email ?? '')
      setCity(contact.city)
      setState(contact.state)
      setStatus(contact.status)
      
      // Fallback address parsing if bairro and cep are empty in state
      let parsedAddress = contact.address ?? ''
      let parsedBairro = contact.bairro ?? ''
      let parsedCep = contact.cep ?? ''

      if (!parsedBairro && !parsedCep && parsedAddress.includes(' - ')) {
        const parts = parsedAddress.split(' - ')
        parsedAddress = parts[0] || ''
        
        const bairroPart = parts.find(p => p.toLowerCase().includes('bairro')) || parts[1]
        if (bairroPart) {
          parsedBairro = bairroPart.replace(/bairro:\s*/i, '').replace(/bairro\s+/i, '').trim()
        }
        
        const cepPart = parts.find(p => p.toLowerCase().includes('cep:')) || parts.find(p => p.match(/\d{5}-\d{3}/))
        if (cepPart) {
          parsedCep = cepPart.replace(/cep:\s*/i, '').trim()
        }
      }

      setAddress(parsedAddress)
      setBairro(parsedBairro)
      setCep(parsedCep)
      setSideActivities(contact.sideActivities ?? [])
      setShowSideActivities(false)
      setRegistrationStatus(contact.registrationStatus ?? 'ATIVA')
      setMainCnae(contact.mainCnae ?? '')
      setTaxRegime(contact.taxRegime ?? 'Simples Nacional')
      setSpecialSituation(contact.specialSituation ?? 'Nenhuma')
      setSpecialSituationDate(contact.specialSituationDate ?? '-')
      setStateRegistration(contact.stateRegistration ?? '')

      setActivities([
        { id: '1', type: 'nota', content: 'Ficha cadastral criada no CRM Carton Pack.', timestamp: '10/07/2026 09:00' },
        { id: '2', type: 'whatsapp', content: 'WhatsApp enviado solicitando retorno sobre proposta de caixas acopladas.', timestamp: '14/07/2026 14:15' },
      ])
    } else {
      setIsOpen(false)
    }
  }, [contact])

  if (!contact) return null

  const handleSaveGeneral = (overrides?: Partial<MockContact> | React.FocusEvent) => {
    const cleanOverrides = overrides && !(overrides as any).nativeEvent 
      ? (overrides as Partial<MockContact>) 
      : {}
    onUpdateContact({
      ...contact,
      name,
      company,
      tradeName,
      cnpj,
      curve,
      representative,
      phone,
      email,
      city,
      state,
      status,
      registrationStatus,
      mainCnae,
      address,
      taxRegime,
      specialSituation,
      specialSituationDate,
      stateRegistration,
      bairro,
      cep,
      sideActivities,
      ...cleanOverrides
    })
  }

  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNote.trim()) return

    const newAct: Activity = {
      id: String(Date.now()),
      type: activityType,
      content: newNote,
      timestamp: new Date().toLocaleString('pt-BR', { hour12: false }).substring(0, 16)
    }

    setActivities(prev => [newAct, ...prev])
    setNewNote('')
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'nota':     return <FileText size={12} />
      case 'whatsapp': return <MessageSquare size={12} className="text-emerald-400" />
      case 'ligacao':  return <Phone size={12} className="text-sky-400" />
      case 'email':    return <Mail size={12} className="text-amber-400" />
      case 'reuniao':  return <User size={12} className="text-purple-400" />
      default:         return <HelpCircle size={12} />
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fade-in"
        />
      )}

      {/* Drawer Body */}
      <div className={`drawer-sheet ${isOpen ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '960px', maxWidth: '95vw' }}>
        {/* Header */}
        <div className="p-6 border-b border-[var(--line)] flex justify-between items-start bg-[var(--card)]">
          <div>
            <h2 className="font-display text-lg text-[var(--white)]">{company}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="drawer-tabs">
          <button 
            className={`drawer-tab-btn ${activeTab === 'geral' ? 'active' : ''}`}
            onClick={() => setActiveTab('geral')}
          >
            Ficha Geral
          </button>
          <button 
            className={`drawer-tab-btn ${activeTab === 'historico' ? 'active' : ''}`}
            onClick={() => setActiveTab('historico')}
          >
            Histórico
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          
          {/* TAB 1: GERAL */}
          {activeTab === 'geral' && (
            <div className="flex flex-col gap-5 animate-fade-in pb-12">
              
              {/* Seção Destaques no Topo: Curva, Representante e Status */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-[var(--card2)] border border-[var(--line)] rounded-xl">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Curva ABC</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold text-[var(--lime)] font-mono bg-[var(--charcoal)]"
                    value={curve} 
                    onChange={(e) => {
                      const val = e.target.value as any
                      setCurve(val)
                      handleSaveGeneral({ curve: val })
                    }}
                  >
                    <option value="A">Curva A</option>
                    <option value="B">Curva B</option>
                    <option value="C">Curva C</option>
                    <option value="D">Curva D</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Representante</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold bg-[var(--charcoal)]"
                    value={representative} 
                    onChange={(e) => {
                      const val = e.target.value
                      setRepresentative(val)
                      handleSaveGeneral({ representative: val })
                    }}
                  >
                    {representativesList.map(rep => (
                      <option key={rep} value={rep}>{rep}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Status Carteira</label>
                  <select 
                    className="input text-xs py-1 px-2 font-bold bg-[var(--charcoal)]"
                    style={{ 
                      color: status === 'ativo' 
                        ? 'var(--green)' 
                        : status === 'inativo' 
                          ? 'var(--red)' 
                          : 'var(--yellow)' 
                    }}
                    value={status} 
                    onChange={(e) => {
                      const val = e.target.value as any
                      setStatus(val)
                      handleSaveGeneral({ status: val })
                    }}
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="prospeccao">Em Prospecção</option>
                  </select>
                </div>
              </div>
              
              {/* Dashboard 2-Column Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* LEFT COLUMN (2/3 width): Dados Cadastrais */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 flex-1">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais</h4>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa</label>
                      <input 
                        type="text" 
                        className="bg-transparent border-b border-dashed border-[var(--line)] focus:border-[var(--lime)] font-display text-sm text-[var(--white)] font-bold w-full pb-1 focus:outline-none"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        onBlur={() => handleSaveGeneral()}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={tradeName}
                          onChange={(e) => setTradeName(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Responsável (Pessoa Física)</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex flex-col gap-1.5 md:w-[155px] shrink-0">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5 font-mono" 
                          value={cnpj}
                          onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 md:w-[135px] shrink-0">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                        <input 
                          type="email" 
                          className="input text-[8px] py-1.5 tracking-tight" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>
                    </div>

                    {/* Linha 1 Endereço: Rua + Bairro */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>
                    </div>

                    {/* Linha 2 Endereço: CEP + Cidade + UF + Map Pin */}
                    <div className="flex gap-3">
                      <div className="flex flex-col gap-1.5" style={{ width: '110px', flexShrink: 0 }}>
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                        <input 
                          type="text" 
                          maxLength={9}
                          className="input text-xs py-1.5 font-mono" 
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                        <input 
                          type="text" 
                          className="input text-xs py-1.5" 
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5" style={{ width: '88px', flexShrink: 0 }}>
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                        <input 
                          type="text" 
                          maxLength={2}
                          className="input text-xs py-1.5 uppercase text-center font-bold font-mono w-full" 
                          value={state}
                          onChange={(e) => setState(e.target.value.toUpperCase())}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      {/* Map icon */}
                      <div className="flex flex-col gap-1.5" style={{ flexShrink: 0 }}>
                        <label className="text-[9px] font-bold text-transparent uppercase font-mono tracking-wider select-none">·</label>
                        <a
                          href={(address || city) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, bairro, city, state, cep].filter(Boolean).join(', '))}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Ver endereço no mapa"
                          className={`flex items-center justify-center py-1.5 px-1 transition-colors ${(address || city) ? 'text-[var(--lime)] hover:opacity-70 cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
                        >
                          <MapPin size={20} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN (1/3 width): Fisco e Tributário */}
                <div className="flex flex-col gap-4">
                  {/* Card 2: Regime Tributário */}
                  <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
                    <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Regime Tributário</h4>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                      <select 
                        className="input text-xs py-1.5" 
                        value={taxRegime} 
                        onChange={(e) => {
                          const val = e.target.value as any
                          setTaxRegime(val)
                          handleSaveGeneral({ taxRegime: val })
                        }}
                      >
                        <option value="MEI">MEI</option>
                        <option value="Simples Nacional">Simples Nacional</option>
                        <option value="Lucro Presumido">Lucro Presumido</option>
                        <option value="Lucro Real">Lucro Real</option>
                      </select>
                    </div>
                  </div>

                  {/* Card 3: Inscrições Estaduais e Status */}
                  <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3 flex-1">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Inscrições Estaduais e Status</h4>
                      {cnpj && (
                        <a 
                          href={`https://cnpja.com/office/${cnpj.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="Ver no CNPJá"
                          className="text-[9px] font-bold text-[var(--gray2)] hover:text-[var(--lime)] transition-colors p-1"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                      <input 
                        type="text" 
                        className="input text-xs py-1.5 font-bold" 
                        style={{ color: registrationStatus.includes('ATIVA') ? 'var(--green)' : 'var(--white)' }}
                        value={registrationStatus}
                        onChange={(e) => setRegistrationStatus(e.target.value)}
                        onBlur={() => handleSaveGeneral()}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Inscrição Estadual (IE)</label>
                      <input 
                        type="text" 
                        className="input text-xs py-1.5 font-mono" 
                        value={stateRegistration}
                        onChange={(e) => setStateRegistration(e.target.value)}
                        onBlur={() => handleSaveGeneral()}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Especial</label>
                        <input 
                          type="text" 
                          className="input text-[10px] py-1.5 truncate" 
                          value={specialSituation}
                          onChange={(e) => setSpecialSituation(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Data Situação</label>
                        <input 
                          type="text" 
                          className="input text-[10px] py-1.5 text-center font-mono" 
                          value={specialSituationDate}
                          onChange={(e) => setSpecialSituationDate(e.target.value)}
                          onBlur={() => handleSaveGeneral()}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Card 4: Atividades Econômicas */}
              <div className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1.5 font-medium" 
                    value={formatCnaeFullString(mainCnae)}
                    onChange={(e) => setMainCnae(e.target.value)}
                    onBlur={() => handleSaveGeneral()}
                  />
                </div>

                {sideActivities.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSideActivities(v => !v)}
                      className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider font-mono transition-colors w-fit"
                      style={{ color: showSideActivities ? 'var(--lime)' : 'var(--gray)' }}
                    >
                      <span
                        className="inline-block transition-transform duration-200"
                        style={{ transform: showSideActivities ? 'rotate(90deg)' : 'rotate(0deg)' }}
                      >▶</span>
                      {showSideActivities ? 'Ocultar' : 'Ver'} atividades secundárias ({sideActivities.length})
                    </button>

                    {showSideActivities && (
                      <div className="flex flex-col gap-0 border border-[var(--line)] rounded-lg overflow-hidden">
                        {sideActivities.map((act, i) => (
                          <div
                            key={i}
                            className="flex gap-2 px-3 py-1.5 text-xs font-mono"
                            style={{ background: i % 2 === 0 ? 'var(--card2)' : 'transparent' }}
                          >
                            <span className="text-[var(--lime)] font-bold shrink-0">{formatCnaeCode(act.id)}</span>
                            <span className="text-[var(--gray)]">{act.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="flex flex-col gap-4 animate-fade-in">
              <form onSubmit={handleAddActivity} className="card p-4 border-[var(--line)] bg-[var(--card)] flex flex-col gap-3">
                <textarea
                  className="input min-h-[90px] py-2 resize-none"
                  placeholder="Escreva uma nova anotação ou registro..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="flex justify-between items-center gap-2">
                  <div className="flex gap-1">
                    {(['nota', 'whatsapp', 'ligacao', 'email', 'reuniao'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setActivityType(type)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded transition-colors uppercase ${
                          activityType === type
                            ? 'bg-neutral-800 text-[var(--lime)] border border-[rgba(180,217,50,0.2)]'
                            : 'text-[var(--gray)] hover:text-[var(--white)] bg-transparent'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm flex items-center gap-1.5">
                    <Send size={11} />
                    <span>Lançar</span>
                  </button>
                </div>
              </form>

              {/* Timeline list */}
              <div className="relative pl-6 flex flex-col gap-6 border-l border-[var(--line)] ml-3 mt-2">
                {activities.map(act => (
                  <div key={act.id} className="relative">
                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[var(--charcoal)] border border-[var(--line)] flex items-center justify-center text-[var(--gray)]">
                      {getActivityIcon(act.type)}
                    </div>
                    <div className="text-[10px] text-[var(--gray2)] font-mono">{act.timestamp}</div>
                    <div className="card p-3 border-[var(--line)] bg-[var(--card)] text-xs text-[var(--white)] mt-1 ml-1">
                      {act.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

// ─── New Contact Modal Component ───────────────────────────────
function NewContactModal({ 
  onConfirm, 
  onCancel 
}: { 
  onConfirm: (data: Partial<MockContact>) => void
  onCancel: () => void 
}) {
  const [rawCnpj, setRawCnpj] = useState('')
  const [loadingCnpj, setLoadingCnpj] = useState(false)
  const [cnpjError, setCnpjError] = useState('')

  // Form fields
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [curve, setCurve] = useState<'A' | 'B' | 'C' | 'D'>('C')
  const [representative] = useState('Diéssica Hartmann') // Default representative set in background
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  
  // Expanded properties states
  const [registrationStatus, setRegistrationStatus] = useState('ATIVA')
  const [mainCnae, setMainCnae] = useState('')
  const [sideActivities, setSideActivities] = useState<{id: string; text: string}[]>([])
  const [showSideActivities, setShowSideActivities] = useState(false)
  const [address, setAddress] = useState('')
  const [bairro, setBairro] = useState('')
  const [cep, setCep] = useState('')
  const [taxRegime, setTaxRegime] = useState<'MEI' | 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real'>('Simples Nacional')
  const [specialSituation, setSpecialSituation] = useState('Nenhuma')
  const [specialSituationDate, setSpecialSituationDate] = useState('-')
  const [stateRegistration, setStateRegistration] = useState('')

  const handleFetchCnpj = async () => {
    const clean = rawCnpj.replace(/\D/g, '')
    if (clean.length !== 14) {
      setCnpjError('CNPJ inválido. Digite os 14 dígitos.')
      return
    }

    setLoadingCnpj(true)
    setCnpjError('')

    try {
      const res = await fetch(`https://open.cnpja.com/office/${clean}`)
      if (!res.ok) throw new Error('Não encontrado')
      const data = await res.json()

      // Populating standard and expanded fields from CNPJá API
      const compName = data.company?.name || ''
      setCompany(compName)
      setTradeName(data.alias || compName)
      
      const phoneObj = data.phones?.[0]
      const rawPhone = phoneObj ? `${phoneObj.area}${phoneObj.number}` : ''
      setPhone(formatPhoneBr(rawPhone))
      
      setEmail(data.emails?.[0]?.address || '')
      setCity(data.address?.city || '')
      setState(data.address?.state || '')
      setCnpj(formatCnpj(clean))
      
      // Auto-populate expanded API information
      const statusText = data.status?.text || 'Ativa'
      const statusDateFormatted = data.statusDate ? formatDateBr(data.statusDate) : ''
      setRegistrationStatus(statusDateFormatted ? `${statusText} desde ${statusDateFormatted}` : statusText)
      
      const mainCnaeId = data.mainActivity?.id
      const mainCnaeDesc = data.mainActivity?.text
      const formattedMainCode = formatCnaeCode(mainCnaeId)
      setMainCnae(formattedMainCode ? `${formattedMainCode} - ${mainCnaeDesc || ''}` : '')

      // Populate secondary activities with standard Receita Federal CNAE format (XXXX-X/XX)
      const sides = (data.sideActivities || []).map((a: any) => ({
        id: formatCnaeCode(String(a.id || '')),
        text: a.text || ''
      }))
      setSideActivities(sides)
      setShowSideActivities(false)
      
      // Populate address fields separately from CNPJá structure
      const addr = data.address
      if (addr) {
        const streetParts = [addr.street, addr.number].filter(Boolean)
        setAddress(streetParts.join(', '))
        setBairro(addr.district || '')
        const rawZip = addr.zip || ''
        setCep(rawZip ? rawZip.replace(/^(\d{5})(\d{3})/, '$1-$2') : '')
      } else {
        setAddress('')
        setBairro('')
        setCep('')
      }
      
      // Determine tax regime dynamically from simples/simei optant flags
      if (data.company?.simei?.optant) {
        setTaxRegime('MEI')
      } else if (data.company?.simples?.optant) {
        setTaxRegime('Simples Nacional')
      } else {
        setTaxRegime('Lucro Presumido')
      }

      setSpecialSituation(data.special?.text || 'Nenhuma')
      setSpecialSituationDate(data.specialDate ? formatDateBr(data.specialDate) : '-')
      
      // Retrieve state registration (IE) from registrations array matching address state or first active
      let ieVal = ''
      if (data.registrations && data.registrations.length > 0) {
        const ieObj = data.registrations.find((r: any) => r.state === data.address?.state) || data.registrations.find((r: any) => r.enabled) || data.registrations[0]
        ieVal = ieObj ? ieObj.number : ''
      }
      
      // Secondary fallback to CNPJ.ws for Inscrição Estadual if CNPJá returned empty
      if (!ieVal) {
        try {
          const wsRes = await fetch(`https://publica.cnpj.ws/cnpj/${clean}`)
          if (wsRes.ok) {
            const wsData = await wsRes.json()
            const ieObj = wsData.estabelecimento?.inscricoes_estadual?.find((ie: any) => ie.ativo) || wsData.estabelecimento?.inscricoes_estadual?.[0]
            if (ieObj) {
              ieVal = ieObj.inscricao_estadual || ''
            }
          }
        } catch (e) {
          // Fail silently and leave IE for manual input
        }
      }
      
      setStateRegistration(ieVal || '')

      // Pull responsible person from company.members: prefer admin/director roles first, fall back to first member
      const adminRoles = ['Sócio-Administrador', 'Administrador', 'Diretor', 'Presidente', 'Gerente']
      const members = data.company?.members || []
      const adminMember = members.find((m: any) => adminRoles.some(r => m.role?.text?.includes(r)))
      const responsibleMember = adminMember || members[0]
      setName(responsibleMember?.person?.name || '')
    } catch (err) {
      setCnpjError('Erro ao buscar CNPJ. CNPJ inexistente ou API fora do ar.')
    } finally {
      setLoadingCnpj(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!company.trim() || !name.trim()) return
    onConfirm({
      name,
      company,
      tradeName,
      cnpj,
      curve,
      representative,
      phone,
      email,
      city,
      state,
      registrationStatus,
      mainCnae,
      address,
      bairro,
      cep,
      sideActivities,
      taxRegime,
      specialSituation,
      specialSituationDate,
      stateRegistration
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-2 sm:p-4">
      <form onSubmit={handleSubmit} className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl w-full max-w-[95vw] xl:max-w-6xl shadow-2xl flex flex-col gap-2.5 animate-fade-up max-h-[96vh] overflow-hidden p-4 sm:p-5">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-[var(--line)] pb-2.5 px-2 shrink-0">
          <div>
            <h3 className="font-display text-sm sm:text-base text-[var(--white)] font-bold">Cadastrar Novo Cliente</h3>
            <p className="text-[11px] text-[var(--gray)] font-mono">Preenchimento automático inteligente integrado com a API do CNPJá e CNPJ.ws</p>
          </div>
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* CNPJ Search Bar */}
        <div className="flex items-center gap-2.5 bg-[var(--card)] border border-[var(--line)] p-2 rounded-xl px-4 shrink-0">
          <label className="text-[10px] font-mono font-bold text-[var(--lime)] uppercase tracking-wider shrink-0">Buscar CNPJ:</label>
          <input 
            type="text" 
            className="input font-mono bg-[var(--charcoal)] flex-1 text-xs py-1 px-3" 
            placeholder="Ex: 00.000.000/0001-00"
            value={rawCnpj}
            onChange={(e) => setRawCnpj(formatCnpj(e.target.value))}
          />
          <button 
            type="button"
            disabled={loadingCnpj}
            onClick={handleFetchCnpj}
            className="btn btn-primary py-1 px-3 text-[10px] font-bold uppercase tracking-wider text-[#060606] shrink-0"
          >
            {loadingCnpj ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {cnpjError && <span className="text-[10px] text-[var(--red)] font-semibold px-2 shrink-0">{cnpjError}</span>}

        {/* 3-Column Harmonious Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[calc(96vh-140px)] pr-1">
          
          {/* COLUMN 1 & 2 (col-span-2): Dados Cadastrais */}
          <div className="lg:col-span-2 card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2.5">
            <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Dados Cadastrais & Endereço</h4>
            
            {/* Razão Social */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Razão Social / Empresa *</label>
              <input 
                type="text" 
                required
                className="bg-transparent border-b border-dashed border-[var(--line)] focus:border-[var(--lime)] font-display text-xs text-[var(--white)] font-bold w-full pb-0.5 focus:outline-none"
                placeholder="Nome da Empresa"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </div>

            {/* Nome Fantasia + Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Fantasia</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="Nome Fantasia"
                  value={tradeName}
                  onChange={(e) => setTradeName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Responsável (Pessoa Física) *</label>
                <input 
                  type="text" 
                  required
                  className="input text-xs py-1 px-2.5 font-bold border-dashed border-[var(--lime)]" 
                  placeholder="Nome do Contato Principal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            {/* CNPJ + Telefone + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNPJ</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5 font-mono" 
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(formatCnpj(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Telefone</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="(00) 00000-0000"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                />
              </div>

              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail</label>
                <input 
                  type="email" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="contato@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Rua / Número + Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2 flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Rua / Número</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="Rua, Número"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Bairro</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="Bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                />
              </div>
            </div>

            {/* CEP | Cidade | UF | Mapa */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2.5 items-end">
              <div className="flex flex-col gap-0.5 shrink-0 w-[100px]">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CEP</label>
                <input 
                  type="text" 
                  maxLength={9}
                  className="input text-xs py-1 px-2.5 font-mono" 
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-0.5 flex-1 min-w-[120px]">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Cidade</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2.5" 
                  placeholder="Cidade"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-0.5 shrink-0 w-[70px]">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">UF</label>
                <input 
                  type="text" 
                  maxLength={2}
                  className="input text-xs py-1 px-1.5 uppercase text-center font-bold font-mono w-full"
                  placeholder="UF"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                />
              </div>

              <div className="flex flex-col gap-0.5 shrink-0 pb-0.5">
                <a
                  href={(address || city) ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([address, bairro, city, state, cep].filter(Boolean).join(', '))}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Ver endereço no mapa"
                  className={`flex items-center justify-center p-1.5 rounded-lg border border-[var(--line)] transition-colors ${(address || city) ? 'text-[var(--lime)] hover:bg-[var(--lime)]/10 hover:border-[var(--lime)] cursor-pointer' : 'text-[var(--gray2)] opacity-30 pointer-events-none'}`}
                >
                  <MapPin size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* COLUMN 3: Fiscal, Inscrições & Atividades Econômicas */}
          <div className="flex flex-col gap-3">
            
            {/* Regime Tributário & Inscrição */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2">
              <div className="flex justify-between items-center border-b border-[var(--line)] pb-1">
                <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] font-mono">Dados Fiscais & Status</h4>
                {cnpj && (
                  <a 
                    href={`https://cnpja.com/office/${cnpj.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] font-bold text-[var(--lime)] hover:text-white uppercase tracking-wider font-mono flex items-center gap-1 transition-colors"
                  >
                    <span>CNPJá</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Regime Tributário</label>
                  <select 
                    className="input text-xs py-1 px-2" 
                    value={taxRegime} 
                    onChange={(e) => setTaxRegime(e.target.value as any)}
                  >
                    <option value="MEI">MEI</option>
                    <option value="Simples Nacional">Simples Nacional</option>
                    <option value="Lucro Presumido">Lucro Presumido</option>
                    <option value="Lucro Real">Lucro Real</option>
                  </select>
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Cadastral</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2 font-bold" 
                    placeholder="Ex: ATIVA"
                    style={{ color: registrationStatus.includes('ATIVA') || registrationStatus.includes('Ativa') ? 'var(--green)' : 'var(--white)' }}
                    value={registrationStatus}
                    onChange={(e) => setRegistrationStatus(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Inscrição Estadual (IE)</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2 font-mono" 
                    placeholder="IE"
                    value={stateRegistration}
                    onChange={(e) => setStateRegistration(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Situação Especial</label>
                  <input 
                    type="text" 
                    className="input text-xs py-1 px-2" 
                    placeholder="Nenhuma"
                    value={specialSituation}
                    onChange={(e) => setSpecialSituation(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Atividades Econômicas */}
            <div className="card p-3 border-[var(--line)] bg-[var(--card)] flex flex-col gap-2 flex-1">
              <h4 className="text-[10px] uppercase font-bold tracking-wider text-[var(--lime)] border-b border-[var(--line)] pb-1 font-mono">Atividades Econômicas</h4>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">CNAE Principal</label>
                <input 
                  type="text" 
                  className="input text-xs py-1 px-2 font-mono" 
                  placeholder="CNAE e Descrição"
                  value={mainCnae}
                  onChange={(e) => setMainCnae(e.target.value)}
                />
              </div>

              {sideActivities.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={() => setShowSideActivities(v => !v)}
                    className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider font-mono transition-colors w-fit"
                    style={{ color: showSideActivities ? 'var(--lime)' : 'var(--gray)' }}
                  >
                    <span
                      className="inline-block transition-transform duration-200"
                      style={{ transform: showSideActivities ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >▶</span>
                    {showSideActivities ? 'Ocultar' : 'Ver'} secundárias ({sideActivities.length})
                  </button>

                  {showSideActivities && (
                    <div className="flex flex-col gap-0 border border-[var(--line)] rounded-lg overflow-y-auto max-h-[90px]">
                      {sideActivities.map((act, i) => (
                        <div
                          key={act.id}
                          className="flex gap-1.5 px-2 py-1 text-[11px] font-mono leading-tight"
                          style={{ background: i % 2 === 0 ? 'var(--card2)' : 'transparent' }}
                        >
                          <span className="text-[var(--lime)] font-bold shrink-0">{act.id}</span>
                          <span className="text-[var(--gray)] truncate">{act.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        {/* Footer Actions */}
        <div className="flex justify-end gap-3 border-t border-[var(--line)] px-6 py-4 shrink-0">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider text-[#060606]"
          >
            Confirmar Cadastro
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── Main Contacts Component ───────────────────────────────────
export default function ContactsPage() {
  const [contacts, setContacts] = useState<MockContact[]>(MOCK_CONTACTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCurve, setSelectedCurve] = useState<string>('all')
  const [selectedRep, setSelectedRep] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [showMapModal, setShowMapModal] = useState<boolean>(false)
  const [modalContact, setModalContact] = useState<MockContact | null>(null)

  // Drawer / New Contact Modal states
  const [selectedContact, setSelectedContact] = useState<MockContact | null>(null)
  const [showNewContactModal, setShowNewContactModal] = useState(false)
  const [showProspeccaoModal, setShowProspeccaoModal] = useState(false)

  // Dynamic representatives list from CRM Users in localStorage + default ones
  const [representativesList, setRepresentativesList] = useState<string[]>(['Diéssica Hartmann', 'Josimar Soares', 'Elci Alcantara'])

  // Load contacts and representatives on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedContacts = localStorage.getItem('crm_contacts')
      if (savedContacts) {
        try {
          setContacts(JSON.parse(savedContacts))
        } catch (e) {
          console.error(e)
        }
      }

      const savedUsers = localStorage.getItem('crm_users')
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers)
          const repsFromUsers = parsed
            .filter((u: any) => u.role === 'representante' && u.status === 'ativo')
            .map((u: any) => u.name)
          if (repsFromUsers.length > 0) {
            setRepresentativesList(repsFromUsers)
          }
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  // Persist contacts on change
  const saveContacts = (newContacts: MockContact[]) => {
    setContacts(newContacts)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_contacts', JSON.stringify(newContacts))
    }
  }

  // Update representatives list when contacts change to include any custom reps in existing contacts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('crm_users')
      let repsFromUsers: string[] = []
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers)
          repsFromUsers = parsed
            .filter((u: any) => u.role === 'representante' && u.status === 'ativo')
            .map((u: any) => u.name)
        } catch (e) {}
      }
      const repsFromContacts = Array.from(new Set(contacts.map(c => c.representative)))
      const combined = Array.from(new Set([...repsFromUsers, ...repsFromContacts, 'Diéssica Hartmann', 'Josimar Soares', 'Elci Alcantara']))
      setRepresentativesList(combined)
    }
  }, [contacts])

  // Filtering logic
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.cnpj.includes(searchTerm)
    
    const matchesCurve = selectedCurve === 'all' || contact.curve === selectedCurve
    const matchesRep = selectedRep === 'all' || contact.representative === selectedRep
    const matchesStatus = selectedStatus === 'all' || contact.status === selectedStatus

    return matchesSearch && matchesCurve && matchesRep && matchesStatus
  })

  function openMap(e: React.MouseEvent, contact: MockContact) {
    e.stopPropagation()
    const query = [contact.address, contact.bairro, contact.city, contact.state, contact.cep].filter(Boolean).join(', ')
    if (query) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank')
    }
  }

  const handleUpdateContact = (updatedContact: MockContact) => {
    const updated = contacts.map(c => c.id === updatedContact.id ? updatedContact : c)
    saveContacts(updated)
    setSelectedContact(updatedContact)
  }

  const handleConfirmNewContact = (data: Partial<MockContact>) => {
    const newContact: MockContact = {
      id: `c-${Date.now()}`,
      name: data.name || '',
      company: data.company || '',
      cnpj: data.cnpj || '',
      curve: data.curve || 'C',
      representative: data.representative || (representativesList[0] || 'Diéssica Hartmann'),
      phone: data.phone || '',
      email: data.email || '',
      city: data.city || '',
      state: data.state || '',
      status: 'ativo',
      lastPurchaseDays: 0,
      
      // New fields mapping
      tradeName: data.tradeName || '',
      registrationStatus: data.registrationStatus || 'ATIVA',
      mainCnae: data.mainCnae || '',
      address: data.address || '',
      bairro: data.bairro || '',
      cep: data.cep || '',
      sideActivities: data.sideActivities || [],
      taxRegime: data.taxRegime || 'Simples Nacional',
      specialSituation: data.specialSituation || 'Nenhuma',
      specialSituationDate: data.specialSituationDate || '-',
      stateRegistration: data.stateRegistration || ''
    }

    const updated = [newContact, ...contacts]
    saveContacts(updated)
    setShowNewContactModal(false)
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
          Carteira de Clientes
        </h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowProspeccaoModal(true)}
            className="btn btn-secondary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer text-[var(--lime)] border-[var(--lime)]/30 hover:border-[var(--lime)] font-bold shadow-lg"
          >
            <UserPlus size={14} />
            <span>Prospectar Novos Leads B2B</span>
          </button>

          <button onClick={() => setShowNewContactModal(true)} className="btn btn-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer">
            <Plus size={14} />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
        {/* Search — ocupa 2 colunas */}
        <div className="md:col-span-2 flex items-center gap-2 input w-full">
          <Search size={14} className="text-[var(--gray2)] shrink-0" />
          <input
            className="bg-transparent border-none outline-none w-full text-sm text-[var(--white)] placeholder-[var(--gray2)]"
            placeholder="Buscar razão social, CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Curva Filter */}
        <div>
          <select 
            className="input w-full"
            value={selectedCurve}
            onChange={(e) => setSelectedCurve(e.target.value)}
          >
            <option value="all">Todas as Curvas (ABC)</option>
            <option value="A">Curva A (Faturamento Alto)</option>
            <option value="B">Curva B (Faturamento Médio)</option>
            <option value="C">Curva C (Faturamento Baixo)</option>
            <option value="D">Curva D (Prospecção)</option>
          </select>
        </div>

        {/* Rep Filter */}
        <div>
          <select 
            className="input w-full"
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
          >
            <option value="all">Todos os Representantes</option>
            {representativesList.map(rep => (
              <option key={rep} value={rep}>{rep}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select 
            className="input w-full"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Clientes Ativos</option>
            <option value="inativo">Inativos / Alerta</option>
            <option value="prospeccao">Em Prospecção</option>
          </select>
        </div>
      </div>

      {/* List Container */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--charcoal)] font-mono text-[10px] text-[var(--gray)] uppercase tracking-wider">
                <th className="p-4 pl-6">Cliente / CNPJ</th>
                <th className="p-4">Curva</th>
                <th className="p-4">Cidade</th>
                <th className="p-4">UF</th>
                <th className="p-4">Representante</th>
                <th className="p-4">Última Compra</th>
                <th className="p-4 pr-6 text-right">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredContacts.map(contact => {
                return (
                  <tr 
                    key={contact.id} 
                    onClick={() => setSelectedContact(contact)}
                    className="hover:bg-[var(--charcoal)] transition-colors duration-150 cursor-pointer"
                  >
                    {/* Cliente Info */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[var(--line)] flex items-center justify-center text-[var(--white)]">
                          <Building2 size={16} />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--white)] flex items-center gap-2">
                            {contact.company}
                            {contact.status === 'inativo' && (
                              <span className="font-mono text-[9px] bg-[rgba(226,72,61,0.15)] text-[var(--red)] px-2 py-0.5 rounded-full border border-[rgba(226,72,61,0.25)] flex items-center gap-1">
                                <AlertCircle size={8} /> ALERTA INATIVO
                              </span>
                            )}
                            {contact.status === 'prospeccao' && (
                              <span className="font-mono text-[9px] bg-[rgba(240,196,25,0.15)] text-[var(--yellow)] px-2 py-0.5 rounded-full border border-[rgba(240,196,25,0.25)] flex items-center gap-1">
                                <Clock size={8} /> EM PROSPECÇÃO
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--gray)] font-mono mt-0.5">{contact.cnpj}</div>
                        </div>
                      </div>
                    </td>

                    {/* Curva */}
                    <td className="p-4">
                      <span 
                        className="font-mono text-xs font-black px-2.5 py-1 rounded-md"
                        style={{
                          background: contact.curve === 'A' ? 'rgba(180,217,50,0.12)' : contact.curve === 'B' ? 'rgba(240,196,25,0.1)' : 'rgba(255,255,255,0.05)',
                          color: contact.curve === 'A' ? 'var(--lime)' : contact.curve === 'B' ? 'var(--yellow)' : 'var(--gray)',
                          border: `1px solid ${contact.curve === 'A' ? 'rgba(180,217,50,0.25)' : contact.curve === 'B' ? 'rgba(240,196,25,0.2)' : 'var(--line)'}`
                        }}
                      >
                        Curva {contact.curve}
                      </span>
                    </td>

                    {/* Cidade */}
                    <td className="p-4">
                      <span className="text-xs text-[var(--white)] font-mono">{contact.city || <span className="text-[var(--gray2)]">-</span>}</span>
                    </td>

                    {/* UF */}
                    <td className="p-4">
                      <span className="text-xs font-bold text-[var(--gray)] font-mono uppercase">{contact.state || '-'}</span>
                    </td>

                    {/* Representante */}
                    <td className="p-4 text-xs font-semibold text-[var(--white)]">
                      <div className="flex items-center gap-2">
                        <User size={12} className="text-[var(--gray)]" />
                        {contact.representative}
                      </div>
                    </td>

                    {/* Ultima compra */}
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-[var(--white)] font-mono">{contact.lastPurchaseDays} dias</span>
                        <span className="text-[10px] text-[var(--gray2)] uppercase tracking-wider font-mono">sem comprar</span>
                      </div>
                    </td>

                    {/* Localizacao — Google Maps icon */}
                    <td className="p-4 pr-6 text-right">
                      <button 
                        onClick={(e) => openMap(e, contact)}
                        title="Ver no Google Maps"
                        className={`inline-flex items-center justify-center transition-colors ${
                          (contact.address || contact.city)
                            ? 'text-[var(--lime)] hover:opacity-70 cursor-pointer'
                            : 'text-[var(--gray2)] opacity-30 pointer-events-none'
                        }`}
                      >
                        <MapPin size={18} />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {filteredContacts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm text-[var(--gray2)] font-mono">
                    Nenhum cliente encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Contact Details Drawer */}
      <ContactDrawer
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onUpdateContact={handleUpdateContact}
        representatives={representativesList}
      />

      {/* New Contact Modal with CNPJ Autopopulate */}
      {showNewContactModal && (
        <NewContactModal
          onConfirm={handleConfirmNewContact}
          onCancel={() => setShowNewContactModal(false)}
        />
      )}

      {/* Map / Facade Modal Mock */}
      {showMapModal && modalContact && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="card max-w-lg w-full overflow-hidden relative border-[var(--line)]">
            {/* Header */}
            <div className="p-4 border-b border-[var(--line)] flex justify-between items-center bg-[var(--charcoal)]">
              <div>
                <h3 className="font-display text-sm text-[var(--white)]">{modalContact.company}</h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">{modalContact.city} · {modalContact.state}</p>
              </div>
              <button 
                onClick={() => setShowMapModal(false)}
                className="text-[var(--gray)] hover:text-white font-mono text-xs"
              >
                [ FECHAR ]
              </button>
            </div>

            {/* Facade photo mock using CSS design to resemble a mockup of Carton Pack premium style */}
            <div className="relative h-64 bg-[#141414] flex flex-col items-center justify-center p-6 border-b border-[var(--line)]">
              {/* Simulated Map View with Google Maps Pin */}
              <div className="absolute inset-0 opacity-10 bg-radial-gradient from-[var(--lime)] to-transparent pointer-events-none" />
              
              <div className="w-48 h-32 rounded-lg border-2 border-dashed border-[var(--line)] bg-[var(--black)] flex flex-col items-center justify-center text-center p-4 relative">
                <MapPin size={24} className="text-[var(--lime)] mb-1 animate-bounce" />
                <span className="text-xs font-bold text-[var(--white)]">Fachada da Empresa</span>
                <span className="text-[10px] text-[var(--gray)] font-mono mt-1">Geolocalizada automaticamente em {modalContact.city}</span>
              </div>
            </div>

            {/* Footer / Meta */}
            <div className="p-4 bg-[var(--charcoal)] flex justify-between items-center text-xs">
              <span className="text-[var(--gray)] font-mono">Assinado a: <b>{modalContact.representative}</b></span>
              <span className="text-[var(--gray)] font-mono">Curva: <b className="text-[var(--lime)]">{modalContact.curve}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* ── Prospecção B2B Modal ── */}
      <ProspeccaoModal
        isOpen={showProspeccaoModal}
        onClose={() => setShowProspeccaoModal(false)}
        usuarioLogado={{ id: 'admin-1', nome: 'Supervisor Comercial', papel: 'supervisor', ativo: true }}
        usuariosDisponiveis={[
          { id: 'usr-1', nome: 'Diéssica Hartmann', papel: 'vendedor_interno', ativo: true },
          { id: 'usr-2', nome: 'Josimar Soares', papel: 'representante', ativo: true },
          { id: 'usr-3', nome: 'Elci Alcantara', papel: 'representante', ativo: true }
        ]}
        onLeadsImported={() => {
          if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('crm_contacts')
            if (saved) {
              try { setContacts(JSON.parse(saved)) } catch (e) {}
            }
          }
        }}
      />
    </div>
  )
}
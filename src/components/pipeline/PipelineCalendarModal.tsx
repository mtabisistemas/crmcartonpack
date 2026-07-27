'use client'

import { useState, useEffect } from 'react'
import { Appointment } from '@/types'
import { getAppointments, updateAppointment, deleteAppointment, saveAppointment } from '@/services/appointment-service'
import { 
  X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Edit2, Trash2, CheckCircle, AlertCircle
} from 'lucide-react'

interface PipelineCalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PipelineCalendarModal({ isOpen, onClose }: PipelineCalendarModalProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  
  // Selected appointment for detail / edit / cancel modal
  const [activeApt, setActiveApt] = useState<Appointment | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editType, setEditType] = useState<Appointment['type']>('visita')
  const [editDate, setEditDate] = useState('')
  const [editTime, setEditTime] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Load appointments and listen for changes
  const loadApts = () => {
    const data = getAppointments()
    setAppointments(data)
  }

  useEffect(() => {
    if (isOpen) {
      loadApts()
      if (typeof window !== 'undefined') {
        window.addEventListener('storage-appointments-changed', loadApts)
        window.addEventListener('storage', loadApts)
      }
      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage-appointments-changed', loadApts)
          window.removeEventListener('storage', loadApts)
        }
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToday = () => {
    setCurrentDate(new Date())
  }

  // Days in month calculation
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekDays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

  // Format date key: YYYY-MM-DD
  const formatDateKey = (y: number, m: number, d: number) => {
    const monthStr = String(m + 1).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    return `${y}-${monthStr}-${dayStr}`
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Open edit modal for an appointment
  const handleOpenAptDetails = (apt: Appointment) => {
    setActiveApt(apt)
    setEditTitle(apt.title)
    setEditType(apt.type)
    setEditDate(apt.date)
    setEditTime(apt.time)
    setEditNotes(apt.notes || '')
    setIsEditing(false)
  }

  // Save changes
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeApt) return
    const updated = updateAppointment({
      ...activeApt,
      title: editTitle,
      type: editType,
      date: editDate,
      time: editTime,
      notes: editNotes
    })
    loadApts()
    setActiveApt(updated)
    setIsEditing(false)
  }

  // Delete / Cancel appointment
  const handleDeleteAppointment = () => {
    if (!activeApt) return
    deleteAppointment(activeApt.id)
    loadApts()
    setActiveApt(null)
    setIsEditing(false)
  }

  // Build grid calendar cells
  const gridCells = []

  // 1. Padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = daysInPrevMonth - i
    const prevMonthIdx = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const dateKey = formatDateKey(prevYear, prevMonthIdx, dayNum)
    gridCells.push({
      dateKey,
      dayNum,
      isCurrentMonth: false,
      apts: appointments.filter(a => a.date === dateKey)
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d)
    gridCells.push({
      dateKey,
      dayNum: d,
      isCurrentMonth: true,
      isToday: dateKey === todayStr,
      apts: appointments.filter(a => a.date === dateKey)
    })
  }

  // 3. Padding days for next month
  const totalCellsSoFar = gridCells.length
  const remainingCells = 42 - totalCellsSoFar // 6 rows of 7 days
  for (let d = 1; d <= remainingCells; d++) {
    const nextMonthIdx = month === 11 ? 0 : month + 1
    const nextYear = month === 11 ? year + 1 : year
    const dateKey = formatDateKey(nextYear, nextMonthIdx, d)
    gridCells.push({
      dateKey,
      dayNum: d,
      isCurrentMonth: false,
      apts: appointments.filter(a => a.date === dateKey)
    })
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Calendar Window */}
      <div className="card w-full max-w-5xl h-[90vh] flex flex-col bg-[#121314] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-4 sm:px-6 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-4 bg-[var(--card)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-[var(--lime)]">
              <CalendarIcon size={20} />
            </div>
            <div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>Agenda Comercial</span>
              </h2>
              <p className="text-xs text-[var(--gray2)] font-mono">
                {monthNames[month]} de {year}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="btn btn-secondary text-xs px-3 py-1.5 font-bold font-mono border-[var(--line)] cursor-pointer hover:border-[var(--lime)]"
            >
              Hoje
            </button>
            <button
              onClick={prevMonth}
              className="p-2 rounded-xl text-gray-300 hover:text-white bg-[var(--charcoal)] border border-[var(--line)] cursor-pointer hover:border-[var(--lime)]"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-xl text-gray-300 hover:text-white bg-[var(--charcoal)] border border-[var(--line)] cursor-pointer hover:border-[var(--lime)]"
            >
              <ChevronRight size={16} />
            </button>
            <div className="h-6 w-[1px] bg-[var(--line)] mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--line)] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Grid Body */}
        <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-5 overflow-hidden">
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-[var(--line)] pb-2 mb-2 shrink-0">
            {weekDays.map(w => (
              <div key={w} className="text-[10px] sm:text-xs font-mono font-bold text-[var(--gray2)] uppercase tracking-wider">
                {w}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5 min-h-0 overflow-y-auto">
            {gridCells.map((cell, idx) => (
              <div
                key={idx}
                className={`p-1 sm:p-2 rounded-xl border flex flex-col justify-start gap-1 overflow-hidden transition-all ${
                  cell.isToday
                    ? 'bg-lime-950/20 border-[var(--lime)]/60 shadow-[0_0_15px_rgba(180,217,50,0.15)]'
                    : cell.isCurrentMonth
                    ? 'bg-[var(--card)] border-[var(--line)]/60 hover:border-[var(--line)]'
                    : 'bg-black/30 border-[var(--line)]/20 opacity-40'
                }`}
              >
                {/* Day Header Number */}
                <div className="flex items-center justify-between shrink-0">
                  <span className={`text-xs font-mono font-bold rounded-md px-1.5 py-0.5 ${
                    cell.isToday
                      ? 'bg-[var(--lime)] text-black font-black'
                      : 'text-[var(--white)]'
                  }`}>
                    {cell.dayNum}
                  </span>
                  {cell.apts.length > 0 && (
                    <span className="text-[9px] font-mono font-bold text-[var(--lime)]">
                      {cell.apts.length} {cell.apts.length === 1 ? 'evt' : 'evts'}
                    </span>
                  )}
                </div>

                {/* List of Appointment Chips in Cell */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto min-h-0 custom-scrollbar">
                  {cell.apts.map(apt => (
                    <button
                      key={apt.id}
                      onClick={() => handleOpenAptDetails(apt)}
                      className={`w-full text-left text-[10px] p-1 sm:p-1.5 rounded-lg border font-mono truncate transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-between gap-1 ${
                        apt.type === 'visita' ? 'bg-sky-500/15 border-sky-500/30 text-sky-300' :
                        apt.type === 'reuniao' ? 'bg-purple-500/15 border-purple-500/30 text-purple-300' :
                        apt.type === 'ligacao' ? 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300' :
                        'bg-lime-500/15 border-lime-500/30 text-lime-300'
                      }`}
                    >
                      <span className="truncate font-bold">{apt.time} · {apt.company_name || apt.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appointment Details / Edit Modal Popup */}
        {activeApt && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                    activeApt.type === 'visita' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                    activeApt.type === 'reuniao' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    activeApt.type === 'ligacao' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-lime-500/10 text-lime-400 border border-lime-500/20'
                  }`}>
                    {activeApt.type}
                  </span>
                  <h3 className="font-display text-sm font-bold text-white">Detalhes do Agendamento</h3>
                </div>
                <button
                  onClick={() => setActiveApt(null)}
                  className="p-1 text-gray-400 hover:text-white rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {!isEditing ? (
                /* View Details Mode */
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Título / Assunto</span>
                    <h4 className="text-sm font-bold text-white">{activeApt.title}</h4>
                  </div>

                  {activeApt.company_name && (
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Empresa / Cliente</span>
                      <p className="text-xs text-[var(--lime)] font-bold">{activeApt.company_name}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Data</span>
                      <p className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <CalendarIcon size={12} className="text-[var(--lime)]" />
                        {activeApt.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Horário</span>
                      <p className="text-xs font-mono font-bold text-white flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-[var(--lime)]" />
                        {activeApt.time}
                      </p>
                    </div>
                  </div>

                  {activeApt.notes && (
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Observações</span>
                      <p className="text-xs text-gray-300 bg-black/30 p-2.5 rounded-xl border border-[var(--line)]/50 mt-1">
                        {activeApt.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
                    <button
                      onClick={handleDeleteAppointment}
                      className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-red-400 border-red-500/20 hover:border-red-500 hover:bg-red-500/10 cursor-pointer font-bold"
                    >
                      <Trash2 size={14} />
                      <span>Cancelar Agenda</span>
                    </button>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn btn-primary text-xs py-2 px-4 flex items-center gap-1.5 uppercase font-bold text-black cursor-pointer"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="label">Título / Assunto</label>
                    <input
                      type="text"
                      className="input"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="label">Tipo</label>
                      <select
                        className="input bg-[var(--charcoal)] cursor-pointer"
                        value={editType}
                        onChange={(e) => setEditType(e.target.value as any)}
                      >
                        <option value="visita">Visita</option>
                        <option value="reuniao">Reunião</option>
                        <option value="ligacao">Ligação</option>
                        <option value="email">E-mail</option>
                        <option value="proposta">Proposta</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="label">Data</label>
                      <input
                        type="date"
                        className="input bg-[var(--charcoal)] cursor-pointer"
                        required
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="label">Hora</label>
                      <input
                        type="time"
                        className="input bg-[var(--charcoal)] cursor-pointer"
                        required
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="label">Observações</label>
                    <textarea
                      className="input min-h-[60px] resize-none"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn btn-secondary text-xs py-2 px-3 cursor-pointer"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary text-xs py-2 px-4 font-bold text-black uppercase cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

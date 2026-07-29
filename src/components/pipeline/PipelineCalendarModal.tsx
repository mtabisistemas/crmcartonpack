'use client'

import { useState, useEffect, useRef } from 'react'
import { Appointment } from '@/types'
import { getAppointments, updateAppointment, deleteAppointment, saveAppointment } from '@/services/appointment-service'
import { 
  X, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, Edit2, Trash2
} from 'lucide-react'

interface PipelineCalendarModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PipelineCalendarModal({ isOpen, onClose }: PipelineCalendarModalProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  
  // Selected appointment for detail / edit modal
  const [activeApt, setActiveApt] = useState<Appointment | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Day Popover for "Mais X" in Month View
  const [dayPopover, setDayPopover] = useState<{
    dateKey: string
    dayNum: number
    dayName: string
    apts: Appointment[]
  } | null>(null)

  // Form state (for create / edit)
  const [formTitle, setFormTitle] = useState('')
  const [formType, setFormType] = useState<Appointment['type']>('visita')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formCompany, setFormCompany] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Scroll ref for week view
  const weekGridRef = useRef<HTMLDivElement>(null)

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

  // Scroll to ~8 AM when switching to week view
  useEffect(() => {
    if (viewMode === 'week' && weekGridRef.current) {
      // 8 AM is 8 * 56px per hour = 448px
      weekGridRef.current.scrollTop = 448
    }
  }, [viewMode, isOpen])

  if (!isOpen) return null

  // Date Navigation
  const prevPeriod = () => {
    setDayPopover(null)
    if (viewMode === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))
    }
  }

  const nextPeriod = () => {
    setDayPopover(null)
    if (viewMode === 'month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
    } else {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))
    }
  }

  const goToday = () => {
    setDayPopover(null)
    setCurrentDate(new Date())
  }

  // Month navigation calculation
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDayIndex = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const monthShortNames = [
    'jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
    'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'
  ]

  const weekDays = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.']

  // Helper date key formatter: YYYY-MM-DD
  const formatDateKey = (y: number, m: number, d: number) => {
    const monthStr = String(m + 1).padStart(2, '0')
    const dayStr = String(d).padStart(2, '0')
    return `${y}-${monthStr}-${dayStr}`
  }

  const todayStr = new Date().toISOString().split('T')[0]

  // Week calculation (Sunday to Saturday)
  const getWeekDays = (anchorDate: Date) => {
    const dayOfWeek = anchorDate.getDay() // 0 = Sun, 6 = Sat
    const sunday = new Date(anchorDate)
    sunday.setDate(anchorDate.getDate() - dayOfWeek)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday)
      d.setDate(sunday.getDate() + i)
      days.push(d)
    }
    return days
  }

  const weekDaysList = getWeekDays(currentDate)
  const weekStart = weekDaysList[0]
  const weekEnd = weekDaysList[6]

  // Header Title Label
  const getHeaderTitle = () => {
    if (viewMode === 'month') {
      return `${monthNames[month]} de ${year}`
    } else {
      const startMonth = monthShortNames[weekStart.getMonth()]
      const endMonth = monthShortNames[weekEnd.getMonth()]
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${startMonth} ${year}`
      }
      return `${startMonth} – ${endMonth} ${weekEnd.getFullYear()}`
    }
  }

  // Open creation modal
  const handleOpenCreate = (presetDate?: string, presetTime?: string) => {
    setIsCreating(true)
    setActiveApt(null)
    setFormTitle('')
    setFormType('visita')
    setFormDate(presetDate || todayStr)
    setFormTime(presetTime || '09:00')
    setFormCompany('')
    setFormNotes('')
  }

  // Open edit modal for an appointment
  const handleOpenAptDetails = (apt: Appointment) => {
    setDayPopover(null)
    setIsCreating(false)
    setActiveApt(apt)
    setFormTitle(apt.title)
    setFormType(apt.type)
    setFormDate(apt.date)
    setFormTime(apt.time)
    setFormCompany(apt.company_name || '')
    setFormNotes(apt.notes || '')
    setIsEditing(false)
  }

  // Save new appointment
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault()
    saveAppointment({
      title: formTitle,
      type: formType,
      date: formDate,
      time: formTime,
      deal_id: '',
      company_name: formCompany || undefined,
      notes: formNotes || undefined,
      status: 'agendado'
    })
    loadApts()
    setIsCreating(false)
  }

  // Save edited appointment
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeApt) return
    const updated = updateAppointment({
      ...activeApt,
      title: formTitle,
      type: formType,
      date: formDate,
      time: formTime,
      company_name: formCompany || undefined,
      notes: formNotes || undefined
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

  // Build grid calendar cells for Month View
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
      dayName: weekDays[(firstDayIndex - 1 - i) % 7],
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      apts: appointments.filter(a => a.date === dateKey)
    })
  }

  // 2. Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = formatDateKey(year, month, d)
    const dayName = weekDays[new Date(year, month, d).getDay()]
    gridCells.push({
      dateKey,
      dayNum: d,
      dayName,
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
    const dayName = weekDays[new Date(nextYear, nextMonthIdx, d).getDay()]
    gridCells.push({
      dateKey,
      dayNum: d,
      dayName,
      isCurrentMonth: false,
      isToday: dateKey === todayStr,
      apts: appointments.filter(a => a.date === dateKey)
    })
  }

  // Time slots for Week View (00:00 to 23:00)
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i)

  // Format hour label (e.g., "08:00" or "8 AM")
  const formatHourLabel = (h: number) => {
    if (h === 0) return '12 AM'
    if (h < 12) return `${h} AM`
    if (h === 12) return '12 PM'
    return `${h - 12} PM`
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* Calendar Window Container */}
      <div className="card w-full max-w-6xl h-[92vh] flex flex-col bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden relative">
        
        {/* Header Bar */}
        <div className="p-3 sm:px-6 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 bg-[var(--card)] shrink-0">
          
          {/* Title & Date */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="btn btn-secondary text-xs px-3 py-1.5 font-bold border-[var(--line)] cursor-pointer hover:border-[var(--lime)] hover:text-[var(--lime)] transition-colors"
            >
              Hoje
            </button>

            <div className="flex items-center gap-1">
              <button
                onClick={prevPeriod}
                className="p-1.5 rounded-lg text-[var(--white)] hover:text-[var(--lime)] bg-[var(--charcoal)] border border-[var(--line)] cursor-pointer hover:border-[var(--lime)] transition-colors"
                title="Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextPeriod}
                className="p-1.5 rounded-lg text-[var(--white)] hover:text-[var(--lime)] bg-[var(--charcoal)] border border-[var(--line)] cursor-pointer hover:border-[var(--lime)] transition-colors"
                title="Próximo"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <h2 className="font-display text-base sm:text-xl font-bold text-[var(--white)] tracking-tight ml-2">
              {getHeaderTitle()}
            </h2>
          </div>

          {/* Controls Right */}
          <div className="flex items-center gap-3">
            {/* View Selector (Mês / Semana) */}
            <div className="flex items-center bg-[var(--charcoal)] border border-[var(--line)] p-1 rounded-xl gap-1">
              <button
                onClick={() => { setViewMode('month'); setDayPopover(null); }}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  viewMode === 'month'
                    ? 'bg-[var(--lime)] text-black shadow-md font-black'
                    : 'text-[var(--gray2)] hover:text-[var(--white)]'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => { setViewMode('week'); setDayPopover(null); }}
                className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                  viewMode === 'week'
                    ? 'bg-[var(--lime)] text-black shadow-md font-black'
                    : 'text-[var(--gray2)] hover:text-[var(--white)]'
                }`}
              >
                Semana
              </button>
            </div>

            {/* Novo Agendamento Button */}
            <button
              onClick={() => handleOpenCreate()}
              className="btn btn-primary text-xs py-1.5 px-3 font-bold uppercase tracking-wider text-black flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(180,217,50,0.25)]"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Novo Agendamento</span>
            </button>

            <div className="h-6 w-[1px] bg-[var(--line)]" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[var(--gray2)] hover:text-[var(--white)] hover:bg-[var(--line)] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Calendar Body Content */}
        <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-4 overflow-hidden relative">
          
          {/* ========================================================
              VIEW 1: MONTH VIEW (Visão de Mês)
             ======================================================== */}
          {viewMode === 'month' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              
              {/* Weekday Header Titles */}
              <div className="grid grid-cols-7 gap-1.5 text-center border-b border-[var(--line)] pb-2 mb-2 shrink-0">
                {weekDays.map(w => (
                  <div key={w} className="text-[11px] font-mono font-bold text-[var(--gray2)] uppercase tracking-wider">
                    {w}
                  </div>
                ))}
              </div>

              {/* Month 7x6 Days Grid */}
              <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1.5 min-h-0 overflow-y-auto custom-scrollbar">
                {gridCells.map((cell, idx) => {
                  const visibleApts = cell.apts.slice(0, 3)
                  const hasMore = cell.apts.length > 3
                  const extraCount = cell.apts.length - 3

                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-xl border flex flex-col justify-start gap-1 overflow-hidden transition-all relative ${
                        cell.isToday
                          ? 'bg-lime-500/10 border-[var(--lime)] shadow-[0_0_15px_rgba(180,217,50,0.15)]'
                          : cell.isCurrentMonth
                          ? 'bg-[var(--card)] border-[var(--line)] hover:border-[var(--lime)]/50'
                          : 'bg-[var(--charcoal)]/40 border-[var(--line)]/40 opacity-40'
                      }`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between shrink-0">
                        <button
                          onClick={() => {
                            if (cell.apts.length > 0) {
                              setDayPopover({
                                dateKey: cell.dateKey,
                                dayNum: cell.dayNum,
                                dayName: cell.dayName,
                                apts: cell.apts
                              })
                            }
                          }}
                          className={`text-xs font-mono font-bold rounded-full w-6 h-6 flex items-center justify-center transition-colors ${
                            cell.isToday
                              ? 'bg-[var(--lime)] text-black font-black'
                              : 'text-[var(--white)] hover:bg-[var(--charcoal)]'
                          }`}
                        >
                          {cell.dayNum}
                        </button>
                      </div>

                      {/* Chips List (Max 3) */}
                      <div className="flex-1 flex flex-col gap-1 overflow-hidden min-h-0 mt-0.5">
                        {visibleApts.map(apt => (
                          <button
                            key={apt.id}
                            onClick={() => handleOpenAptDetails(apt)}
                            className="w-full text-left text-[10px] py-1 px-1.5 rounded-md border border-[var(--lime)]/40 bg-[var(--lime)]/15 text-[var(--white)] font-mono truncate transition-all hover:bg-[var(--lime)]/30 hover:border-[var(--lime)] cursor-pointer flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--lime)] shrink-0" />
                            <span className="truncate font-semibold text-[var(--white)]">
                              <strong className="font-bold text-[var(--lime)]">{apt.time}</strong> {apt.company_name || apt.title}
                            </span>
                          </button>
                        ))}

                        {/* "Mais X" Indicator Button */}
                        {hasMore && (
                          <button
                            onClick={() => setDayPopover({
                              dateKey: cell.dateKey,
                              dayNum: cell.dayNum,
                              dayName: cell.dayName,
                              apts: cell.apts
                            })}
                            className="text-[10px] font-bold text-[var(--lime)] hover:text-[var(--white)] hover:bg-[var(--lime)]/20 px-1.5 py-0.5 rounded transition-colors text-left cursor-pointer flex items-center gap-1"
                          >
                            <span>Mais {extraCount}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ========================================================
              VIEW 2: WEEK VIEW (Visão de Semana)
             ======================================================== */}
          {viewMode === 'week' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              
              {/* Weekday Header Columns */}
              <div className="grid grid-cols-[60px_1fr] border-b border-[var(--line)] pb-2 mb-1 shrink-0">
                <div className="text-[10px] font-mono text-[var(--gray2)] text-center self-end">
                  GMT-03
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekDaysList.map((d, i) => {
                    const dNum = d.getDate()
                    const dateKey = d.toISOString().split('T')[0]
                    const isToday = dateKey === todayStr
                    const dayLabel = weekDays[d.getDay()]

                    return (
                      <div key={i} className="flex flex-col items-center">
                        <span className="text-[10px] font-mono font-bold text-[var(--gray2)] uppercase">
                          {dayLabel}
                        </span>
                        <span className={`text-sm font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                          isToday
                            ? 'bg-[var(--lime)] text-black font-black shadow-[0_0_10px_rgba(180,217,50,0.4)]'
                            : 'text-[var(--white)]'
                        }`}>
                          {dNum}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Scrollable 24-hour Week Timeline Grid */}
              <div ref={weekGridRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-[60px_1fr] relative min-h-[1344px]">
                  
                  {/* Hour labels left column */}
                  <div className="flex flex-col">
                    {hoursOfDay.map(h => (
                      <div key={h} className="h-14 border-b border-[var(--line)]/30 text-[10px] font-mono text-[var(--gray2)] pr-2 text-right -translate-y-2">
                        {formatHourLabel(h)}
                      </div>
                    ))}
                  </div>

                  {/* 7 Columns for Days of the Week */}
                  <div className="grid grid-cols-7 gap-1 relative border-l border-[var(--line)]/40">
                    {weekDaysList.map((dayDate, dayIdx) => {
                      const dateKey = dayDate.toISOString().split('T')[0]
                      const dayApts = appointments.filter(a => a.date === dateKey)

                      return (
                        <div key={dayIdx} className="relative border-r border-[var(--line)]/30 h-[1344px]">
                          {/* Hour slot background grid lines */}
                          {hoursOfDay.map(h => (
                            <div
                              key={h}
                              onClick={() => handleOpenCreate(dateKey, `${String(h).padStart(2, '0')}:00`)}
                              className="h-14 border-b border-[var(--line)]/30 hover:bg-[var(--lime)]/5 transition-colors cursor-pointer"
                              title={`Agendar para ${dateKey} às ${String(h).padStart(2, '0')}:00`}
                            />
                          ))}

                          {/* Rendered Appointment Blocks */}
                          {dayApts.map(apt => {
                            const [hStr, mStr] = (apt.time || '09:00').split(':')
                            const hourNum = parseInt(hStr, 10) || 9
                            const minNum = parseInt(mStr, 10) || 0
                            
                            // 56px per hour
                            const topPx = (hourNum + minNum / 60) * 56
                            const heightPx = 52 // standard ~1 hour block height

                            return (
                              <button
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleOpenAptDetails(apt)
                                }}
                                style={{ top: `${topPx}px`, height: `${heightPx}px` }}
                                className="absolute left-0.5 right-0.5 z-10 bg-[var(--lime)]/15 border-l-4 border-[var(--lime)] p-1.5 rounded-md text-[11px] font-mono text-left shadow-md hover:bg-[var(--lime)]/25 transition-all cursor-pointer overflow-hidden flex flex-col justify-between"
                              >
                                <div className="font-bold truncate text-[var(--white)] leading-tight">
                                  {apt.title}
                                </div>
                                <div className="text-[10px] text-[var(--lime)] truncate font-semibold">
                                  {apt.time} {apt.company_name ? `· ${apt.company_name}` : ''}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================
            POPOVER FLUTUANTE DO DIA (Estilo Google Calendar)
           ======================================================== */}
        {dayPopover && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="card w-full max-w-sm bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
              
              {/* Popover Header */}
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[var(--gray2)] uppercase">
                    {dayPopover.dayName}
                  </span>
                  <span className="text-xl font-mono font-bold text-[var(--white)] bg-[var(--lime)] text-black w-8 h-8 rounded-full flex items-center justify-center">
                    {dayPopover.dayNum}
                  </span>
                </div>

                <button
                  onClick={() => setDayPopover(null)}
                  className="p-1 text-[var(--gray2)] hover:text-[var(--white)] rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Popover Appointments List */}
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-2 py-1">
                {dayPopover.apts.map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => handleOpenAptDetails(apt)}
                    className="w-full text-left p-2.5 rounded-xl border border-[var(--lime)]/30 bg-[var(--lime)]/10 hover:bg-[var(--lime)]/20 text-[var(--white)] transition-all cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--lime)] shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-[var(--white)] truncate">{apt.title}</div>
                        {apt.company_name && (
                          <div className="text-[10px] text-[var(--lime)] font-mono truncate">{apt.company_name}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[var(--lime)] shrink-0">
                      {apt.time}
                    </span>
                  </button>
                ))}
              </div>

              {/* Footer action to add appointment for this day */}
              <div className="pt-2 border-t border-[var(--line)] flex justify-end">
                <button
                  onClick={() => {
                    const dateKey = dayPopover.dateKey
                    setDayPopover(null)
                    handleOpenCreate(dateKey)
                  }}
                  className="btn btn-primary text-xs py-1.5 px-3 font-bold text-black flex items-center gap-1 uppercase cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Agendar neste dia</span>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL DE NOVO AGENDAMENTO (Create)
           ======================================================== */}
        {isCreating && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <Plus size={18} className="text-[var(--lime)]" />
                  <h3 className="font-display text-sm font-bold text-[var(--white)]">Novo Agendamento Comercial</h3>
                </div>
                <button
                  onClick={() => setIsCreating(false)}
                  className="p-1 text-[var(--gray2)] hover:text-[var(--white)] rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveNew} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="label">Título / Assunto</label>
                  <input
                    type="text"
                    className="input text-[var(--white)]"
                    placeholder="Ex: Reunião de Apresentação Comercial"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="label">Empresa / Cliente (Opcional)</label>
                  <input
                    type="text"
                    className="input text-[var(--white)]"
                    placeholder="Ex: CartonPack Embalagens"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="label">Tipo</label>
                    <select
                      className="input bg-[var(--charcoal)] text-[var(--white)] cursor-pointer"
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as any)}
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
                      className="input bg-[var(--charcoal)] text-[var(--white)] cursor-pointer"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="label">Hora</label>
                    <input
                      type="time"
                      className="input bg-[var(--charcoal)] text-[var(--white)] cursor-pointer"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="label">Observações</label>
                  <textarea
                    className="input min-h-[60px] resize-none text-[var(--white)]"
                    placeholder="Notas ou pauta do compromisso..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--line)]">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="btn btn-secondary text-xs py-2 px-3 cursor-pointer font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary text-xs py-2 px-4 font-bold text-black uppercase cursor-pointer"
                  >
                    Salvar Compromisso
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

        {/* ========================================================
            MODAL DE DETALHES / EDIÇÃO (Edit / View)
           ======================================================== */}
        {activeApt && (
          <div className="fixed inset-0 z-[100001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
            <div className="card w-full max-w-md bg-[var(--card)] border border-[var(--line)] p-5 rounded-2xl flex flex-col gap-4 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--lime)]/10 text-[var(--lime)] border border-[var(--lime)]/30">
                    {activeApt.type}
                  </span>
                  <h3 className="font-display text-sm font-bold text-[var(--white)]">Detalhes do Agendamento</h3>
                </div>
                <button
                  onClick={() => setActiveApt(null)}
                  className="p-1 text-[var(--gray2)] hover:text-[var(--white)] rounded cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {!isEditing ? (
                /* View Details Mode */
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Título / Assunto</span>
                    <h4 className="text-sm font-bold text-[var(--white)] mt-0.5">{activeApt.title}</h4>
                  </div>

                  {activeApt.company_name && (
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Empresa / Cliente</span>
                      <p className="text-xs text-[var(--lime)] font-bold mt-0.5">{activeApt.company_name}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 bg-[var(--charcoal)] p-3 rounded-xl border border-[var(--line)]">
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Data</span>
                      <p className="text-xs font-mono font-bold text-[var(--white)] flex items-center gap-1.5 mt-0.5">
                        <CalendarIcon size={12} className="text-[var(--lime)]" />
                        {activeApt.date.split('-').reverse().join('/')}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Horário</span>
                      <p className="text-xs font-mono font-bold text-[var(--white)] flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} className="text-[var(--lime)]" />
                        {activeApt.time}
                      </p>
                    </div>
                  </div>

                  {activeApt.notes && (
                    <div>
                      <span className="text-[10px] font-mono text-[var(--gray2)] uppercase font-bold">Observações</span>
                      <p className="text-xs text-[var(--white)] bg-[var(--charcoal)] p-2.5 rounded-xl border border-[var(--line)] mt-1">
                        {activeApt.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--line)]">
                    <button
                      onClick={handleDeleteAppointment}
                      className="btn btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 text-red-500 border-red-500/30 hover:border-red-500 hover:bg-red-500/10 cursor-pointer font-bold"
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
                /* Edit Form Mode */
                <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="label">Título / Assunto</label>
                    <input
                      type="text"
                      className="input"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="label">Empresa / Cliente</label>
                    <input
                      type="text"
                      className="input"
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="label">Tipo</label>
                      <select
                        className="input bg-[var(--charcoal)] cursor-pointer"
                        value={formType}
                        onChange={(e) => setFormType(e.target.value as any)}
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
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="label">Hora</label>
                      <input
                        type="time"
                        className="input bg-[var(--charcoal)] cursor-pointer"
                        required
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="label">Observações</label>
                    <textarea
                      className="input min-h-[60px] resize-none"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
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

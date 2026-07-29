'use client'

import { dbService } from '@/services/supabase-client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  User,
  X,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  Key,
  MapPin,
  Eye,
  Users,
  UserCog
} from 'lucide-react'

interface TeamUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'gestor' | 'representante' | 'vendedor'
  status: 'ativo' | 'inativo'
  phone: string
  createdAt: string
  username?: string
  tempPassword?: string
  password?: string
  isFirstAccess?: boolean
  isEmailConfirmed?: boolean
  lastSeenAt?: string
  lastLocation?: string
}

function formatPhoneBr(v: string) {
  const clean = v.replace(/\D/g, '')
  if (clean.length === 0) return ''
  if (clean.length <= 2) return `(${clean}`
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
}

function formatLastSeen(dateStr?: string) {
  if (!dateStr) return 'Sem acesso registrado'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Sem acesso registrado'
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (e) {
    return 'Sem acesso registrado'
  }
}

export default function UsersPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  
  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [selectedUserForFicha, setSelectedUserForFicha] = useState<TeamUser | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamUser['role']>('vendedor')
  const [status, setStatus] = useState<TeamUser['status']>('ativo')
  const [phone, setPhone] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [username, setUsername] = useState('')

  // Success screen after creation
  const [showCopyModal, setShowCopyModal] = useState(false)
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    name: string
    usernameOrEmail: string
    tempPassword: string
    type: 'cartonpack' | 'externo'
  } | null>(null)

  // Custom dialog states
  const [toastMessage, setToastMessage] = useState('')
  const [userToDelete, setUserToDelete] = useState<string | null>(null)

  // Role permissions
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'administrador'
  const isGestor = currentUser?.role === 'gestor' || currentUser?.role === 'gestor comercial'

  // Access control & Role enforcement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const session = localStorage.getItem('crm_current_user')
      if (session) {
        try {
          const parsed = JSON.parse(session)
          setCurrentUser(parsed)
          if (parsed.role === 'vendedor' || parsed.role === 'representante') {
            router.replace('/dashboard')
          }
        } catch (e) {
          router.replace('/login')
        }
      } else {
        router.replace('/login')
      }
    }
  }, [router])

  // Load users from Supabase API + local storage merge
  useEffect(() => {
    async function syncUsers() {
      let apiUserList: TeamUser[] = []
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.users)) {
          apiUserList = json.users
        }
      } catch (e) {
        console.error('[UsersPage] Failed to load users from API', e)
      }

      let localUserList: TeamUser[] = []
      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('cp_crm_v7_official_users') || localStorage.getItem('crm_users')
        if (raw) {
          try { localUserList = JSON.parse(raw) } catch (e) {}
        }
      }

      // Merge API and Local users by ID / email / name
      const userMap = new Map<string, TeamUser>()
      localUserList.forEach(u => {
        if (u.id || u.name) userMap.set(u.id || u.name.toLowerCase(), u)
      })
      apiUserList.forEach(u => {
        userMap.set(u.id || u.name.toLowerCase(), u)
      })

      const combined = Array.from(userMap.values())
      if (combined.length > 0) {
        setUsers(combined)
      }
    }
    syncUsers()
  }, [])

  const saveUsers = (newUsers: TeamUser[]) => {
    setUsers(newUsers)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm_users', JSON.stringify(newUsers))
      localStorage.setItem('cp_crm_v7_official_users', JSON.stringify(newUsers))
    }
  }

  const deriveUsername = (n: string) => {
    const parts = n.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0]}.${parts[1]}`
    } else if (parts.length === 1) {
      return parts[0]
    }
    return ''
  }

  const generateTempPassword = () => {
    return '123456'
  }

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null)
    setName('')
    setEmail('')
    setRole('vendedor')
    setStatus('ativo')
    setPhone('')
    setTempPassword(generateTempPassword())
    setUsername('')
    setShowModal(true)
  }

  // Open modal for Edit
  const handleOpenEdit = (user: TeamUser) => {
    setEditingUser(user)
    setName(user.name)
    setEmail(user.email)
    setRole(user.role)
    setStatus(user.status)
    setPhone(user.phone)
    setTempPassword(user.tempPassword || '')
    setUsername(user.username || '')
    setShowModal(true)
  }

  // Toggle user status
  const handleToggleStatus = async (user: TeamUser) => {
    const newStatus: TeamUser['status'] = user.status === 'ativo' ? 'inativo' : 'ativo'
    const updatedUser = { ...user, status: newStatus }
    const updatedList = users.map(u => 
      u.id === user.id ? updatedUser : u
    )
    saveUsers(updatedList)

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })
      setToastMessage(newStatus === 'inativo' ? `Acesso de ${user.name} suspenso com sucesso!` : `Acesso de ${user.name} reativado!`)
      setTimeout(() => setToastMessage(''), 3000)
    } catch (e) {
      console.error('Failed to update user status on API', e)
    }
  }

  // Resets temporary password (Admin only)
  const handleResetTempPassword = async (user: TeamUser) => {
    const newTempPassword = 'CP@' + Math.floor(100000 + Math.random() * 900000)
    const updatedUser: TeamUser = {
      ...user,
      tempPassword: newTempPassword,
      isFirstAccess: true
    }
    const updatedList = users.map(u => 
      u.id === user.id ? updatedUser : u
    )
    saveUsers(updatedList)

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      })
      setToastMessage(`Senha temporária redefinida para ${user.name}: ${newTempPassword}`)
      setTimeout(() => setToastMessage(''), 6000)
    } catch (e) {
      console.error('Failed to reset temp password on API', e)
    }
  }

  // Save Modal (Create or Edit)
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const isRep = role === 'representante'
    if (!name.trim() || (!isRep && !email.trim())) return

    // Prevent Gestor Comercial from creating an Admin user
    if (isGestor && (role as string) === 'admin') {
      setToastMessage('Gestores Comerciais não possuem permissão para criar usuários Administradores.')
      setTimeout(() => setToastMessage(''), 4000)
      return
    }

    const formattedName = name.trim().toUpperCase()
    const derivedUser = username || deriveUsername(formattedName)
    const isCarton = !isRep && email.includes('@')
    const finalUsername = derivedUser
    const finalEmail = isRep ? '' : email

    if (editingUser) {
      // Edit mode
      const updated = users.map(u => 
        u.id === editingUser.id 
          ? { 
              ...u, 
              name: formattedName, 
              email: finalEmail, 
              role, 
              status, 
              phone, 
              username: finalUsername,
              tempPassword: tempPassword || u.tempPassword
            }
          : u
      )
      saveUsers(updated)
      const updatedUser = updated.find(u => u.id === editingUser.id)
      if (updatedUser) {
        setSelectedUserForFicha(updatedUser)
      }
      setShowModal(false)
    } else {
      // Create mode
      const finalTempPassword = tempPassword || generateTempPassword()

      const newUserPayload = {
        id: `u-${Date.now()}`,
        name: formattedName,
        email: finalEmail,
        role,
        status,
        phone: formatPhoneBr(phone),
        tempPassword: finalTempPassword,
        username: finalUsername
      }

      const optimisticUser: TeamUser = {
        ...newUserPayload,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        isFirstAccess: true,
        isEmailConfirmed: isCarton ? false : true
      }
      setUsers(prev => [optimisticUser, ...prev])

      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserPayload)
      })
        .then(r => r.json())
        .then(json => {
          if (json.success && json.user?.id) {
            setUsers(prev => prev.map(u =>
              u.id === optimisticUser.id ? { ...u, id: json.user.id } : u
            ))
          }
          return fetch('/api/users', { cache: 'no-store' })
        })
        .then(r => r?.json())
        .then(json => {
          if (json?.success && Array.isArray(json.users)) {
            setUsers(json.users)
          }
        })
        .catch(e => console.error('[UsersPage] Failed to save user', e))

      setCreatedUserCredentials({
        name: formattedName,
        usernameOrEmail: finalUsername,
        tempPassword: finalTempPassword,
        type: isCarton ? 'cartonpack' : 'externo'
      })

      setShowModal(false)
      setShowCopyModal(true)
    }
  }

  // Capitalize name helper
  const capitalizeName = (str: string) => {
    return str
      .trim()
      .split(/\s+/)
      .map(word => {
        if (word.length === 0) return ''
        const lower = word.toLowerCase()
        if (['de', 'do', 'da', 'dos', 'das', 'e'].includes(lower)) return lower
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      })
      .join(' ')
  }

  // Delete user
  const handleDelete = (id: string) => {
    setUserToDelete(id)
  }

  const confirmDelete = () => {
    if (!userToDelete) return
    const updated = users.filter(u => u.id !== userToDelete)
    saveUsers(updated)

    dbService.usuarios.delete(userToDelete).catch(e => console.error('Failed to delete user from API', e))

    setToastMessage('Usuário excluído com sucesso!')
    setTimeout(() => setToastMessage(''), 3000)
    setUserToDelete(null)
  }

  // Filter users list by role & search (Gestor sees Vendedor, Representante and Gestor)
  const roleFilteredUsers = useMemo(() => {
    return users.filter(u => {
      if (isGestor) {
        const r = (u.role || '').toLowerCase()
        return r.includes('vend') || r.includes('rep') || r.includes('gestor')
      }
      return true
    })
  }, [users, isGestor])

  const filteredUsers = useMemo(() => {
    return roleFilteredUsers.filter(u => {
      const matchesSearch = 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone.includes(searchTerm)
        
      const uRoleLower = (u.role || '').toLowerCase()
      const matchesRole = selectedRole === 'all' || uRoleLower === selectedRole.toLowerCase() || uRoleLower.includes(selectedRole.toLowerCase())
      const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [roleFilteredUsers, searchTerm, selectedRole, selectedStatus])

  // KPI Metrics calculation for summary cards
  const metrics = useMemo(() => {
    const list = roleFilteredUsers
    return {
      total: list.length,
      gestores: list.filter(u => (u.role || '').toLowerCase().includes('gestor')).length,
      vendedores: list.filter(u => (u.role || '').toLowerCase().includes('vend')).length,
      representantes: list.filter(u => (u.role || '').toLowerCase().includes('rep')).length
    }
  }, [roleFilteredUsers])

  // Role tag styling helpers
  const getRoleDetails = (r: string) => {
    const roleLower = (r || '').toLowerCase()
    if (roleLower.includes('admin')) {
      return { label: 'Administrador', bg: 'rgba(168,85,247,0.12)', color: '#c084fc', border: 'rgba(168,85,247,0.25)' }
    }
    if (roleLower.includes('gestor')) {
      return { label: 'Gestor Comercial', bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' }
    }
    if (roleLower.includes('rep')) {
      return { label: 'Representante', bg: 'rgba(180,217,50,0.12)', color: 'var(--lime)', border: 'rgba(180,217,50,0.25)' }
    }
    if (roleLower.includes('vend')) {
      return { label: 'Vendedor', bg: 'rgba(240,196,25,0.1)', color: 'var(--yellow)', border: 'rgba(240,196,25,0.2)' }
    }
    return { label: r || 'Membro', bg: 'rgba(180,217,50,0.12)', color: 'var(--lime)', border: 'rgba(180,217,50,0.25)' }
  }

  const getInitials = (n: string) => {
    return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-2.5">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[9999] p-4 rounded-xl bg-[var(--lime)] text-black font-mono text-xs font-bold shadow-2xl animate-fade-up">
          {toastMessage}
        </div>
      )}

      {/* Header — Clean without subtitle matching Contacts page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
          Gestão de Equipe e Usuários
        </h1>

        {(isAdmin || isGestor) && (
          <button onClick={handleOpenCreate} className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-md font-bold">
            <Plus size={13} />
            <span>Novo Usuário</span>
          </button>
        )}
      </div>

      {/* ── KPI METRICS SUMMARY CARDS (Exact match to Contacts Page) ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        {/* Card 1: Total de Usuários */}
        <div 
          onClick={() => setSelectedRole('all')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedRole === 'all' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Total de Usuários</span>
            <span className="text-xl font-black text-[var(--white)] font-display mt-0.5 block">{metrics.total}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Users size={15} />
          </div>
        </div>

        {/* Card 2: Gestores */}
        <div 
          onClick={() => setSelectedRole('gestor')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedRole === 'gestor' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Gestores</span>
            <span className="text-xl font-black text-[#60a5fa] font-display mt-0.5 block">{metrics.gestores}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#60a5fa] flex items-center justify-center shrink-0">
            <UserCog size={15} />
          </div>
        </div>

        {/* Card 3: Vendedores */}
        <div 
          onClick={() => setSelectedRole('vendedor')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedRole === 'vendedor' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Vendedores</span>
            <span className="text-xl font-black text-amber-400 font-display mt-0.5 block">{metrics.vendedores}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
            <User size={15} />
          </div>
        </div>

        {/* Card 4: Representantes */}
        <div 
          onClick={() => setSelectedRole('representante')}
          className={`card p-3 flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] ${
            selectedRole === 'representante' ? 'border-[var(--lime)] bg-[var(--lime)]/5 shadow-sm' : 'border-[var(--line)] bg-[var(--card)]'
          }`}
        >
          <div>
            <span className="text-[9px] font-mono text-[var(--gray2)] uppercase tracking-wider block font-bold">Representantes</span>
            <span className="text-xl font-black text-[var(--lime)] font-display mt-0.5 block">{metrics.representantes}</span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-[var(--lime)]/10 border border-[var(--lime)]/20 text-[var(--lime)] flex items-center justify-center shrink-0">
            <UserCheck size={15} />
          </div>
        </div>
      </div>

      {/* Filters Bar — Exact match to Contacts Page */}
      <div className="card p-3 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
        <div className="md:col-span-3 flex items-center gap-2 input w-full py-1.5 px-3">
          <Search size={13} className="text-[var(--gray2)] shrink-0" />
          <input
            className="bg-transparent border-none outline-none w-full text-xs text-[var(--white)] placeholder-[var(--gray2)]"
            placeholder="Buscar por nome, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="md:col-span-1">
          <select 
            className="input w-full py-1.5 px-3 text-xs"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">Todas as Funções</option>
            {isAdmin && <option value="gestor">Gestor Comercial</option>}
            <option value="vendedor">Vendedor</option>
            <option value="representante">Representante</option>
            {isAdmin && <option value="admin">Administrador</option>}
          </select>
        </div>

        <div className="md:col-span-1">
          <select 
            className="input w-full py-1.5 px-3 text-xs"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table Card — Compact layout matching Contacts page */}
      <div className="card overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[var(--charcoal)] shadow-sm">
              <tr className="border-b border-[var(--line)] bg-[var(--charcoal)] font-mono text-[9px] text-[var(--gray)] uppercase tracking-wider">
                <th className="py-2.5 px-3 pl-4">Membro / Contato</th>
                <th className="py-2.5 px-3">Função</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3">Telefone</th>
                <th className="py-2.5 px-3">Cadastrado em</th>
                <th className="py-2.5 px-3">Último Acesso</th>
                {isAdmin && <th className="py-2.5 px-3">Última Localização</th>}
                <th className="py-2.5 px-3 pr-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredUsers.map(user => {
                const roleInfo = getRoleDetails(user.role)
                return (
                  <tr 
                    key={user.id} 
                    onClick={() => setSelectedUserForFicha(user)}
                    className="hover:bg-[var(--charcoal)] transition-colors duration-150 cursor-pointer"
                  >
                    
                    {/* User Info */}
                    <td className="py-2 px-3 pl-4">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--white)] font-bold text-xs shrink-0"
                          style={{
                            background: user.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'var(--line)',
                            border: `1px solid ${user.role === 'admin' ? 'rgba(168,85,247,0.3)' : 'transparent'}`
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--white)] truncate">{user.name}</div>
                          <div className="text-[10px] text-[var(--gray)] font-mono leading-tight truncate">{user.email || user.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Tag */}
                    <td className="py-2 px-3">
                      <span
                        className="font-mono text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider inline-block shrink-0"
                        style={{
                          background: roleInfo.bg,
                          color: roleInfo.color,
                          border: `1px solid ${roleInfo.border}`
                        }}
                      >
                        {roleInfo.label}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 text-center">
                      {(isAdmin || isGestor) ? (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(user)
                          }}
                          title={`Clique para deixar o usuário ${user.status === 'ativo' ? 'inativo' : 'ativo'}`}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border transition-all cursor-pointer ${
                            user.status === 'ativo'
                              ? 'bg-[rgba(34,197,94,0.15)] text-[var(--green)] border-[rgba(34,197,94,0.25)] hover:bg-[rgba(34,197,94,0.25)]'
                              : 'bg-[rgba(239,68,68,0.15)] text-[var(--red)] border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.25)]'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ativo' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}></span>
                          <span>{user.status === 'ativo' ? 'ATIVO' : 'INATIVO'}</span>
                        </button>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold border ${
                          user.status === 'ativo'
                            ? 'bg-[rgba(34,197,94,0.15)] text-[var(--green)] border-[rgba(34,197,94,0.25)]'
                            : 'bg-[rgba(239,68,68,0.15)] text-[var(--red)] border-[rgba(239,68,68,0.25)]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ativo' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}></span>
                          <span>{user.status === 'ativo' ? 'ATIVO' : 'INATIVO'}</span>
                        </span>
                      )}
                    </td>

                    {/* Telefone */}
                    <td className="py-2 px-3 font-mono text-xs text-[var(--white)]">
                      {user.phone || '-'}
                    </td>

                    {/* Created At */}
                    <td className="py-2 px-3 text-xs text-[var(--gray)] font-mono">
                      {user.createdAt}
                    </td>

                    {/* Último Acesso (Admin & Gestor) */}
                    <td className="py-2 px-3 text-xs font-mono text-[var(--lime)] font-medium">
                      {formatLastSeen(user.lastSeenAt)}
                    </td>

                    {/* Última Localização (Admin ONLY) */}
                    {isAdmin && (
                      <td className="py-2 px-3 text-xs font-mono text-zinc-300">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-[var(--lime)] shrink-0" />
                          <span className="truncate max-w-[180px]" title={user.lastLocation || 'Não capturada'}>
                            {user.lastLocation || 'Não capturada'}
                          </span>
                        </div>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-2 px-3 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForFicha(user)}
                          title="Visualizar Ficha Completa do Usuário"
                          className="p-1.5 rounded-lg bg-neutral-900 border border-[var(--line)] text-zinc-300 hover:text-white hover:border-[var(--lime)]/50 transition-all cursor-pointer"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS BAR INTEGRATED AT BOTTOM OF TABLE CARD ── */}
        {filteredUsers.length > 0 && (
          <div className="py-2 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--charcoal)]/80 shrink-0">
            <div className="text-[11px] font-mono text-[var(--gray2)]">
              Exibindo <span className="font-bold text-[var(--white)]">1</span> a <span className="font-bold text-[var(--white)]">{filteredUsers.length}</span> de <span className="font-bold text-[var(--white)]">{filteredUsers.length}</span> usuários
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled
                className="btn btn-secondary text-[11px] px-2.5 py-1 rounded-md disabled:opacity-40 cursor-not-allowed font-mono font-bold"
              >
                &larr; Anterior
              </button>

              <span className="text-[11px] font-mono font-bold text-[var(--lime)] px-2">
                Página 1 de 1
              </span>

              <button
                disabled
                className="btn btn-secondary text-[11px] px-2.5 py-1 rounded-md disabled:opacity-40 cursor-not-allowed font-mono font-bold"
              >
                Próxima &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Cadastrar / Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-5 animate-fade-up">
            
            <div className="flex justify-between items-start border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-display text-base text-[var(--white)] font-bold">
                  {editingUser ? 'Editar Dados do Usuário' : 'Cadastrar Novo Usuário'}
                </h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">
                  Defina os dados e permissões do membro de forma instantânea.
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-[var(--white)] p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Completo *</label>
                  <div className="relative flex items-center">
                    <User size={13} className="absolute left-3 text-[var(--gray2)] pointer-events-none" />
                    <input
                      type="text"
                      required
                      className="input w-full !pl-9 uppercase"
                      placeholder="Ex: ROBERTO CARLOS"
                      value={name}
                      onChange={(e) => {
                        const upper = e.target.value.toUpperCase()
                        setName(upper)
                        if (!editingUser) {
                          setUsername(deriveUsername(upper))
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Função do Usuário *</label>
                  <select 
                    className="input w-full font-bold"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="vendedor">Vendedor</option>
                    <option value="representante">Representante</option>
                    <option value="gestor">Gestor Comercial</option>
                    {isAdmin && <option value="admin">Administrador</option>}
                  </select>
                </div>

                {role !== 'representante' && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">E-mail Comercial *</label>
                    <div className="relative flex items-center">
                      <Mail size={13} className="absolute left-3 text-[var(--gray2)] pointer-events-none" />
                      <input
                        type="email"
                        required
                        className="input w-full !pl-9 font-mono text-xs"
                        placeholder="ex: joao.silva@cartonpack.com.br"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {role === 'representante' || !email.toLowerCase().endsWith('@cartonpack.com') ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider">Nome de Usuário *</label>
                      <input
                        type="text"
                        required
                        className="input w-full font-mono text-xs font-bold"
                        placeholder="usuario.sobrenome"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome de Usuário</label>
                      <div className="input w-full text-xs text-[var(--gray2)] font-mono flex items-center bg-[var(--charcoal)] opacity-50 select-none cursor-not-allowed">
                        (Usará o E-mail)
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[var(--lime)] uppercase font-mono tracking-wider flex items-center justify-between">
                      <span>Senha Temporária *</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="input w-full font-mono text-xs font-bold text-[var(--lime)] bg-[var(--card)]"
                      placeholder="123456"
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">WhatsApp / Telefone</label>
                  <div className="relative flex items-center">
                    <Phone size={13} className="absolute left-3 text-[var(--gray2)] pointer-events-none" />
                    <input
                      type="text"
                      className="input w-full !pl-9 font-mono text-xs"
                      placeholder="(11) 98888-8888"
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBr(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--line)] pt-3 mt-2">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider text-[#060606] cursor-pointer"
                >
                  Confirmar e Salvar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal Copiar Credenciais */}
      {showCopyModal && createdUserCredentials && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal)] border border-[var(--lime)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
            <div className="flex justify-between items-start border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-display text-base text-[var(--lime)] font-bold">Usuário Cadastrado / Senha Gerada!</h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">Copie a mensagem para compartilhar com o membro da equipe.</p>
              </div>
              <button type="button" onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-[var(--white)] p-1 cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-black/40 border border-[var(--line)] rounded-xl p-4 font-mono text-[11px] text-[var(--white)] whitespace-pre-wrap leading-relaxed select-all">
{`Olá, ${createdUserCredentials.name}! Seu acesso ao CRM Carton Pack está liberado.

Link de Acesso: https://crmcartonpack.vercel.app
${createdUserCredentials.type === 'cartonpack' ? `Login (E-mail Corporativo): ${createdUserCredentials.usernameOrEmail}` : `Login (Nome de Usuário): ${createdUserCredentials.usernameOrEmail}`}
Senha Temporária: ${createdUserCredentials.tempPassword}

Obs: No primeiro acesso você deverá alterar a senha temporária para ativar sua conta.`}
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `Olá, ${createdUserCredentials.name}! Seu acesso ao CRM Carton Pack está liberado.\n\nLink de Acesso: https://crmcartonpack.vercel.app\n${createdUserCredentials.type === 'cartonpack' ? `Login (E-mail): ${createdUserCredentials.usernameOrEmail}` : `Usuário: ${createdUserCredentials.usernameOrEmail}`}\nSenha Temporária: ${createdUserCredentials.tempPassword}\n\nObs: No primeiro acesso você deverá alterar a senha temporária para ativar sua conta.`
                navigator.clipboard.writeText(text)
                setToastMessage('Mensagem de acesso copiada com sucesso!')
                setTimeout(() => setToastMessage(''), 3000)
              }}
              className="btn btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-black w-full cursor-pointer"
            >
              Copiar Mensagem de Acesso
            </button>
          </div>
        </div>
      )}

      {/* Ficha do Usuário (Drawer) */}
      {selectedUserForFicha && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={() => setSelectedUserForFicha(null)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md border-l border-[var(--line)] flex flex-col h-full bg-[var(--charcoal)] text-white shadow-2xl animate-slide-in-right">
              
              <div className="p-6 border-b border-[var(--line)] flex items-center justify-between bg-[var(--card)]">
                <div>
                  <h3 className="text-xl font-bold font-display text-white">
                    {selectedUserForFicha.name}
                  </h3>
                  <div className="mt-2">
                    {(() => {
                      const roleInfo = getRoleDetails(selectedUserForFicha.role)
                      return (
                        <span
                          className="font-mono text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider inline-block"
                          style={{
                            background: roleInfo.bg,
                            color: roleInfo.color,
                            border: `1px solid ${roleInfo.border}`
                          }}
                        >
                          {roleInfo.label}
                        </span>
                      )
                    })()}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedUserForFicha(null)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Detalhes de Acesso & Contato */}
                <div className="card p-5 border-[var(--line)] bg-[var(--card)] space-y-4">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest border-b border-[var(--line)] pb-2">
                    Detalhes de Contato & Acesso
                  </h4>
                  
                  <div className="flex items-center gap-3">
                    <Phone size={14} className="text-[var(--lime)]" />
                    <div>
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">WhatsApp / Telefone</div>
                      <div className="text-sm font-semibold text-[var(--white)]">{selectedUserForFicha.phone || 'Não informado'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail size={14} className="text-[var(--lime)]" />
                    <div>
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">E-mail / Login</div>
                      <div className="text-sm font-semibold text-[var(--white)]">{selectedUserForFicha.email || selectedUserForFicha.username}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-[var(--lime)]" />
                    <div>
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Último Acesso Registrado</div>
                      <div className="text-sm font-semibold text-[var(--lime)] font-mono">
                        {formatLastSeen(selectedUserForFicha.lastSeenAt)}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-3">
                      <MapPin size={14} className="text-[var(--lime)] shrink-0" />
                      <div>
                        <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Última Localização (Endereço)</div>
                        <div className="text-xs font-semibold text-zinc-200 font-mono mt-0.5">
                          {selectedUserForFicha.lastLocation || 'Não capturada'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin-only Password Management */}
                {isAdmin && (
                  <div className="card p-5 border-[var(--line)] bg-[var(--card)] space-y-4">
                    <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--lime)] tracking-widest border-b border-[var(--line)] pb-2">
                      Gestão de Segurança e Senha
                    </h4>

                    <button
                      type="button"
                      onClick={() => handleResetTempPassword(selectedUserForFicha)}
                      className="w-full py-3 px-3 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)] text-xs font-bold font-mono flex items-center justify-center gap-2 hover:bg-[var(--lime)]/20 transition-all cursor-pointer shadow-lg"
                    >
                      <Key size={14} />
                      <span>Redefinir Senha Temporária</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer Actions (Admin only or Gestor for non-admin users) */}
              {(isAdmin || (isGestor && selectedUserForFicha.role !== 'admin')) && (
                <div className="p-5 border-t border-[var(--line)] bg-[var(--black)] flex justify-between gap-3">
                  <button 
                    onClick={() => handleDelete(selectedUserForFicha.id)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/8 text-[var(--red)] text-xs font-bold hover:bg-[var(--red)]/15 transition-all cursor-pointer"
                  >
                    <Trash2 size={13} /> Excluir Usuário
                  </button>
                  
                  <button 
                    onClick={() => handleOpenEdit(selectedUserForFicha)}
                    className="btn btn-primary flex items-center gap-2 text-xs py-2.5 px-6 rounded-xl cursor-pointer text-black font-bold"
                  >
                    <Edit2 size={13} /> Editar Dados
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

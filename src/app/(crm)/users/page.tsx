'use client'

import { dbService } from '@/services/supabase-client'
import { useState, useEffect } from 'react'
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
  Key
} from 'lucide-react'

interface TeamUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'gestor' | 'representante' | 'vendedor' | 'financeiro'
  status: 'ativo' | 'inativo'
  phone: string
  createdAt: string
  username?: string
  tempPassword?: string
  password?: string
  isFirstAccess?: boolean
  isEmailConfirmed?: boolean
}

// No hardcoded users — source of truth is Supabase profiles table

function formatPhoneBr(v: string) {
  const clean = v.replace(/\D/g, '')
  if (clean.length === 0) return ''
  if (clean.length <= 2) return `(${clean}`
  if (clean.length <= 6) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`
  if (clean.length <= 10) return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`
}

export default function UsersPage() {
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

  // Load users — always from Supabase via /api/users, never from localStorage
  useEffect(() => {
    async function syncUsers() {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' })
        const json = await res.json()
        if (json.success && Array.isArray(json.users)) {
          setUsers(json.users)
        }
      } catch (e) {
        console.error('[UsersPage] Failed to load users from API', e)
      }
    }
    syncUsers()
  }, [])

  // Update local state and local storage — synced with Supabase
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

  // Toggle user status quickly
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
    } catch (e) {
      console.error('Failed to update user status on API', e)
    }
  }

  // Resets temporary password and forces first-access password update
  const handleResetTempPassword = async (user: TeamUser) => {
    const newTempPassword = 'CP@' + Math.floor(100000 + Math.random() * 900000)
    const updatedUser: TeamUser = {
      ...user,
      tempPassword: newTempPassword,
      isFirstAccess: true
    }

    const updatedList = users.map(u => u.id === user.id ? updatedUser : u)
    saveUsers(updatedList)

    if (selectedUserForFicha?.id === user.id) {
      setSelectedUserForFicha(updatedUser)
    }

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedUser,
          resetFirstAccess: true
        })
      })
    } catch (e) {
      console.error('Failed to sync temp password to API', e)
    }

    const isCarton = !!user.email && user.email.includes('@')
    setCreatedUserCredentials({
      name: user.name,
      usernameOrEmail: user.role === 'representante' ? (user.username || user.name) : user.email,
      tempPassword: newTempPassword,
      type: isCarton ? 'cartonpack' : 'externo'
    })
    setShowCopyModal(true)
    setToastMessage(`Nova senha temporária gerada para ${user.name}!`)
  }

  const capitalizeName = (n: string) => {
    return n
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

  // Submit modal form
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    // Only 'representante' has no real email. All other roles (vendedor, admin, financeiro) use the real email.
    const isRep = role === 'representante'
    if (!name.trim() || (!isRep && !email.trim())) return

    // Corporate users MUST use @cartonpack.com.br domain
    if (!isRep) {
      const cleanEmail = email.toLowerCase().trim()
      if (!cleanEmail.endsWith('@cartonpack.com.br') && !cleanEmail.endsWith('@cartonpack.com')) {
        setToastMessage('Atenção: E-mail corporativo inválido. É obrigatório utilizar o domínio @cartonpack.com.br')
        setTimeout(() => setToastMessage(''), 4000)
        return
      }
    }

    const formattedName = capitalizeName(name)
    const derivedUser = username || deriveUsername(formattedName)
    const isCarton = !isRep && email.includes('@')
    const finalUsername = derivedUser
    // Representatives don't have real email — API generates internal email on the Supabase side
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
      // Create mode — call API to create user in Supabase Auth + profiles
      const finalTempPassword = tempPassword || generateTempPassword()

      const newUserPayload = {
        id: `u-${Date.now()}`, // temporary, API will replace with real UUID
        name: formattedName,
        email: finalEmail,
        role,
        status,
        phone: formatPhoneBr(phone),
        tempPassword: finalTempPassword,
        username: finalUsername
      }

      // Optimistic local update
      const optimisticUser: TeamUser = {
        ...newUserPayload,
        createdAt: new Date().toLocaleDateString('pt-BR'),
        isFirstAccess: true,
        isEmailConfirmed: isCarton ? false : true
      }
      setUsers(prev => [optimisticUser, ...prev])

      // Persist to Supabase
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserPayload)
      })
        .then(r => r.json())
        .then(json => {
          if (json.success && json.user?.id) {
            // Replace optimistic entry with real Supabase ID
            setUsers(prev => prev.map(u =>
              u.id === optimisticUser.id ? { ...u, id: json.user.id } : u
            ))
          }
          // Reload from API to reflect server state
          return fetch('/api/users', { cache: 'no-store' })
        })
        .then(r => r?.json())
        .then(json => {
          if (json?.success && Array.isArray(json.users)) {
            setUsers(json.users)
          }
        })
        .catch(e => console.error('[UsersPage] Failed to save user', e))

      // Save credentials for the Copy Screen
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

  // Delete user
  const handleDelete = (id: string) => {
    setUserToDelete(id)
  }

  // Filter users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm)
      
    const matchesRole = selectedRole === 'all' || u.role === selectedRole
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus

    return matchesSearch && matchesRole && matchesStatus
  })

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
    if (roleLower.includes('finan')) {
      return { label: 'Financeiro', bg: 'rgba(6,182,212,0.12)', color: '#22d3ee', border: 'rgba(6,182,212,0.25)' }
    }
    return { label: r || 'Membro', bg: 'rgba(180,217,50,0.12)', color: 'var(--lime)', border: 'rgba(180,217,50,0.25)' }
  }

  // Initial Avatar generator helper
  const getInitials = (n: string) => {
    return n.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  }

  return (
    <div className="page-content animate-fade-in w-full h-full flex flex-col gap-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl md:text-2xl text-[var(--white)] font-bold tracking-tight">
            Gestão de Equipe e Usuários
          </h1>
        </div>

        <button onClick={handleOpenCreate} className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0 self-start md:self-auto">
          <Plus size={14} />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-[var(--gray2)] pointer-events-none" />
          <input
            type="text"
            className="input w-full !pl-9"
            placeholder="Buscar por nome, email ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Role Select Filter */}
        <div>
          <select 
            className="input w-full"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">Todas as Funções</option>
            <option value="gestor">Gestor Comercial</option>
            <option value="vendedor">Vendedor</option>
            <option value="representante">Representante</option>
            <option value="admin">Administrador</option>
            <option value="financeiro">Financeiro</option>
          </select>
        </div>

        {/* Status Select Filter */}
        <div>
          <select 
            className="input w-full"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Todos os Status</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[var(--charcoal)] font-mono text-[10px] text-[var(--gray)] uppercase tracking-wider">
                <th className="p-4 pl-6">Membro / Contato</th>
                <th className="p-4">Função</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4">Telefone</th>
                <th className="p-4">Cadastrado em</th>
                <th className="p-4 pr-6 text-right">Ações</th>
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
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--white)] font-bold text-xs"
                          style={{
                            background: user.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'var(--line)',
                            border: `1px solid ${user.role === 'admin' ? 'rgba(168,85,247,0.3)' : 'transparent'}`
                          }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-[var(--white)]">{user.name}</div>
                          <div className="text-xs text-[var(--gray)] font-mono mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role Tag */}
                    <td className="p-4">
                      <span
                        className="font-mono text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider"
                        style={{
                          background: roleInfo.bg,
                          color: roleInfo.color,
                          border: `1px solid ${roleInfo.border}`
                        }}
                      >
                        {roleInfo.label}
                      </span>
                    </td>

                    {/* Status Toggle Dot */}
                    <td className="p-4 text-center">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleStatus(user)
                        }}
                        title={`Clique para deixar o usuário ${user.status === 'ativo' ? 'inativo' : 'ativo'}`}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border transition-all ${
                          user.status === 'ativo'
                            ? 'bg-[rgba(34,197,94,0.15)] text-[var(--green)] border-[rgba(34,197,94,0.25)] hover:bg-[rgba(34,197,94,0.25)]'
                            : 'bg-[rgba(239,68,68,0.15)] text-[var(--red)] border-[rgba(239,68,68,0.25)] hover:bg-[rgba(239,68,68,0.25)]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ativo' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}></span>
                        <span>{user.status === 'ativo' ? 'ATIVO' : 'INATIVO'}</span>
                      </button>
                    </td>

                    {/* Telefone */}
                    <td className="p-4 font-mono text-xs text-[var(--white)]">
                      {user.phone || '-'}
                    </td>

                    {/* Created At */}
                    <td className="p-4 text-xs text-[var(--gray)] font-mono">
                      {user.createdAt}
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResetTempPassword(user)
                          }}
                          title="Reenviar Nova Senha Temporária (Primeiro Acesso)"
                          className="px-2.5 py-1 rounded-lg bg-[rgba(217,249,157,0.1)] text-[var(--lime)] hover:bg-[rgba(217,249,157,0.2)] border border-[rgba(217,249,157,0.3)] text-[10px] font-mono font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          <Key size={12} />
                          <span>Nova Senha</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleStatus(user)
                            if (selectedUserForFicha?.id === user.id) {
                              setSelectedUserForFicha(prev => prev ? { ...prev, status: prev.status === 'ativo' ? 'inativo' : 'ativo' } : null)
                            }
                          }}
                          title={user.status === 'ativo' ? 'Suspender Acesso' : 'Reativar Acesso'}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none self-center mx-1.5 ${
                            user.status === 'ativo' ? 'bg-[var(--lime)]' : 'bg-zinc-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              user.status === 'ativo' ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </td>

                  </tr>
                )
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-sm text-[var(--gray2)] font-mono">
                    Nenhum usuário cadastrado ou encontrado com estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register/Edit User Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-lg shadow-2xl flex flex-col gap-4 animate-fade-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-display text-base text-[var(--white)] font-bold">
                  {editingUser ? 'Editar Usuário da Equipe' : 'Cadastrar Novo Usuário'}
                </h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">
                  Defina os dados e permissões do membro de forma instantânea.
                </p>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-[var(--white)] p-1 rounded-md hover:bg-[var(--line)] transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-4">
              
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Nome Completo *</label>
                <div className="relative flex items-center">
                  <User size={13} className="absolute left-3 text-[var(--gray2)] pointer-events-none" />
                  <input
                    type="text"
                    required
                    className="input w-full !pl-9"
                    placeholder="Ex: Roberto Carlos"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (!editingUser) {
                        setUsername(deriveUsername(e.target.value))
                      }
                    }}
                  />
                </div>
              </div>

              {/* Role (User Function) - Moved to top as requested */}
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
                  <option value="admin">Administrador</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>

              {/* Email (Hidden if Representative) */}
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

              {/* Conditional Username & Password Fields */}
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
                    <span className="text-[8px] text-[var(--gray2)] font-normal font-sans lowercase">(editável)</span>
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

              {/* Phone */}
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

              {/* Status (Only when editing) */}
              {editingUser && (
                <div className="flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[9px] font-bold text-[var(--gray2)] uppercase font-mono tracking-wider">Status Cadastral</label>
                  <div className="flex items-center justify-between p-3.5 border border-[var(--line)] rounded-xl bg-[var(--card)]">
                    <span className="text-xs text-[var(--white)] font-medium flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${status === 'ativo' ? 'bg-[var(--green)]' : 'bg-[var(--red)]'}`}></span>
                      {status === 'ativo' ? 'Acesso Ativo (Autorizado)' : 'Acesso Inativo (Suspenso)'}
                    </span>
                    
                    <button
                      type="button"
                      onClick={() => setStatus(status === 'ativo' ? 'inativo' : 'ativo')}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        status === 'ativo' ? 'bg-[var(--lime)]' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          status === 'ativo' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 border-t border-[var(--line)] pt-3 mt-2">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-primary py-2 px-4 text-xs font-bold uppercase tracking-wider text-[#060606]"
              >
                Confirmar e Salvar
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Copy Credentials Success Modal */}
      {showCopyModal && createdUserCredentials && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[var(--charcoal)] border border-[var(--lime)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-fade-up">
            <div className="flex justify-between items-start border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="font-display text-base text-[var(--lime)] font-bold">Usuário Cadastrado!</h3>
                <p className="text-xs text-[var(--gray)] mt-0.5 font-mono">Copie a mensagem para compartilhar com o membro da equipe.</p>
              </div>
              <button type="button" onClick={() => setShowCopyModal(false)} className="text-gray-400 hover:text-[var(--white)] p-1">
                <X size={18} />
              </button>
            </div>
            
            <div className="bg-black/40 border border-[var(--line)] rounded-xl p-4 font-mono text-[11px] text-[var(--white)] whitespace-pre-wrap leading-relaxed select-all">
{`Olá, ${createdUserCredentials.name}! Seu acesso ao CRM Carton Pack está liberado.

Link de Acesso: https://crmcartonpack.vercel.app
${createdUserCredentials.type === 'cartonpack' ? `Login (E-mail Corporativo): ${createdUserCredentials.usernameOrEmail}` : `Login (Nome de Usuário): ${createdUserCredentials.usernameOrEmail}`}
Senha Temporária: ${createdUserCredentials.tempPassword}

${createdUserCredentials.type === 'cartonpack' 
  ? 'Obs: No primeiro acesso você deverá alterar a senha temporária e validar seu e-mail corporativo.' 
  : 'Obs: No primeiro acesso utilize seu Nome de Usuário e altere a senha temporária para ativar sua conta.'}`}
            </div>

            <button
              type="button"
              onClick={() => {
                const text = `Olá, ${createdUserCredentials.name}! Seu acesso ao CRM Carton Pack está liberado.\n\nLink de Acesso: https://crmcartonpack.vercel.app\n${createdUserCredentials.type === 'cartonpack' ? `Login (E-mail): ${createdUserCredentials.usernameOrEmail}` : `Usuário: ${createdUserCredentials.usernameOrEmail}`}\nSenha Temporária: ${createdUserCredentials.tempPassword}\n\n${createdUserCredentials.type === 'cartonpack' ? 'Obs: No primeiro acesso você deverá alterar a senha temporária e confirmar o link de ativação enviado para o seu e-mail.' : 'Obs: No primeiro acesso você deverá alterar a senha temporária para ativar sua conta.'}`
                navigator.clipboard.writeText(text)
                setToastMessage('Mensagem de acesso copiada com sucesso!')
                setTimeout(() => setToastMessage(''), 3000)
              }}
              className="btn btn-primary py-2.5 text-xs font-bold uppercase tracking-wider text-black w-full"
            >
              Copiar Mensagem de Acesso
            </button>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Dialog */}
      {userToDelete && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 text-left">
          <div className="bg-[var(--charcoal)] border border-[var(--line)] rounded-2xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-4 animate-fade-up">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle size={18} />
              <h3 className="font-display text-base font-bold">Excluir Usuário</h3>
            </div>
            
            <p className="text-xs text-[var(--gray)] font-mono leading-relaxed">
              Tem certeza que deseja excluir o usuário <strong className="text-[var(--white)]">{users.find(u => u.id === userToDelete)?.name}</strong>? Esta ação removerá permanentemente o acesso dele ao sistema Carton Pack.
            </p>

            <div className="flex justify-end gap-3 mt-2 border-t border-[var(--line)] pt-3">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="btn btn-secondary py-2 px-4 text-xs font-bold uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (userToDelete) {
                    const updated = users.filter(u => u.id !== userToDelete)
                    saveUsers(updated)
                    setUserToDelete(null)
                    setSelectedUserForFicha(null)
                    setToastMessage('Usuário excluído com sucesso!')
                    setTimeout(() => setToastMessage(''), 3000)
                  }
                }}
                className="btn bg-[var(--red)] text-white hover:bg-[#ef4444] border-none py-2 px-4 text-xs font-bold uppercase tracking-wider"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Drawer (Ficha do Usuário) */}
      {selectedUserForFicha && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" onClick={() => setSelectedUserForFicha(null)} />
          
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md border-l border-[var(--line)] flex flex-col h-full bg-[var(--charcoal)] text-white shadow-2xl animate-slide-in-right">
              
              {/* Drawer Header */}
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
                  className="p-1.5 rounded-full bg-[var(--black)] border border-[var(--line)] hover:border-[var(--lime)] text-[var(--gray)] hover:text-white cursor-pointer transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">


                {/* Contact and Status Info */}
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
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">E-mail Comercial</div>
                      <div className="text-sm font-semibold text-[var(--white)]">{selectedUserForFicha.email}</div>
                    </div>
                  </div>

                  {selectedUserForFicha.username && (
                    <div className="flex items-center gap-3">
                      <User size={14} className="text-[var(--lime)]" />
                      <div>
                        <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Nome de Usuário</div>
                        <div className="text-sm font-semibold text-[var(--white)] font-mono">{selectedUserForFicha.username}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Clock size={14} className="text-[var(--lime)]" />
                    <div>
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Cadastrado em</div>
                      <div className="text-sm font-semibold text-[var(--white)] font-mono">{selectedUserForFicha.createdAt}</div>
                    </div>
                  </div>
                </div>

                {/* Account Status Card */}
                <div className="card p-5 border-[var(--line)] bg-[var(--card)] space-y-4">
                  <h4 className="text-[10px] font-mono uppercase font-bold text-[var(--gray)] tracking-widest border-b border-[var(--line)] pb-2">
                    Status da Conta
                  </h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Acesso ao Sistema</div>
                      <div className="text-xs text-[var(--white)] font-semibold mt-0.5">
                        {selectedUserForFicha.status === 'ativo' ? 'Autorizado' : 'Suspenso'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleStatus(selectedUserForFicha)
                        setSelectedUserForFicha(prev => prev ? { ...prev, status: prev.status === 'ativo' ? 'inativo' : 'ativo' } : null)
                      }}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        selectedUserForFicha.status === 'ativo' ? 'bg-[var(--lime)]' : 'bg-zinc-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          selectedUserForFicha.status === 'ativo' ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {selectedUserForFicha.tempPassword && (
                    <div className="p-3 bg-[var(--black)] border border-[var(--line)] rounded-xl space-y-1">
                      <div className="text-[9px] text-[var(--gray2)] uppercase font-mono">Senha Temporária Ativa</div>
                      <div className="text-xs font-mono font-bold text-[var(--lime)]">{selectedUserForFicha.tempPassword}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleResetTempPassword(selectedUserForFicha)}
                    className="w-full py-2.5 px-3 rounded-xl border border-[var(--lime)]/40 bg-[var(--lime)]/10 text-[var(--lime)] text-xs font-bold font-mono flex items-center justify-center gap-2 hover:bg-[var(--lime)]/20 transition-all cursor-pointer shadow-lg"
                  >
                    <Key size={14} />
                    <span>Reenviar Nova Senha Temporária</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer Actions (EDIT and DELETE only here as requested!) */}
              <div className="p-5 border-t border-[var(--line)] bg-[var(--black)] flex justify-between gap-3">
                <button 
                  onClick={() => {
                    handleDelete(selectedUserForFicha.id)
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--red)]/25 bg-[var(--red)]/8 text-[var(--red)] text-xs font-bold hover:bg-[var(--red)]/15 transition-all cursor-pointer"
                >
                  <Trash2 size={13} /> Excluir Usuário
                </button>
                
                <button 
                  onClick={() => handleOpenEdit(selectedUserForFicha)}
                  className="btn btn-primary flex items-center gap-2 text-xs py-2.5 px-6 rounded-xl cursor-pointer text-black"
                >
                  <Edit2 size={13} /> Editar Dados
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#1a1c1e] border border-[var(--lime)] rounded-xl p-4 text-xs font-bold text-[var(--lime)] shadow-2xl flex items-center gap-2 animate-fade-in z-[999999]">
          <CheckCircle size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  )
}

'use client'

import { dbService } from '@/services/supabase-client'
import { useState, useEffect } from 'react'
import { CartonPackLogo } from '@/components/CartonPackLogo'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Key, ShieldAlert, Mail, Lock, ArrowRight, UserCheck, Shield, Eye, EyeOff, User } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loginType, setLoginType] = useState<'representante' | 'corporativo'>('representante')
  const [identifier, setIdentifier] = useState('') // username or email
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Simulated Login Flow Steps
  const [activeStep, setActiveStep] = useState<'login' | 'first-access' | 'confirm-email'>('login')
  const [targetUser, setTargetUser] = useState<any | null>(null)
  
  // Password Change Fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Check for inactive error from URL on initial load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('error') === 'inactive') {
        setError('Seu usuário está inativo. O acesso ao sistema foi suspenso pelo administrador.')
      }
    }
  }, [])

  // Clean old mock users on initial load if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cp_crm_v7_official_users')
      if (!saved) {
        // Default clean state
      }
    }
  }, [])

  // Standard or Mock auth handler
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanInput = identifier.trim()
    const inputLower = cleanInput.toLowerCase()

    // Check if user is marked as inativo before any authentication step
    const isMasterUser = inputLower === 'mauricio@mtabi.com.br' || inputLower === 'mauricio'
    if (typeof window !== 'undefined') {
      const keysToSearch = ['crm_users', 'cp_crm_v7_official_users']
      for (const key of keysToSearch) {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            const list = JSON.parse(raw)
            const matched = list.find((u: any) => 
              (u.email && u.email.toLowerCase() === inputLower) ||
              (u.username && u.username.toLowerCase() === inputLower) ||
              (isMasterUser && (u.email?.toLowerCase() === 'mauricio@mtabi.com.br' || u.username === 'mauricio'))
            )
            if (matched && matched.status === 'inativo') {
              setError('Seu usuário está inativo. Entre em contato com a administração para liberar o acesso.')
              setLoading(false)
              return
            }
          } catch (e) {}
        }
      }
    }

    // 0. AUTENTICAÇÃO EXCLUSIVA MASTER ADMIN (Maurício Maciel)
    if (isMasterUser) {
      if (password === '@Speni190868') {
        const masterSession = {
          id: 'u-master-mauricio',
          name: 'Maurício Maciel',
          email: 'mauricio@mtabi.com.br',
          username: 'mauricio',
          role: 'administrador',
          phone: '51997587025',
          status: 'ativo'
        }
        localStorage.setItem('crm_current_user', JSON.stringify(masterSession))
        document.cookie = `cp_crm_session=${masterSession.id}; path=/; max-age=86400`
        try { dbService.usuarios.save(masterSession) } catch (e) {}
        
        router.push('/dashboard')
        router.refresh()
        return
      } else {
        setError('Senha de Administrador Master incorreta.')
        setLoading(false)
        return
      }
    }

    // 1. VALIDAÇÃO DE ACESSO CORPORATIVO E E-MAILS DE TESTE
    // Domain validation for corporate logins
    if (loginType === 'corporativo') {
      if (!cleanInput.includes('@') || (!cleanInput.endsWith('@cartonpack.com.br') && !cleanInput.endsWith('@cartonpack.com'))) {
        setError('Apenas e-mails corporativos @cartonpack.com.br são permitidos no login corporativo.')
        setLoading(false)
        return
      }
    }

    try {
      const supabase = createClient()

      // Representatives log in with username mapped to internal domain @crm.cartonpack.com.br
      const authEmail = cleanInput.includes('@')
        ? cleanInput
        : `${cleanInput}@crm.cartonpack.com.br`

      // 1. STRICT SUPABASE AUTHENTICATION
      const { error: sbError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: password
      })

      if (sbError) {
        setError(loginType === 'representante' ? 'Nome de usuário ou senha incorretos.' : 'E-mail corporativo ou senha incorretos.')
        setLoading(false)
        return
      }

      // 2. Fetch authenticated Supabase user profile & metadata
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Sessão inválida. Tente novamente.')
        setLoading(false)
        return
      }

      const userRole = user.user_metadata?.role || 'representante'
      const isFirstAccess = user.user_metadata?.isFirstAccess === true

      // Enforce role separation between Corporate and Representative login tabs
      if (loginType === 'corporativo' && authEmail.endsWith('@crm.cartonpack.com.br')) {
        setError('Representantes comerciais devem utilizar a aba "Representante".')
        setLoading(false)
        return
      }
      if (loginType === 'representante' && !authEmail.endsWith('@crm.cartonpack.com.br') && userRole !== 'representante') {
        setError('Usuários corporativos devem utilizar a aba "Corporativo".')
        setLoading(false)
        return
      }

      const sessionData = {
        id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        email: user.email?.endsWith('@crm.cartonpack.com.br') ? '' : user.email,
        username: user.email?.split('@')[0],
        role: userRole,
        status: 'ativo'
      }

      // 3. Handle First Access Password Reset
      if (isFirstAccess) {
        setTargetUser({ ...sessionData, supabaseUser: user })
        setActiveStep('first-access')
        setLoading(false)
        return
      }

      // 4. Direct access granted! Save active session
      localStorage.setItem('crm_current_user', JSON.stringify(sessionData))
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(loginType === 'representante' ? 'Nome de usuário ou senha incorretos.' : 'E-mail corporativo ou senha incorretos.')
      setLoading(false)
    }
  }

function translateAuthError(msg: string): string {
  if (!msg) return 'Erro ao atualizar senha. Tente novamente.'
  const lower = msg.toLowerCase()

  if (lower.includes('new password should be different from the old password') || lower.includes('same as old password')) {
    return 'A nova senha deve ser diferente da senha temporária/anterior.'
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'A nova senha deve ter pelo menos 6 caracteres.'
  }
  if (lower.includes('invalid credentials') || lower.includes('invalid login credentials')) {
    return 'Credenciais de acesso incorretas.'
  }
  if (lower.includes('user not found')) {
    return 'Usuário não encontrado.'
  }
  if (lower.includes('email not confirmed')) {
    return 'E-mail ainda não confirmado.'
  }
  if (lower.includes('session missing') || lower.includes('auth session missing')) {
    return 'Sessão de autorização não encontrada. Redirecionando...'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes.'
  }

  return msg
}

  // Handle first time password change
  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')

    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas digitadas não coincidem.')
      return
    }

    try {
      const supabase = createClient()

      // 1. Update password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        data: { isFirstAccess: false }
      })

      if (updateError) {
        const ptMessage = translateAuthError(updateError.message)
        setPasswordError('Erro ao atualizar senha: ' + ptMessage)
        return
      }

      // 2. Update local state and save session
      if (targetUser) {
        if (typeof window !== 'undefined') {
          const keysToUpdate = ['cp_crm_v7_official_users', 'crm_users']
          keysToUpdate.forEach(k => {
            const raw = localStorage.getItem(k)
            if (raw) {
              try {
                const parsed = JSON.parse(raw)
                const updated = parsed.map((u: any) =>
                  (u.id === targetUser.id || (u.email && targetUser.email && u.email.toLowerCase() === targetUser.email.toLowerCase()) || (u.username && targetUser.username && u.username.toLowerCase() === targetUser.username.toLowerCase()))
                    ? { ...u, password: newPassword, tempPassword: '', isFirstAccess: false }
                    : u
                )
                localStorage.setItem(k, JSON.stringify(updated))
              } catch {}
            }
          })
        }

        try {
          fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...targetUser,
              password: newPassword,
              isFirstAccess: false
            })
          }).catch(() => {})
        } catch (e) {}

        const sessionData = {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          username: targetUser.username,
          role: targetUser.role,
          status: targetUser.status
        }

        localStorage.setItem('crm_current_user', JSON.stringify(sessionData))
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setPasswordError('Erro inesperado. Tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Dynamic Background Glow */}
      <div className="absolute w-[650px] h-[650px] rounded-full bg-[radial-gradient(circle,rgba(180,217,50,0.07)_0%,transparent_70%)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10 space-y-6 animate-fade-up">

        {/* LOGO OFICIAL CARTON PACK® */}
        <div className="text-center flex flex-col items-center gap-3 mb-2">
          <div className="p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-2xl backdrop-blur-md">
            <CartonPackLogo height={40} />
          </div>
          <div>
            <h1 className="text-sm font-bold font-display text-[var(--white)] tracking-wide uppercase mt-1">
              Plataforma CRM Comercial & Operacional
            </h1>
          </div>
        </div>

        {/* STEP 1: LOGIN FORM */}
        {activeStep === 'login' && (
          <div className="rounded-3xl border border-[var(--line)] bg-[var(--card)]/90 backdrop-blur-xl p-7 shadow-2xl space-y-6">

            {/* SELETOR DE MODO DE ACESSO */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[var(--black)] border border-[var(--line)]">
              <button
                type="button"
                onClick={() => {
                  setLoginType('representante')
                  setError('')
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginType === 'representante'
                    ? 'bg-[var(--lime)] text-black shadow-lg font-mono'
                    : 'text-[var(--gray)] hover:text-[var(--white)]'
                }`}
              >
                <User size={14} />
                <span>Representante</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginType('corporativo')
                  setError('')
                }}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  loginType === 'corporativo'
                    ? 'bg-[var(--lime)] text-black shadow-lg font-mono'
                    : 'text-[var(--gray)] hover:text-[var(--white)]'
                }`}
              >
                <Mail size={14} />
                <span>Corporativo</span>
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* CAMPO DE USUÁRIO OU E-MAIL */}
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray)] mb-1.5 block">
                  {loginType === 'representante' ? 'Nome de Usuário *' : 'E-mail Corporativo *'}
                </label>
                <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/60 focus-within:shadow-[0_0_15px_rgba(180,217,50,0.15)] transition-all px-3.5 py-3 gap-2.5">
                  {loginType === 'representante' ? (
                    <User size={16} className="text-[var(--lime)] shrink-0" />
                  ) : (
                    <Mail size={16} className="text-[var(--lime)] shrink-0" />
                  )}
                  <input
                    type={loginType === 'representante' ? 'text' : 'email'}
                    placeholder={loginType === 'representante' ? 'ex: fausto.fleck' : 'ex: seuemail@cartonpack.com.br'}
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-[var(--white)] w-full placeholder:text-[var(--gray2)] font-mono shadow-none"
                    style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  />
                </div>
              </div>

              {/* CAMPO DE SENHA */}
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray)] mb-1.5 block">
                  Senha de Acesso *
                </label>
                <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/60 focus-within:shadow-[0_0_15px_rgba(180,217,50,0.15)] transition-all px-3.5 py-3 gap-2.5">
                  <Lock size={16} className="text-[var(--gray2)] shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-[var(--white)] w-full placeholder:text-[var(--gray2)] font-mono shadow-none"
                    style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[var(--gray)] hover:text-[var(--white)] transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* MENSAGEM DE ERRO */}
              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-start gap-2.5 animate-shake">
                  <ShieldAlert size={16} className="shrink-0 text-red-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* BOTÃO DE SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--lime)] text-black font-display font-black text-sm uppercase tracking-wider hover:bg-[#c7eb46] hover:brightness-110 hover:shadow-[0_0_25px_rgba(180,217,50,0.45)] transition-all transform active:scale-[0.99] shadow-lg shadow-[rgba(180,217,50,0.2)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Validando Acesso...' : 'ENTRAR NO SISTEMA'}</span>
                {!loading && <ArrowRight size={16} />}
              </button>
            </form>

            <div className="pt-2 border-t border-[var(--line)]/50 text-center">
              <p className="text-[11px] text-[var(--gray)] font-mono font-medium">
                Acesso restrito à equipe autorizada Carton Pack.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: PRIMEIRO ACESSO - ALTERAÇÃO DE SENHA */}
        {activeStep === 'first-access' && targetUser && (
          <div className="rounded-3xl border border-[var(--lime)]/40 bg-[var(--card)]/90 backdrop-blur-xl p-7 shadow-2xl space-y-5 animate-fade-up">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-[var(--lime)]/10 border border-[var(--lime)]/30 text-[var(--lime)] flex items-center justify-center mx-auto shadow-inner">
                <Key size={22} />
              </div>
              <h3 className="text-base font-bold font-display text-white">Primeiro Acesso Detectado</h3>
              <p className="text-xs text-[var(--gray2)]">
                Por motivos de segurança, defina uma nova senha para o usuário <strong className="text-white font-mono">{targetUser.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray)] mb-1.5 block">
                  Nova Senha (mínimo 6 caracteres) *
                </label>
                <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/60 focus-within:shadow-[0_0_15px_rgba(180,217,50,0.15)] transition-all px-3.5 py-3 gap-2.5">
                  <Lock size={16} className="text-[var(--gray2)] shrink-0" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-[var(--white)] w-full placeholder:text-[var(--gray2)] font-mono shadow-none"
                    style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-[var(--gray2)] hover:text-[var(--lime)] transition-colors p-1 cursor-pointer"
                    title={showNewPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--gray)] mb-1.5 block">
                  Confirmar Nova Senha *
                </label>
                <div className="flex items-center bg-[var(--black)] border border-[var(--line)] rounded-xl focus-within:border-[var(--lime)]/60 focus-within:shadow-[0_0_15px_rgba(180,217,50,0.15)] transition-all px-3.5 py-3 gap-2.5">
                  <Lock size={16} className="text-[var(--gray2)] shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 text-sm text-[var(--white)] w-full placeholder:text-[var(--gray2)] font-mono shadow-none"
                    style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-[var(--gray2)] hover:text-[var(--lime)] transition-colors p-1 cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar Senha' : 'Exibir Senha'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono">
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl bg-[var(--lime)] text-black font-display font-black text-sm uppercase tracking-wider hover:bg-[var(--lime-hover)] transition-all cursor-pointer shadow-lg"
              >
                SALVAR SENHA E CONTINUAR
              </button>
            </form>
          </div>
        )}

        {/* FOOTER */}
        <p className="text-center text-[11px] font-mono text-[var(--gray)] font-medium">
          Carton Pack © {new Date().getFullYear()} — Sistema Interno Homologado
        </p>

      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Key, ShieldAlert, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Simulated Login Flow Steps
  const [activeStep, setActiveStep] = useState<'login' | 'first-access' | 'confirm-email'>('login')
  const [targetUser, setTargetUser] = useState<any | null>(null)
  
  // Password Change Fields
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Initialize mocks in localStorage on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crm_users')
      if (!saved) {
        localStorage.setItem('crm_users', JSON.stringify([
          { id: '1', name: 'Diéssica Hartmann', email: 'ana.lima@cartonpack.com', role: 'representante', status: 'ativo', phone: '(11) 98888-8888', createdAt: '10/05/2026', isFirstAccess: false, isEmailConfirmed: true, password: '123' },
          { id: '2', name: 'Josimar Soares', email: 'erminio@cartonpack.com', role: 'representante', status: 'ativo', phone: '(51) 99999-9999', createdAt: '12/05/2026', isFirstAccess: false, isEmailConfirmed: true, password: '123' },
          { id: '3', name: 'Versapack Centro de Negocios Ltda', email: 'carlos.mendes@cartonpack.com', role: 'representante', status: 'ativo', phone: '(21) 97777-7777', createdAt: '15/05/2026', isFirstAccess: false, isEmailConfirmed: true, password: '123' },
          { id: '4', name: 'Inácio Siqueira', email: 'julio.admin@cartonpack.com', role: 'admin', status: 'ativo', phone: '(51) 98888-7777', createdAt: '01/05/2026', isFirstAccess: false, isEmailConfirmed: true, password: '123' },
          { id: '5', name: 'Thaiane Antunes', email: 'mariana.fin@cartonpack.com', role: 'financeiro', status: 'ativo', phone: '(51) 96666-5555', createdAt: '20/05/2026', isFirstAccess: false, isEmailConfirmed: true, password: '123' },
        ]))
      }
    }
  }, [])

  // Standard or Mock auth handle
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 1. Try local storage mockup login intercept
    if (typeof window !== 'undefined') {
      const savedUsers = localStorage.getItem('crm_users')
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers)
          const matchedUser = parsed.find((u: any) => 
            u.email?.toLowerCase() === email.toLowerCase() || 
            (u.username && u.username.toLowerCase() === email.toLowerCase())
          )

          if (matchedUser) {
            const currentPassword = matchedUser.password || matchedUser.tempPassword
            if (password === currentPassword) {
              if (matchedUser.status === 'inativo') {
                setError('Este usuário está inativo. Acesso bloqueado.')
                setLoading(false)
                return
              }

              setTargetUser(matchedUser)

              // Check if first access (needs password change)
              if (matchedUser.isFirstAccess !== false) {
                setActiveStep('first-access')
                setLoading(false)
                return
              }

              // Check if email confirmation is required (only for cartonpack.com emails)
              const isCarton = matchedUser.email?.toLowerCase().endsWith('@cartonpack.com')
              if (isCarton && matchedUser.isEmailConfirmed !== true) {
                setActiveStep('confirm-email')
                setLoading(false)
                return
              }

              // Direct access! Save active session
              localStorage.setItem('crm_current_user', JSON.stringify({
                id: matchedUser.id,
                name: matchedUser.name,
                email: matchedUser.email,
                role: matchedUser.role,
                status: matchedUser.status
              }))
              
              router.push('/dashboard')
              router.refresh()
              return
            }
          }
        } catch (err) {
          console.error(err)
        }
      }
    }

    // 2. Production fallback with Supabase
    const supabase = createClient()
    const { error: sbError } = await supabase.auth.signInWithPassword({ email, password })

    if (sbError) {
      setError('E-mail, usuário ou senha incorretos.')
      setLoading(false)
      return
    }

    // Load active session user if Supabase login succeeded
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      localStorage.setItem('crm_current_user', JSON.stringify({
        id: user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0],
        email: user.email,
        role: user.user_metadata?.role || 'admin',
        status: 'ativo'
      }))
    }

    router.push('/dashboard')
    router.refresh()
  }

  // Handle first time password change
  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    
    if (newPassword.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('As senhas não coincidem.')
      return
    }

    if (typeof window !== 'undefined' && targetUser) {
      const savedUsers = localStorage.getItem('crm_users')
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers)
          const isCarton = targetUser.email?.toLowerCase().endsWith('@cartonpack.com')
          
          const updated = parsed.map((u: any) => {
            if (u.id === targetUser.id) {
              return {
                ...u,
                password: newPassword,
                isFirstAccess: false,
                // Externals bypass email confirmation directly
                isEmailConfirmed: isCarton ? false : true
              }
            }
            return u
          })
          
          localStorage.setItem('crm_users', JSON.stringify(updated))
          
          // Log user record state update locally
          const updatedTargetUser = {
            ...targetUser,
            password: newPassword,
            isFirstAccess: false,
            isEmailConfirmed: isCarton ? false : true
          }
          setTargetUser(updatedTargetUser)

          // Route based on email domain
          if (isCarton) {
            setActiveStep('confirm-email')
          } else {
            // Direct access
            localStorage.setItem('crm_current_user', JSON.stringify({
              id: targetUser.id,
              name: targetUser.name,
              email: targetUser.email,
              role: targetUser.role,
              status: targetUser.status
            }))
            router.push('/dashboard')
            router.refresh()
          }
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  // Handle email confirmation simulation click
  const handleSimulateEmailConfirm = () => {
    if (typeof window !== 'undefined' && targetUser) {
      const savedUsers = localStorage.getItem('crm_users')
      if (savedUsers) {
        try {
          const parsed = JSON.parse(savedUsers)
          const updated = parsed.map((u: any) => {
            if (u.id === targetUser.id) {
              return {
                ...u,
                isEmailConfirmed: true
              }
            }
            return u
          })
          localStorage.setItem('crm_users', JSON.stringify(updated))
          
          // Log in successfully
          localStorage.setItem('crm_current_user', JSON.stringify({
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
            role: targetUser.role,
            status: targetUser.status
          }))
          
          router.push('/dashboard')
          router.refresh()
        } catch (err) {
          console.error(err)
        }
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(180,217,50,0.06) 0%, transparent 70%)',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'var(--brand-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 28px rgba(180,217,50,0.3)',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <path d="M3 9l9-6 9 6v11a1 1 0 01-1 1H4a1 1 0 01-1-1V9z" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 22V12h6v10" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>CARTON</span>
            <span style={{ color: 'var(--brand-500)' }}> PACK</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            CRM Comercial e Operacional
          </p>
        </div>

        {/* STEP 1: Standard Login Form */}
        {activeStep === 'login' && (
          <div className="card" style={{ padding: '32px' }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="label">E-mail ou Usuário</label>
                <input
                  className="input"
                  type="text"
                  placeholder="seu.nome ou seu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Senha</label>
                <input
                  className="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fca5a5',
                  fontSize: '13px',
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                disabled={loading}
                style={{ width: '100%', marginTop: '4px' }}
              >
                {loading ? 'Validando...' : 'Entrar no Sistema'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: First Access - Change Password */}
        {activeStep === 'first-access' && targetUser && (
          <div className="card animate-fade-up" style={{ padding: '32px', border: '1px solid var(--lime)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', padding: '10px', background: 'rgba(180,217,50,0.1)', borderRadius: '50%', color: 'var(--lime)', marginBottom: '12px' }}>
                <Key size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Primeiro Acesso</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Defina uma nova senha para o usuário <strong style={{ color: 'var(--text-secondary)' }}>{targetUser.name}</strong>.
              </p>
            </div>

            <form onSubmit={handleSaveNewPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label className="label">Nova Senha (mín. 6 dígitos)</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Confirmar Nova Senha</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Repita a nova senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>

              {passwordError && (
                <div style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fca5a5',
                  fontSize: '12px',
                }}>
                  {passwordError}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '6px', color: 'black' }}
              >
                Definir Senha e Continuar
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Confirm Email (Carton Pack Emails Only) */}
        {activeStep === 'confirm-email' && targetUser && (
          <div className="card animate-fade-up" style={{ padding: '32px', border: '1px solid var(--brand-500)' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(99,102,241,0.12)', borderRadius: '50%', color: 'var(--brand-500)', marginBottom: '14px' }}>
                <Mail size={28} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Confirmação Pendente</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
                Um link de ativação foi enviado para seu e-mail corporativo: <br/>
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{targetUser.email}</strong>
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Acesse a caixa de entrada para confirmar seu acesso.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={handleSimulateEmailConfirm}
                className="btn btn-primary w-full flex items-center justify-center gap-2 py-3"
                style={{ color: 'black' }}
              >
                <span>Simular Ativação de E-mail</span>
                <ArrowRight size={14} />
              </button>

              <button
                onClick={() => {
                  setActiveStep('login')
                  setTargetUser(null)
                }}
                className="btn btn-secondary w-full py-2.5"
              >
                Voltar para o Login
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Carton Pack © {new Date().getFullYear()} — Sistema interno
        </p>
      </div>
    </div>
  )
}

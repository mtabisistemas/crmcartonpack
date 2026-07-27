import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const DEFAULT_TEAM_USERS = [
  { id: 'usr-admin-1', name: 'Maurício Maciel', email: 'mauricio@mtabi.com.br', role: 'admin', status: 'ativo', phone: '(51) 99999-0000', createdAt: '26/07/2026', username: 'mauricio.maciel' },
  { id: 'usr-rep-teste', name: 'Representante Teste', email: 'rep.teste@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(51) 98888-1111', createdAt: '26/07/2026', username: 'rep.teste' },
  { id: 'usr-rep-carlos', name: 'Fausto Fleck', email: 'fausto.fleck@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(51) 99344-1234', createdAt: '26/07/2026', username: 'fausto.fleck' },
  { id: 'usr-rep-juliana', name: 'Ana Paula Nunes', email: 'ana.nunes@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(51) 98111-5555', createdAt: '26/07/2026', username: 'ana.nunes' },
  { id: 'usr-rep-marcos', name: 'Felipe Ribeiro', email: 'felipe.ribeiro@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(54) 99655-4433', createdAt: '26/07/2026', username: 'felipe.ribeiro' },
  { id: 'usr-rep-fernanda', name: 'Witalo Frota', email: 'witalo.frota@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(51) 99222-3344', createdAt: '26/07/2026', username: 'witalo.frota' },
  { id: 'usr-sup-diessica', name: 'Diéssica Hartmann', email: 'diessica.hartmann@cartonpack.com.br', role: 'vendedor', status: 'ativo', phone: '(51) 99344-1234', createdAt: '26/07/2026', username: 'diessica.hartmann' },
  { id: 'usr-sup-thaiane', name: 'Thaiane Antunes', email: 'thaiane.antunes@cartonpack.com.br', role: 'vendedor', status: 'ativo', phone: '(51) 98111-5555', createdAt: '26/07/2026', username: 'thaiane.antunes' }
]

export async function GET() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      cache: 'no-store'
    })
    const data = await res.json()
    
    let usersList: any[] = []
    if (Array.isArray(data)) {
      usersList = data.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.name || p.email?.split('@')[0],
        email: p.email,
        role: p.role || 'administrador',
        status: p.active !== false ? 'ativo' : 'inativo',
        phone: p.phone || '',
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        username: p.username || p.email?.split('@')[0]
      }))
    }

    DEFAULT_TEAM_USERS.forEach(du => {
      if (!usersList.some(u => u.id === du.id || u.email === du.email || (u.username && u.username === du.username))) {
        usersList.push(du)
      }
    })

    return NextResponse.json({ success: true, users: usersList })
  } catch (err: any) {
    return NextResponse.json({ success: true, users: DEFAULT_TEAM_USERS })
  }
}

export async function POST(req: Request) {
  try {
    const user = await req.json()
    
    let authUserId = user.id
    if (!authUserId || !authUserId.includes('-')) {
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: user.email,
          password: user.tempPassword || user.password || '123456',
          email_confirm: true,
          user_metadata: {
            full_name: user.name,
            name: user.name,
            role: user.role,
            phone: user.phone
          }
        })
      })
      const authData = await authRes.json()
      if (authData?.id) {
        authUserId = authData.id
      }
    }

    if (authUserId) {
      const profilePayload = {
        id: authUserId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        full_name: user.name,
        email: user.email,
        role: user.role || 'representante',
        phone: user.phone || null,
        active: user.status !== 'inativo'
      }

      await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([profilePayload])
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

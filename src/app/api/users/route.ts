import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const DEFAULT_REAL_USERS = [
  { id: 'usr-admin-1', name: 'Maurício Maciel', email: 'mauricio@mtabi.com.br', role: 'admin', status: 'ativo', phone: '', createdAt: '26/07/2026', username: 'mauricio.maciel' },
  { id: 'usr-rep-teste', name: 'Representante Teste', email: 'rep.teste@cartonpack.com.br', role: 'representante', status: 'ativo', phone: '(51) 98888-1111', createdAt: '26/07/2026', username: 'representante.teste' }
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
    if (Array.isArray(data) && data.length > 0) {
      usersList = data.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.name || p.email?.split('@')[0],
        email: p.email,
        role: p.role || 'administrador',
        status: p.active !== false ? 'ativo' : 'inativo',
        phone: p.phone || '',
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '26/07/2026',
        username: p.username || p.email?.split('@')[0]
      }))
    }

    // Always guarantee Representante Teste & Mauricio Maciel if not yet in Supabase profiles
    DEFAULT_REAL_USERS.forEach(ru => {
      if (!usersList.some(u => u.email === ru.email || u.id === ru.id)) {
        usersList.push(ru)
      }
    })

    return NextResponse.json({ success: true, users: usersList })
  } catch (err: any) {
    return NextResponse.json({ success: true, users: DEFAULT_REAL_USERS })
  }
}

const isUUID = (str: string) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export async function POST(req: Request) {
  try {
    const user = await req.json()
    
    let authUserId = isUUID(user.id) ? user.id : null
    if (!authUserId) {
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
      } else {
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          }
        })
        const listData = await listRes.json()
        const existing = listData?.users?.find((u: any) => u.email?.toLowerCase() === user.email?.toLowerCase())
        if (existing?.id) {
          authUserId = existing.id
        }
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
        active: user.status !== 'inativo',
        updated_at: new Date().toISOString()
      }

      const pRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=representation'
        },
        body: JSON.stringify([profilePayload])
      })
      const pData = await pRes.json()
      return NextResponse.json({ success: true, user: { ...user, id: authUserId }, profile: pData })
    }

    return NextResponse.json({ success: false, error: 'Não foi possível gerar ID do usuário no Supabase' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

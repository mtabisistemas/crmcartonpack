import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

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
    
    if (Array.isArray(data)) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.full_name || p.name || p.email?.split('@')[0],
        email: p.email,
        role: p.role || 'administrador',
        status: p.active !== false ? 'ativo' : 'inativo',
        phone: p.phone || '',
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
        username: p.username || p.email?.split('@')[0]
      }))
      return NextResponse.json({ success: true, users: mapped })
    }

    return NextResponse.json({ success: true, users: [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
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
          password: user.tempPassword || user.password || '@CartonPack2026',
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

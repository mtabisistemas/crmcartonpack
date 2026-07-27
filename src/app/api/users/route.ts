import { NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

// Internal email domain used for representatives who don't have a real email
const REP_EMAIL_DOMAIN = 'crm.cartonpack.com.br'

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

    if (!Array.isArray(data)) {
      return NextResponse.json({ success: true, users: [] })
    }

    const usersList = data.map((p: any) => {
      const isInternalEmail = p.email?.endsWith(`@${REP_EMAIL_DOMAIN}`)
      return {
        id: p.id,
        name: p.full_name || p.email?.split('@')[0] || '',
        // Show empty email for representatives with internal email
        email: isInternalEmail ? '' : (p.email || ''),
        role: p.role || 'representante',
        status: p.active !== false ? 'ativo' : 'inativo',
        phone: p.phone || '',
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
        username: p.username || p.email?.split('@')[0] || ''
      }
    })

    return NextResponse.json({ success: true, users: usersList })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, users: [] }, { status: 500 })
  }
}

const isUUID = (str: string) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export async function POST(req: Request) {
  try {
    const user = await req.json()

    // Only 'representante' role has no real email — all other roles (vendedor, admin, etc.) use the real email
    const isRep = user.role === 'representante'

    // Representatives: generate internal email from username. Everyone else: use the real email typed.
    const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const emailForAuth = isRep
      ? `${username}@${REP_EMAIL_DOMAIN}`
      : user.email

    let authUserId = isUUID(user.id) ? user.id : null

    if (!authUserId) {
      // Try creating in Supabase Auth
      const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: emailForAuth,
          password: user.tempPassword || '123456',
          email_confirm: true,
          user_metadata: {
            full_name: user.name,
            role: user.role,
            phone: user.phone,
            isFirstAccess: true
          }
        })
      })
      const authData = await authRes.json()

      if (authData?.id) {
        authUserId = authData.id
      } else {
        // User already exists in Auth — find by email
        const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          }
        })
        const listData = await listRes.json()
        const existing = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === emailForAuth.toLowerCase()
        )
        if (existing?.id) {
          authUserId = existing.id
        }
      }
    }

    if (authUserId) {
      // Update Auth user password or metadata if resetFirstAccess or tempPassword provided
      const updateMetadata: any = {
        full_name: user.name,
        role: user.role,
        phone: user.phone
      }
      if (user.resetFirstAccess || user.isFirstAccess) {
        updateMetadata.isFirstAccess = true
      } else if (user.isFirstAccess === false) {
        updateMetadata.isFirstAccess = false
      }

      const updatePayload: any = { user_metadata: updateMetadata }
      if (user.tempPassword || user.password) {
        updatePayload.password = user.tempPassword || user.password
      }

      try {
        await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUserId}`, {
          method: 'PUT',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        })
      } catch (e) {
        console.error('[API /users] Error updating Auth user for password reset', e)
      }
    }

    const profilePayload = {
      id: authUserId,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      full_name: user.name,
      // Store the internal email in DB (representatives use @crm.cartonpack.com.br)
      email: emailForAuth,
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

    return NextResponse.json({
      success: true,
      user: { ...user, id: authUserId, email: isRep ? '' : emailForAuth },
      profile: pData
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

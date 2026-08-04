import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const REP_EMAIL_DOMAIN = 'crm.cartonpack.com.br'

const isUUID = (str: string) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

// Sessions don't always carry a profile UUID (the master admin uses a
// hardcoded id), so fall back to the other identifiers we store.
async function resolveProfile(identity: { id?: string | null; email?: string | null; username?: string | null }) {
  if (identity.id && isUUID(identity.id)) {
    const { data } = await supabaseAdmin.from('profiles').select('id, role').eq('id', identity.id).limit(1)
    if (data && data.length > 0) return data[0]
  }

  if (identity.email) {
    const { data } = await supabaseAdmin.from('profiles').select('id, role').eq('email', identity.email).limit(1)
    if (data && data.length > 0) return data[0]
  }

  if (identity.username) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('email', `${identity.username}@${REP_EMAIL_DOMAIN}`)
      .limit(1)
    if (data && data.length > 0) return data[0]
  }

  return null
}

const isAdminRole = (role?: string | null) => {
  const r = (role || '').toLowerCase()
  return r === 'admin' || r === 'administrador'
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)

    // Whoever is asking has to be verified against the database — the caller's
    // own claim about its role can't be trusted, and location is admin-only.
    const requester = await resolveProfile({
      id: searchParams.get('requesterId'),
      email: searchParams.get('requesterEmail'),
      username: searchParams.get('requesterUsername')
    })
    const canSeeLocation = isAdminRole(requester?.role)

    const { data: profiles, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('*')

    if (pErr) {
      return NextResponse.json({ success: false, error: pErr.message, users: [] }, { status: 500 })
    }

    const usersList = (profiles || []).map((p: any) => {
      const isInternalEmail = p.email?.endsWith(`@${REP_EMAIL_DOMAIN}`)
      return {
        id: p.id,
        name: p.full_name || p.email?.split('@')[0] || '',
        email: isInternalEmail ? '' : (p.email || ''),
        role: p.role || 'representante',
        status: p.active !== false ? 'ativo' : 'inativo',
        phone: p.phone || '',
        createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '',
        username: p.username || p.email?.split('@')[0] || '',
        lastSeenAt: p.last_seen_at || null,
        // Omitted entirely for non-admins so it never reaches the browser.
        ...(canSeeLocation ? { lastLocation: p.last_location || null } : {})
      }
    })

    return NextResponse.json({ success: true, users: usersList })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, users: [] }, { status: 500 })
  }
}

// PATCH endpoint to update user activity (heartbeat & location)
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const rawId = body.userId || body.id

    let targetId: string | null = isUUID(rawId) ? rawId : null

    // Not every session carries a real profile UUID — the master admin logs in
    // with a hardcoded id — so fall back to the identifiers we do have.
    if (!targetId && body.email) {
      const { data: byEmail } = await supabaseAdmin.from('profiles').select('id').eq('email', body.email).limit(1)
      if (byEmail && byEmail.length > 0) targetId = byEmail[0].id
    }

    if (!targetId && body.username) {
      // Reps have no real mailbox; their profile email is derived from username.
      const { data: byRepEmail } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', `${body.username}@${REP_EMAIL_DOMAIN}`)
        .limit(1)
      if (byRepEmail && byRepEmail.length > 0) targetId = byRepEmail[0].id
    }

    if (!targetId) {
      // Previously this returned success, so a heartbeat that matched no
      // profile looked identical to one that was actually recorded.
      return NextResponse.json(
        { success: false, error: 'Perfil não localizado para registrar o acesso' },
        { status: 404 }
      )
    }

    const updates: any = {
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (body.location && typeof body.location === 'string') {
      updates.last_location = body.location
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', targetId)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const user = await req.json()
    const isRep = user.role === 'representante'

    const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const emailForAuth = isRep
      ? `${username}@${REP_EMAIL_DOMAIN}`
      : user.email?.toLowerCase().trim()

    if (!emailForAuth) {
      return NextResponse.json({ success: false, error: 'E-mail do usuário é obrigatório' }, { status: 400 })
    }

    let authUserId = isUUID(user.id) ? user.id : null

    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingInAuth = authUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === emailForAuth.toLowerCase()
    )

    if (existingInAuth?.id) {
      authUserId = existingInAuth.id
    }

    const tempPass = user.tempPassword || user.password || '123456'

    if (!authUserId) {
      const { data: createdAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: emailForAuth,
        password: tempPass,
        email_confirm: true,
        user_metadata: {
          full_name: user.name,
          role: user.role || 'representante',
          phone: user.phone || '',
          isFirstAccess: true
        }
      })

      if (createErr) {
        console.error('[API /users] Error creating user in auth.users:', createErr)
        return NextResponse.json({ success: false, error: `Erro na Autenticação Supabase: ${createErr.message}` }, { status: 400 })
      }

      authUserId = createdAuth?.user?.id || null
    }

    if (!authUserId) {
      return NextResponse.json({ success: false, error: 'Erro ao gerar ID de autenticação do usuário' }, { status: 400 })
    }

    const updateMetadata: any = {
      full_name: user.name,
      role: user.role || 'representante',
      phone: user.phone || ''
    }
    if (user.resetFirstAccess || user.isFirstAccess || user.tempPassword) {
      updateMetadata.isFirstAccess = true
    } else if (user.isFirstAccess === false) {
      updateMetadata.isFirstAccess = false
    }

    await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password: tempPass,
      user_metadata: updateMetadata
    }).catch(err => console.error('[API /users] Error updating auth user', err))

    const profilePayload: any = {
      id: authUserId,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      full_name: user.name,
      email: emailForAuth,
      role: user.role || 'representante',
      phone: user.phone || null,
      active: user.status !== 'inativo',
      updated_at: new Date().toISOString()
    }

    const { data: profileData, error: profileErr } = await supabaseAdmin
      .from('contacts')
      ? await supabaseAdmin.from('profiles').upsert(profilePayload).select()
      : { data: null, error: null }

    return NextResponse.json({
      success: true,
      user: { ...user, id: authUserId, email: isRep ? '' : emailForAuth },
      profile: profileData
    })
  } catch (err: any) {
    console.error('[API /users] Unexpected POST error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    let targetId: string | null = isUUID(id) ? id : null

    if (!targetId) {
      // Look up profile by id or email
      const { data: found } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .or(`id.eq.${id},email.eq.${id}`)
        .limit(1)
      if (found && found.length > 0) {
        targetId = found[0].id
      }
    }

    const deleteId = targetId || id

    // Delete from profiles
    const { error: pErr } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', deleteId)

    if (pErr) {
      console.error('[API /users DELETE] Error deleting profile:', pErr)
    }

    // Delete from auth.users
    if (isUUID(deleteId)) {
      await supabaseAdmin.auth.admin.deleteUser(deleteId).catch(err => {
        console.error('[API /users DELETE] Error deleting auth user:', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API /users DELETE] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

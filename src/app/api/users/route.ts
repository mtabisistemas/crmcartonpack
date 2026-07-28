import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Internal email domain used for representatives who don't have a real email
const REP_EMAIL_DOMAIN = 'crm.cartonpack.com.br'

const isUUID = (str: string) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export async function GET() {
  try {
    // 1. Fetch profiles
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
        username: p.username || p.email?.split('@')[0] || ''
      }
    })

    return NextResponse.json({ success: true, users: usersList })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, users: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Special action: ensure-auth (auto-repair user in auth.users if missing)
    if (body.action === 'ensure-auth') {
      const email = body.email?.toLowerCase().trim()
      const password = body.password || '123456'
      if (!email) {
        return NextResponse.json({ success: false, error: 'E-mail inválido' }, { status: 400 })
      }

      const emailForAuth = email.includes('@') ? email : `${email}@${REP_EMAIL_DOMAIN}`

      // Check if user exists in auth.users
      const { data: authList } = await supabaseAdmin.auth.admin.listUsers()
      let existingAuth = authList?.users?.find(
        (u: any) => u.email?.toLowerCase() === emailForAuth.toLowerCase()
      )

      if (!existingAuth) {
        // Create user in auth.users
        const { data: newAuth, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: emailForAuth,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: email.split('@')[0],
            isFirstAccess: true
          }
        })
        if (createErr) {
          return NextResponse.json({ success: false, error: createErr.message }, { status: 400 })
        }
        existingAuth = newAuth?.user
      } else {
        // Update password for existing auth user
        await supabaseAdmin.auth.admin.updateUserById(existingAuth.id, {
          password: password,
          user_metadata: { ...existingAuth.user_metadata, isFirstAccess: true }
        })
      }

      // Sync profile ID to match auth user ID
      if (existingAuth?.id) {
        await supabaseAdmin.from('profiles').upsert({
          id: existingAuth.id,
          tenant_id: '00000000-0000-0000-0000-000000000001',
          email: emailForAuth,
          full_name: existingAuth.user_metadata?.full_name || email.split('@')[0],
          role: existingAuth.user_metadata?.role || 'vendedor',
          active: true,
          updated_at: new Date().toISOString()
        })
      }

      return NextResponse.json({ success: true, userId: existingAuth?.id })
    }

    // Normal user creation / update
    const user = body
    const isRep = user.role === 'representante'

    const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '.').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const emailForAuth = isRep
      ? `${username}@${REP_EMAIL_DOMAIN}`
      : user.email?.toLowerCase().trim()

    if (!emailForAuth) {
      return NextResponse.json({ success: false, error: 'E-mail do usuário é obrigatório' }, { status: 400 })
    }

    let authUserId = isUUID(user.id) ? user.id : null

    // 1. Check in auth.users by email first
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingInAuth = authUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === emailForAuth.toLowerCase()
    )

    if (existingInAuth?.id) {
      authUserId = existingInAuth.id
    }

    const tempPass = user.tempPassword || user.password || '123456'

    if (!authUserId) {
      // 2. Create in auth.users with email_confirm: true so login works instantly
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

    // 3. Always ensure password & metadata in auth.users match
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

    // 4. Create / Update public.profiles with guaranteed authUserId
    const profilePayload = {
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
      .from('profiles')
      .upsert(profilePayload)
      .select()

    if (profileErr) {
      console.error('[API /users] Error saving profile:', profileErr)
      return NextResponse.json({ success: false, error: profileErr.message }, { status: 500 })
    }

    // Clean up any orphaned profile with mismatched old ID if user email matched
    if (user.id && user.id !== authUserId) {
      try {
        await supabaseAdmin.from('profiles').delete().eq('id', user.id)
      } catch (e) {}
    }

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

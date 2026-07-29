import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function GET() {
  try {
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .limit(1)

    const tenant = tenants?.[0]
    if (error || !tenant) {
      return NextResponse.json({ success: true, goalsMap: {}, lossReasons: [] })
    }

    let goalsMap = {}
    let lossReasons = []

    if (tenant.plan) {
      try { goalsMap = typeof tenant.plan === 'string' ? JSON.parse(tenant.plan) : tenant.plan } catch (e) {}
    }
    if (tenant.logo_url) {
      try { lossReasons = typeof tenant.logo_url === 'string' ? JSON.parse(tenant.logo_url) : tenant.logo_url } catch (e) {}
    }

    return NextResponse.json({ success: true, goalsMap, lossReasons })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, goalsMap: {}, lossReasons: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { type, payload } = await req.json()

    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .limit(1)

    const tenant = tenants?.[0]
    const tenantId = tenant?.id || '00000000-0000-0000-0000-000000000001'

    const updateObj: any = {
      updated_at: new Date().toISOString()
    }

    if (type === 'goals') {
      updateObj.plan = JSON.stringify(payload)
    } else if (type === 'loss_reasons') {
      updateObj.logo_url = JSON.stringify(payload)
    }

    if (!tenant) {
      await supabaseAdmin.from('tenants').insert([{
        id: tenantId,
        name: 'Carton Pack',
        slug: 'carton-pack',
        ...updateObj
      }])
    } else {
      await supabaseAdmin.from('tenants').update(updateObj).eq('id', tenantId)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

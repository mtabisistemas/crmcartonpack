import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const isUUID = (str: string) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  try {
    const { data: deals, error: dErr } = await supabaseAdmin
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })

    if (dErr) {
      return NextResponse.json({ success: false, error: dErr.message, deals: [] }, { status: 500 })
    }

    return NextResponse.json({ success: true, deals: deals || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, deals: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const dealsInput = Array.isArray(body) ? body : [body]

    if (dealsInput.length === 0) {
      return NextResponse.json({ success: true, deals: [] })
    }

    // Get a fallback contact UUID in case a deal is missing a valid contact_id
    const { data: contacts } = await supabaseAdmin.from('contacts').select('id, name, company').limit(1)
    const fallbackContactId = contacts?.[0]?.id || '177d91c9-f324-4998-8e1a-b847777d4b8a'

    const payloads = dealsInput.map((d: any) => {
      let finalContactId = d.contact_id || d.contact?.id
      if (!isUUID(finalContactId)) {
        finalContactId = fallbackContactId
      }

      let dealId = d.id
      if (!isUUID(dealId)) {
        // Deterministic or random UUID for non-UUID string IDs
        dealId = '00000000-0000-0000-0000-' + String(Date.now()).slice(-12).padStart(12, '0')
      }

      return {
        id: dealId,
        tenant_id: DEFAULT_TENANT_ID,
        title: d.title || d.contact?.name || d.contact?.company || 'Novo Negócio',
        contact_id: finalContactId,
        stage: d.stage || 'leads',
        assigned_to: d.assigned_to || d.representative || '',
        estimated_value: parseFloat(d.estimated_value) || 0,
        final_value: parseFloat(d.final_value) || 0,
        lost_reason: d.lost_reason || '',
        lost_notes: d.lost_notes || '',
        position: parseInt(d.position) || 0,
        updated_at: new Date().toISOString()
      }
    })

    const { data, error } = await supabaseAdmin
      .from('deals')
      .upsert(payloads, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[API /deals POST] Error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deals: data })
  } catch (err: any) {
    console.error('[API /deals POST] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

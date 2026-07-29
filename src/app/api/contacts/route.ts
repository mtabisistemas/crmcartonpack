import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message, contacts: [] }, { status: 500 })
    }

    return NextResponse.json({ success: true, contacts: data || [] })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, contacts: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const contact = await req.json()

    if (!contact.id) {
      return NextResponse.json({ success: false, error: 'ID do contato é obrigatório' }, { status: 400 })
    }

    // Unpack projection fields into notes JSON
    let existingNotesObj: any = {}
    if (contact.notes) {
      try {
        existingNotesObj = typeof contact.notes === 'string' ? JSON.parse(contact.notes) : contact.notes
      } catch (e) {}
    }

    const mergedNotesObj = {
      ...existingNotesObj,
      projectedPurchaseValue: contact.projectedPurchaseValue ?? existingNotesObj.projectedPurchaseValue ?? 0,
      purchaseFrequencyDays: contact.purchaseFrequencyDays ?? existingNotesObj.purchaseFrequencyDays ?? 30,
      lastPurchaseDate: contact.lastPurchaseDate || existingNotesObj.lastPurchaseDate || '',
      planningNotes: contact.planningNotes || existingNotesObj.planningNotes || '',
      history: contact.history || existingNotesObj.history || [],
      activities: contact.activities || existingNotesObj.activities || []
    }

    const payload: any = {
      id: contact.id,
      name: contact.name || contact.company,
      company: contact.company || contact.name,
      role: contact.tradeName || contact.company || contact.name,
      trade_name: contact.tradeName || contact.company,
      phone: contact.phone || '',
      email: contact.email || '',
      city: contact.city || '',
      state: contact.state || '',
      status: contact.status || 'ativo',
      curve: contact.curve || 'C',
      representative: contact.representative || '',
      assigned_to: contact.representative || '',
      cnpj: contact.cnpj || '',
      address: contact.address || '',
      bairro: contact.bairro || '',
      cep: contact.cep || '',
      tax_regime: contact.taxRegime || 'Simples Nacional',
      special_situation: contact.specialSituation || 'Nenhuma',
      special_situation_date: contact.specialSituationDate || '-',
      state_registration: contact.stateRegistration || '',
      registration_status: contact.registrationStatus || 'ATIVA',
      main_cnae: contact.mainCnae || '',
      side_activities: JSON.stringify(contact.sideActivities || []),
      website: contact.website || '',
      instagram: contact.instagram || '',
      linkedin: contact.linkedin || '',
      facebook: contact.facebook || '',
      notes: JSON.stringify(mergedNotesObj),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('contacts')
      .upsert([payload], { onConflict: 'id' })
      .select()

    if (error) {
      console.error('[API /contacts POST] Error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, contact: data?.[0] })
  } catch (err: any) {
    console.error('[API /contacts POST] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

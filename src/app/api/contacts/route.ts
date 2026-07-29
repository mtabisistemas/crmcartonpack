import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const isUUID = (str: any) =>
  typeof str === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ success: false, error: error.message, contacts: [] }, { status: 500 })
    }

    const mappedContacts = (data || []).map((item: any) => {
      let notesObj: any = {}
      if (item.notes) {
        try {
          notesObj = typeof item.notes === 'string' ? JSON.parse(item.notes) : item.notes
        } catch (e) {}
      }

      return {
        ...item,
        projectedPurchaseValue: notesObj.projectedPurchaseValue ?? item.projected_purchase_value ?? 0,
        purchaseFrequencyDays: notesObj.purchaseFrequencyDays ?? item.purchase_frequency_days ?? 30,
        lastPurchaseDate: notesObj.lastPurchaseDate || item.last_purchase_date || '',
        planningNotes: notesObj.planningNotes || item.planning_notes || '',
        history: notesObj.history || item.history || [],
        activities: notesObj.activities || item.activities || []
      }
    })

    return NextResponse.json({ success: true, contacts: mappedContacts })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, contacts: [] }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const contact = await req.json()

    if (!contact) {
      return NextResponse.json({ success: false, error: 'Dados do contato são obrigatórios' }, { status: 400 })
    }

    // Resolve target UUID in Supabase
    let targetUUID: string | null = isUUID(contact.id) ? contact.id : null

    const cleanCnpj = (contact.cnpj || '').replace(/\D/g, '')
    const cleanCompany = (contact.company || '').trim()
    const cleanName = (contact.name || '').trim()

    if (!targetUUID && cleanCnpj) {
      const { data: byCnpj } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .ilike('cnpj', `%${cleanCnpj}%`)
        .limit(1)
      if (byCnpj && byCnpj.length > 0) targetUUID = byCnpj[0].id
    }

    if (!targetUUID && cleanCompany) {
      const { data: byComp } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .ilike('company', cleanCompany)
        .limit(1)
      if (byComp && byComp.length > 0) targetUUID = byComp[0].id
    }

    if (!targetUUID && cleanName) {
      const { data: byName } = await supabaseAdmin
        .from('contacts')
        .select('id')
        .ilike('name', cleanName)
        .limit(1)
      if (byName && byName.length > 0) targetUUID = byName[0].id
    }

    if (!targetUUID) {
      targetUUID = crypto.randomUUID()
    }

    // Unpack projection fields into notes JSON
    let existingNotesObj: any = {}
    if (targetUUID) {
      const { data: existingContact } = await supabaseAdmin
        .from('contacts')
        .select('notes')
        .eq('id', targetUUID)
        .limit(1)

      if (existingContact?.[0]?.notes) {
        try {
          existingNotesObj = typeof existingContact[0].notes === 'string'
            ? JSON.parse(existingContact[0].notes)
            : existingContact[0].notes
        } catch (e) {}
      }
    }

    if (contact.notes && Object.keys(existingNotesObj).length === 0) {
      try {
        existingNotesObj = typeof contact.notes === 'string' ? JSON.parse(contact.notes) : contact.notes
      } catch (e) {}
    }

    // Merge activities avoiding duplicate IDs
    const existingActs: any[] = existingNotesObj.activities || []
    const incomingActs: any[] = contact.activities || []
    const actMap = new Map<string, any>()
    existingActs.forEach(a => { if (a && a.id) actMap.set(a.id, a) })
    incomingActs.forEach(a => { if (a && a.id) actMap.set(a.id, a) })
    const mergedActivities = Array.from(actMap.values()).sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))

    const mergedNotesObj = {
      ...existingNotesObj,
      projectedPurchaseValue: contact.projectedPurchaseValue ?? existingNotesObj.projectedPurchaseValue ?? 0,
      purchaseFrequencyDays: contact.purchaseFrequencyDays ?? existingNotesObj.purchaseFrequencyDays ?? 30,
      lastPurchaseDate: contact.lastPurchaseDate || existingNotesObj.lastPurchaseDate || '',
      planningNotes: contact.planningNotes || existingNotesObj.planningNotes || '',
      history: contact.history || existingNotesObj.history || [],
      activities: mergedActivities
    }

    // assigned_to MUST be a valid UUID or NULL (never a name string like "Maurício Maciel")
    let validAssignedTo: string | null = null
    if (isUUID(contact.assigned_to)) validAssignedTo = contact.assigned_to
    else if (isUUID(contact.assignedTo)) validAssignedTo = contact.assignedTo
    else if (isUUID(contact.representative)) validAssignedTo = contact.representative

    const repName = contact.representative || contact.assigned_to || ''

    const payload: any = {
      id: targetUUID,
      name: contact.name || contact.company || 'Contato Sem Nome',
      company: contact.company || contact.name || 'Empresa Sem Nome',
      role: contact.tradeName || contact.company || contact.name,
      trade_name: contact.tradeName || contact.company || null,
      phone: contact.phone || '',
      email: contact.email || '',
      city: contact.city || '',
      state: contact.state || '',
      status: contact.status || 'ativo',
      curve: contact.curve || 'C',
      representative: repName,
      assigned_to: validAssignedTo,
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

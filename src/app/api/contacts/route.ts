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
        inactivityThresholdDays: notesObj.inactivityThresholdDays ?? item.inactivity_threshold_days ?? 90,
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

    // Fetch existing contact row from Supabase to preserve any non-empty fields
    let existingContactRow: any = null
    let existingNotesObj: any = {}

    if (targetUUID) {
      const { data: found } = await supabaseAdmin
        .from('contacts')
        .select('*')
        .eq('id', targetUUID)
        .limit(1)

      if (found && found.length > 0) {
        existingContactRow = found[0]
        if (existingContactRow.notes) {
          try {
            existingNotesObj = typeof existingContactRow.notes === 'string'
              ? JSON.parse(existingContactRow.notes)
              : existingContactRow.notes
          } catch (e) {}
        }
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
      inactivityThresholdDays: contact.inactivityThresholdDays ?? existingNotesObj.inactivityThresholdDays ?? 90,
      planningNotes: contact.planningNotes || existingNotesObj.planningNotes || '',
      history: contact.history || existingNotesObj.history || [],
      activities: mergedActivities
    }

    // assigned_to MUST be a valid UUID or NULL
    let validAssignedTo: string | null = null
    if (isUUID(contact.assigned_to)) validAssignedTo = contact.assigned_to
    else if (isUUID(contact.assignedTo)) validAssignedTo = contact.assignedTo
    else if (isUUID(contact.representative)) validAssignedTo = contact.representative

    const repName = contact.representative || contact.assigned_to || existingContactRow?.representative || ''

    const payload: any = {
      id: targetUUID,
      name: contact.name || existingContactRow?.name || contact.company || existingContactRow?.company || 'Contato Sem Nome',
      company: contact.company || existingContactRow?.company || contact.name || existingContactRow?.name || 'Empresa Sem Nome',
      role: contact.tradeName || existingContactRow?.role || contact.company || 'Empresa Sem Nome',
      trade_name: contact.tradeName || existingContactRow?.trade_name || null,
      phone: contact.phone || existingContactRow?.phone || '',
      email: contact.email || existingContactRow?.email || '',
      city: contact.city || existingContactRow?.city || '',
      state: contact.state || existingContactRow?.state || '',
      status: contact.status || existingContactRow?.status || 'ativo',
      curve: contact.curve || existingContactRow?.curve || 'C',
      representative: repName,
      assigned_to: validAssignedTo || existingContactRow?.assigned_to || null,
      cnpj: contact.cnpj || existingContactRow?.cnpj || '',
      address: contact.address || existingContactRow?.address || '',
      bairro: contact.bairro || existingContactRow?.bairro || '',
      cep: contact.cep || existingContactRow?.cep || '',
      tax_regime: contact.taxRegime || existingContactRow?.tax_regime || 'Simples Nacional',
      special_situation: contact.specialSituation || existingContactRow?.special_situation || 'Nenhuma',
      special_situation_date: contact.specialSituationDate || existingContactRow?.special_situation_date || '-',
      state_registration: contact.stateRegistration || existingContactRow?.state_registration || '',
      registration_status: contact.registrationStatus || existingContactRow?.registration_status || 'ATIVA',
      main_cnae: contact.mainCnae || existingContactRow?.main_cnae || '',
      side_activities: contact.sideActivities ? JSON.stringify(contact.sideActivities) : (existingContactRow?.side_activities || '[]'),
      website: contact.website || existingContactRow?.website || '',
      instagram: contact.instagram || existingContactRow?.instagram || '',
      linkedin: contact.linkedin || existingContactRow?.linkedin || '',
      facebook: contact.facebook || existingContactRow?.facebook || '',
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

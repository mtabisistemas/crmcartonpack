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

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

const VALID_DB_STAGES = new Set([
  'leads',
  'prospect',
  'dinamica',
  'potencial',
  'visita',
  'briefing',
  'aprovacao',
  'fechamento',
  'pos_venda',
  'perdido'
])

const mapFrontendStageToDB = (stage: string): string => {
  if (!stage) return 'leads'
  const lower = stage.toLowerCase()
  if (lower === 'pedido') return 'pos_venda'
  if (lower === 'prospeccao') return 'prospect'
  if (lower === 'proposta') return 'potencial'
  if (VALID_DB_STAGES.has(lower)) return lower
  return 'leads'
}

const mapDBStageToFrontend = (stage: string): string => {
  if (!stage) return 'leads'
  if (stage === 'pos_venda') return 'pedido'
  if (stage === 'dinamica' || stage === 'visita') return 'prospect'
  if (stage === 'aprovacao') return 'briefing'
  if (stage === 'fechamento') return 'potencial'
  return stage
}

export async function GET() {
  try {
    let allDeals: any[] = []
    let from = 0
    const step = 1000

    while (true) {
      const { data: deals, error: dErr } = await supabaseAdmin
        .from('deals')
        .select('*, contacts(id, name, company, representative, phone, email, cnpj, address, bairro, cep, city, state, curve, notes)')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1)

      if (dErr) {
        return NextResponse.json({ success: false, error: dErr.message, deals: [] }, { status: 500 })
      }
      if (!deals || deals.length === 0) break
      allDeals = allDeals.concat(deals)
      if (deals.length < step) break
      from += step
    }

    const mappedDeals = (allDeals || []).map(d => {
      const c = d.contacts as any
      let contactObj = null
      if (c) {
        let parsedNotes: any = {}
        if (c.notes) {
          try {
            parsedNotes = typeof c.notes === 'string' ? JSON.parse(c.notes) : c.notes
          } catch (e) {}
        }
        contactObj = {
          id: c.id,
          name: c.name || d.title,
          company: c.company || d.title,
          representative: c.representative || '',
          phone: c.phone || '',
          email: c.email || '',
          cnpj: c.cnpj || '',
          address: c.address || '',
          bairro: c.bairro || '',
          cep: c.cep || '',
          city: c.city || '',
          state: c.state || '',
          curve: c.curve || 'C',
          activities: parsedNotes.activities || [],
          history: parsedNotes.history || []
        }
      }
      const assignedToName = (isUUID(d.assigned_to) ? null : d.assigned_to) || c?.representative || ''

      let prob = typeof d.probability === 'number' ? d.probability : 50
      let cleanNotes = d.lost_notes || ''
      let budgetObj = null
      let orderNumber = d.order_number || ''
      if (d.lost_notes && d.lost_notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(d.lost_notes)
          if (typeof parsed.prob === 'number') prob = parsed.prob
          if (typeof parsed.notes === 'string') cleanNotes = parsed.notes
          if (parsed.budget) budgetObj = parsed.budget
          if (parsed.order_number) orderNumber = parsed.order_number
        } catch (e) {}
      }

      return {
        ...d,
        probability: prob,
        lost_notes: cleanNotes,
        budget: budgetObj || d.budget || null,
        order_number: orderNumber,
        stage: mapDBStageToFrontend(d.stage),
        assigned_to: assignedToName,
        contact: contactObj
      }
    })

    return NextResponse.json({ success: true, deals: mappedDeals })
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

    // Get fallback contact UUID
    const { data: fallbackList } = await supabaseAdmin.from('contacts').select('id').limit(1)
    const fallbackContactId = fallbackList?.[0]?.id || '177d91c9-f324-4998-8e1a-b847777d4b8a'

    const payloads = []

    for (const d of dealsInput) {
      let finalContactId: string | null = isUUID(d.contact_id) ? d.contact_id : (isUUID(d.contact?.id) ? d.contact.id : null)

      const companyName = (d.contact?.company || d.contact?.name || d.title || '').trim()

      if (!finalContactId && companyName) {
        // Search contact by company or name
        const cleanName = companyName.replace(/[%_]/g, '')
        const { data: found } = await supabaseAdmin
          .from('contacts')
          .select('id')
          .or(`company.ilike.%${cleanName}%,name.ilike.%${cleanName}%`)
          .limit(1)

        if (found && found.length > 0) {
          finalContactId = found[0].id
        } else {
          // Create contact in contacts table so foreign key is valid
          const newContactUUID = crypto.randomUUID()
          const { data: createdContact } = await supabaseAdmin.from('contacts').insert([{
            id: newContactUUID,
            name: d.contact?.name || companyName,
            company: companyName,
            role: companyName,
            representative: d.assigned_to || d.contact?.representative || '',
            status: 'ativo'
          }]).select()

          if (createdContact && createdContact.length > 0) {
            finalContactId = createdContact[0].id
          }
        }
      }

      if (!finalContactId) {
        finalContactId = fallbackContactId
      }

      const repName = d.assigned_to || d.contact?.representative
      if (finalContactId && repName && typeof repName === 'string' && !isUUID(repName)) {
        await supabaseAdmin
          .from('contacts')
          .update({ representative: repName })
          .eq('id', finalContactId)
      }

      let dealId = isUUID(d.id) ? d.id : crypto.randomUUID()

      let validAssignedTo: string | null = null
      if (isUUID(d.assigned_to)) validAssignedTo = d.assigned_to
      else if (isUUID(d.assignedTo)) validAssignedTo = d.assignedTo

      const dbStage = mapFrontendStageToDB(d.stage)

      const budgetData = d.budget || {
        totalAmount: parseFloat(d.estimated_value) || 0,
        paymentTerms: d.payment_terms || d.paymentTerms || '',
        attachment: d.attachment || d.budget_attachment || null
      }

      const serializedNotes = JSON.stringify({
        prob: typeof d.probability === 'number' ? d.probability : 50,
        notes: d.lost_notes || '',
        budget: budgetData,
        order_number: d.order_number || ''
      })

      payloads.push({
        id: dealId,
        tenant_id: DEFAULT_TENANT_ID,
        title: d.title || d.contact?.company || d.contact?.name || 'Novo Negócio',
        contact_id: finalContactId,
        stage: dbStage,
        assigned_to: validAssignedTo,
        estimated_value: parseFloat(d.estimated_value) || 0,
        final_value: parseFloat(d.final_value) || 0,
        lost_reason: d.lost_reason || '',
        lost_notes: serializedNotes,
        position: parseInt(d.position) || 0,
        updated_at: new Date().toISOString()
      })
    }

    const { data, error } = await supabaseAdmin
      .from('deals')
      .upsert(payloads, { onConflict: 'id' })
      .select('*, contacts(id, name, company, representative, phone, email, cnpj, address, bairro, cep, city, state, curve, notes)')

    if (error) {
      console.error('[API /deals POST] Error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const returnedDeals = (data || []).map(d => {
      const c = d.contacts as any
      const assignedToName = (isUUID(d.assigned_to) ? null : d.assigned_to) || c?.representative || ''

      let prob = 50
      let cleanNotes = d.lost_notes || ''
      let budgetObj = null
      let orderNumber = d.order_number || ''
      if (d.lost_notes && d.lost_notes.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(d.lost_notes)
          if (typeof parsed.prob === 'number') prob = parsed.prob
          if (typeof parsed.notes === 'string') cleanNotes = parsed.notes
          if (parsed.budget) budgetObj = parsed.budget
          if (parsed.order_number) orderNumber = parsed.order_number
        } catch (e) {}
      }

      return {
        ...d,
        probability: prob,
        lost_notes: cleanNotes,
        budget: budgetObj || d.budget || null,
        order_number: orderNumber,
        stage: mapDBStageToFrontend(d.stage),
        assigned_to: assignedToName,
        contact: c ? {
          id: c.id,
          name: c.name || d.title,
          company: c.company || d.title,
          representative: c.representative || '',
          phone: c.phone || '',
          email: c.email || '',
          cnpj: c.cnpj || '',
          address: c.address || '',
          bairro: c.bairro || '',
          cep: c.cep || '',
          city: c.city || '',
          state: c.state || '',
          curve: c.curve || 'C'
        } : null
      }
    })

    return NextResponse.json({ success: true, deals: returnedDeals })
  } catch (err: any) {
    console.error('[API /deals POST] Unexpected error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do negócio é obrigatório' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('deals')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

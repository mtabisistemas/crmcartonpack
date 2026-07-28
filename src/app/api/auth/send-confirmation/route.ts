import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { generateNewUserEmailHtml } from '@/lib/emailTemplates/newUserConfirmation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ycpottoodbkqbvdkndyr.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcG90dG9vZGJrcWJ2ZGtuZHlyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDkyMzA1NiwiZXhwIjoyMTAwNDk5MDU2fQ.-P2sI6ueHJarEM4YwRd8IpSnm7e53v3KbOlXMIXuKwA'

export async function POST(req: Request) {
  try {
    const { email, name = 'Usuário', role = 'vendedor' } = await req.json()

    if (!email) {
      return NextResponse.json({ success: false, error: 'E-mail é obrigatório' }, { status: 400 })
    }

    // 1. Generate confirmation/magic link via Supabase Auth Admin API
    const linkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: email,
        redirect_to: 'https://crmcartonpack.vercel.app/dashboard'
      })
    })

    const linkData = await linkRes.json()
    const actionLink = linkData?.action_link || linkData?.properties?.action_link || 'https://crmcartonpack.vercel.app/login'

    // 2. Trigger Supabase Auth default resend endpoint
    await fetch(`${supabaseUrl}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: 'https://crmcartonpack.vercel.app/dashboard'
        }
      })
    }).catch(() => {})

    // 3. Direct SMTP dispatch if custom SMTP variables are configured
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    let directEmailSent = false

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        })

        const htmlContent = generateNewUserEmailHtml({
          name: name,
          email: email,
          role: role,
          loginUrl: actionLink
        })

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Carton Pack CRM" <${smtpUser}>`,
          to: email,
          subject: 'Confirme seu acesso ao Carton Pack CRM 🚀',
          html: htmlContent
        })

        directEmailSent = true
      } catch (smtpErr) {
        console.error('[API /send-confirmation] Custom SMTP dispatch failed:', smtpErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: directEmailSent
        ? 'E-mail de confirmação enviado via SMTP!'
        : 'Link de confirmação gerado e comando enviado ao Supabase.',
      actionLink: actionLink,
      directEmailSent: directEmailSent
    })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

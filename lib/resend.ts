import { Resend } from 'resend'
import type { Lead } from '@/lib/types'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVisitConfirmedEmail(lead: Lead): Promise<void> {
  try {
    await resend.emails.send({
      from: 'LeadDial <noreply@leaddial.dev>',
      to: process.env.SITE_MANAGER_EMAIL!,
      subject: `Site Visit Confirmed — ${lead.first_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #0F172A; margin-bottom: 8px;">Site Visit Confirmed</h2>
          <p style="color: #64748B; margin-bottom: 24px;">A lead has confirmed a site visit at Horizon Developers, Ulwe.</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">Name</td><td style="padding: 8px 0; color: #0F172A; font-weight: 600;">${lead.first_name}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">Phone</td><td style="padding: 8px 0; color: #0F172A;">${lead.phone}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">BHK Type</td><td style="padding: 8px 0; color: #0F172A;">${lead.bhk_type}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">Visit Slot</td><td style="padding: 8px 0; color: #0F172A;">${lead.visit_slot ?? '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">Budget Range</td><td style="padding: 8px 0; color: #0F172A;">${lead.budget_range ?? '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #64748B; font-size: 14px;">Lead Score</td><td style="padding: 8px 0; color: #0F172A;">${lead.lead_score != null ? `${lead.lead_score}/10` : '—'}</td></tr>
          </table>
        </div>
      `,
    })
  } catch (err) {
    console.error('Failed to send visit confirmed email:', err)
  }
}

// app/api/staff/refunds/route.js
// GET /api/staff/refunds
// Antrean refund DP yang menunggu diproses staf.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      refund_status,
      refund_amount,
      refund_note,
      refunded_at,
      reservations (
        id,
        reservation_code,
        contact_name,
        reservation_date,
        status
      )
      `
    )
    .eq('refund_status', 'menunggu_refund')
    .order('issued_at', { ascending: false })

  if (error) {
    console.error('Fetch refunds error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil daftar refund' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    refunds: (data || []).map((inv) => ({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      refund_amount: parseFloat(inv.refund_amount || 0),
      refund_note: inv.refund_note,
      refunded_at: inv.refunded_at,
      reservation: inv.reservations,
    })),
    total: data?.length || 0,
  })
}

// app/api/staff/refunds/[invoiceId]/settle/route.js
// POST /api/staff/refunds/[invoiceId]/settle
// Staf menutup refund: dana sudah dikembalikan atau DP dinyatakan hangus.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { settleRefundSchema } from '@/lib/validations/staff'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { invoiceId } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = settleRefundSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('settle_refund', {
      p_invoice_id: invoiceId,
      p_action: parsed.data.action,
      p_note: parsed.data.note,
    })

    if (error) {
      console.error('Settle refund error:', error)
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak memproses refund' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Gagal memproses refund' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      message:
        parsed.data.action === 'sudah_dikembalikan'
          ? 'Refund ditandai sudah dikembalikan'
          : 'DP ditandai hangus',
      invoice: data,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// app/api/staff/payments/[id]/verify/route.js
// PATCH /api/staff/payments/[id]/verify
// Staf menerima/menolak bukti transfer/QRIS lewat RPC verify_payment.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { verifyPaymentSchema } from '@/lib/validations/staff'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = verifyPaymentSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('verify_payment', {
      p_payment_id: id,
      p_decision: parsed.data.decision,
      p_note: parsed.data.note || null,
    })

    if (error) {
      console.error('Verify payment error:', error)
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak memverifikasi pembayaran' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: error.message || 'Verifikasi pembayaran gagal' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      message:
        parsed.data.decision === 'terima'
          ? 'Pembayaran diverifikasi dan diterima'
          : 'Pembayaran ditolak',
      payment: data,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

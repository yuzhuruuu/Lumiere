// app/api/staff/reservations/[id]/invoice/route.js
// POST /api/staff/reservations/[id]/invoice
// Staf/admin membuat tagihan lewat RPC generate_invoice().
// Subtotal, pajak, total, dan DP dihitung database — bukan dari client.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const { data, error } = await supabase.rpc('generate_invoice', {
      p_reservation_id: id,
    })

    if (error) {
      console.error('generate_invoice error:', error)

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Tagihan untuk reservasi ini sudah pernah dibuat' },
          { status: 409 }
        )
      }
      if (error.code === 'P0002') {
        return NextResponse.json(
          { error: 'Reservasi tidak ditemukan' },
          { status: 404 }
        )
      }
      if (error.code === '23514') {
        return NextResponse.json(
          {
            error:
              'Tagihan hanya bisa dibuat setelah reservasi divalidasi (status dikonfirmasi/check_in/selesai)',
          },
          { status: 409 }
        )
      }
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak membuat tagihan' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal membuat tagihan' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Tagihan berhasil dibuat',
        invoice: {
          id: data.id,
          invoice_number: data.invoice_number,
          subtotal: parseFloat(data.subtotal),
          tax_amount: parseFloat(data.tax_amount),
          total_amount: parseFloat(data.total_amount),
          dp_amount: parseFloat(data.dp_amount),
          payment_status: data.payment_status,
          issued_at: data.issued_at,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

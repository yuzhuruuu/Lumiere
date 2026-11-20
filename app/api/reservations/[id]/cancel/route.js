// app/api/reservations/[id]/cancel/route.js
// PATCH /api/reservations/[id]/cancel
// Pelanggan membatalkan reservasinya sendiri (atau staf/admin membatalkan).
// Hanya status menunggu_validasi / dikonfirmasi yang boleh dibatalkan.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const CANCELLABLE = ['menunggu_validasi', 'dikonfirmasi']

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => ({}))
    const reason =
      typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null

    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('id, customer_id, status, reservation_code, notes')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    // Pelanggan hanya boleh membatalkan miliknya sendiri
    if (auth.profile.role === 'pelanggan' && current.customer_id !== auth.user.id) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses ke reservasi ini' },
        { status: 403 }
      )
    }

    if (!CANCELLABLE.includes(current.status)) {
      return NextResponse.json(
        {
          error: `Reservasi berstatus "${current.status}" tidak bisa dibatalkan`,
        },
        { status: 409 }
      )
    }

    const note = reason
      ? `Dibatalkan oleh ${auth.profile.role}: ${reason}`
      : `Dibatalkan oleh ${auth.profile.role}`

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'dibatalkan', notes: note })
      .eq('id', id)
      .select('id, reservation_code, status, notes, updated_at')
      .single()

    if (error) {
      console.error('Cancel reservation error:', error)
      if (error.code === '23514') {
        return NextResponse.json(
          { error: error.message || 'Pembatalan tidak diizinkan.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal membatalkan reservasi' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Reservasi berhasil dibatalkan',
      reservation: data,
      info:
        'Pembatalan tidak otomatis mengembalikan pembayaran. Hubungi staf untuk proses refund.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

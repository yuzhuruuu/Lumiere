// app/api/staff/reservations/[id]/validate/route.js
// PATCH /api/staff/reservations/[id]/validate
// Staf/admin menyetujui atau menolak reservasi.
// Body: { "action": "approve" } atau { "action": "reject", "rejection_reason": "..." }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { validateReservationSchema } from '@/lib/validations/staff'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = validateReservationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    // Cek status saat ini agar pesan error jelas
    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('id, status, reservation_code')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    if (current.status !== 'menunggu_validasi') {
      return NextResponse.json(
        {
          error: `Reservasi berstatus "${current.status}" tidak bisa divalidasi lagi`,
        },
        { status: 409 }
      )
    }

    let data = null
    let error = null

    if (parsed.data.action === 'approve') {
      // PRD v0.4: setuju + terbitkan invoice + pasang batas DP dalam satu transaksi.
      const rpc = await supabase.rpc('approve_reservation', {
        p_reservation_id: id,
      })
      data = rpc.data
      error = rpc.error
    } else {
      const result = await supabase
        .from('reservations')
        .update({
          status: 'ditolak',
          validated_by: auth.profile.id,
          validated_at: new Date().toISOString(),
          rejection_reason: parsed.data.rejection_reason,
        })
        .eq('id', id)
        .select('id, reservation_code, status, validated_at, rejection_reason')
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('Validate reservation error:', error)
      if (error.code === '23514') {
        return NextResponse.json(
          { error: error.message || 'Status reservasi sudah berubah. Muat ulang halaman.' },
          { status: 409 }
        )
      }
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak memvalidasi reservasi ini' },
          { status: 403 }
        )
      }
      if (error.code === 'P0002') {
        return NextResponse.json(
          { error: 'Reservasi tidak ditemukan' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal memvalidasi reservasi' },
        { status: 500 }
      )
    }

    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, reservation_code, status, validated_at, rejection_reason')
      .eq('id', id)
      .single()

    return NextResponse.json({
      message:
        parsed.data.action === 'approve'
          ? 'Reservasi berhasil dikonfirmasi'
          : 'Reservasi berhasil ditolak',
      reservation,
      invoice: parsed.data.action === 'approve' ? data : null,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

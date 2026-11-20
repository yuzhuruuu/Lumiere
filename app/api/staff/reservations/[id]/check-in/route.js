// app/api/staff/reservations/[id]/check-in/route.js
// PATCH /api/staff/reservations/[id]/check-in
// Staf/admin melakukan check-in tamu atau menandai tidak hadir.
// Body: { "action": "check_in" } atau { "action": "no_show", "note": "..." }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkInSchema } from '@/lib/validations/staff'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = checkInSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('id, status, reservation_code, notes')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    if (current.status !== 'dikonfirmasi') {
      return NextResponse.json(
        {
          error: `Check-in hanya untuk reservasi berstatus "dikonfirmasi" (sekarang: "${current.status}")`,
        },
        { status: 409 }
      )
    }

    const updateData =
      parsed.data.action === 'check_in'
        ? {
            status: 'check_in',
            checked_in_at: new Date().toISOString(),
          }
        : {
            status: 'tidak_hadir',
            notes: parsed.data.note || current.notes,
          }

    const { data, error } = await supabase
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select('id, reservation_code, status, checked_in_at, notes')
      .single()

    if (error) {
      console.error('Check-in error:', error)
      if (error.code === '23514') {
        return NextResponse.json(
          { error: error.message || 'Status reservasi sudah berubah.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal memproses check-in' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message:
        parsed.data.action === 'check_in'
          ? 'Check-in berhasil'
          : 'Reservasi ditandai tidak hadir',
      reservation: data,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

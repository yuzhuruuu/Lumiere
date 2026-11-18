// app/api/staff/reservations/[id]/complete/route.js
// PATCH /api/staff/reservations/[id]/complete
// Staf/admin menandai reservasi selesai (check_in -> selesai).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
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

    if (current.status !== 'check_in') {
      return NextResponse.json(
        {
          error: `Reservasi hanya bisa diselesaikan dari status "check_in" (sekarang: "${current.status}")`,
        },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'selesai' })
      .eq('id', id)
      .select('id, reservation_code, status, updated_at')
      .single()

    if (error) {
      console.error('Complete reservation error:', error)
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Status reservasi sudah berubah. Muat ulang halaman.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal menyelesaikan reservasi' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Reservasi ditandai selesai',
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

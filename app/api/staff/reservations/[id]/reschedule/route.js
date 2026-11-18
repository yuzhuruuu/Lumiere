// app/api/staff/reservations/[id]/reschedule/route.js
// PATCH /api/staff/reservations/[id]/reschedule
// Staf/admin mengubah tanggal, jam, durasi, jumlah tamu, meja, atau catatan.
// Body boleh sebagian, contoh: { "start_time": "20:00", "guest_count": 6 }
//
// Database tetap memeriksa jam operasional, kapasitas, meja aktif, dan
// benturan jadwal (exclusion constraint) sehingga aman dari race condition.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { rescheduleReservationSchema } from '@/lib/validations/staff'
import { nowJakartaTime, todayJakarta } from '@/lib/utils/date'

const RESCHEDULABLE = ['menunggu_validasi', 'dikonfirmasi']

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = rescheduleReservationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('id, status, reservation_code, reservation_date, start_time')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!RESCHEDULABLE.includes(current.status)) {
      return NextResponse.json(
        {
          error: `Jadwal hanya bisa diubah sebelum check-in (sekarang: "${current.status}")`,
        },
        { status: 409 }
      )
    }

    const updates = { ...parsed.data }

    const effectiveDate = updates.reservation_date || current.reservation_date
    const effectiveTime = String(updates.start_time || current.start_time).slice(
      0,
      5
    )

    if (effectiveDate < todayJakarta()) {
      return NextResponse.json(
        { error: 'Tanggal reservasi tidak boleh di masa lalu.' },
        { status: 422 }
      )
    }

    if (
      effectiveDate === todayJakarta() &&
      effectiveTime <= nowJakartaTime()
    ) {
      return NextResponse.json(
        { error: 'Waktu reservasi hari ini sudah lewat. Pilih jam lain.' },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select(
        `
        id,
        reservation_code,
        reservation_date,
        start_time,
        duration_minutes,
        guest_count,
        status,
        notes,
        dining_tables ( id, code, capacity, area )
      `
      )
      .single()

    if (error) {
      console.error('Reschedule reservation error:', error)
      const message = error.message || ''

      if (error.code === '23P01') {
        return NextResponse.json(
          { error: 'Meja sudah dipakai pada jadwal tersebut. Pilih waktu atau meja lain.' },
          { status: 409 }
        )
      }
      if (error.code === '23514' && message.includes('melebihi kapasitas')) {
        return NextResponse.json(
          { error: 'Kapasitas meja tidak cukup untuk jumlah tamu tersebut.' },
          { status: 422 }
        )
      }
      if (
        error.code === '23514' &&
        (message.includes('jam operasional') || message.includes('Restoran tutup'))
      ) {
        return NextResponse.json(
          { error: 'Waktu reservasi di luar jam operasional restoran.' },
          { status: 422 }
        )
      }
      if (error.code === '23514' && message.includes('tidak aktif')) {
        return NextResponse.json(
          { error: 'Meja yang dipilih sedang tidak aktif.' },
          { status: 422 }
        )
      }
      if (error.code === '23514' || error.code === '22007' || error.code === '22008') {
        return NextResponse.json(
          { error: 'Jadwal atau meja tidak valid. Periksa kembali data reservasi.' },
          { status: 422 }
        )
      }
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak mengubah reservasi ini' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal mengubah jadwal reservasi' },
        { status: 500 }
      )
    }

    const { dining_tables, ...reservation } = data

    return NextResponse.json({
      message: 'Jadwal reservasi berhasil diperbarui',
      reservation: {
        ...reservation,
        table: dining_tables
          ? {
              id: dining_tables.id,
              code: dining_tables.code,
              capacity: dining_tables.capacity,
              area: dining_tables.area,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

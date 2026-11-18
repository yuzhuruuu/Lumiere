// app/api/staff/reservations/[id]/move-table/route.js
// PATCH /api/staff/reservations/[id]/move-table
// Staf/admin memindahkan reservasi aktif ke meja lain.
// Body: { "table_id": 9208 }
// Database tetap memeriksa kapasitas, jam operasional, dan benturan jadwal.

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const moveTableSchema = z.object({
  table_id: z.number().int().positive('ID meja tidak valid'),
})

const MOVABLE = ['menunggu_validasi', 'dikonfirmasi', 'check_in']

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = moveTableSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { data: current, error: currentError } = await supabase
      .from('reservations')
      .select('id, status, guest_count, table_id')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Reservasi tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!MOVABLE.includes(current.status)) {
      return NextResponse.json(
        {
          error: `Meja hanya bisa dipindah untuk reservasi aktif (sekarang: "${current.status}")`,
        },
        { status: 409 }
      )
    }

    if (current.table_id === parsed.data.table_id) {
      return NextResponse.json(
        { error: 'Reservasi sudah menggunakan meja tersebut' },
        { status: 400 }
      )
    }

    const { data: table, error: tableError } = await supabase
      .from('dining_tables')
      .select('id, code, capacity, area, is_active')
      .eq('id', parsed.data.table_id)
      .single()

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Meja tidak ditemukan' },
        { status: 404 }
      )
    }

    if (!table.is_active) {
      return NextResponse.json(
        { error: 'Meja sedang tidak aktif' },
        { status: 409 }
      )
    }

    if (table.capacity < current.guest_count) {
      return NextResponse.json(
        {
          error: `Kapasitas meja ${table.code} (${table.capacity}) kurang dari jumlah tamu (${current.guest_count})`,
        },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('reservations')
      .update({ table_id: parsed.data.table_id })
      .eq('id', id)
      .select('id, reservation_code, status, table_id')
      .single()

    if (error) {
      console.error('Move table error:', error)
      if (error.code === '23P01') {
        return NextResponse.json(
          { error: 'Meja tujuan sudah dipakai pada jam tersebut' },
          { status: 409 }
        )
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: error.message || 'Perpindahan meja melanggar aturan reservasi' },
          { status: 422 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal memindahkan meja' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Reservasi dipindah ke meja ${table.code}`,
      reservation: data,
      table: {
        id: table.id,
        code: table.code,
        capacity: table.capacity,
        area: table.area,
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

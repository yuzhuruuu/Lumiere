// app/api/admin/operating-hours/route.js
// GET /api/admin/operating-hours  → 7 baris jam operasional
// PUT /api/admin/operating-hours  → ubah sekaligus (upsert per hari)
// Body: array of { day_of_week, open_time, close_time, is_closed }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { operatingHoursBulkSchema } from '@/lib/validations/admin'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('operating_hours')
    .select('id, day_of_week, open_time, close_time, is_closed')
    .order('day_of_week')

  if (error) {
    console.error('Admin fetch operating hours error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil jam operasional' },
      { status: 500 }
    )
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  return NextResponse.json({
    operating_hours: data.map((h) => ({
      ...h,
      day_name: dayNames[h.day_of_week],
    })),
    total: data.length,
  })
}

export async function PUT(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = operatingHoursBulkSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  // Upsert berdasarkan day_of_week (UNIQUE)
  const { data, error } = await supabase
    .from('operating_hours')
    .upsert(
      parsed.data.map((row) => ({
        day_of_week: row.day_of_week,
        open_time: row.open_time,
        close_time: row.close_time,
        is_closed: row.is_closed,
      })),
      { onConflict: 'day_of_week' }
    )
    .select('id, day_of_week, open_time, close_time, is_closed')

  if (error) {
    console.error('Admin update operating hours error:', error)
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'Jam tutup harus lebih besar dari jam buka' },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menyimpan jam operasional' },
      { status: 500 }
    )
  }

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  return NextResponse.json({
    message: 'Jam operasional berhasil disimpan',
    operating_hours: data
      .map((h) => ({ ...h, day_name: dayNames[h.day_of_week] }))
      .sort((a, b) => a.day_of_week - b.day_of_week),
  })
}

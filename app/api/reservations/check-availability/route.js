// app/api/reservations/check-availability/route.js
// POST /api/reservations/check-availability
// Cek ketersediaan meja berdasarkan tanggal, waktu, durasi, dan jumlah tamu.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { checkAvailabilitySchema } from '@/lib/validations/reservation'
import { nowJakartaTime, todayJakarta } from '@/lib/utils/date'
import {
  addMinutesToTime,
  dayOfWeekForDate,
  formatMinutesAsTime,
  getConflictingTableIds,
  isWithinOperatingHours,
} from '@/lib/utils/availability'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const BLOCKING_STATUSES = ['menunggu_validasi', 'dikonfirmasi', 'check_in']

function timeLabel(value) {
  return String(value || '').slice(0, 5)
}

export async function POST(request) {
  const supabase = await createClient()

  try {
    // Ketersediaan adalah bagian dari alur reservasi pelanggan. Wajib login
    // supaya endpoint tidak bisa dipakai anonim untuk memancing data.
    const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
    if (auth.error) return auth.error

    const body = await request.json().catch(() => null)
    const parsed = checkAvailabilitySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { reservation_date, start_time, duration_minutes, guest_count } =
      parsed.data
    const today = todayJakarta()

    if (reservation_date < today) {
      return NextResponse.json(
        { error: 'Tanggal reservasi tidak boleh di masa lalu.' },
        { status: 400 }
      )
    }

    if (reservation_date === today && start_time <= nowJakartaTime()) {
      return NextResponse.json(
        { error: 'Waktu reservasi hari ini sudah lewat. Pilih jam lain.' },
        { status: 400 }
      )
    }

    const endMinutes = addMinutesToTime(start_time, duration_minutes)
    const end_time = formatMinutesAsTime(endMinutes)
    const ends_next_day = endMinutes > 24 * 60

    const query = {
      date: reservation_date,
      start_time,
      end_time,
      ends_next_day,
      duration_minutes,
      guest_count,
    }

    // Periksa jam operasional lebih dulu supaya UI bisa menjelaskan bahwa
    // restoran tutup, bukan sekadar menampilkan daftar meja kosong.
    const { data: hours, error: hoursError } = await supabase
      .from('operating_hours')
      .select('open_time, close_time, is_closed')
      .eq('day_of_week', dayOfWeekForDate(reservation_date))
      .maybeSingle()

    if (hoursError) {
      console.error('Error fetching operating hours:', hoursError)
      return NextResponse.json(
        { error: 'Gagal memeriksa jam operasional' },
        { status: 500 }
      )
    }

    const isOpen =
      hours &&
      isWithinOperatingHours(
        start_time,
        duration_minutes,
        hours.open_time,
        hours.close_time,
        hours.is_closed
      )

    if (!isOpen) {
      const message = !hours || hours.is_closed
        ? 'Restoran tutup pada tanggal tersebut.'
        : `Waktu reservasi di luar jam operasional (${timeLabel(hours.open_time)}–${timeLabel(hours.close_time)}).`

      return NextResponse.json({
        is_open: false,
        available_tables: [],
        grouped_by_area: {},
        total_available: 0,
        message,
        query,
      })
    }

    // Ambil semua meja aktif yang cukup kapasitas.
    const { data: allTables, error: tablesError } = await supabase
      .from('dining_tables')
      .select('id, code, capacity, area')
      .gte('capacity', guest_count)
      .eq('is_active', true)
      .order('capacity')

    if (tablesError) {
      console.error('Error fetching tables:', tablesError)
      return NextResponse.json(
        { error: 'Gagal mengambil data meja' },
        { status: 500 }
      )
    }

    if (!allTables || allTables.length === 0) {
      return NextResponse.json({
        is_open: true,
        available_tables: [],
        grouped_by_area: {},
        total_available: 0,
        message: `Tidak ada meja dengan kapasitas minimal ${guest_count} orang.`,
        query,
      })
    }

    // RLS reservations hanya memperlihatkan reservasi milik pelanggan yang
    // sedang login. Untuk menghitung benturan lintas pelanggan, query agregat
    // ini memakai admin client. Hanya table_id/start_time/duration yang dibaca
    // dan tidak ada data pelanggan yang dikembalikan ke client.
    const admin = getSupabaseAdmin()
    const { data: bookings, error: bookingError } = await admin
      .from('reservations')
      .select('table_id, start_time, duration_minutes')
      .eq('reservation_date', reservation_date)
      .in('status', BLOCKING_STATUSES)

    if (bookingError) {
      console.error('Error checking bookings:', bookingError)
      return NextResponse.json(
        { error: 'Gagal memeriksa ketersediaan' },
        { status: 500 }
      )
    }

    const bookedTableIds = getConflictingTableIds(
      bookings,
      start_time,
      duration_minutes
    )
    const availableTables = allTables.filter(
      (table) => !bookedTableIds.has(table.id)
    )

    const groupedByArea = availableTables.reduce((groups, table) => {
      const area = table.area || 'Lainnya'
      if (!groups[area]) groups[area] = []
      groups[area].push(table)
      return groups
    }, {})

    return NextResponse.json({
      is_open: true,
      available_tables: availableTables,
      grouped_by_area: groupedByArea,
      total_available: availableTables.length,
      operating_hours: {
        open_time: timeLabel(hours.open_time),
        close_time: timeLabel(hours.close_time),
      },
      query,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

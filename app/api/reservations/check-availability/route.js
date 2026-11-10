// app/api/reservations/check-availability/route.js
// POST /api/reservations/check-availability
// Cek ketersediaan meja berdasarkan tanggal, waktu, durasi, dan jumlah tamu

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAvailabilitySchema } from '@/lib/validations/reservation'

export async function POST(request) {
  const supabase = await createClient()
  
  try {
    const body = await request.json()
    
    // Validasi input
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
    
    const { reservation_date, start_time, duration_minutes, guest_count } = parsed.data
    
    // Validasi tanggal tidak boleh masa lalu
    const today = new Date().toISOString().split('T')[0]
    if (reservation_date < today) {
      return NextResponse.json(
        { error: 'Tanggal reservasi tidak boleh di masa lalu' },
        { status: 400 }
      )
    }
    
    // Hitung end_time
    const [hours, minutes] = start_time.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const endMinutes = startMinutes + duration_minutes
    const endHours = Math.floor(endMinutes / 60)
    const endMins = endMinutes % 60
    const end_time = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
    
    // Ambil semua meja yang sesuai kapasitas dan aktif
    const { data: allTables, error: tablesError } = await supabase
      .from('dining_tables')
      .select('id, code, capacity, area, is_active')
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
    
    if (allTables.length === 0) {
      return NextResponse.json({
        available_tables: [],
        message: `Tidak ada meja dengan kapasitas minimal ${guest_count} orang`,
      })
    }
    
    // Cek meja yang sudah dibooking pada waktu yang bentrok
    // Status yang memblokir meja: menunggu_validasi, dikonfirmasi, check_in
    const { data: bookedReservations, error: bookingError } = await supabase
      .from('reservations')
      .select('table_id')
      .eq('reservation_date', reservation_date)
      .in('status', ['menunggu_validasi', 'dikonfirmasi', 'check_in'])
    
    if (bookingError) {
      console.error('Error checking bookings:', bookingError)
      return NextResponse.json(
        { error: 'Gagal memeriksa ketersediaan' },
        { status: 500 }
      )
    }
    
    // Untuk setiap meja yang di-book, cek apakah waktunya bentrok
    const bookedTableIds = new Set()
    
    for (const booking of bookedReservations) {
      // Ambil detail reservasi untuk cek waktu
      const { data: reservation } = await supabase
        .from('reservations')
        .select('table_id, start_time, duration_minutes')
        .eq('table_id', booking.table_id)
        .eq('reservation_date', reservation_date)
        .in('status', ['menunggu_validasi', 'dikonfirmasi', 'check_in'])
        .single()
      
      if (reservation) {
        const [bookHours, bookMinutes] = reservation.start_time.split(':').map(Number)
        const bookStartMinutes = bookHours * 60 + bookMinutes
        const bookEndMinutes = bookStartMinutes + reservation.duration_minutes
        
        // Cek apakah ada overlap waktu
        const hasOverlap = (
          (startMinutes < bookEndMinutes && endMinutes > bookStartMinutes)
        )
        
        if (hasOverlap) {
          bookedTableIds.add(reservation.table_id)
        }
      }
    }
    
    // Filter meja yang available (tidak terblokir)
    const availableTables = allTables.filter(table => !bookedTableIds.has(table.id))
    
    // Group by area
    const groupedByArea = availableTables.reduce((acc, table) => {
      if (!acc[table.area]) {
        acc[table.area] = []
      }
      acc[table.area].push(table)
      return acc
    }, {})
    
    return NextResponse.json({
      available_tables: availableTables,
      grouped_by_area: groupedByArea,
      total_available: availableTables.length,
      query: {
        date: reservation_date,
        start_time,
        end_time,
        duration_minutes,
        guest_count,
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

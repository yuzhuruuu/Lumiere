// app/api/reservations/route.js
// POST /api/reservations - Buat reservasi baru
// GET /api/reservations - Riwayat reservasi user

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReservationSchema } from '@/lib/validations/reservation'

// POST - Buat reservasi baru
export async function POST(request) {
  const supabase = await createClient()
  
  try {
    // 1. Cek login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }
    
    // 2. Validasi input
    const body = await request.json()
    const parsed = createReservationSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }
    
    const {
      contact_name,
      contact_phone,
      contact_email,
      reservation_date,
      start_time,
      duration_minutes,
      guest_count,
      table_id,
      items,
      notes,
    } = parsed.data
    
    // 3. Validasi tanggal tidak boleh masa lalu
    const today = new Date().toISOString().split('T')[0]
    if (reservation_date < today) {
      return NextResponse.json(
        { error: 'Tanggal reservasi tidak boleh di masa lalu' },
        { status: 400 }
      )
    }
    
    // 4. Panggil RPC create_reservation
    // RPC ini akan handle:
    // - Insert reservasi + items dalam satu transaksi
    // - Cek minimum pembelian (Rp300k)
    // - Cek kapasitas meja
    // - Cek bentrokan jadwal
    // - Auto-generate reservation_code
    const { data, error } = await supabase.rpc('create_reservation', {
      p_contact_name: contact_name,
      p_contact_phone: contact_phone,
      p_contact_email: contact_email,
      p_reservation_date: reservation_date,
      p_start_time: start_time,
      p_duration_minutes: duration_minutes,
      p_guest_count: guest_count,
      p_table_id: table_id,
      p_items: items,
      p_notes: notes || null,
    })
    
    if (error) {
      console.error('create_reservation error:', error)
      
      // Terjemahkan error PostgreSQL ke pesan ramah
      if (error.code === '23P01') {
        return NextResponse.json(
          { error: 'Meja sudah dipesan pada jadwal tersebut. Silakan pilih meja atau waktu lain.' },
          { status: 409 }
        )
      }
      
      if (error.code === '23514' || error.message?.includes('minimum')) {
        return NextResponse.json(
          { error: 'Total pembelian belum mencapai minimum Rp300.000. Silakan tambah menu.' },
          { status: 422 }
        )
      }
      
      if (error.code === '23514' || error.message?.includes('capacity')) {
        return NextResponse.json(
          { error: 'Kapasitas meja tidak cukup untuk jumlah tamu tersebut.' },
          { status: 422 }
        )
      }
      
      if (error.message?.includes('outside operating hours')) {
        return NextResponse.json(
          { error: 'Waktu reservasi di luar jam operasional restoran.' },
          { status: 422 }
        )
      }
      
      // Error umum
      return NextResponse.json(
        { error: 'Gagal membuat reservasi. Silakan coba lagi.' },
        { status: 500 }
      )
    }
    
    // 5. Return data reservasi yang berhasil dibuat
    return NextResponse.json(
      {
        message: 'Reservasi berhasil dibuat',
        reservation: data,
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

// GET - Riwayat reservasi user
export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  
  try {
    // 1. Cek login
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      )
    }
    
    // 2. Cek role user
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Profil tidak ditemukan' },
        { status: 404 }
      )
    }
    
    // 3. Query parameters
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // 4. Build query
    let query = supabase
      .from('reservations')
      .select(`
        id,
        reservation_code,
        contact_name,
        reservation_date,
        start_time,
        duration_minutes,
        guest_count,
        status,
        notes,
        created_at,
        dining_tables (
          id,
          code,
          capacity,
          area
        )
      `)
    
    // Pelanggan hanya lihat reservasi sendiri
    // Staf dan admin bisa lihat semua
    if (profile.role === 'pelanggan') {
      query = query.eq('customer_id', user.id)
    }
    
    // Filter by status (optional)
    if (status) {
      query = query.eq('status', status)
    }
    
    // Pagination
    query = query
      .order('reservation_date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1)
    
    const { data, error, count } = await query
    
    if (error) {
      console.error('Error fetching reservations:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data reservasi' },
        { status: 500 }
      )
    }
    
    // 5. Format response
    const formattedData = data.map(reservation => ({
      id: reservation.id,
      reservation_code: reservation.reservation_code,
      contact_name: reservation.contact_name,
      reservation_date: reservation.reservation_date,
      start_time: reservation.start_time,
      duration_minutes: reservation.duration_minutes,
      guest_count: reservation.guest_count,
      status: reservation.status,
      notes: reservation.notes,
      created_at: reservation.created_at,
      table: {
        id: reservation.dining_tables.id,
        code: reservation.dining_tables.code,
        capacity: reservation.dining_tables.capacity,
        area: reservation.dining_tables.area,
      },
    }))
    
    return NextResponse.json({
      reservations: formattedData,
      total: formattedData.length,
      pagination: {
        limit,
        offset,
        has_more: formattedData.length === limit,
      },
      filters: {
        status,
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

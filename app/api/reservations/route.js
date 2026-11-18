// app/api/reservations/route.js
// POST /api/reservations - Buat reservasi baru
// GET /api/reservations - Riwayat reservasi user

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReservationSchema } from '@/lib/validations/reservation'
import { requireRole } from '@/lib/auth/require-role'
import { todayJakarta } from '@/lib/utils/date'
import { calculateBill } from '@/lib/utils/bill'

const ALLOWED_STATUS = [
  'menunggu_validasi',
  'dikonfirmasi',
  'check_in',
  'selesai',
  'ditolak',
  'dibatalkan',
  'tidak_hadir',
]

// POST - Buat reservasi baru
export async function POST(request) {
  const supabase = await createClient()
  
  try {
    // 1. Cek login + role (hanya pelanggan; RLS juga membatasi)
    const auth = await requireRole(supabase, ['pelanggan'])
    if (auth.error) return auth.error
    
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
    
    // 3. Validasi tanggal tidak boleh masa lalu (zona waktu WIB)
    const today = todayJakarta()
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
      
      const message = error.message || ''
      
      // Terjemahkan error PostgreSQL ke pesan ramah.
      // Urutan penting: jangan menebak dari kode saja, karena banyak aturan
      // memakai kode 23514 dengan pesan berbeda.
      if (error.code === '23P01') {
        return NextResponse.json(
          { error: 'Meja sudah dipesan pada jadwal tersebut. Silakan pilih meja atau waktu lain.' },
          { status: 409 }
        )
      }
      
      if (message.includes('minimal pembelian')) {
        return NextResponse.json(
          { error: 'Total pembelian belum mencapai minimum. Silakan tambah menu.' },
          { status: 422 }
        )
      }
      
      if (message.includes('melebihi kapasitas')) {
        return NextResponse.json(
          { error: 'Kapasitas meja tidak cukup untuk jumlah tamu tersebut.' },
          { status: 422 }
        )
      }
      
      if (message.includes('jam operasional') || message.includes('Restoran tutup')) {
        return NextResponse.json(
          { error: 'Waktu reservasi di luar jam operasional restoran.' },
          { status: 422 }
        )
      }
      
      if (message.includes('masa lalu')) {
        return NextResponse.json(
          { error: 'Tanggal reservasi tidak boleh di masa lalu.' },
          { status: 422 }
        )
      }
      
      if (message.includes('Pilih minimal satu menu')) {
        return NextResponse.json(
          { error: 'Pilih minimal satu menu untuk reservasi.' },
          { status: 422 }
        )
      }
      
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Hanya pelanggan yang dapat membuat reservasi.' },
          { status: 403 }
        )
      }
      
      // Error umum
      return NextResponse.json(
        { error: 'Gagal membuat reservasi. Silakan coba lagi.' },
        { status: 500 }
      )
    }
    
    // 5. Hitung rincian tagihan dari item yang benar-benar tersimpan di database.
    //    Subtotal sudah dihitung trigger dari harga menu, bukan dari client.
    const [{ data: createdItems }, { data: billConfig }] = await Promise.all([
      supabase
        .from('reservation_items')
        .select('subtotal')
        .eq('reservation_id', data.id),
      supabase
        .from('restaurant_profile')
        .select('tax_percentage, dp_percentage')
        .eq('id', 1)
        .single(),
    ])

    const subtotal = (createdItems || []).reduce(
      (acc, item) => acc + parseFloat(item.subtotal),
      0
    )
    const bill = calculateBill(
      subtotal,
      billConfig?.tax_percentage ?? 10,
      billConfig?.dp_percentage ?? 50
    )

    // 6. Return data reservasi yang berhasil dibuat
    return NextResponse.json(
      {
        message: 'Reservasi berhasil dibuat',
        reservation: data,
        bill: {
          source: 'estimate',
          ...bill,
        },
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
    // 1. Cek login + status akun (semua role boleh membaca sesuai RLS)
    const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
    if (auth.error) return auth.error
    
    // 2. Query parameters
    const status = searchParams.get('status')
    if (status && !ALLOWED_STATUS.includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid', allowed: ALLOWED_STATUS },
        { status: 400 }
      )
    }
    
    const parsedLimit = parseInt(searchParams.get('limit') || '20', 10)
    const parsedOffset = parseInt(searchParams.get('offset') || '0', 10)
    const limit = Number.isInteger(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20
    const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0
    
    // 3. Build query
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
      `, { count: 'exact' })
    
    // Pelanggan hanya lihat reservasi sendiri
    // Staf dan admin bisa lihat semua
    if (auth.profile.role === 'pelanggan') {
      query = query.eq('customer_id', auth.user.id)
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
    
    // 4. Format response
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
      table: reservation.dining_tables
        ? {
            id: reservation.dining_tables.id,
            code: reservation.dining_tables.code,
            capacity: reservation.dining_tables.capacity,
            area: reservation.dining_tables.area,
          }
        : null,
    }))
    
    return NextResponse.json({
      reservations: formattedData,
      total: count ?? formattedData.length,
      pagination: {
        limit,
        offset,
        has_more: offset + formattedData.length < (count ?? 0),
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

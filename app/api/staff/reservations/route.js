// app/api/staff/reservations/route.js
// GET /api/staff/reservations
// Daftar semua reservasi untuk staf/admin, dengan filter & pagination.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { sanitizeSearch } from '@/lib/utils/search'

const ALLOWED_STATUS = [
  'menunggu_validasi',
  'dikonfirmasi',
  'check_in',
  'selesai',
  'ditolak',
  'dibatalkan',
  'tidak_hadir',
]

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  // Filter
  const status = searchParams.get('status')
  if (status && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: 'Status tidak valid', allowed: ALLOWED_STATUS },
      { status: 400 }
    )
  }

  const date = searchParams.get('date') // YYYY-MM-DD
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Format tanggal harus YYYY-MM-DD' },
      { status: 400 }
    )
  }

  const search = sanitizeSearch(searchParams.get('search')) // kode / nama / telepon
  const parsedLimit = parseInt(searchParams.get('limit') || '20', 10)
  const parsedOffset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 20
  const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0

  try {
    let query = supabase
      .from('reservations')
      .select(
        `
        id,
        reservation_code,
        contact_name,
        contact_phone,
        reservation_date,
        start_time,
        duration_minutes,
        guest_count,
        status,
        created_at,
        dining_tables ( id, code, capacity, area ),
        invoices ( invoice_number, payment_status, total_amount )
      `,
        { count: 'exact' }
      )

    if (status) query = query.eq('status', status)
    if (date) query = query.eq('reservation_date', date)
    if (search) {
      query = query.or(
        `reservation_code.ilike.%${search}%,contact_name.ilike.%${search}%,contact_phone.ilike.%${search}%`
      )
    }

    // Yang paling mendesak di atas: tanggal terdekat, lalu jam
    query = query
      .order('reservation_date', { ascending: true })
      .order('start_time', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching staff reservations:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data reservasi' },
        { status: 500 }
      )
    }

    const reservations = data.map((r) => {
      const invoice = Array.isArray(r.invoices) ? r.invoices[0] : r.invoices
      return {
        id: r.id,
        reservation_code: r.reservation_code,
        contact_name: r.contact_name,
        contact_phone: r.contact_phone,
        reservation_date: r.reservation_date,
        start_time: r.start_time,
        duration_minutes: r.duration_minutes,
        guest_count: r.guest_count,
        status: r.status,
        table: r.dining_tables
          ? {
              id: r.dining_tables.id,
              code: r.dining_tables.code,
              capacity: r.dining_tables.capacity,
              area: r.dining_tables.area,
            }
          : null,
        invoice: invoice
          ? {
              invoice_number: invoice.invoice_number,
              payment_status: invoice.payment_status,
              total_amount: parseFloat(invoice.total_amount),
            }
          : null,
        created_at: r.created_at,
      }
    })

    return NextResponse.json({
      reservations,
      total: count ?? reservations.length,
      pagination: { limit, offset, has_more: offset + reservations.length < (count ?? 0) },
      filters: { status, date, search },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

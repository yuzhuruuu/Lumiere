// app/api/staff/orders/route.js
// GET /api/staff/orders?status=menunggu
// Daftar pesanan (order dapur) untuk staf/admin.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const ALLOWED_STATUS = ['menunggu', 'disiapkan', 'disajikan', 'selesai', 'dibatalkan']

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  const status = searchParams.get('status')
  if (status && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: 'Status tidak valid', allowed: ALLOWED_STATUS },
      { status: 400 }
    )
  }

  try {
    let query = supabase
      .from('orders')
      .select(
        `
        id,
        reservation_id,
        status,
        notes,
        created_at,
        updated_at,
        reservations (
          id,
          reservation_code,
          contact_name,
          reservation_date,
          start_time,
          guest_count,
          status,
          dining_tables ( code, area )
        )
      `
      )
      .order('created_at', { ascending: true })
      .limit(100)

    if (status) query = query.eq('status', status)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data pesanan' },
        { status: 500 }
      )
    }

    const orders = data.map((o) => ({
      id: o.id,
      reservation_id: o.reservation_id,
      status: o.status,
      notes: o.notes,
      created_at: o.created_at,
      updated_at: o.updated_at,
      reservation: o.reservations
        ? {
            id: o.reservations.id,
            reservation_code: o.reservations.reservation_code,
            contact_name: o.reservations.contact_name,
            reservation_date: o.reservations.reservation_date,
            start_time: o.reservations.start_time,
            guest_count: o.reservations.guest_count,
            status: o.reservations.status,
            table: o.reservations.dining_tables
              ? {
                  code: o.reservations.dining_tables.code,
                  area: o.reservations.dining_tables.area,
                }
              : null,
          }
        : null,
    }))

    return NextResponse.json({ orders, total: orders.length, filters: { status } })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

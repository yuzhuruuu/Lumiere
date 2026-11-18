// app/api/staff/invoices/route.js
// GET /api/staff/invoices?payment_status=belum_dibayar&limit=20&offset=0
// Daftar tagihan untuk staf/admin, lengkap dengan ringkasan pembayaran.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const ALLOWED_PAYMENT_STATUS = [
  'belum_dibayar',
  'dp_dibayar',
  'lunas',
  'dibatalkan',
]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  const paymentStatus = searchParams.get('payment_status')
  if (paymentStatus && !ALLOWED_PAYMENT_STATUS.includes(paymentStatus)) {
    return NextResponse.json(
      {
        error: 'Status pembayaran tidak valid',
        allowed: ALLOWED_PAYMENT_STATUS,
      },
      { status: 400 }
    )
  }

  const reservationId = searchParams.get('reservation_id')
  if (reservationId && !UUID_REGEX.test(reservationId)) {
    return NextResponse.json(
      { error: 'reservation_id tidak valid' },
      { status: 400 }
    )
  }

  const search = (searchParams.get('search') || '').trim().slice(0, 100)

  const parsedLimit = parseInt(searchParams.get('limit') || '20', 10)
  const parsedOffset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 20
  const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0

  try {
    let query = supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        reservation_id,
        subtotal,
        tax_amount,
        total_amount,
        dp_amount,
        payment_status,
        issued_at,
        reservations (
          id,
          reservation_code,
          contact_name,
          contact_phone,
          reservation_date,
          start_time,
          status,
          dining_tables ( code, area )
        ),
        payments ( amount, status )
      `,
        { count: 'exact' }
      )
      .order('issued_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (paymentStatus) query = query.eq('payment_status', paymentStatus)
    if (reservationId) query = query.eq('reservation_id', reservationId)
    if (search) query = query.ilike('invoice_number', `%${search}%`)

    const { data, error, count } = await query

    if (error) {
      console.error('Staff fetch invoices error:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data tagihan' },
        { status: 500 }
      )
    }

    const invoices = data.map((inv) => {
      const payments = Array.isArray(inv.payments) ? inv.payments : []
      const paidAmount = payments
        .filter((p) => p.status === 'berhasil')
        .reduce((acc, p) => acc + parseFloat(p.amount), 0)

      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        reservation_id: inv.reservation_id,
        subtotal: parseFloat(inv.subtotal),
        tax_amount: parseFloat(inv.tax_amount),
        total_amount: parseFloat(inv.total_amount),
        dp_amount: parseFloat(inv.dp_amount),
        paid_amount: paidAmount,
        remaining_amount: Math.max(parseFloat(inv.total_amount) - paidAmount, 0),
        payment_status: inv.payment_status,
        issued_at: inv.issued_at,
        reservation: inv.reservations
          ? {
              id: inv.reservations.id,
              reservation_code: inv.reservations.reservation_code,
              contact_name: inv.reservations.contact_name,
              contact_phone: inv.reservations.contact_phone,
              reservation_date: inv.reservations.reservation_date,
              start_time: inv.reservations.start_time,
              status: inv.reservations.status,
              table: inv.reservations.dining_tables
                ? {
                    code: inv.reservations.dining_tables.code,
                    area: inv.reservations.dining_tables.area,
                  }
                : null,
            }
          : null,
      }
    })

    return NextResponse.json({
      invoices,
      total: count ?? invoices.length,
      pagination: {
        limit,
        offset,
        has_more: offset + invoices.length < (count ?? 0),
      },
      filters: { payment_status: paymentStatus, reservation_id: reservationId, search },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

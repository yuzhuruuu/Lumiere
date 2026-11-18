// app/api/staff/invoices/[id]/route.js
// GET /api/staff/invoices/[id]
// Detail tagihan + reservasi + rincian item + seluruh pembayaran.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const { data: invoice, error } = await supabase
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
        updated_at,
        reservations (
          id,
          reservation_code,
          contact_name,
          contact_phone,
          contact_email,
          reservation_date,
          start_time,
          duration_minutes,
          guest_count,
          status,
          dining_tables ( id, code, capacity, area ),
          reservation_items (
            id,
            menu_item_id,
            quantity,
            unit_price,
            subtotal,
            menu_items ( id, name )
          )
        ),
        payments (
          id,
          type,
          method,
          amount,
          status,
          reference_no,
          paid_at,
          created_at
        )
      `
      )
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tagihan tidak ditemukan' },
          { status: 404 }
        )
      }
      console.error('Staff fetch invoice detail error:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil detail tagihan' },
        { status: 500 }
      )
    }

    const payments = (invoice.payments || [])
      .map((p) => ({
        id: p.id,
        type: p.type,
        method: p.method,
        amount: parseFloat(p.amount),
        status: p.status,
        reference_no: p.reference_no,
        paid_at: p.paid_at,
        created_at: p.created_at,
      }))
      .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))

    const paidAmount = payments
      .filter((p) => p.status === 'berhasil')
      .reduce((acc, p) => acc + p.amount, 0)

    const reservation = invoice.reservations
    const items = reservation?.reservation_items || []

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        reservation_id: invoice.reservation_id,
        subtotal: parseFloat(invoice.subtotal),
        tax_amount: parseFloat(invoice.tax_amount),
        total_amount: parseFloat(invoice.total_amount),
        dp_amount: parseFloat(invoice.dp_amount),
        paid_amount: paidAmount,
        remaining_amount: Math.max(parseFloat(invoice.total_amount) - paidAmount, 0),
        payment_status: invoice.payment_status,
        issued_at: invoice.issued_at,
        updated_at: invoice.updated_at,
      },
      reservation: reservation
        ? {
            id: reservation.id,
            reservation_code: reservation.reservation_code,
            contact_name: reservation.contact_name,
            contact_phone: reservation.contact_phone,
            contact_email: reservation.contact_email,
            reservation_date: reservation.reservation_date,
            start_time: reservation.start_time,
            duration_minutes: reservation.duration_minutes,
            guest_count: reservation.guest_count,
            status: reservation.status,
            table: reservation.dining_tables
              ? {
                  id: reservation.dining_tables.id,
                  code: reservation.dining_tables.code,
                  capacity: reservation.dining_tables.capacity,
                  area: reservation.dining_tables.area,
                }
              : null,
            items: items.map((item) => ({
              id: item.id,
              menu_item_id: item.menu_item_id,
              name: item.menu_items?.name ?? null,
              quantity: item.quantity,
              unit_price: parseFloat(item.unit_price),
              subtotal: parseFloat(item.subtotal),
            })),
          }
        : null,
      payments,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

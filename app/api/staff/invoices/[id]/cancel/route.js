// app/api/staff/invoices/[id]/cancel/route.js
// PATCH /api/staff/invoices/[id]/cancel
// Membatalkan tagihan yang belum dibayar, hanya setelah reservasinya
// dibatalkan atau tamu tidak hadir. Tagihan yang sudah dibayar (DP/lunas)
// tidak bisa dibatalkan lewat API — harus proses refund manual.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        payment_status,
        total_amount,
        reservation_id,
        reservations ( id, status, reservation_code )
      `
      )
      .eq('id', id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Tagihan tidak ditemukan' },
        { status: 404 }
      )
    }

    if (invoice.payment_status === 'dibatalkan') {
      return NextResponse.json(
        { error: 'Tagihan ini sudah dibatalkan' },
        { status: 409 }
      )
    }

    if (invoice.payment_status === 'dp_dibayar' || invoice.payment_status === 'lunas') {
      return NextResponse.json(
        {
          error:
            'Tagihan sudah memiliki pembayaran. Proses refund secara manual sebelum membatalkan tagihan.',
        },
        { status: 409 }
      )
    }

    const reservationStatus = invoice.reservations?.status
    if (!['dibatalkan', 'tidak_hadir'].includes(reservationStatus)) {
      return NextResponse.json(
        {
          error:
            'Tagihan hanya bisa dibatalkan jika reservasi sudah dibatalkan atau tamu tidak hadir.',
        },
        { status: 409 }
      )
    }

    // Defensif: pastikan tidak ada pembayaran berhasil/menunggu
    const { data: existingPayments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('invoice_id', id)
      .in('status', ['berhasil', 'menunggu'])
      .limit(1)

    if (paymentsError) {
      console.error('Check invoice payments error:', paymentsError)
      return NextResponse.json(
        { error: 'Gagal memeriksa pembayaran tagihan' },
        { status: 500 }
      )
    }

    if (existingPayments && existingPayments.length > 0) {
      return NextResponse.json(
        {
          error:
            'Masih ada pembayaran berhasil/menunggu pada tagihan ini. Selesaikan atau refund terlebih dahulu.',
        },
        { status: 409 }
      )
    }

    // Syarat payment_status di WHERE mencegah race condition dengan pembayaran baru
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({ payment_status: 'dibatalkan' })
      .eq('id', id)
      .eq('payment_status', 'belum_dibayar')
      .select('id, invoice_number, payment_status, updated_at')
      .single()

    if (updateError) {
      console.error('Cancel invoice error:', updateError)
      if (updateError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Status tagihan sudah berubah. Muat ulang halaman.' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal membatalkan tagihan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Tagihan berhasil dibatalkan',
      invoice: updated,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

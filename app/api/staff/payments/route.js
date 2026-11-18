// app/api/staff/payments/route.js
// GET  /api/staff/payments?invoice_id=...  → daftar pembayaran
// POST /api/staff/payments                 → catat pembayaran (DP/pelunasan)
// Status invoice (belum_dibayar/dp_dibayar/lunas) diperbarui otomatis
// oleh trigger sync_invoice_payment_status.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { createPaymentSchema } from '@/lib/validations/staff'

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  const invoiceId = searchParams.get('invoice_id')

  try {
    let query = supabase
      .from('payments')
      .select(
        `
        id,
        invoice_id,
        type,
        method,
        amount,
        status,
        reference_no,
        paid_at,
        created_at,
        invoices ( invoice_number, payment_status, total_amount )
      `
      )
      .order('paid_at', { ascending: false })
      .limit(50)

    if (invoiceId) query = query.eq('invoice_id', invoiceId)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil data pembayaran' },
        { status: 500 }
      )
    }

    const payments = data.map((p) => ({
      id: p.id,
      invoice_id: p.invoice_id,
      invoice_number: p.invoices?.invoice_number ?? null,
      invoice_payment_status: p.invoices?.payment_status ?? null,
      type: p.type,
      method: p.method,
      amount: parseFloat(p.amount),
      status: p.status,
      reference_no: p.reference_no,
      paid_at: p.paid_at,
      created_at: p.created_at,
    }))

    return NextResponse.json({ payments, total: payments.length })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = createPaymentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const d = parsed.data

    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: d.invoice_id,
        type: d.type,
        method: d.method,
        amount: d.amount,
        status: d.status,
        reference_no: d.reference_no || null,
        idempotency_key: d.idempotency_key,
        paid_at: new Date().toISOString(),
        recorded_by: auth.profile.id,
      })
      .select(
        'id, invoice_id, type, method, amount, status, reference_no, paid_at'
      )
      .single()

    if (error) {
      console.error('Create payment error:', error)

      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Pembayaran ini sudah pernah dicatat (idempotency key ganda)' },
          { status: 409 }
        )
      }
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Invoice tidak ditemukan' },
          { status: 404 }
        )
      }
      if (error.code === '23514') {
        return NextResponse.json(
          { error: 'Jumlah pembayaran melebihi sisa tagihan atau tidak valid' },
          { status: 422 }
        )
      }
      if (error.code === '42501') {
        return NextResponse.json(
          { error: 'Anda tidak berhak mencatat pembayaran' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: 'Gagal mencatat pembayaran' },
        { status: 500 }
      )
    }

    // Ambil status invoice terbaru setelah trigger berjalan
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, invoice_number, payment_status, total_amount')
      .eq('id', d.invoice_id)
      .single()

    return NextResponse.json(
      {
        message: 'Pembayaran berhasil dicatat',
        payment: {
          ...data,
          amount: parseFloat(data.amount),
        },
        invoice: invoice
          ? {
              ...invoice,
              total_amount: parseFloat(invoice.total_amount),
            }
          : null,
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

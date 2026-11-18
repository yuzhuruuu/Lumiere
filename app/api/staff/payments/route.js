// app/api/staff/payments/route.js
// GET  /api/staff/payments?invoice_id=...  → daftar pembayaran
// POST /api/staff/payments                 → catat pembayaran (DP/pelunasan)
// Status invoice (belum_dibayar/dp_dibayar/lunas) diperbarui otomatis
// oleh trigger sync_invoice_payment_status.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { createPaymentSchema } from '@/lib/validations/staff'
import { jakartaDayRange } from '@/lib/utils/date'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_STATUS = ['menunggu', 'berhasil', 'gagal']

export async function GET(request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  const invoiceId = searchParams.get('invoice_id')
  if (invoiceId && !UUID_REGEX.test(invoiceId)) {
    return NextResponse.json(
      { error: 'invoice_id tidak valid' },
      { status: 400 }
    )
  }

  const status = searchParams.get('status')
  if (status && !ALLOWED_STATUS.includes(status)) {
    return NextResponse.json(
      { error: 'Status pembayaran tidak valid', allowed: ALLOWED_STATUS },
      { status: 400 }
    )
  }

  const date = searchParams.get('date')
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'Format tanggal harus YYYY-MM-DD' },
      { status: 400 }
    )
  }

  const parsedLimit = parseInt(searchParams.get('limit') || '50', 10)
  const parsedOffset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = Number.isInteger(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), 100)
    : 50
  const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0

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
      `,
        { count: 'exact' }
      )
      .order('paid_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (invoiceId) query = query.eq('invoice_id', invoiceId)
    if (status) query = query.eq('status', status)
    if (date) {
      const range = jakartaDayRange(date)
      query = query.gte('paid_at', range.start).lt('paid_at', range.end)
    }

    const { data, error, count } = await query

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

    return NextResponse.json({
      payments,
      total: count ?? payments.length,
      pagination: {
        limit,
        offset,
        has_more: offset + payments.length < (count ?? 0),
      },
      filters: { invoice_id: invoiceId, status, date },
    })
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

    // Pastikan invoice ada dan belum dibatalkan. Pemeriksaan ini juga memberi
    // pesan yang jelas sebelum trigger database menolak pembayaran.
    const { data: invoiceCheck, error: invoiceCheckError } = await supabase
      .from('invoices')
      .select('id, payment_status, total_amount, dp_amount')
      .eq('id', d.invoice_id)
      .single()

    if (invoiceCheckError || !invoiceCheck) {
      return NextResponse.json(
        { error: 'Invoice tidak ditemukan' },
        { status: 404 }
      )
    }

    if (invoiceCheck.payment_status === 'dibatalkan') {
      return NextResponse.json(
        { error: 'Invoice sudah dibatalkan dan tidak bisa menerima pembayaran' },
        { status: 409 }
      )
    }

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

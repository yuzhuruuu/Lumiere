// app/api/payments/submit/route.js
// POST /api/payments/submit
// Pelanggan mengajukan DP/penuh/pelunasan via transfer/QRIS dengan bukti.
// File diunggah dulu ke bucket private payment-proofs, lalu path dikirim ke RPC.

import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { submitPaymentSchema } from '@/lib/validations/staff'

const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export async function POST(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['pelanggan'])
  if (auth.error) return auth.error

  try {
    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const parsed = submitPaymentSchema.safeParse(
      Object.fromEntries(formData.entries())
    )
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const proof = formData.get('proof')
    if (!proof || typeof proof === 'string') {
      return NextResponse.json(
        { error: 'Bukti pembayaran wajib diunggah' },
        { status: 400 }
      )
    }
    if (!ALLOWED_TYPES[proof.type]) {
      return NextResponse.json(
        { error: 'Bukti harus JPG, PNG, WebP, atau PDF' },
        { status: 415 }
      )
    }
    if (proof.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran bukti maksimal 5 MB' },
        { status: 413 }
      )
    }

    const ext = ALLOWED_TYPES[proof.type]
    const proofPath = `${auth.user.id}/${randomUUID()}.${ext}`
    const bytes = new Uint8Array(await proof.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(proofPath, bytes, { contentType: proof.type, upsert: false })

    if (uploadError) {
      console.error('Upload payment proof error:', uploadError)
      return NextResponse.json(
        { error: 'Gagal mengunggah bukti pembayaran' },
        { status: 500 }
      )
    }

    const d = parsed.data
    const { data: paymentId, error } = await supabase.rpc(
      'submit_payment_request',
      {
        p_invoice_id: d.invoice_id,
        p_choice: d.choice,
        p_method: d.method,
        p_idempotency_key: d.idempotency_key,
        p_proof_path: proofPath,
      }
    )

    if (error) {
      await supabase.storage.from('payment-proofs').remove([proofPath])
      return NextResponse.json(
        { error: error.message || 'Pengajuan pembayaran ditolak' },
        { status: 422 }
      )
    }

    return NextResponse.json(
      {
        message: 'Pembayaran diajukan. Menunggu verifikasi staf.',
        payment_id: paymentId,
        proof_path: proofPath,
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

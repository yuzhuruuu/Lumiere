// app/api/staff/orders/[id]/route.js
// PATCH /api/staff/orders/[id]
// Staf/admin memperbarui status pesanan dapur.
// Body: { "status": "disiapkan", "notes": "opsional" }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { updateOrderStatusSchema } from '@/lib/validations/staff'

// Transisi status yang diizinkan aplikasi (selaras alur dapur)
const ALLOWED_TRANSITIONS = {
  menunggu: ['disiapkan', 'dibatalkan'],
  disiapkan: ['disajikan', 'dibatalkan'],
  disajikan: ['selesai', 'dibatalkan'],
  selesai: [],
  dibatalkan: [],
}

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['staf', 'admin'])
  if (auth.error) return auth.error

  try {
    const body = await request.json().catch(() => null)
    const parsed = updateOrderStatusSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Data tidak valid',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { data: current, error: currentError } = await supabase
      .from('orders')
      .select('id, status, reservation_id')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json(
        { error: 'Pesanan tidak ditemukan' },
        { status: 404 }
      )
    }

    const allowed = ALLOWED_TRANSITIONS[current.status] || []
    if (!allowed.includes(parsed.data.status)) {
      return NextResponse.json(
        {
          error: `Tidak bisa mengubah status "${current.status}" menjadi "${parsed.data.status}"`,
          allowed_next: allowed,
        },
        { status: 409 }
      )
    }

    const updateData = {
      status: parsed.data.status,
      handled_by: auth.profile.id,
    }
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('id, reservation_id, status, notes, updated_at')
      .single()

    if (error) {
      console.error('Update order error:', error)
      return NextResponse.json(
        { error: 'Gagal memperbarui status pesanan' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Status pesanan diperbarui menjadi "${data.status}"`,
      order: data,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

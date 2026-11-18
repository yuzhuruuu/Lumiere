// app/api/admin/tables/[id]/route.js
// PATCH  /api/admin/tables/[id]  → ubah meja (kapasitas, area, aktif/nonaktif)
// DELETE /api/admin/tables/[id]  → hapus meja

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { diningTableUpdateSchema } from '@/lib/validations/admin'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = diningTableUpdateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: 'Tidak ada field yang diubah' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('dining_tables')
    .update(parsed.data)
    .eq('id', id)
    .select('id, code, capacity, area, is_active, updated_at')
    .single()

  if (error) {
    console.error('Admin update table error:', error)
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Meja tidak ditemukan' },
        { status: 404 }
      )
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Kode meja sudah dipakai' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal mengubah meja' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Meja diperbarui', table: data })
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { error } = await supabase.from('dining_tables').delete().eq('id', id)

  if (error) {
    console.error('Admin delete table error:', error)
    if (error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Meja sudah dipakai pada reservasi sehingga tidak bisa dihapus. Nonaktifkan saja (is_active = false).',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menghapus meja' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Meja berhasil dihapus' })
}

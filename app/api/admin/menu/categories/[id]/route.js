// app/api/admin/menu/categories/[id]/route.js
// PATCH  /api/admin/menu/categories/[id]  → ubah kategori
// DELETE /api/admin/menu/categories/[id]  → hapus kategori

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { menuCategoryUpdateSchema } from '@/lib/validations/admin'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = menuCategoryUpdateSchema.safeParse(body)

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
    .from('menu_categories')
    .update(parsed.data)
    .eq('id', id)
    .select('id, name, sort_order, created_at')
    .single()

  if (error) {
    console.error('Admin update category error:', error)
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      )
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nama kategori sudah dipakai' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal mengubah kategori' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Kategori diperbarui', category: data })
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { error } = await supabase.from('menu_categories').delete().eq('id', id)

  if (error) {
    console.error('Admin delete category error:', error)
    if (error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Kategori masih dipakai oleh menu. Pindahkan atau hapus menunya terlebih dahulu.',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menghapus kategori' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Kategori berhasil dihapus' })
}

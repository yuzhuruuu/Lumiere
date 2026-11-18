// app/api/admin/menu/items/[id]/route.js
// PATCH  /api/admin/menu/items/[id]  → ubah menu (termasuk is_available)
// DELETE /api/admin/menu/items/[id]  → hapus menu

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { menuItemUpdateSchema } from '@/lib/validations/admin'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = menuItemUpdateSchema.safeParse(body)

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
    .from('menu_items')
    .update(parsed.data)
    .eq('id', id)
    .select('id, name, category_id, price, is_available, photo_path, updated_at')
    .single()

  if (error) {
    console.error('Admin update menu item error:', error)
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Menu tidak ditemukan' },
        { status: 404 }
      )
    }
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nama menu sudah dipakai di kategori tersebut' },
        { status: 409 }
      )
    }
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Kategori tidak ditemukan' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal mengubah menu' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Menu diperbarui',
    item: { ...data, price: parseFloat(data.price) },
  })
}

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { error } = await supabase.from('menu_items').delete().eq('id', id)

  if (error) {
    console.error('Admin delete menu item error:', error)
    if (error.code === '23503') {
      return NextResponse.json(
        {
          error:
            'Menu sudah pernah dipesan sehingga tidak bisa dihapus. Nonaktifkan saja (is_available = false).',
        },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menghapus menu' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Menu berhasil dihapus' })
}

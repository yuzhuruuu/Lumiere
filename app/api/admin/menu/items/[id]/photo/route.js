// app/api/admin/menu/items/[id]/photo/route.js
// POST   /api/admin/menu/items/[id]/photo  → unggah/ganti foto menu (multipart, field "file")
// DELETE /api/admin/menu/items/[id]/photo  → hapus foto menu
// Bucket: restaurant-assets (publik baca, hanya admin menulis, maks 2 MB, jpeg/png/webp)

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'

const BUCKET = 'restaurant-assets'
const MAX_SIZE = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  try {
    const itemId = parseInt(id, 10)
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: 'ID menu tidak valid' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabase
      .from('menu_items')
      .select('id, name, photo_path')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })
    }

    const formData = await request.formData().catch(() => null)
    const file = formData?.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { error: 'File foto wajib dikirim dengan field "file"' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES[file.type]) {
      return NextResponse.json(
        { error: 'Format foto harus JPEG, PNG, atau WebP' },
        { status: 415 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran foto maksimal 2 MB' },
        { status: 413 }
      )
    }

    const ext = ALLOWED_TYPES[file.type]
    const newPath = `menu/item-${itemId}.${ext}`
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(newPath, bytes, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload menu photo error:', uploadError)
      return NextResponse.json(
        { error: 'Gagal mengunggah foto' },
        { status: 500 }
      )
    }

    // Hapus foto lama jika path/ekstensinya berbeda
    if (item.photo_path && item.photo_path !== newPath) {
      await supabase.storage.from(BUCKET).remove([item.photo_path])
    }

    const { data: updated, error: updateError } = await supabase
      .from('menu_items')
      .update({ photo_path: newPath })
      .eq('id', itemId)
      .select('id, name, photo_path, updated_at')
      .single()

    if (updateError) {
      console.error('Update photo_path error:', updateError)
      return NextResponse.json(
        { error: 'Foto terunggah tetapi gagal disimpan ke menu' },
        { status: 500 }
      )
    }

    const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(newPath)

    return NextResponse.json(
      {
        message: 'Foto menu berhasil diunggah',
        item: updated,
        public_url: publicUrl.publicUrl,
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

export async function DELETE(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  try {
    const itemId = parseInt(id, 10)
    if (!Number.isInteger(itemId) || itemId <= 0) {
      return NextResponse.json({ error: 'ID menu tidak valid' }, { status: 400 })
    }

    const { data: item, error: itemError } = await supabase
      .from('menu_items')
      .select('id, photo_path')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Menu tidak ditemukan' }, { status: 404 })
    }

    if (!item.photo_path) {
      return NextResponse.json(
        { error: 'Menu ini belum memiliki foto' },
        { status: 404 }
      )
    }

    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([item.photo_path])

    if (removeError) {
      console.error('Remove menu photo error:', removeError)
      return NextResponse.json(
        { error: 'Gagal menghapus foto dari storage' },
        { status: 500 }
      )
    }

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ photo_path: null })
      .eq('id', itemId)

    if (updateError) {
      console.error('Reset photo_path error:', updateError)
      return NextResponse.json(
        { error: 'Foto terhapus tetapi gagal memperbarui menu' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Foto menu berhasil dihapus' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

// app/api/menu/items/[id]/route.js
// GET /api/menu/items/[id]
// Detail satu menu (publik) beserta kategorinya.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const itemId = parseInt(id, 10)
  if (!Number.isInteger(itemId) || itemId <= 0) {
    return NextResponse.json({ error: 'ID menu tidak valid' }, { status: 400 })
  }

  try {
    const { data: item, error } = await supabase
      .from('menu_items')
      .select(
        `
        id,
        name,
        description,
        price,
        photo_path,
        is_available,
        category_id,
        menu_categories ( id, name ),
        created_at,
        updated_at
      `
      )
      .eq('id', itemId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Menu tidak ditemukan' },
          { status: 404 }
        )
      }
      console.error('Fetch menu item detail error:', error)
      return NextResponse.json(
        { error: 'Gagal mengambil detail menu' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: parseFloat(item.price),
        photo_path: item.photo_path,
        is_available: item.is_available,
        category: item.menu_categories
          ? { id: item.menu_categories.id, name: item.menu_categories.name }
          : null,
        created_at: item.created_at,
        updated_at: item.updated_at,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}

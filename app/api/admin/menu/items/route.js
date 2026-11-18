// app/api/admin/menu/items/route.js
// GET  /api/admin/menu/items?category_id=&search=  → daftar menu (termasuk yang tidak tersedia)
// POST /api/admin/menu/items                       → tambah menu

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { menuItemSchema } from '@/lib/validations/admin'
import { sanitizeSearch } from '@/lib/utils/search'

export async function GET(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const categoryId = searchParams.get('category_id')
  const search = sanitizeSearch(searchParams.get('search'))

  if (categoryId && !/^\d+$/.test(categoryId)) {
    return NextResponse.json(
      { error: 'category_id tidak valid' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('menu_items')
    .select(
      `
      id, name, description, price, photo_path, is_available, category_id,
      menu_categories ( id, name ),
      created_at, updated_at
    `
    )
    .order('name')

  if (categoryId) query = query.eq('category_id', parseInt(categoryId, 10))
  if (search) query = query.ilike('name', `%${search}%`)

  const { data, error } = await query

  if (error) {
    console.error('Admin fetch menu items error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil menu' },
      { status: 500 }
    )
  }

  const items = data.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: parseFloat(item.price),
    photo_path: item.photo_path,
    is_available: item.is_available,
    category_id: item.category_id,
    category_name: item.menu_categories?.name ?? null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }))

  return NextResponse.json({ items, total: items.length })
}

export async function POST(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = menuItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const d = parsed.data

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      category_id: d.category_id,
      name: d.name,
      description: d.description ?? null,
      price: d.price,
      photo_path: d.photo_path ?? null,
      is_available: d.is_available ?? true,
    })
    .select('id, name, category_id, price, is_available, photo_path')
    .single()

  if (error) {
    console.error('Admin create menu item error:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Menu dengan nama ini sudah ada di kategori tersebut' },
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
      { error: 'Gagal menambah menu' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      message: 'Menu berhasil ditambahkan',
      item: { ...data, price: parseFloat(data.price) },
    },
    { status: 201 }
  )
}

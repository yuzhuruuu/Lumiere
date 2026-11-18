// app/api/admin/menu/categories/route.js
// GET  /api/admin/menu/categories  → semua kategori (termasuk urutan)
// POST /api/admin/menu/categories  → tambah kategori

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { menuCategorySchema } from '@/lib/validations/admin'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order, created_at')
    .order('sort_order')
    .order('name')

  if (error) {
    console.error('Admin fetch categories error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil kategori' },
      { status: 500 }
    )
  }

  return NextResponse.json({ categories: data, total: data.length })
}

export async function POST(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = menuCategorySchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      name: parsed.data.name,
      sort_order: parsed.data.sort_order ?? 0,
    })
    .select('id, name, sort_order, created_at')
    .single()

  if (error) {
    console.error('Admin create category error:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Nama kategori sudah ada' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menambah kategori' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { message: 'Kategori berhasil ditambahkan', category: data },
    { status: 201 }
  )
}

// app/api/admin/tables/route.js
// GET  /api/admin/tables  → semua meja
// POST /api/admin/tables  → tambah meja

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { diningTableSchema } from '@/lib/validations/admin'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('dining_tables')
    .select('id, code, capacity, area, is_active, created_at, updated_at')
    .order('area')
    .order('code')

  if (error) {
    console.error('Admin fetch tables error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data meja' },
      { status: 500 }
    )
  }

  return NextResponse.json({ tables: data, total: data.length })
}

export async function POST(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = diningTableSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('dining_tables')
    .insert({
      code: parsed.data.code,
      capacity: parsed.data.capacity,
      area: parsed.data.area,
      is_active: parsed.data.is_active ?? true,
    })
    .select('id, code, capacity, area, is_active')
    .single()

  if (error) {
    console.error('Admin create table error:', error)
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Kode meja sudah dipakai' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menambah meja' },
      { status: 500 }
    )
  }

  return NextResponse.json(
    { message: 'Meja berhasil ditambahkan', table: data },
    { status: 201 }
  )
}

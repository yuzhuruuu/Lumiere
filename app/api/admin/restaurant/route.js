// app/api/admin/restaurant/route.js
// GET   /api/admin/restaurant  → profil restoran (baris id = 1)
// PATCH /api/admin/restaurant  → ubah pengaturan restoran
// Catatan: min_order_amount, dp_percentage, tax_percentage dibaca oleh
// trigger database, jadi perubahan langsung berlaku tanpa deploy ulang.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { restaurantProfileSchema } from '@/lib/validations/admin'

export async function GET() {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('restaurant_profile')
    .select('*')
    .eq('id', 1)
    .single()

  if (error) {
    console.error('Admin fetch restaurant error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil profil restoran' },
      { status: 500 }
    )
  }

  return NextResponse.json({ restaurant: data })
}

export async function PATCH(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = restaurantProfileSchema.safeParse(body)

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
    .from('restaurant_profile')
    .update(parsed.data)
    .eq('id', 1)
    .select('*')
    .single()

  if (error) {
    console.error('Admin update restaurant error:', error)
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'Nilai yang dimasukkan melanggar aturan database' },
        { status: 422 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal menyimpan profil restoran' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Profil restoran diperbarui',
    restaurant: data,
  })
}

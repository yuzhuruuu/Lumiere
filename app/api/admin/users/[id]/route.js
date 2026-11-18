// app/api/admin/users/[id]/route.js
// PATCH /api/admin/users/[id]
// Admin mengubah role atau mengaktifkan/menonaktifkan akun.
// Body: { "role": "staf", "is_active": true } (boleh salah satu)
//
// Pengaman:
// - Admin tidak bisa menurunkan/menonaktifkan akunnya sendiri.
// - Minimal harus ada 1 admin aktif.
// - Trigger protect_profile_role di database tetap menjadi lapisan terakhir.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { adminUpdateUserSchema } from '@/lib/validations/profile'

export async function PATCH(request, { params }) {
  const supabase = await createClient()
  const { id } = await params

  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = adminUpdateUserSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { data: target, error: targetError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', id)
    .single()

  if (targetError || !target) {
    return NextResponse.json(
      { error: 'Pengguna tidak ditemukan' },
      { status: 404 }
    )
  }

  const demoted = parsed.data.role !== undefined && parsed.data.role !== 'admin'
  const deactivated = parsed.data.is_active === false
  const willLoseAdmin =
    target.role === 'admin' && target.is_active && (demoted || deactivated)

  if (id === auth.user.id && willLoseAdmin) {
    return NextResponse.json(
      {
        error:
          'Anda tidak bisa menurunkan atau menonaktifkan akun sendiri. Minta admin lain melakukannya.',
      },
      { status: 400 }
    )
  }

  if (willLoseAdmin) {
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('is_active', true)

    if (countError) {
      console.error('Count admins error:', countError)
      return NextResponse.json(
        { error: 'Gagal memeriksa jumlah admin' },
        { status: 500 }
      )
    }

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Minimal harus ada satu admin aktif' },
        { status: 409 }
      )
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', id)
    .select('id, full_name, email, role, is_active, updated_at')
    .single()

  if (error) {
    console.error('Admin update user error:', error)
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'Hanya admin yang boleh mengubah role/status akun' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal memperbarui pengguna' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Data pengguna diperbarui',
    user: data,
  })
}

// app/api/profile/route.js
// GET   /api/profile  → profil pengguna yang sedang login
// PATCH /api/profile  → ubah nama / nomor HP sendiri
// Role dan status akun TIDAK bisa diubah lewat endpoint ini
// (trigger protect_profile_role menolak perubahan dari non-admin).

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { updateProfileSchema } from '@/lib/validations/profile'

export async function GET() {
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
  if (auth.error) return auth.error

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active, created_at, updated_at')
    .eq('id', auth.user.id)
    .single()

  if (error) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil profil' },
      { status: 500 }
    )
  }

  return NextResponse.json({ profile: data })
}

export async function PATCH(request) {
  const supabase = await createClient()

  const auth = await requireRole(supabase, ['pelanggan', 'staf', 'admin'])
  if (auth.error) return auth.error

  const body = await request.json().catch(() => null)
  const parsed = updateProfileSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Data tidak valid', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const updates = {}
  if (parsed.data.full_name !== undefined) {
    updates.full_name = parsed.data.full_name
  }
  if (parsed.data.phone !== undefined) {
    updates.phone = parsed.data.phone || null
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Tidak ada field yang diubah' },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', auth.user.id)
    .select('id, full_name, email, phone, role, is_active, updated_at')
    .single()

  if (error) {
    console.error('Update profile error:', error)
    if (error.code === '23514') {
      return NextResponse.json(
        { error: 'Nama atau nomor HP tidak valid' },
        { status: 422 }
      )
    }
    if (error.code === '42501') {
      return NextResponse.json(
        { error: 'Anda tidak berhak mengubah data ini' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'Gagal memperbarui profil' },
      { status: 500 }
    )
  }

  return NextResponse.json({ message: 'Profil diperbarui', profile: data })
}

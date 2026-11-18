// app/api/admin/users/route.js
// GET /api/admin/users?role=&search=
// Daftar semua pengguna (profiles) untuk admin.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { sanitizeSearch } from '@/lib/utils/search'

const ALLOWED_ROLES = ['pelanggan', 'staf', 'admin']

export async function GET(request) {
  const supabase = await createClient()
  const auth = await requireRole(supabase, ['admin'])
  if (auth.error) return auth.error

  const { searchParams } = new URL(request.url)
  const role = searchParams.get('role')
  const search = sanitizeSearch(searchParams.get('search'))

  if (role && !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json(
      { error: 'Role tidak valid', allowed: ALLOWED_ROLES },
      { status: 400 }
    )
  }

  let query = supabase
    .from('profiles')
    .select('id, full_name, email, phone, role, is_active, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (role) query = query.eq('role', role)
  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    )
  }

  const { data, error } = await query

  if (error) {
    console.error('Admin fetch users error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil data pengguna' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    users: data,
    total: data.length,
    filters: { role, search },
  })
}

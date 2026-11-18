// lib/auth/require-role.js
// Helper otorisasi untuk Route Handler.
// Selalu pakai getUser() (verifikasi ke server Auth), bukan getSession().

import { NextResponse } from 'next/server'

export async function requireRole(supabase, allowedRoles) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Silakan login terlebih dahulu' },
        { status: 401 }
      ),
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return {
      error: NextResponse.json(
        { error: 'Profil tidak ditemukan' },
        { status: 404 }
      ),
    }
  }

  if (!profile.is_active) {
    return {
      error: NextResponse.json(
        { error: 'Akun Anda tidak aktif' },
        { status: 403 }
      ),
    }
  }

  if (!allowedRoles.includes(profile.role)) {
    return {
      error: NextResponse.json(
        { error: 'Anda tidak memiliki akses ke fitur ini' },
        { status: 403 }
      ),
    }
  }

  return { user, profile }
}

// app/actions/auth.js
// Server Actions untuk autentikasi
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { registerSchema, loginSchema } from '@/lib/validations/auth'

export async function register(formData) {
  const supabase = await createClient()
  
  // Validasi input
  const parsed = registerSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  
  if (!parsed.success) {
    return {
      error: 'Data tidak valid',
      details: parsed.error.flatten().fieldErrors,
    }
  }
  
  const { full_name, phone, email, password } = parsed.data
  
  // Sign up dengan metadata untuk trigger database
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
      },
    },
  })
  
  if (error) {
    // Terjemahkan error ke bahasa Indonesia
    if (error.message.includes('already registered')) {
      return { error: 'Email sudah terdaftar' }
    }
    if (error.message.includes('invalid email')) {
      return { error: 'Format email tidak valid' }
    }
    if (error.message.includes('password')) {
      return { error: 'Password terlalu lemah' }
    }
    console.error('Register error:', error)
    return { error: 'Gagal mendaftar. Silakan coba lagi.' }
  }
  
  if (data.user) {
    // Redirect ke login dengan pesan sukses
    redirect('/login?message=Pendaftaran berhasil! Silakan login.')
  }
  
  return { error: 'Terjadi kesalahan. Silakan coba lagi.' }
}

export async function login(formData) {
  const supabase = await createClient()
  
  // Validasi input
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  
  if (!parsed.success) {
    return {
      error: 'Data tidak valid',
      details: parsed.error.flatten().fieldErrors,
    }
  }
  
  const { email, password } = parsed.data
  
  // Sign in
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Email atau password salah' }
    }
    console.error('Login error:', error)
    return { error: 'Gagal login. Silakan coba lagi.' }
  }
  
  // Baca role dari profiles
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Sesi tidak valid. Silakan coba lagi.' }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    return { error: 'Profil tidak ditemukan. Silakan hubungi admin.' }
  }
  
  // Redirect berdasarkan role
  const role = profile.role
  if (role === 'admin') {
    redirect('/dashboard/admin')
  } else if (role === 'staf') {
    redirect('/dashboard/staf')
  } else {
    redirect('/dashboard/pelanggan')
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

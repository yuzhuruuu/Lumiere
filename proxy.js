// proxy.js
// Middleware untuk Next.js 16 - menyegarkan sesi dan proteksi routes
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll().map(({ name, value }) => ({ name, value }))
        },
        setAll: (cookieList) => {
          cookieList.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session - penting untuk menjaga sesi tetap aktif
  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Proteksi dashboard - harus login
  if (pathname.startsWith('/dashboard')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // Baca role dari profiles untuk proteksi berdasarkan role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Jika profil tidak ditemukan, redirect ke login
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    const role = profile.role

    // Proteksi dashboard admin - hanya admin
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      const dashboardUrl = new URL(`/dashboard/${role}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }

    // Proteksi dashboard staf - hanya staf dan admin
    if (pathname.startsWith('/dashboard/staf') && role !== 'staf' && role !== 'admin') {
      const dashboardUrl = new URL(`/dashboard/${role}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  // Redirect ke dashboard jika sudah login dan akses login/register
  if ((pathname === '/login' || pathname === '/register') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const dashboardUrl = new URL(`/dashboard/${profile.role}`, request.url)
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
  ],
}

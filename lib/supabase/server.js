// lib/supabase/server.js
// Klien Supabase untuk server (Server Components, Route Handlers, Server Actions)
// Bertindak sebagai pengguna yang sedang login (membaca cookie sesi)
// RLS berlaku - hanya bisa akses data sesuai permission user

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookieList) => {
          try {
            cookieList.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            )
          } catch {
            // Handle cookies not available in Server Components
          }
        },
      },
    }
  )
}

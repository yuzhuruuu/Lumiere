// lib/supabase/admin.js
// Klien Supabase Admin - MELEWATI RLS!
// HANYA untuk operasi khusus (misal: buat akun test, update role)
// TIDAK BOLEH dipakai untuk operasi normal user
// File ini akan error jika diimport di kode browser

import 'server-only'
import { createClient } from '@supabase/supabase-js'

let adminClient = null

export function getSupabaseAdmin() {
  // Validasi environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL tidak ditemukan. ' +
      'Pastikan environment variable sudah diset di Vercel atau .env.local'
    )
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY tidak ditemukan. ' +
      'Pastikan environment variable sudah diset di Vercel atau .env.local. ' +
      'JANGAN gunakan NEXT_PUBLIC_ prefix untuk service role key.'
    )
  }
  
  // Lazy initialization - hanya buat client saat pertama kali dipanggil
  if (!adminClient) {
    adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
        },
      }
    )
  }
  
  return adminClient
}

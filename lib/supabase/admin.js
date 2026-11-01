// lib/supabase/admin.js
// Klien Supabase Admin - MELEWATI RLS!
// HANYA untuk operasi khusus (misal: buat akun test, update role)
// TIDAK BOLEH dipakai untuk operasi normal user
// File ini akan error jika diimport di kode browser

import 'server-only'
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
)

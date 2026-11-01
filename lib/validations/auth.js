// lib/validations/auth.js
// Schema validasi untuk autentikasi

import { z } from 'zod'

export const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nama lengkap minimal 2 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter'),
  
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+62|62|0)8[0-9]{8,11}$/,
      'Format nomor telepon tidak valid. Contoh: 08123456789'
    ),
  
  email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(255, 'Email terlalu panjang'),
  
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .max(100, 'Password maksimal 100 karakter'),
})

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Format email tidak valid'),
  
  password: z
    .string()
    .min(1, 'Password wajib diisi'),
})

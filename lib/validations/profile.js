// lib/validations/profile.js
// Schema validasi profil pengguna dan manajemen user oleh admin

import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(
      /^(\+62|62|0)8[0-9]{8,11}$/,
      'Nomor HP harus format Indonesia, contoh 081234567890'
    )
    .optional()
    .nullable(),
})

export const adminUpdateUserSchema = z
  .object({
    role: z.enum(['pelanggan', 'staf', 'admin'], {
      message: 'Role harus pelanggan, staf, atau admin',
    }).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Tidak ada field yang diubah',
  })

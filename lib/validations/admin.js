// lib/validations/admin.js
// Schema validasi untuk operasi admin

import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$|^24:00(:00)?$/

export const menuCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(60),
  sort_order: z.number().int().min(0).max(32767).optional(),
})

export const menuCategoryUpdateSchema = menuCategorySchema.partial()

export const menuItemSchema = z.object({
  category_id: z.number().int().positive('Kategori wajib dipilih'),
  name: z.string().trim().min(1, 'Nama menu wajib diisi').max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  price: z
    .number()
    .min(0, 'Harga tidak boleh negatif')
    .max(9999999999, 'Harga terlalu besar'),
  photo_path: z.string().trim().max(500).optional().nullable(),
  is_available: z.boolean().optional(),
})

export const menuItemUpdateSchema = menuItemSchema.partial()

export const diningTableSchema = z.object({
  code: z.string().trim().min(1, 'Kode meja wajib diisi').max(10),
  capacity: z.number().int().min(1, 'Kapasitas minimal 1').max(50, 'Kapasitas maksimal 50'),
  area: z.string().trim().min(1, 'Area wajib diisi').max(40),
  is_active: z.boolean().optional(),
})

export const diningTableUpdateSchema = diningTableSchema.partial()

export const operatingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  open_time: z.string().regex(timeRegex, 'Format jam harus HH:MM'),
  close_time: z.string().regex(timeRegex, 'Format jam harus HH:MM'),
  is_closed: z.boolean(),
})

export const operatingHoursBulkSchema = z
  .array(operatingHourSchema)
  .min(1, 'Minimal 1 baris')
  .max(7, 'Maksimal 7 baris')
  .refine(
    (rows) => new Set(rows.map((r) => r.day_of_week)).size === rows.length,
    'Hari tidak boleh duplikat'
  )
  .refine(
    (rows) =>
      rows.every((r) => {
        if (r.is_closed) return true
        // close_time 24:00 dianggap tengah malam (lebih besar dari jam buka)
        const toMin = (t) => {
          const [h, m] = t.split(':').map(Number)
          return h * 60 + m
        }
        return toMin(r.close_time) > toMin(r.open_time)
      }),
    'Jam tutup harus lebih besar dari jam buka'
  )

export const restaurantProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  tagline: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  address: z.string().trim().min(1).max(1000).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email('Format email tidak valid').max(255).optional().nullable(),
  min_order_amount: z.number().min(0).optional(),
  dp_percentage: z.number().int().min(0).max(100).optional(),
  tax_percentage: z.number().min(0).max(100).optional(),
  pending_timeout_minutes: z.number().int().min(0).max(1440).optional(),
  dp_deadline_minutes: z.number().int().min(0).max(1440).optional(),
  cancel_cutoff_days: z.number().int().min(0).max(30).optional(),
  no_show_grace_minutes: z.number().int().min(0).max(1440).optional(),
  bank_name: z.string().trim().max(100).optional().nullable(),
  bank_account_number: z.string().trim().max(50).optional().nullable(),
  bank_account_name: z.string().trim().max(100).optional().nullable(),
  qris_path: z.string().trim().max(500).optional().nullable(),
  available_payment_methods: z
    .array(z.enum(['tunai', 'transfer', 'qris', 'kartu_debit']))
    .optional(),
  payment_instructions: z.string().trim().max(2000).optional().nullable(),
})

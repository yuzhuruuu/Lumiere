// lib/validations/reservation.js
// Schema validasi untuk reservasi

import { z } from 'zod'

export const checkAvailabilitySchema = z.object({
  reservation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:MM'),
  
  duration_minutes: z
    .number()
    .int()
    .min(30, 'Durasi minimal 30 menit')
    .max(240, 'Durasi maksimal 240 menit')
    .refine(val => val % 30 === 0, 'Durasi harus kelipatan 30 menit'),
  
  guest_count: z
    .number()
    .int()
    .min(1, 'Jumlah tamu minimal 1 orang')
    .max(50, 'Jumlah tamu maksimal 50 orang'),
})

export const createReservationSchema = z.object({
  contact_name: z
    .string()
    .trim()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  
  contact_phone: z
    .string()
    .trim()
    .regex(
      /^(\+62|62|0)8[0-9]{8,11}$/,
      'Format nomor telepon tidak valid. Contoh: 08123456789'
    ),
  
  contact_email: z
    .string()
    .trim()
    .email('Format email tidak valid')
    .max(255, 'Email terlalu panjang'),
  
  reservation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format waktu harus HH:MM'),
  
  duration_minutes: z
    .number()
    .int()
    .min(30, 'Durasi minimal 30 menit')
    .max(240, 'Durasi maksimal 240 menit')
    .refine(val => val % 30 === 0, 'Durasi harus kelipatan 30 menit'),
  
  guest_count: z
    .number()
    .int()
    .min(1, 'Jumlah tamu minimal 1 orang')
    .max(50, 'Jumlah tamu maksimal 50 orang'),
  
  table_id: z
    .number()
    .int()
    .positive('ID meja tidak valid'),
  
  items: z
    .array(
      z.object({
        menu_item_id: z.number().int().positive('ID menu tidak valid'),
        quantity: z
          .number()
          .int()
          .min(1, 'Jumlah minimal 1')
          .max(99, 'Jumlah maksimal 99'),
      })
    )
    .min(1, 'Minimal pilih 1 menu'),
  
  notes: z
    .string()
    .max(500, 'Catatan maksimal 500 karakter')
    .optional(),
})

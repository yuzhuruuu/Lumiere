// lib/validations/reservation.js
// Schema validasi untuk reservasi pelanggan.

import { z } from 'zod'
import { dateStringSchema, timeStringSchema } from './datetime'

const durationMinutesSchema = z
  .number()
  .int()
  .min(30, 'Durasi minimal 30 menit')
  .max(240, 'Durasi maksimal 240 menit')
  .refine((value) => value % 30 === 0, 'Durasi harus kelipatan 30 menit')

const guestCountSchema = z
  .number()
  .int()
  .min(1, 'Jumlah tamu minimal 1 orang')
  .max(50, 'Jumlah tamu maksimal 50 orang')

export const checkAvailabilitySchema = z.object({
  reservation_date: dateStringSchema,
  start_time: timeStringSchema,
  duration_minutes: durationMinutesSchema,
  guest_count: guestCountSchema,
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

  reservation_date: dateStringSchema,
  start_time: timeStringSchema,
  duration_minutes: durationMinutesSchema,
  guest_count: guestCountSchema,

  table_id: z.number().int().positive('ID meja tidak valid'),

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
    .min(1, 'Minimal pilih 1 menu')
    .refine(
      (items) =>
        new Set(items.map((item) => item.menu_item_id)).size === items.length,
      'Menu yang sama tidak boleh dipilih lebih dari sekali'
    ),

  notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional(),

  // Dipakai admin saat membuat reservasi atas nama pelanggan terdaftar.
  // Pelanggan biasa tidak mengirim field ini.
  customer_id: z.string().uuid('ID pelanggan tidak valid').optional(),
})

// lib/validations/staff.js
// Schema validasi untuk aksi staf/admin

import { z } from 'zod'

export const validateReservationSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
  }),
  z.object({
    action: z.literal('reject'),
    rejection_reason: z
      .string()
      .trim()
      .min(5, 'Alasan penolakan minimal 5 karakter')
      .max(500, 'Alasan penolakan maksimal 500 karakter'),
  }),
])

export const checkInSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('check_in'),
  }),
  z.object({
    action: z.literal('no_show'),
    note: z.string().trim().max(500).optional(),
  }),
])

export const rescheduleReservationSchema = z
  .object({
    reservation_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
      .optional(),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format waktu harus HH:MM')
      .optional(),
    duration_minutes: z
      .number()
      .int()
      .min(30, 'Durasi minimal 30 menit')
      .max(240, 'Durasi maksimal 240 menit')
      .refine((val) => val % 30 === 0, 'Durasi harus kelipatan 30 menit')
      .optional(),
    guest_count: z
      .number()
      .int()
      .min(1, 'Jumlah tamu minimal 1 orang')
      .max(50, 'Jumlah tamu maksimal 50 orang')
      .optional(),
    table_id: z.number().int().positive('ID meja tidak valid').optional(),
    notes: z.string().trim().max(500, 'Catatan maksimal 500 karakter').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Tidak ada perubahan yang dikirim',
  })

export const updateOrderStatusSchema = z.object({
  status: z.enum(['disiapkan', 'disajikan', 'selesai', 'dibatalkan'], {
    message: 'Status pesanan tidak valid',
  }),
  notes: z.string().trim().max(500).optional(),
})

export const createPaymentSchema = z.object({
  invoice_id: z.string().uuid('Invoice ID tidak valid'),
  type: z.enum(['dp', 'pelunasan'], {
    message: 'Tipe pembayaran harus dp atau pelunasan',
  }),
  method: z.enum(['tunai', 'transfer', 'qris', 'kartu_debit'], {
    message: 'Metode pembayaran tidak valid',
  }),
  amount: z
    .number()
    .positive('Jumlah pembayaran harus lebih dari 0')
    .max(1_000_000_000, 'Jumlah pembayaran terlalu besar'),
  status: z.enum(['berhasil', 'menunggu', 'gagal']).default('berhasil'),
  reference_no: z.string().trim().max(100).optional(),
  idempotency_key: z
    .string()
    .trim()
    .min(8, 'Idempotency key minimal 8 karakter')
    .max(64, 'Idempotency key maksimal 64 karakter'),
})

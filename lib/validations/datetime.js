// lib/validations/datetime.js
// Schema tanggal/jam yang ketat. Regex saja tidak cukup: "2026-02-31"
// lolos regex tetapi bukan tanggal kalender yang valid.

import { z } from 'zod'

export function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [year, month, day] = value.split('-').map(Number)

  // Rentang yang wajar untuk aplikasi reservasi.
  if (year < 1900 || year > 9999) return false

  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
  .refine(isValidDateString, 'Tanggal tidak valid')

// Jam mulai reservasi memakai format 24 jam. Nilai 24:00 bukan jam mulai
// yang valid; batas tutup 24:00 ditangani terpisah dari data operating_hours.
export const timeStringSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    'Format waktu harus HH:MM (00:00–23:59)'
  )

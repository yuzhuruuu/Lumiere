// lib/utils/date.js
// Helper tanggal berbasis zona waktu restoran (Asia/Jakarta / WIB, UTC+7).
// Jangan memakai toISOString().split('T')[0] karena itu UTC dan bisa
// menggeser tanggal antara pukul 00:00 - 07:00 WIB.

export function todayJakarta() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function monthPrefixJakarta() {
  return todayJakarta().slice(0, 7) // YYYY-MM
}

// Jam saat ini di WIB dalam format HH:MM (24 jam).
// Dipakai untuk menolak reservasi hari ini yang jam mulainya sudah lewat.
export function nowJakartaTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date())
}

// Rentang satu hari WIB dalam format ISO, untuk filter kolom timestamptz.
// Contoh: jakartaDayRange('2026-11-18')
//   → { start: '2026-11-18T00:00:00+07:00',
//       end:   '2026-11-19T00:00:00+07:00' }
export function jakartaDayRange(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(year, month - 1, day + 1))
  const nextStr = [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, '0'),
    String(next.getUTCDate()).padStart(2, '0'),
  ].join('-')

  return {
    start: `${dateStr}T00:00:00+07:00`,
    end: `${nextStr}T00:00:00+07:00`,
  }
}

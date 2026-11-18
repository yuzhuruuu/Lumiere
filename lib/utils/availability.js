// lib/utils/availability.js
// Perhitungan benturan jadwal reservasi. Fungsi murni supaya bisa diuji
// tanpa database; database tetap menjadi penjaga terakhir lewat exclusion
// constraint no_double_booking.

/**
 * Ubah "HH:MM" atau "HH:MM:SS" (termasuk "24:00:00" dari PostgreSQL time)
 * menjadi jumlah menit sejak tengah malam.
 */
export function parseTimeToMinutes(value) {
  if (typeof value !== 'string') return NaN

  const match = value.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return NaN

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3] || 0)

  if (minutes > 59 || seconds > 59) return NaN

  // PostgreSQL mengizinkan time "24:00:00" sebagai batas akhir hari.
  if (hours === 24 && minutes === 0 && seconds === 0) return 24 * 60
  if (hours > 23) return NaN

  return hours * 60 + minutes
}

export function formatMinutesAsTime(totalMinutes) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours = Math.floor(normalized / 60)
  const minutes = normalized % 60

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export function addMinutesToTime(startTime, durationMinutes) {
  return parseTimeToMinutes(startTime) + Number(durationMinutes)
}

/**
 * Dua rentang [start, end) bentrok jika mulai baru < selesai lama DAN
 * selesai baru > mulai lama. Reservasi yang bersambung tepat di batas
 * (misalnya 19:00–21:00 lalu 21:00–23:00) tidak dianggap bentrok.
 */
export function timesOverlap(
  firstStart,
  firstDuration,
  secondStart,
  secondDuration
) {
  const firstStartMinutes = parseTimeToMinutes(firstStart)
  const secondStartMinutes = parseTimeToMinutes(secondStart)
  const firstEndMinutes = firstStartMinutes + Number(firstDuration)
  const secondEndMinutes = secondStartMinutes + Number(secondDuration)

  if (
    [firstStartMinutes, secondStartMinutes, firstEndMinutes, secondEndMinutes].some(
      Number.isNaN
    )
  ) {
    return false
  }

  return (
    firstStartMinutes < secondEndMinutes &&
    firstEndMinutes > secondStartMinutes
  )
}

/**
 * Kembalikan Set id meja yang sudah terpakai pada slot yang diminta.
 * bookings: [{ table_id, start_time, duration_minutes }]
 */
export function getConflictingTableIds(bookings, startTime, durationMinutes) {
  const conflicting = new Set()

  for (const booking of bookings || []) {
    if (
      timesOverlap(
        startTime,
        durationMinutes,
        booking.start_time,
        booking.duration_minutes
      )
    ) {
      conflicting.add(booking.table_id)
    }
  }

  return conflicting
}

/**
 * Hari dalam seminggu (0 = Minggu) untuk string YYYY-MM-DD.
 * Memakai UTC agar tanggal tidak bergeser karena zona waktu server.
 */
export function dayOfWeekForDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

/**
 * Cek apakah slot [start, start + duration) berada di dalam jam operasional.
 * closeTime boleh "24:00:00" untuk restoran yang tutup tengah malam.
 */
export function isWithinOperatingHours(
  startTime,
  durationMinutes,
  openTime,
  closeTime,
  isClosed = false
) {
  if (isClosed) return false

  const start = parseTimeToMinutes(startTime)
  const end = start + Number(durationMinutes)
  const open = parseTimeToMinutes(openTime)
  const close = parseTimeToMinutes(closeTime)

  if ([start, end, open, close].some(Number.isNaN)) return false

  return start >= open && end <= close
}

import { describe, expect, it } from 'vitest'
import {
  addMinutesToTime,
  dayOfWeekForDate,
  formatMinutesAsTime,
  getConflictingTableIds,
  isWithinOperatingHours,
  parseTimeToMinutes,
  timesOverlap,
} from '@/lib/utils/availability'

describe('parseTimeToMinutes', () => {
  it('mengubah HH:MM dan HH:MM:SS menjadi menit', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0)
    expect(parseTimeToMinutes('10:30')).toBe(630)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
    expect(parseTimeToMinutes('24:00:00')).toBe(1440)
    expect(parseTimeToMinutes('19:00:00')).toBe(1140)
  })

  it('menolak jam yang tidak valid', () => {
    expect(Number.isNaN(parseTimeToMinutes('24:01'))).toBe(true)
    expect(Number.isNaN(parseTimeToMinutes('25:00'))).toBe(true)
    expect(Number.isNaN(parseTimeToMinutes('12:60'))).toBe(true)
    expect(Number.isNaN(parseTimeToMinutes('abc'))).toBe(true)
    expect(Number.isNaN(parseTimeToMinutes(null))).toBe(true)
  })
})

describe('formatMinutesAsTime', () => {
  it('memformat menit kembali ke HH:MM', () => {
    expect(formatMinutesAsTime(0)).toBe('00:00')
    expect(formatMinutesAsTime(630)).toBe('10:30')
    expect(formatMinutesAsTime(1440)).toBe('00:00')
  })
})

describe('addMinutesToTime', () => {
  it('menambahkan durasi ke jam mulai', () => {
    expect(addMinutesToTime('19:00', 120)).toBe(1260)
    expect(addMinutesToTime('22:00', 120)).toBe(1440)
  })
})

describe('timesOverlap', () => {
  it('mendeteksi benturan pada rentang yang beririsan', () => {
    expect(timesOverlap('19:00', 120, '20:00', 120)).toBe(true)
    expect(timesOverlap('20:00', 120, '19:00', 120)).toBe(true)
    expect(timesOverlap('19:00', 120, '19:00', 120)).toBe(true)
    expect(timesOverlap('19:00', 180, '21:00', 60)).toBe(true)
  })

  it('mengizinkan reservasi yang bersambung tepat di batas', () => {
    expect(timesOverlap('19:00', 120, '21:00', 120)).toBe(false)
    expect(timesOverlap('21:00', 120, '19:00', 120)).toBe(false)
  })

  it('mengizinkan slot yang benar-benar terpisah', () => {
    expect(timesOverlap('19:00', 60, '21:00', 60)).toBe(false)
  })
})

describe('getConflictingTableIds', () => {
  const bookings = [
    { table_id: 1, start_time: '19:00:00', duration_minutes: 120 },
    { table_id: 2, start_time: '21:00:00', duration_minutes: 120 },
  ]

  it('mengembalikan meja yang bentrok saja', () => {
    expect([...getConflictingTableIds(bookings, '20:00', 30)]).toEqual([1])
    expect([...getConflictingTableIds(bookings, '21:00', 30)]).toEqual([2])
    expect([...getConflictingTableIds(bookings, '23:00', 60)]).toEqual([])
  })
})

describe('dayOfWeekForDate', () => {
  it('menghitung hari dalam seminggu tanpa pergeseran zona waktu', () => {
    expect(dayOfWeekForDate('2026-11-18')).toBe(3) // Rabu
    expect(dayOfWeekForDate('2026-11-22')).toBe(0) // Minggu
  })
})

describe('isWithinOperatingHours', () => {
  it('memeriksa slot di dalam jam operasional 10:00-24:00', () => {
    expect(isWithinOperatingHours('10:00', 60, '10:00', '24:00')).toBe(true)
    expect(isWithinOperatingHours('19:00', 120, '10:00', '24:00')).toBe(true)
    expect(isWithinOperatingHours('22:00', 120, '10:00', '24:00')).toBe(true)
    expect(isWithinOperatingHours('23:00', 120, '10:00', '24:00')).toBe(false)
    expect(isWithinOperatingHours('09:00', 60, '10:00', '24:00')).toBe(false)
  })

  it('menolak hari tutup', () => {
    expect(
      isWithinOperatingHours('19:00', 120, '10:00', '24:00', true)
    ).toBe(false)
  })
})

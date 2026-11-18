import { describe, expect, it } from 'vitest'
import {
  checkAvailabilitySchema,
  createReservationSchema,
} from '@/lib/validations/reservation'

function validPayload(overrides = {}) {
  return {
    contact_name: 'Budi Santoso',
    contact_phone: '081234567890',
    contact_email: 'budi@example.com',
    reservation_date: '2099-01-01',
    start_time: '19:00',
    duration_minutes: 120,
    guest_count: 4,
    table_id: 1,
    items: [{ menu_item_id: 1, quantity: 2 }],
    notes: 'Ulang tahun',
    ...overrides,
  }
}

describe('createReservationSchema', () => {
  it('menerima payload reservasi yang lengkap dan valid', () => {
    const parsed = createReservationSchema.safeParse(validPayload())
    expect(parsed.success).toBe(true)
  })

  it('menolak tanggal kalender yang tidak ada', () => {
    for (const date of ['2026-02-30', '2026-13-01', '2026-00-10', '2026-04-31']) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ reservation_date: date })
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('menerima tanggal 29 Februari pada tahun kabisat', () => {
    const parsed = createReservationSchema.safeParse(
      validPayload({ reservation_date: '2028-02-29' })
    )
    expect(parsed.success).toBe(true)
  })

  it('menolak format jam yang tidak valid', () => {
    for (const time of ['24:00', '25:00', '12:60', '9:00', '19.00']) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ start_time: time })
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('menolak durasi di luar 30-240 menit atau bukan kelipatan 30', () => {
    for (const duration of [0, 15, 45, 250, 270]) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ duration_minutes: duration })
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('menerima durasi 30 dan 240 menit', () => {
    for (const duration of [30, 240]) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ duration_minutes: duration })
      )
      expect(parsed.success).toBe(true)
    }
  })

  it('menolak jumlah tamu di luar 1-50', () => {
    for (const guests of [0, 51]) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ guest_count: guests })
      )
      expect(parsed.success).toBe(false)
    }
  })

  it('menolak menu yang sama dipilih dua kali', () => {
    const parsed = createReservationSchema.safeParse(
      validPayload({
        items: [
          { menu_item_id: 1, quantity: 1 },
          { menu_item_id: 1, quantity: 2 },
        ],
      })
    )

    expect(parsed.success).toBe(false)
    expect(
      parsed.error.issues.some(
        (issue) =>
          issue.message === 'Menu yang sama tidak boleh dipilih lebih dari sekali'
      )
    ).toBe(true)
  })

  it('menolak daftar menu kosong', () => {
    const parsed = createReservationSchema.safeParse(
      validPayload({ items: [] })
    )
    expect(parsed.success).toBe(false)
  })

  it('menolak nomor telepon dan email yang tidak valid', () => {
    for (const phone of ['12345', '0812', '+62812abc', '628123456789012345']) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ contact_phone: phone })
      )
      expect(parsed.success).toBe(false)
    }

    const parsedEmail = createReservationSchema.safeParse(
      validPayload({ contact_email: 'bukan-email' })
    )
    expect(parsedEmail.success).toBe(false)
  })

  it('menerima nomor telepon dengan awalan 0, 62, dan +62', () => {
    for (const phone of ['081234567890', '6281234567890', '+6281234567890']) {
      const parsed = createReservationSchema.safeParse(
        validPayload({ contact_phone: phone })
      )
      expect(parsed.success).toBe(true)
    }
  })
})

describe('checkAvailabilitySchema', () => {
  it('menolak tanggal/jam tidak valid', () => {
    const valid = {
      reservation_date: '2099-01-01',
      start_time: '19:00',
      duration_minutes: 120,
      guest_count: 4,
    }

    expect(checkAvailabilitySchema.safeParse(valid).success).toBe(true)
    expect(
      checkAvailabilitySchema.safeParse({
        ...valid,
        reservation_date: '2026-02-30',
      }).success
    ).toBe(false)
    expect(
      checkAvailabilitySchema.safeParse({ ...valid, start_time: '24:00' }).success
    ).toBe(false)
  })
})
